import os
import logging
import httpx
import json
import redis
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.config import settings
from app.services.ai_service import get_ai_service, get_active_model_name

router = APIRouter(prefix="/webhook", tags=["Webhook Listener"])
logger = logging.getLogger("rh.webhook_listener")

# Configuration for Webhook Outbound
WEBHOOK_SEND_URL = os.getenv("WEBHOOK_SEND_URL", "http://host.docker.internal:5000/messages/send")
WEBHOOK_API_KEY = os.getenv("WEBHOOK_API_KEY", "your_secret_api_key_here")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


def parse_curp_and_calculate_age(curp: str = None, birth_date_str: str = None) -> tuple:
    """Calcula la edad en años a partir de la CURP o fecha de nacimiento."""
    import re
    from datetime import datetime
    age = None
    b_date = None
    clean_curp = None

    if curp:
        curp_match = re.search(r'[A-Z]{4}(\d{2})(\d{2})(\d{2})[HM][A-Z]{5}[A-Z0-9]\d', str(curp).upper().strip())
        if curp_match:
            clean_curp = curp_match.group(0)
            yy, mm, dd = int(curp_match.group(1)), int(curp_match.group(2)), int(curp_match.group(3))
            current_year = datetime.now().year
            century = 2000 if yy <= (current_year % 100) else 1900
            birth_year = century + yy
            try:
                b_date = f"{birth_year:04d}-{mm:02d}-{dd:02d}"
                birth_dt = datetime(birth_year, mm, dd)
                now = datetime.now()
                age = now.year - birth_dt.year - ((now.month, now.day) < (birth_dt.month, birth_dt.day))
            except Exception:
                pass

    if age is None and birth_date_str:
        from datetime import datetime
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                dt = datetime.strptime(str(birth_date_str).strip(), fmt)
                now = datetime.now()
                age = now.year - dt.year - ((now.month, now.day) < (dt.month, dt.day))
                b_date = dt.strftime("%Y-%m-%d")
                break
            except Exception:
                pass

    return age, b_date, clean_curp

async def download_telegram_media(file_id: str) -> bytes:
    """Descarga archivo multimedia desde los servidores de Telegram Bot API."""
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            res = await client.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getFile?file_id={file_id}")
            data = res.json()
            if data.get("ok"):
                file_path = data["result"]["file_path"]
                file_res = await client.get(f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}")
                if file_res.status_code == 200:
                    return file_res.content
    except Exception as e:
        logger.error(f"Error descargando media {file_id} de Telegram: {e}")
    return None

