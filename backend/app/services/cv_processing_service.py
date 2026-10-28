import os
import logging
from fastapi import UploadFile
from sqlalchemy.orm import Session
from pypdf import PdfReader
from app.config import settings
from app.services.ai_service import get_ai_service, get_active_model_name
import app.models as models

logger = logging.getLogger("rh.cv_processing_service")

class CVProcessingService:
    """
    Servicio encargado de gestionar el ciclo de vida físico de los archivos PDF
    y de la extracción de texto plano.
    """

    @staticmethod
    def save_file(file: UploadFile, candidate_id: str) -> str:
        """
        Guarda el archivo subido en el almacenamiento persistente usando el UUID del candidato.
        
        Args:
            file: Archivo subido por el usuario.
            candidate_id: UUID único del candidato.
            
        Returns:
            str: Ruta completa donde se guardó el archivo.
        """
        os.makedirs(settings.storage_path, exist_ok=True)
        from app.services.file_validator import resolve_safe_storage_path
        from app.services.crypto_service import encrypt_bytes
        file_path = resolve_safe_storage_path(settings.storage_path, f"{candidate_id}.pdf")
        
        raw_content = file.file.read()
        if getattr(settings, "enable_at_rest_encryption", True):
            content_to_write = encrypt_bytes(raw_content)
        else:
            content_to_write = raw_content

        logger.info(f"Guardando archivo PDF en: {file_path}")
        with open(file_path, "wb") as buffer:
            buffer.write(content_to_write)
                
        return file_path

    @staticmethod
    def extract_text(file_path: str) -> str:
        """
        Extrae el texto plano de un archivo PDF usando la librería PyPDF,
        descifrando en memoria si el archivo está protegido en reposo.
        
        Args:
            file_path: Ruta del archivo PDF en disco.
            
        Returns:
            str: Texto plano extraído.
        """
        import io
        from app.services.crypto_service import decrypt_bytes

        logger.info(f"Extrayendo texto del PDF: {file_path}")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"No existe el archivo en la ruta: {file_path}")
            
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        plain_pdf_bytes = decrypt_bytes(file_bytes)
        reader = PdfReader(io.BytesIO(plain_pdf_bytes))
        extracted_pages = []
        
        for idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                extracted_pages.append(text)
            else:
                logger.warning(f"No se pudo extraer texto de la página {idx + 1} en {file_path}")
                
        full_text = "\n\n".join(extracted_pages).strip()
        if not full_text:
            raise ValueError("El archivo PDF parece estar vacío o no contiene capas de texto legibles.")
            
        return full_text

    @classmethod
    async def process_cv_async(cls, candidate_id: str, file_path: str, db_session_factory):
        """
        Tarea en segundo plano para procesar el CV:
        1. Extrae el texto plano del PDF.
        2. Llama a Ollama (Gemma) para extraer datos de contacto y habilidades.
        3. Persiste toda la información y gestiona logs de auditoría en la BD.
        """
        print(f"DEBUG: Tarea process_cv_async iniciada para el candidato {candidate_id}.", flush=True)
        db: Session = db_session_factory()
        
        # --- PASO 1: LECTURA DE PDF ---
        try:
            print(f"DEBUG: Registrando log de inicio lectura_pdf...", flush=True)
            log_start = models.ProcessingLog(
                candidate_id=candidate_id,
                step="lectura_pdf",
                status="procesando",
                message="Iniciando extracción de texto del archivo PDF."
            )
            db.add(log_start)
            db.commit()
            print(f"DEBUG: Log inicio lectura_pdf guardado con éxito. Extrayendo texto...", flush=True)
            
            text = cls.extract_text(file_path)
            print(f"DEBUG: Texto extraído ({len(text)} caracteres). Buscando candidato...", flush=True)
            
            candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
            if not candidate:
                raise ValueError("Candidato no encontrado en la base de datos al extraer texto.")
                
            candidate.raw_text = text
            
            log_success = models.ProcessingLog(
                candidate_id=candidate_id,
                step="lectura_pdf",
                status="exito",
                message=f"Texto extraído con éxito ({len(text)} caracteres)."
            )
            db.add(log_success)
            db.commit()
            print(f"DEBUG: Paso 1 completado con éxito.", flush=True)
            logger.info(f"Texto extraído del candidato {candidate_id} y guardado.")
            
        except Exception as e:
            print(f"DEBUG: Error en paso de lectura de PDF: {str(e)}", flush=True)
            logger.error(f"Error en paso de lectura de PDF para {candidate_id}: {str(e)}")
            db.rollback()
            candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
            if candidate:
                candidate.status = "error"
            log_error = models.ProcessingLog(
                candidate_id=candidate_id,
                step="lectura_pdf",
                status="error",
                message=f"Fallo en lectura de PDF: {str(e)}"
            )
            db.add(log_error)
            db.commit()
            db.close()
            return

        # --- PASO 2: EXTRACCIÓN CON IA (GEMMA) ---
        try:
            print(f"DEBUG: Iniciando paso de extracción IA...", flush=True)
            log_ai_start = models.ProcessingLog(
                candidate_id=candidate_id,
                step="extraccion_ia",
                status="procesando",
                message=f"Enviando texto al LLM ({get_active_model_name()}) para estructuración de datos."
            )
            db.add(log_ai_start)
            db.commit()
            print(f"DEBUG: Log inicio extracción IA guardado. Preparando consulta...", flush=True)
            
            prompt = (
                f"Analiza el siguiente texto extraído de un Curriculum Vitae y extrae los datos de contacto y habilidades clave.\n\n"
                f"Texto del CV:\n"
                f"\"\"\"\n{text}\n\"\"\""
            )
            schema_desc = (
                "{\n"
                '  "nombre_completo": "Nombre completo del candidato (encontrado generalmente al inicio del documento)",\n'
                '  "email": "Correo electrónico principal del candidato o null si no se encuentra",\n'
                '  "telefono": "Teléfono de contacto o null si no se encuentra",\n'
                '  "habilidades": ["Lista de hasta 10 habilidades técnicas, tecnologías o competencias clave descritas en el CV"]\n'
                "}"
            )
            
            print(f"DEBUG: Llamando a OllamaService...", flush=True)
            ai_service = get_ai_service()
            ai_data = await ai_service.generate_json(prompt, schema_desc)
            print(f"DEBUG: Respuesta de Ollama recibida: {ai_data}", flush=True)
            
            # Recargar al candidato para evitar problemas de sesión desfasada
            candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
            
            # Guardar resultados
            extracted_name = ai_data.get("nombre_completo")
            print(f"DEBUG: Nombre extraído: {extracted_name}", flush=True)
            if extracted_name and extracted_name.strip():
                candidate.name = extracted_name.strip()
                
            candidate.email = ai_data.get("email")
            candidate.phone = ai_data.get("telefono")
            candidate.skills = ai_data.get("habilidades", [])
            candidate.status = "completado"
            
            log_ai_success = models.ProcessingLog(
                candidate_id=candidate_id,
                step="extraccion_ia",
                status="exito",
                message="Información del candidato estructurada e insertada correctamente por Gemma."
            )
            db.add(log_ai_success)
            db.commit()
            logger.info(f"Procesamiento IA del candidato {candidate_id} finalizado con éxito.")
            
        except Exception as e:
            logger.error(f"Error en paso de extracción de IA para {candidate_id}: {str(e)}")
            db.rollback()
            candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
            if candidate:
                candidate.status = "error"
            log_ai_error = models.ProcessingLog(
                candidate_id=candidate_id,
                step="extraccion_ia",
                status="error",
                message=f"Fallo en procesamiento de IA: {str(e)}"
            )
            db.add(log_ai_error)
            db.commit()
        finally:
            db.close()
