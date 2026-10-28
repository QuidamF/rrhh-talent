import uuid
import time
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services.ai_service import get_ai_service, get_active_model_name

logger = logging.getLogger("rh.simulator")

router = APIRouter(prefix="/simulator", tags=["Simulator"])

# Almacén de sesiones en memoria para el Sandbox
SIMULATOR_SESSIONS: Dict[str, Dict[str, Any]] = {}

def clean_expired_sessions():
    """Limpia sesiones con más de 2 horas de inactividad."""
    now = time.time()
    expired = [sid for sid, data in SIMULATOR_SESSIONS.items() if now - data.get("last_activity", now) > 7200]
    for sid in expired:
        SIMULATOR_SESSIONS.pop(sid, None)

class StartSimulatorRequest(BaseModel):
    candidate_id: Optional[str] = None
    mock_name: Optional[str] = "Carlos Mendoza Silva"
    mock_vacancy: Optional[str] = "Asesor Comercial Senior"
    mock_skills: Optional[List[str]] = ["Ventas consultivas", "Prospección", "Negociación", "Cierre comercial"]
    mock_experience: Optional[str] = "4 años de experiencia en ventas de servicios financieros y cambaceo. Logro de metas al 120%."

class SendSimulatorMessageRequest(BaseModel):
    session_id: str
    message: str

def detect_step_from_history(history: List[Dict[str, str]], last_reply: str, is_closed: bool, id_uploaded: bool) -> int:
    """Calcula la fase del embudo del 1 al 6."""
    if id_uploaded:
        return 6
    if is_closed:
        return 5
    
    # Evaluar por contenido en el historial
    text_corpus = " ".join([m.get("body", "").lower() for m in history]) + " " + last_reply.lower()
    
    if "disponib" in text_corpus or "pretens" in text_corpus or "sueldo" in text_corpus or "horario" in text_corpus:
        return 4
    if len(history) >= 2:
        return 3
    return 2


@router.post("/start")
async def start_simulator(request: StartSimulatorRequest, db: Session = Depends(get_db)):
    """
    Inicializa una sesión en el Sandbox para emular el inicio de conversación de Telegram (/start).
    Carga el perfil (real o mock) y genera el saludo con Aviso de Privacidad y primera pregunta.
    """
    clean_expired_sessions()
    session_id = str(uuid.uuid4())
    
    # 1. Determinar datos del candidato
    candidate_data = {
        "id": None,
        "name": request.mock_name or "Carlos Mendoza Silva",
        "vacancy": request.mock_vacancy or "Asesor Comercial",
        "skills": request.mock_skills or ["Ventas", "Atención a clientes"],
        "experience": request.mock_experience or "Experiencia comercial previa en prospección y ventas directas."
    }
    
    if request.candidate_id:
        cand = db.query(models.Candidate).filter(models.Candidate.id == request.candidate_id).first()
        if cand:
            vac_title = "Asesor Comercial"
            if cand.applications:
                primary_app = cand.applications[0]
                if primary_app.vacancy:
                    vac_title = primary_app.vacancy.title
            
            skills = cand.skills if isinstance(cand.skills, list) else []
            candidate_data = {
                "id": cand.id,
                "name": cand.name,
                "vacancy": vac_title,
                "skills": skills,
                "experience": cand.extracted_text[:400] if cand.extracted_text else "Sin extracto de CV."
            }
            
    # 2. Obtener configuraciones vigentes de OctyBot
    bot_name_s = db.query(models.Setting).filter(models.Setting.key == "bot_name").first()
    bot_name = bot_name_s.value if bot_name_s else "OctyBot"
    
    privacy_s = db.query(models.Setting).filter(models.Setting.key == "privacy_notice").first()
    privacy_notice = privacy_s.value if privacy_s else (
        "🔒 **Aviso de Privacidad y Tratamiento de Datos Personales Laborales**:\n"
        "En Octopy protegemos tus datos conforme a la legislación aplicable. "
        "La información compartida será tratada de forma estrictamente confidencial por Recursos Humanos exclusivamente para la evaluación de tu postulación."
    )
    
    bot_prompt_s = db.query(models.Setting).filter(models.Setting.key == "bot_core_prompt").first()
    bot_core_prompt = bot_prompt_s.value if bot_prompt_s else "Eres OctyBot, reclutador de Octopy (octopy.com)."
    
    # 3. Construir mensaje de bienvenida idéntico a Telegram
    welcome_text = (
        f"¡Hola, {candidate_data['name']}! Qué gusto saludarte. 👋\n\n"
        f"Soy {bot_name}, el asistente virtual de Selección de Talento en Octopy (octopy.com). "
        f"Te doy la bienvenida a tu proceso para la vacante de **{candidate_data['vacancy']}**.\n\n"
        f"{privacy_notice}\n\n"
        f"Para comenzar con tu pre-entrevista de filtro inicial, cuéntame un poco: "
        f"¿qué fue lo que más te motivó a postularte a esta vacante y qué experiencia tienes en el área comercial, tecnológica o de atención a clientes?"
    )
    
    # 4. Guardar sesión en memoria
    history = [
        {"role": "assistant", "body": welcome_text, "timestamp": time.time()}
    ]
    
    SIMULATOR_SESSIONS[session_id] = {
        "session_id": session_id,
        "candidate": candidate_data,
        "bot_name": bot_name,
        "bot_core_prompt": bot_core_prompt,
        "history": history,
        "is_closed": False,
        "executive_summary": None,
        "extracted_id_data": None,
        "last_activity": time.time()
    }
    
    return {
        "session_id": session_id,
        "bot_name": bot_name,
        "candidate": candidate_data,
        "welcome_message": welcome_text,
        "detected_step": 2,
        "history": history
    }