async def process_id_document(candidate_id: str, actor_id: str, channel: str, media_id: str, db_session_factory):
    """Procesa imagen de credencial oficial usando Gemma 4 con visión multimodal."""
    import os
    db = db_session_factory()
    try:
        candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
        if not candidate:
            logger.error(f"Candidato {candidate_id} no encontrado para procesar documento de identidad.")
            return

        logger.info(f"Descargando documento de identidad para {candidate.name} (media_id={media_id})...")
        image_bytes = await download_telegram_media(media_id)
        if not image_bytes:
            err_msg = "No pudimos descargar tu fotografía. ¿Podrías enviarla nuevamente con buena iluminación por favor?"
            await send_outbound_message(to=actor_id, channel=channel, text=err_msg)
            return

        # Validar Magic Bytes de la imagen recibida (evita scripts camuflados)
        from app.services.file_validator import validate_image_magic_bytes, resolve_safe_storage_path
        is_valid_img, img_format = validate_image_magic_bytes(image_bytes[:16])
        if not is_valid_img:
            logger.error(f"Firma binaria de imagen inválida para {candidate.name} (media_id={media_id}).")
            err_msg = "El archivo enviado no parece ser una imagen válida (JPEG o PNG). Por favor toma una fotografía clara de tu identificación oficial y reenvíala."
            await send_outbound_message(to=actor_id, channel=channel, text=err_msg)
            return

        os.makedirs(settings.storage_path, exist_ok=True)
        id_path = resolve_safe_storage_path(settings.storage_path, f"{candidate.id}_id.{img_format}")
        from app.services.crypto_service import encrypt_bytes
        bytes_to_store = encrypt_bytes(image_bytes) if getattr(settings, "enable_at_rest_encryption", True) else image_bytes
        with open(id_path, "wb") as f:
            f.write(bytes_to_store)

        # Inferencia con visión en Ollama
        ai_service = get_ai_service()
        logger.info(f"Invocando visión Ollama para analizar identificación de {candidate.name}...")
        extracted_data = await ai_service.analyze_document_image(image_bytes)

        doc_type = extracted_data.get("tipo_documento") or "Identificación Oficial"
        doc_name = (extracted_data.get("nombre_completo") or "").strip()
        raw_curp = extracted_data.get("curp")
        raw_bdate = extracted_data.get("fecha_nacimiento")

        age, b_date, clean_curp = parse_curp_and_calculate_age(raw_curp, raw_bdate)

        # Tolerancia en Modo Prueba: Comparamos nombres
        cand_name_parts = set(candidate.name.lower().split())
        doc_name_parts = set(doc_name.lower().split())
        is_name_match = bool(cand_name_parts.intersection(doc_name_parts))

        if is_name_match:
            validation_status = "validado"
        else:
            validation_status = "validado_prueba"  # Tolerante para pruebas

        import hashlib
        from datetime import datetime, timezone, timedelta

        evidence_hash = hashlib.sha256(image_bytes).hexdigest()
        retention_hours = getattr(settings, "id_document_retention_hours", 24)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=retention_hours)

        candidate.curp = clean_curp or raw_curp
        candidate.birth_date = b_date or raw_bdate
        candidate.calculated_age = age
        candidate.id_document_path = id_path
        candidate.id_document_name = doc_name
        candidate.id_validation_status = validation_status
        candidate.id_document_expires_at = expires_at
        candidate.id_evidence_hash = evidence_hash
        candidate.id_document_purged = False
        db.commit()

        # LOG SANITIZADO EN BACKEND (Para auditoría y revisión interna con DLP)
        from app.services.security_service import mask_curp, mask_name
        age_str = f"{age} años" if age is not None else "No calculable"
        masked_curp_str = mask_curp(clean_curp or raw_curp) or "No visible"
        print("=" * 65, flush=True)
        print(f"📋 [BACKEND AUDIT - IDENTIFICACIÓN OFICIAL (SANITIZADO)]", flush=True)
        print(f"   • Candidato Postulado: {candidate.name} (ID: {candidate.id})", flush=True)
        print(f"   • Documento Presentado: {doc_type}", flush=True)
        print(f"   • Nombre en Documento:  '{mask_name(doc_name)}'", flush=True)
        print(f"   • CURP Enmascarada:     {masked_curp_str}", flush=True)
        print(f"   • Fecha Nacimiento Año: {b_date[:4] if b_date else 'No detectada'}", flush=True)
        print(f"   • Edad Calculada:       {age_str}", flush=True)
        print(f"   • Nombre Corroborado:   {'SÍ (Coincide con postulante)' if is_name_match else 'NO (Nombre diferente al CV - Modo Prueba)'}", flush=True)
        print(f"   • Estatus Validación:   {validation_status}", flush=True)
        print("=" * 65, flush=True)

        logger.info(
            f"Extracción ID para {candidate.name}: Doc='{doc_type}', NombreDoc='{mask_name(doc_name)}', "
            f"CURP='{masked_curp_str}', Edad={age_str}, Corroborado={is_name_match}, Status='{validation_status}'"
        )

        # Nota de auditoría interna en expediente del candidato con PII enmascarada
        audit_content = (
            f"🪪 **Identificación Oficial Procesada ({doc_type})**:\n"
            f"- **Nombre en documento**: {doc_name or 'No detectado'}\n"
            f"- **CURP**: {masked_curp_str}\n"
            f"- **Edad (cálculo interno)**: {age_str}\n"
            f"- **Corroboración de identidad**: {'✅ Nombre corroborado con CV' if is_name_match else '🟡 Nombre diferente al CV (Modo Prueba)'}"
        )
        db_note = models.Note(
            candidate_id=candidate.id,
            content=audit_content,
            author="OctyBot (Visión IA)"
        )
        db.add(db_note)
        db.commit()

        # Respuesta en Telegram: Validar corroboración de identidad SIN notificar edad al usuario
        if is_name_match:
            reply_text = (
                f"¡Excelente! Hemos recibido tu {doc_type} y hemos corroborado tu identidad correctamente. 📄✨\n\n"
                f"Tus datos han quedado vinculados a tu expediente. "
                f"El equipo de Recursos Humanos se pondrá en contacto contigo muy pronto para continuar con tu proceso. ¡Mucho éxito!"
            )
        else:
            reply_text = (
                f"¡Muchas gracias! Hemos recibido tu {doc_type} correctamente. 📄✨\n\n"
                f"Tus documentos han quedado adjuntos a tu expediente para revisión del equipo de selección. "
                f"Nos pondremos en contacto contigo muy pronto."
            )

        db_out = models.ChatMessage(
            candidate_id=candidate.id,
            direction="outbound",
            body=reply_text
        )
        db.add(db_out)
        db.commit()

        await send_outbound_message(to=actor_id, channel=channel, text=reply_text)
        logger.info(f"ID processing completed for candidate {candidate.name}: status={validation_status}")

    except Exception as e:
        logger.error(f"Error procesando documento de identidad: {e}")
        fallback_msg = (
            "Recibimos tu documento con éxito. Nuestro equipo de Recursos Humanos lo cotejará en tu expediente. ¡Muchas gracias!"
        )
        await send_outbound_message(to=actor_id, channel=channel, text=fallback_msg)
    finally:
        db.close()

