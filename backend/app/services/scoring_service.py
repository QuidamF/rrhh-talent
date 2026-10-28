import logging
from sqlalchemy.orm import Session
from app.config import settings
from app.services.ai_service import get_ai_service, get_active_model_name
import app.models as models

logger = logging.getLogger("rh.scoring_service")

class ScoringService:
    """
    Servicio encargado de evaluar candidatos frente a vacantes específicas
    utilizando Gemma para obtener un score detallado y explicable.
    """

    @classmethod
    async def evaluate_candidate_async(cls, application_id: int, db_session_factory):
        """
        Tarea en segundo plano que:
        1. Carga los datos de la postulación, vacante y candidato.
        2. Llama a Gemma para calificar y justificar cada criterio de evaluación.
        3. Calcula la puntuación final ponderada según los pesos de la vacante.
        4. Actualiza la postulación y registra la auditoría.
        """
        print(f"DEBUG: Tarea ScoringService iniciada para postulación {application_id}.", flush=True)
        db: Session = db_session_factory()
        
        try:
            # 1. Cargar postulación con relaciones
            application = db.query(models.Application).filter(models.Application.id == application_id).first()
            if not application:
                raise ValueError(f"Postulación {application_id} no encontrada en la base de datos.")
                
            candidate = application.candidate
            vacancy = application.vacancy
            
            print(f"DEBUG: Evaluando candidato {candidate.name} para la vacante '{vacancy.title}'", flush=True)
            
            # Registrar log de inicio
            log_start = models.ProcessingLog(
                candidate_id=candidate.id,
                step="evaluacion_vacancy",
                status="procesando",
                message=f"Iniciando evaluación automatizada de IA para la vacante '{vacancy.title}'."
            )
            db.add(log_start)
            db.commit()
            
            # Validar que el candidato tenga texto extraído
            if not candidate.raw_text or not candidate.raw_text.strip():
                raise ValueError("El candidato no posee texto extraído (raw_text) para realizar la evaluación.")
                
            # 2. Obtener criterios
            criteria = vacancy.evaluation_criteria or []
            if not criteria:
                raise ValueError("La vacante no posee criterios de evaluación configurados.")
                
            # Formatear la lista de criterios para el prompt
            criteria_list_str = ""
            for idx, c in enumerate(criteria):
                c_lbl = c.get('criterio') or c.get('nombre') or f"Criterio {idx+1}"
                c_w = float(c.get('peso', 0)) * 100
                criteria_list_str += f"- Criterio {idx + 1}: \"{c_lbl}\" (Peso: {c_w:.0f}%)\n"
                
            # 3. Construir Prompt Dinámico
            prompt = (
                f"Eres un experto seleccionador de talento humano y evaluación integral de perfiles profesionales.\n"
                f"Tu tarea es evaluar el perfil de un candidato frente a los criterios específicos de una vacante.\n\n"
                f"=== DATOS DE LA VACANTE ===\n"
                f"Título: {vacancy.title}\n"
                f"Descripción:\n{vacancy.description}\n"
                f"Requisitos:\n{vacancy.requirements or 'No especificados'}\n\n"
                f"=== CRITERIOS DE EVALUACIÓN A CALIFICAR ===\n"
                f"{criteria_list_str}\n"
                f"=== CURRICULUM VITAE DEL CANDIDATO ===\n"
                f"\"\"\"\n{candidate.raw_text}\n\"\"\"\n\n"
                f"Instrucciones de evaluación:\n"
                f"1. Analiza el CV detalladamente y busca evidencias para cada uno de los criterios.\n"
                f"2. Asigna una calificación de 0 a 100 para cada uno de los criterios.\n"
                f"3. Escribe una justificación ejecutiva y objetiva de máximo 2 líneas para cada criterio."
            )
            
            schema_desc = (
                "{\n"
                '  "analisis_general": "Resumen general sobre la adecuación del candidato al puesto (2-3 líneas)",\n'
                '  "evaluaciones_criterios": [\n'
                '    {\n'
                '      "criterio": "Nombre del criterio evaluado tal cual aparece listado",\n'
                '      "puntuacion": 85.0,\n'
                '      "explicacion": "Explicación breve de por qué se asignó esa calificación basándote en su CV."\n'
                '    }\n'
                '  ]\n'
                "}"
            )
            
            # 4. Invocación a OllamaService
            print(f"DEBUG: Enviando prompt dinámico a OllamaService...", flush=True)
            ai_service = get_ai_service()
            ai_data = await ai_service.generate_json(prompt, schema_desc)
            print(f"DEBUG: Respuesta de Ollama recibida: {ai_data}", flush=True)
            
            # Recargar entidades
            application = db.query(models.Application).filter(models.Application.id == application_id).first()
            
            # 5. Calcular puntuación ponderada final en el backend
            ai_criteria_scores = ai_data.get("evaluaciones_criterios", [])
            weighted_score_sum = 0.0
            total_weight = 0.0
            evaluated_details = []
            
            for index, vc in enumerate(criteria):
                c_name = vc.get("criterio") or vc.get("nombre") or ""
                c_weight = vc.get("peso", 0.0)
                
                matched_score = 0.0
                matched_exp = "No se encontraron evidencias suficientes en el documento de CV."
                
                # Buscar coincidencia semántica por nombre de criterio
                for item in ai_criteria_scores:
                    # Extraer el nombre del criterio con tolerancia a la clave (criterio, criter, crit)
                    item_crit = ""
                    for k, v in item.items():
                        if k.lower() in ["criterio", "criter", "crit", "name", "nombre"]:
                            item_crit = str(v)
                            break
                            
                    if c_name.lower() in item_crit.lower() or item_crit.lower() in c_name.lower():
                        # Extraer puntuación con tolerancia a la clave (puntuacion, puntuación, score, puntaje, valor)
                        raw_score = 0.0
                        for k, v in item.items():
                            if k.lower() in ["puntuacion", "puntuación", "score", "puntaje", "rating", "val", "value"]:
                                try:
                                    raw_score = float(v)
                                    break
                                except:
                                    pass
                        matched_score = raw_score
                        
                        # Extraer explicación con tolerancia (explicacion, explicación, justificaciòn, justificacion, reason)
                        for k, v in item.items():
                            if k.lower() in ["explicacion", "explicación", "justificacion", "justificación", "reason", "desc"]:
                                matched_exp = str(v)
                                break
                        break
                else:
                    # Fallback por orden de índice si la IA no estructuró el nombre idéntico
                    if index < len(ai_criteria_scores):
                        item = ai_criteria_scores[index]
                        raw_score = 0.0
                        for k, v in item.items():
                            if k.lower() in ["puntuacion", "puntuación", "score", "puntaje", "rating", "val", "value"]:
                                try:
                                    raw_score = float(v)
                                    break
                                except:
                                    pass
                        matched_score = raw_score
                        
                        for k, v in item.items():
                            if k.lower() in ["explicacion", "explicación", "justificacion", "justificación", "reason", "desc"]:
                                matched_exp = str(v)
                                break
                
                weighted_score_sum += matched_score * c_weight
                total_weight += c_weight
                
                evaluated_details.append({
                    "criterio": c_name,
                    "peso": c_weight,
                    "puntuacion": matched_score,
                    "explicacion": matched_exp
                })
                
            # Calcular el score ponderado final
            final_score = weighted_score_sum
            if total_weight > 0:
                final_score = weighted_score_sum / total_weight
                
            # Limitar a rango 0 - 100
            final_score = max(0.0, min(100.0, final_score))
            
            # 6. Actualizar Postulación
            application.score = round(final_score, 1)
            application.evaluation_feedback = {
                "analisis_general": ai_data.get("analisis_general", "Evaluación completada de forma automática."),
                "detalles": evaluated_details
            }
            
            # Registrar log de éxito
            log_success = models.ProcessingLog(
                candidate_id=candidate.id,
                step="evaluacion_vacancy",
                status="exito",
                message=f"Evaluación IA finalizada con éxito. Score obtenido: {application.score}%"
            )
            db.add(log_success)
            db.commit()
            print(f"DEBUG: Evaluación finalizada con éxito para candidatura {application_id}. Score: {application.score}", flush=True)
            
        except Exception as e:
            print(f"DEBUG: Error durante la evaluación de la postulación: {str(e)}", flush=True)
            db.rollback()
            
            # Registrar error de procesamiento
            application = db.query(models.Application).filter(models.Application.id == application_id).first()
            if application:
                log_error = models.ProcessingLog(
                    candidate_id=application.candidate_id,
                    step="evaluacion_vacancy",
                    status="error",
                    message=f"Fallo en evaluación automatizada de IA: {str(e)}"
                )
                db.add(log_error)
                db.commit()
        finally:
            db.close()