@router.post("/message")
async def send_simulator_message(request: SendSimulatorMessageRequest, db: Session = Depends(get_db)):
    """
    Procesa un mensaje del usuario simulado y ejecuta la inferencia en tiempo real usando Ollama.
    """
    clean_expired_sessions()
    session = SIMULATOR_SESSIONS.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión de simulación no encontrada o expirada. Inicia una nueva sesión.")
    
    session["last_activity"] = time.time()
    user_text = request.message.strip()
    
    # Registrar mensaje entrante en historial
    session["history"].append({
        "role": "user",
        "body": user_text,
        "timestamp": time.time()
    })
    
    # Re-obtener prompt core actualizado de la base de datos
    bot_prompt_s = db.query(models.Setting).filter(models.Setting.key == "bot_core_prompt").first()
    bot_prompt = bot_prompt_s.value if bot_prompt_s else session["bot_core_prompt"]
    bot_name = session["bot_name"]
    candidate = session["candidate"]
    
    # Construir historial para el contexto del LLM
    history_text = ""
    for m in session["history"][-12:]:
        author = "Usuario" if m["role"] == "user" else bot_name
        history_text += f"{author}: {m['body']}\n"
        
    system_prompt = f"""
{bot_prompt}

DATOS DEL CANDIDATO (DE SU CV/PERFIL):
- Nombre del candidato: {candidate['name']}
- Vacante postulada: {candidate['vacancy']}
- Habilidades detectadas: {', '.join(candidate['skills']) if isinstance(candidate['skills'], list) else candidate['skills']}
- Resumen laboral: {candidate['experience']}
""".strip()

    prompt_thinker = f"Historial de la conversación:\n{history_text}\nUsuario: {user_text}\n\nEstrategia y Mensaje de Respuesta de {bot_name}:"
    
    ai_service = get_ai_service()
    start_time = time.time()
    
    try:
        reply_text = await ai_service.generate_text(
            prompt=prompt_thinker,
            system_prompt=system_prompt
        )
        reply_text = reply_text.strip()
    except Exception as e:
        logger.error(f"Error en inferencia de simulador: {e}")
        reply_text = f"Disculpa, ocurrió un error al procesar tu respuesta con el motor de IA local ({str(e)}). Verifica que Ollama esté activo."
        
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Registrar respuesta saliente
    session["history"].append({
        "role": "assistant",
        "body": reply_text,
        "timestamp": time.time()
    })
    
    # Detección de Cierre (Paso 5)
    lower_reply = reply_text.lower()
    closing_keywords = [
        "recursos humanos", "rrhh", "equipo de selección", 
        "se pondrá en contacto", "nos pondremos en contacto",
        "revisará tu información", "revisará tu expediente",
        "mucho éxito en tu proceso", "mucho éxito en el proceso",
        "gracias por tu tiempo", "gracias por compartirnos",
        "coordinar la siguiente etapa"
    ]
    
    is_cierre = False
    if any(kw in lower_reply for kw in closing_keywords):
        history_lower = history_text.lower()
        if "disponib" in history_lower or "pretens" in history_lower or "sueldo" in history_lower or "horario" in history_lower or len(session["history"]) >= 6:
            is_cierre = True
        elif ("recursos humanos" in lower_reply and "contacto" in lower_reply) or ("rrhh" in lower_reply and "contacto" in lower_reply):
            is_cierre = True
            
    executive_summary = session.get("executive_summary")
    
    # Si detecta cierre y aún no se había generado el resumen ejecutivo:
    if is_cierre and not session.get("is_closed"):
        session["is_closed"] = True
        try:
            summary_prompt = f"""
Genera una NOTA EJECUTIVA ESTRUCTURADA de la siguiente pre-entrevista realizada por OctyBot (IA) al candidato {candidate['name']} para la vacante {candidate['vacancy']}.
Extrae y resume en viñetas claras los siguientes puntos clave:
- 💼 Experiencia Profesional / Técnica y Mayores Logros
- 🎯 Motivación para integrarse a Octopy
- ⏱️ Disponibilidad de Horario
- 💰 Expectativas / Pretensión Económica Mensual
- 🗣️ Desenvolvimiento, Facilidad de Palabra y Actitud

Conversación completa:
{history_text}

Formato de salida (resumen ejecutivo breve en viñetas markdown, máximo 160 palabras):
""".strip()
            summary_data = await ai_service.generate_text(
                prompt=summary_prompt,
                system_prompt="Eres un asistente senior de Recursos Humanos. Genera resúmenes ejecutivos breves, objetivos y estructurados de pre-entrevistas laborales."
            )
            executive_summary = summary_data.strip()
            session["executive_summary"] = executive_summary
        except Exception as se:
            logger.error(f"Error generando resumen en sandbox: {se}")
            executive_summary = f"No se pudo generar la nota ejecutiva: {se}"
            
    detected_step = detect_step_from_history(
        session["history"], 
        reply_text, 
        session.get("is_closed", False), 
        session.get("extracted_id_data") is not None
    )
    
    return {
        "reply": reply_text,
        "is_cierre": session.get("is_closed", False),
        "detected_step": detected_step,
        "executive_summary": executive_summary,
        "latency_ms": duration_ms,
        "system_prompt_used": system_prompt,
        "history": session["history"]
    }