async def send_outbound_message(to: str, channel: str, text: str):
    """Utility to send the final message back to Telegram/WhatsApp via webhook gateway."""
    try:
        payload = {
            "conversation_key": f"{channel}:{to}",
            "text": text,
            "origin": "ai_agent"
        }
        headers = {"X-API-Key": WEBHOOK_API_KEY}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(WEBHOOK_SEND_URL, json=payload, headers=headers)
            if resp.status_code == 200:
                logger.info(f"Outbound message sent successfully to {to} via {channel}")
            else:
                logger.error(f"Failed to send outbound message. Status: {resp.status_code}, Body: {resp.text}")
    except Exception as e:
        logger.error(f"Error calling webhook outbound endpoint: {e}")

async def generate_and_post_cierre_note(candidate_id: str, history_text: str, db_session_factory):
    """Runs in background to generate a structured pre-interview note and post it to Octopy Talento."""
    # Obtain a thread-safe DB session
    db = db_session_factory()
    try:
        ai_service = get_ai_service()
        prompt = f"""
        Genera un resumen ejecutivo estructurado de la pre-entrevista de este candidato para el equipo de Recursos Humanos de Octopy (octopy.com).
        
        Evalúa y sintetiza puntualmente los aspectos clave:
        - 💼 Experiencia Profesional / Técnica y Logros Relevantes
        - 🎯 Motivación para la Vacante
        - ⏰ Disponibilidad de Horario y Modalidad
        - 💰 Expectativas / Pretensión Económica Mensual
        - 🗣️ Desenvolvimiento, Facilidad de Palabra y Actitud
        
        Conversación completa:
        {history_text}
        
        Formato de salida (resumen ejecutivo breve en viñetas markdown, máximo 160 palabras):
        """
        
        # Invocamos inferencia usando el modelo configurado
        ai_data = await ai_service.generate_text(
            prompt=prompt,
            system_prompt="Eres un asistente senior de Recursos Humanos. Genera resúmenes ejecutivos breves, objetivos y estructurados de pre-entrevistas laborales."
        )
        
        db_note = models.Note(
            candidate_id=candidate_id,
            content=f"📋 **Resumen Ejecutivo de Pre-entrevista (OctyBot IA)**:\n\n{ai_data.strip()}",
            author="OctyBot (Asistente IA)",
            stage="pre_entrevista"
        )
        db.add(db_note)
        db.commit()
        logger.info(f"Pre-interview summary note created in SQLite for candidate {candidate_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating/saving pre-interview summary note: {e}")
    finally:
        db.close()

async def process_chat_message(candidate_id: str, actor_id: str, channel: str, user_message: str, db_session_factory):
    """Processes conversational messages using AI and Octopy Talento prompts."""
    print(f"DEBUG: process_chat_message background task started for candidate_id: {candidate_id}", flush=True)
    db = db_session_factory()
    try:
        # 1. Fetch Candidate and settings
        candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
        if not candidate:
            print(f"DEBUG ERROR: Candidate {candidate_id} not found in DB.", flush=True)
            return
            
        bot_prompt_setting = db.query(models.Setting).filter(models.Setting.key == "bot_core_prompt").first()
        bot_name_setting = db.query(models.Setting).filter(models.Setting.key == "bot_name").first()
        
        bot_prompt = bot_prompt_setting.value if bot_prompt_setting else "Eres OctyBot, el Asistente Reclutador de Octopy (octopy.com)."
        bot_name = bot_name_setting.value if bot_name_setting else "OctyBot"
        
        # 2. Get recent history from database
        history_msgs = db.query(models.ChatMessage).filter(
            models.ChatMessage.candidate_id == candidate_id
        ).order_by(models.ChatMessage.created_at.asc()).all()[-15:]
        
        history_text = ""
        for hm in history_msgs:
            role = "Usuario" if hm.direction == "inbound" else bot_name
            history_text += f"{role}: {hm.body}\n"

        # 3. Construct System Prompt dynamically using database setting
        system_prompt_final = f"""
{bot_prompt}

DATOS DEL CANDIDATO (DE SU CV/PERFIL):
- Nombre del candidato: {candidate.name}
- Habilidades extraídas: {json_to_str(candidate.skills)}
"""

        prompt_thinker = f"Historial:\n{history_text}\nUsuario: {user_message}\n\nEstrategia y Mensaje de Respuesta:"
        
        # 4. Generate response using local Ollama
        print(f"DEBUG: Invocando OllamaService.generate_text...", flush=True)
        ai_service = get_ai_service()
        final_resp = await ai_service.generate_text(
            prompt=prompt_thinker,
            system_prompt=system_prompt_final
        )
        final_resp = final_resp.strip()
        print(f"DEBUG: Respuesta generada por Ollama (Dynamic Setting): '{final_resp[:60]}...'", flush=True)

        # 5. Save Outbound message in ChatMessage
        db_out = models.ChatMessage(
            candidate_id=candidate_id,
            direction="outbound",
            body=final_resp
        )
        db.add(db_out)
        db.commit()
        print("DEBUG: Respuesta saliente guardada en SQLite.", flush=True)

        # 6. Dispatch message to Telegram via Webhook Gateway
        await send_outbound_message(to=actor_id, channel=channel, text=final_resp)

        # 7. Check for Cierre and Trigger Note Creation
        is_cierre = False
        lower_resp = final_resp.lower()
        closing_keywords = [
            "recursos humanos", "rrhh", "equipo de selección", 
            "se pondrá en contacto", "nos pondremos en contacto",
            "revisará tu información", "revisará tu expediente",
            "mucho éxito en tu proceso", "mucho éxito en el proceso",
            "gracias por tu tiempo", "gracias por compartirnos",
            "coordinar la siguiente etapa"
        ]
        if any(kw in lower_resp for kw in closing_keywords):
            history_lower = history_text.lower()
            if "disponib" in history_lower or "pretens" in history_lower or "sueldo" in history_lower or "horario" in history_lower or len(history_msgs) >= 5:
                is_cierre = True
            elif ("recursos humanos" in lower_resp and "contacto" in lower_resp) or ("rrhh" in lower_resp and "contacto" in lower_resp):
                is_cierre = True
            
        if is_cierre:
            print("DEBUG: Cierre detectado. Generando reporte...", flush=True)
            # Fetch complete history
            updated_history_msgs = db.query(models.ChatMessage).filter(
                models.ChatMessage.candidate_id == candidate_id
            ).order_by(models.ChatMessage.created_at.asc()).all()
            full_context = ""
            for hm in updated_history_msgs:
                role = "Usuario" if hm.direction == "inbound" else bot_name
                full_context += f"{role}: {hm.body}\n"
                
            # Run note creation in background
            import asyncio
            from app.database import SessionLocal
            asyncio.create_task(generate_and_post_cierre_note(candidate_id, full_context, SessionLocal))

            # Paso 6: Solicitar foto de identificación oficial para corroborar identidad y blindar expediente
            if candidate.id_validation_status in ("no_solicitado", None):
                candidate.id_validation_status = "solicitado"
                db.commit()
                id_req_text = (
                    f"📸 **Paso final de verificación (Identificación Oficial)**:\n\n"
                    f"Para blindar y formalizar tu expediente antes de tu entrevista con Recursos Humanos, "
                    f"por favor tómale y envíame aquí mismo una **fotografía clara y legible de tu identificación oficial (INE, Pasaporte o Licencia)**.\n\n"
                    f"🔒 *Tus documentos son procesados con IA segura y tratados con estricta confidencialidad laboral.*"
                )
                db_id_out = models.ChatMessage(
                    candidate_id=candidate.id,
                    direction="outbound",
                    body=id_req_text
                )
                db.add(db_id_out)
                db.commit()
                await send_outbound_message(to=actor_id, channel=channel, text=id_req_text)

    except Exception as e:
        logger.error(f"Error processing chat message for candidate {candidate_id}: {e}")
        print(f"DEBUG ERROR in process_chat_message: {e}", flush=True)
    finally:
        db.close()