@router.post("/upload-id")
async def upload_simulator_id(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Recibe la imagen de la identificación oficial, corre el motor de visión multimodal
    de Ollama y coteja los datos contra el candidato de la sesión activa en el Sandbox.
    """
    clean_expired_sessions()
    session = SIMULATOR_SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión de simulación no encontrada o expirada.")
        
    session["last_activity"] = time.time()
    
    # Validar extensión
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    import os
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Formato de archivo '{ext}' no permitido. Sube una imagen (JPG, PNG, WebP).")
        
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen excede el límite de 10 MB.")
        
    ai_service = get_ai_service()
    start_time = time.time()
    
    try:
        extracted = await ai_service.analyze_document_image(image_bytes)
    except Exception as e:
        logger.error(f"Error en visión multimodal del simulador: {e}")
        raise HTTPException(status_code=500, detail=f"Error en visión multimodal: {str(e)}")
        
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Cotejar nombre
    candidate_name = session["candidate"]["name"]
    doc_name = (extracted.get("nombre_completo") or "").strip()
    
    name_match = False
    if doc_name and candidate_name:
        cand_parts = set(candidate_name.upper().split())
        doc_parts = set(doc_name.upper().split())
        common = cand_parts.intersection(doc_parts)
        if len(common) >= 2 or (len(cand_parts) == 1 and len(common) >= 1):
            name_match = True
            
    # Calcular edad a partir de fecha de nacimiento si viene
    birth_date_str = extracted.get("fecha_nacimiento")
    calculated_age = None
    if birth_date_str:
        import datetime
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                dt = datetime.datetime.strptime(birth_date_str.strip(), fmt).date()
                today = datetime.date.today()
                calculated_age = today.year - dt.year - ((today.month, today.day) < (dt.month, dt.day))
                break
            except Exception:
                continue
                
    extracted_summary = {
        "tipo_documento": extracted.get("tipo_documento", "INE"),
        "nombre_completo": doc_name,
        "curp": extracted.get("curp"),
        "fecha_nacimiento": birth_date_str,
        "sexo": extracted.get("sexo"),
        "calculated_age": calculated_age,
        "name_match": name_match,
        "status": "valido" if name_match else "discrepancia_detectada"
    }
    
    session["extracted_id_data"] = extracted_summary
    
    # Generar respuesta de Samanta ante la recepción de la identificación
    bot_reply = (
        f"¡Muchas gracias por compartir tu {extracted_summary['tipo_documento']}, {candidate_name}! 🪪✨\n\n"
        f"He validado tu documento con éxito:\n"
        f"• **CURP**: `{extracted_summary['curp'] or 'Detectada'}`\n"
        f"• **Edad calculada**: {calculated_age if calculated_age else 'Registrada'}\n"
        f"• **Estatus de cotejo**: {'✅ Nombre verificado correctamente' if name_match else '⚠️ Nombre en credencial requiere validación manual por RH'}\n\n"
        f"Tu expediente laboral ha quedado debidamente blindado para la siguiente etapa con Recursos Humanos. ¡Mucho éxito!"
    )
    
    session["history"].append({
        "role": "user",
        "body": f"📷 [Foto de Identificación Oficial adjuntada: {file.filename}]",
        "timestamp": time.time()
    })
    session["history"].append({
        "role": "assistant",
        "body": bot_reply,
        "timestamp": time.time()
    })
    
    return {
        "extracted_data": extracted_summary,
        "bot_reply": bot_reply,
        "latency_ms": duration_ms,
        "detected_step": 6,
        "history": session["history"]
    }


@router.post("/reset")
async def reset_simulator(session_id: str = Form(...)):
    """Limpia la sesión de simulación activa."""
    if session_id in SIMULATOR_SESSIONS:
        SIMULATOR_SESSIONS.pop(session_id)
    return {"status": "reset_successful"}