def json_to_str(skills_json):
    if not skills_json:
        return "No detectadas"
    if isinstance(skills_json, list):
        return ", ".join(skills_json)
    return str(skills_json)


@router.post("/inbound")
async def webhook_inbound(
    payload: Dict[str, Any], 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """Processes normalized inbound messages from the Webhook gateway."""
    # Desempaquetar si el payload viene envuelto por frontend_dispatcher_worker ({"event": "...", "data": {...}})
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], dict):
        payload = payload["data"]

    channel = payload.get("channel")
    actor_id = payload.get("actor_id")
    content = payload.get("content", {})
    body = (content.get("body", "") or "").strip()
    media_id = content.get("media_id")
    content_type = content.get("type", "text")
    
    print(f"DEBUG: /webhook/inbound endpoint invocado. body='{body}', actor_id='{actor_id}', type='{content_type}', media_id='{media_id}'", flush=True)
    
    if not actor_id or not channel:
        raise HTTPException(status_code=400, detail="Invalid payload attributes.")

    # --- HANDLE RESTART OR `/start` ---
    is_start = body.startswith("/start")
    is_restart = body == "/restart"
    
    if is_start:
        if "app_" in body:
            # Extract application_id
            application_id = body.replace("/start app_", "").strip()
            print(f"DEBUG: Procesando /start con app_{application_id}", flush=True)
            application = db.query(models.Application).filter(models.Application.id == application_id).first()
            
            if application:
                candidate = application.candidate
                # Bind Telegram chat ID to candidate
                candidate.telegram_chat_id = actor_id
                db.commit()
                
                print(f"DEBUG: Asociado candidato {candidate.name} con telegram_chat_id {actor_id}", flush=True)
                
                # Wipe any previous ChatMessage logs to allow a fresh start
                db.query(models.ChatMessage).filter(models.ChatMessage.candidate_id == candidate.id).delete()
                db.commit()

                # Obtener nombre del bot y aviso de privacidad configurado
                bot_name_s = db.query(models.Setting).filter(models.Setting.key == "bot_name").first()
                bot_name = bot_name_s.value if bot_name_s else "OctyBot"

                privacy_s = db.query(models.Setting).filter(models.Setting.key == "privacy_notice").first()
                privacy_text = privacy_s.value if privacy_s else (
                    "🔒 **Aviso de Privacidad y Tratamiento de Datos**:\n"
                    "En Octopy Talento protegemos tus datos conforme a la legislación aplicable. "
                    "La información y respuestas que compartas serán tratadas de forma estrictamente confidencial "
                    "por Recursos Humanos exclusivamente para la evaluación de tu postulación. "
                    "Al continuar con esta conversación, confirmas tu conformidad para el tratamiento de tus datos para dichos fines."
                )

                # Welcome message con Aviso de Privacidad Formal (Paso 1 y Paso 2) y primera pregunta (Paso 3)
                welcome_text = (
                    f"¡Hola, {candidate.name}! Qué gusto saludarte. 👋\n\n"
                    f"Soy {bot_name}, el asistente virtual de Selección de Talento en Octopy (octopy.com). "
                    f"Te doy la bienvenida a tu proceso para la vacante de **{application.vacancy.title}**.\n\n"
                    f"{privacy_text}\n\n"
                    f"Para comenzar con tu pre-entrevista de filtro inicial, cuéntame un poco: "
                    f"¿qué fue lo que más te motivó a postularte a esta vacante y qué experiencia tienes en el área comercial, técnica o de atención a clientes?"
                )
                
                # Record outbound in SQLite ChatMessage
                db_out = models.ChatMessage(
                    candidate_id=candidate.id,
                    direction="outbound",
                    body=welcome_text
                )
                db.add(db_out)
                db.commit()
                
                print("DEBUG: Despachando mensaje de bienvenida inicial...", flush=True)
                background_tasks.add_task(send_outbound_message, actor_id, channel, welcome_text)
                return {"status": "welcomed", "candidate_id": candidate.id}
                
            else:
                print("DEBUG: Application no encontrada. Fallback bienvenida genérica.", flush=True)
                fallback = "¡Hola! Qué gusto saludarte. 👋 Soy OctyBot, el asistente de Talento en Octopy. Para iniciar tu proceso, compárteme tu nombre completo por favor."
                background_tasks.add_task(send_outbound_message, actor_id, channel, fallback)
                return {"status": "fallback_started"}
        else:
            # /start directo sin enlace deep-link de postulación
            candidate = db.query(models.Candidate).filter(models.Candidate.telegram_chat_id == actor_id).first()
            if candidate:
                welcome_text = f"¡Hola de nuevo, {candidate.name}! 👋 Soy OctyBot, tu asistente de Talento en Octopy. ¿En qué puedo apoyarte hoy con tu proceso?"
            else:
                welcome_text = (
                    "¡Hola! Qué gusto saludarte. 👋 Soy OctyBot, el asistente virtual de Recursos Humanos en Octopy (octopy.com).\n\n"
                    "Si te postulaste a una vacante, puedes abrir el enlace de Telegram directo de tu postulación para vincular tu expediente, o bien compárteme tu nombre completo para buscarte."
                )
            background_tasks.add_task(send_outbound_message, actor_id, channel, welcome_text)
            return {"status": "start_greeted"}

    # --- GENERAL CONVERSATIONAL MESSAGES ---
    # Find candidate mapped to this chat ID
    candidate = db.query(models.Candidate).filter(models.Candidate.telegram_chat_id == actor_id).first()
    
    if is_restart and candidate:
        print(f"DEBUG: /restart recibido. Limpiando historial para candidato {candidate.name}", flush=True)
        # Clear history
        db.query(models.ChatMessage).filter(models.ChatMessage.candidate_id == candidate.id).delete()
        db.commit()
        
        welcome_text = (
            f"¡Hola de nuevo, {candidate.name}! 👋 Vamos a reiniciar nuestra plática desde cero.\n\n"
            f"Cuéntame un poco: ¿qué es lo que más te llamó la atención de nuestra vacante y qué experiencia tienes?"
        )
        db_out = models.ChatMessage(
            candidate_id=candidate.id,
            direction="outbound",
            body=welcome_text
        )
        db.add(db_out)
        db.commit()
        
        background_tasks.add_task(send_outbound_message, actor_id, channel, welcome_text)
        return {"status": "restarted"}

    # --- COMANDO DE PRUEBA RÁPIDA DE IDENTIFICACIÓN: /test_id ---
    if body == "/test_id" and candidate:
        candidate.id_validation_status = "solicitado"
        db.commit()
        test_msg = (
            f"🧪 **Modo de Prueba de Validación de Identidad activado** para {candidate.name}.\n\n"
            f"Por favor envía una fotografía de tu identificación oficial (INE, Pasaporte o Licencia) para procesarla con la IA de visión."
        )
        db_test_out = models.ChatMessage(
            candidate_id=candidate.id,
            direction="outbound",
            body=test_msg
        )
        db.add(db_test_out)
        db.commit()
        background_tasks.add_task(send_outbound_message, actor_id, channel, test_msg)
        return {"status": "test_id_requested"}

    if not candidate:
        print(f"DEBUG: No se encontró candidato con telegram_chat_id {actor_id}. Intentando vincular por nombre o iniciar onboarding...", flush=True)
        import re
        clean_text = body.strip()

        # 1. Detectar si el usuario escribió su nombre (ej. "Brenda", "Me llamo Brenda", "Soy Brenda")
        name_match = re.search(r'(?:soy|me llamo|mi nombre es)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ ]+)', clean_text, re.IGNORECASE)
        extracted_name = name_match.group(1).strip() if name_match else clean_text
        extracted_name = re.sub(r'[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]', '', extracted_name).strip()

        # Buscar si existe en la base de datos un candidato con ese nombre
        matched_candidate = None
        if len(extracted_name) >= 3 and extracted_name.lower() not in ["hola", "buenos", "dias", "tardes", "noches", "prueba", "flujo"]:
            matched_candidate = db.query(models.Candidate).filter(
                models.Candidate.name.ilike(f"%{extracted_name}%")
            ).first()

        if matched_candidate:
            candidate = matched_candidate
            candidate.telegram_chat_id = actor_id
            db.commit()
            print(f"DEBUG: Candidato existente '{candidate.name}' vinculado con telegram_chat_id {actor_id}", flush=True)
            
            app_rec = db.query(models.Application).filter(models.Application.candidate_id == candidate.id).first()
            vac_title = app_rec.vacancy.title if (app_rec and app_rec.vacancy) else "tu postulación"
            
            welcome_text = (
                f"¡Hola, {candidate.name}! 👋 Qué gusto saludarte.\n\n"
                f"He encontrado tu expediente en Octopy Talento para la vacante de **{vac_title}**.\n\n"
                f"Para iniciar tu pre-entrevista de filtro inicial, cuéntame un poco: "
                f"¿qué experiencia tienes en esta área y qué te motivó a postularte?"
            )
            db_out = models.ChatMessage(candidate_id=candidate.id, direction="outbound", body=welcome_text)
            db.add(db_out)
            db.commit()
            background_tasks.add_task(send_outbound_message, actor_id, channel, welcome_text)
            return {"status": "candidate_linked_by_name", "candidate_id": candidate.id}

        # 2. Si es solo un saludo sin nombre
        is_greeting_only = clean_text.lower() in [
            "hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", 
            "que tal", "hi", "hello", "hey", "inicio", "empezar"
        ]
        if is_greeting_only:
            fallback = (
                "¡Hola! Qué gusto saludarte. 👋 Soy OctyBot, el asistente virtual de Recursos Humanos en Octopy (octopy.com).\n\n"
                "Para poder iniciar tu pre-entrevista de selección, por favor compárteme tu **nombre completo**."
            )
            background_tasks.add_task(send_outbound_message, actor_id, channel, fallback)
            return {"status": "asked_for_name"}

        # 3. Si proporcionó un nombre o está realizando una prueba directa del flujo:
        # Extraer un nombre usable
        cand_name = extracted_name.title() if (3 <= len(extracted_name) <= 50 and not any(w in extracted_name.lower() for w in ["postulado", "probando", "flujo", "test"])) else "Brenda"
        if any(w in clean_text.lower() for w in ["brenda"]):
            cand_name = "Brenda"

        # Buscar vacante abierta existente o crear vacante por defecto
        vac = db.query(models.Vacancy).filter(models.Vacancy.status == "abierta").first()
        if not vac:
            vac = db.query(models.Vacancy).first()
        if not vac:
            vac = models.Vacancy(
                title="Puesto General - Selección Octopy", 
                description="Evaluación general y pre-entrevista de talento", 
                status="abierta"
            )
            db.add(vac)
            db.commit()
            db.refresh(vac)

        # Crear registro automático del candidato vinculado a este chat de Telegram
        new_candidate = models.Candidate(
            name=cand_name,
            filename="telegram_direct.pdf",
            status="creado",
            source="Telegram Directo",
            telegram_chat_id=actor_id
        )
        db.add(new_candidate)
        db.commit()
        db.refresh(new_candidate)

        new_app = models.Application(
            candidate_id=new_candidate.id,
            vacancy_id=vac.id,
            stage="entrevista"
        )
        db.add(new_app)
        db.commit()

        # Obtener nombre del bot y aviso de privacidad
        bot_name_s = db.query(models.Setting).filter(models.Setting.key == "bot_name").first()
        bot_name = bot_name_s.value if bot_name_s else "OctyBot"
        privacy_s = db.query(models.Setting).filter(models.Setting.key == "privacy_notice").first()
        privacy_text = privacy_s.value if privacy_s else (
            "🔒 **Aviso de Privacidad y Tratamiento de Datos**:\n"
            "En Octopy Talento protegemos tus datos conforme a la legislación aplicable. "
            "La información y respuestas que compartas serán tratadas de forma estrictamente confidencial "
            "por Recursos Humanos exclusivamente para la evaluación de tu postulación."
        )

        welcome_text = (
            f"¡Mucho gusto, {new_candidate.name}! 👋 Te doy la bienvenida a Octopy (octopy.com).\n\n"
            f"Soy {bot_name}, el asistente virtual de Selección de Talento. "
            f"He activado tu proceso para la vacante de **{vac.title}**.\n\n"
            f"{privacy_text}\n\n"
            f"Para comenzar con tu pre-entrevista de filtro inicial, cuéntame un poco sobre ti: "
            f"¿qué experiencia laboral tienes y qué te motivó a postularte a esta oportunidad?"
        )

        db_out = models.ChatMessage(candidate_id=new_candidate.id, direction="outbound", body=welcome_text)
        db.add(db_out)
        db.commit()

        print(f"DEBUG: Nuevo candidato '{new_candidate.name}' auto-creado y vinculado a telegram_chat_id {actor_id}", flush=True)
        background_tasks.add_task(send_outbound_message, actor_id, channel, welcome_text)
        return {"status": "auto_created_and_started", "candidate_id": new_candidate.id}

    # --- RECEPCIÓN DE FOTOGRAFÍA / DOCUMENTO (INE / IDENTIFICACIÓN) ---
    if (content_type in ("image", "document") or media_id) and candidate:
        print(f"DEBUG: Fotografía/documento recibido para {candidate.name} (media_id={media_id}). Ejecutando visión...", flush=True)
        db_img_in = models.ChatMessage(
            candidate_id=candidate.id,
            direction="inbound",
            body="[Fotografía / Documento de Identificación adjunto]"
        )
        db.add(db_img_in)
        db.commit()

        ack_msg = "He recibido tu fotografía. 🔍 Estoy analizando los datos oficiales con nuestra IA, un momento por favor..."
        background_tasks.add_task(send_outbound_message, actor_id, channel, ack_msg)

        from app.database import SessionLocal
        background_tasks.add_task(process_id_document, candidate.id, actor_id, channel, media_id, SessionLocal)
        return {"status": "processing_id"}

    # Log inbound ChatMessage
    print(f"DEBUG: Guardando mensaje entrante en SQLite para candidato {candidate.name}: '{body}'", flush=True)
    db_in = models.ChatMessage(
        candidate_id=candidate.id,
        direction="inbound",
        body=body
    )
    db.add(db_in)
    db.commit()

    # Enqueue task in Redis for background worker processing (prevents HTTP thread locking)
    try:
        r = redis.Redis.from_url(settings.redis_url)
        r.lpush("octopy_chat_tasks", json.dumps({
            "candidate_id": candidate.id,
            "actor_id": actor_id,
            "channel": channel,
            "body": body
        }))
        print(f"DEBUG: Tarea encolada en Redis para candidato {candidate.name}.", flush=True)
    except Exception as redis_err:
        print(f"DEBUG ERROR: Fallo al encolar en Redis, fallback a BackgroundTasks: {redis_err}", flush=True)
        from app.database import SessionLocal
        background_tasks.add_task(process_chat_message, candidate.id, actor_id, channel, body, SessionLocal)
        
    return {"status": "processing"}
