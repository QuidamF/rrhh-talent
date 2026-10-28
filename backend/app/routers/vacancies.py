from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Request
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.services.vacancy_service import VacancyService
from app.services.scoring_service import ScoringService
from app.services.audit_service import log_audit_event
from app.routers.auth_rbac import get_current_user_optional
import app.models as models
import app.schemas as schemas

router = APIRouter(
    prefix="/vacancies",
    tags=["Vacantes y Postulaciones"]
)

# ==========================================================================
# ENDPOINTS DE VACANTES (CRUD)
# ==========================================================================

@router.post("", response_model=schemas.Vacancy, status_code=status.HTTP_201_CREATED)
async def create_vacancy(vacancy: schemas.VacancyCreate, db: Session = Depends(get_db)):
    """Crea una nueva vacante en el sistema definiendo criterios de evaluación y pesos."""
    # Validar que los pesos sumen 1.0 (aprox. con tolerancia flotante) o 100
    criteria = vacancy.evaluation_criteria or []
    if criteria:
        total_weight = sum(c.get("peso", 0.0) for c in criteria)
        # Toleramos 1.0 o 100
        if not (0.99 <= total_weight <= 1.01) and not (99 <= total_weight <= 101):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La suma de los pesos de los criterios de evaluación debe ser igual a 1.0 (o 100%)."
            )
            
        # Si introdujeron en base 100, normalizar a base 1.0 para consistencia interna
        if total_weight > 2.0:
            for c in criteria:
                c["peso"] = c.get("peso", 0.0) / 100.0

    return VacancyService.create_vacancy(db, vacancy)


@router.get("", response_model=List[schemas.Vacancy])
async def list_vacancies(db: Session = Depends(get_db)):
    """Obtiene el listado de todas las vacantes creadas."""
    return VacancyService.list_vacancies(db)


@router.get("/stats/dashboard", status_code=status.HTTP_200_OK)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Obtiene métricas estadísticas consolidadas de vacantes, candidatos y postulaciones para el Dashboard."""
    try:
        total_candidates = db.query(models.Candidate).count()
        total_vacancies = db.query(models.Vacancy).count()
        total_applications = db.query(models.Application).count()

        # IA success rate calculation
        success_candidates = db.query(models.Candidate).filter(models.Candidate.status == "completado").count()
        error_candidates = db.query(models.Candidate).filter(models.Candidate.status == "error").count()
        processing_candidates = db.query(models.Candidate).filter(models.Candidate.status == "procesando").count()
        
        ia_success_rate = 100.0
        if (success_candidates + error_candidates) > 0:
            ia_success_rate = round((success_candidates / (success_candidates + error_candidates)) * 100, 1)

        # Candidates by status
        candidates_by_status = {
            "completado": success_candidates,
            "procesando": processing_candidates,
            "error": error_candidates
        }

        # Applications by stage
        stages = ["cv_recibido", "pre_entrevista", "sin_respuesta", "entrevista", "evaluado", "roleplay", "capacitacion_1", "capacitacion_2", "contratado", "rechazado"]
        applications_by_stage = {}
        for stage in stages:
            applications_by_stage[stage] = db.query(models.Application).filter(models.Application.stage == stage).count()

        # Applications by vacancy (Bar Chart)
        vacancies = db.query(models.Vacancy).all()
        applications_by_vacancy = []
        for vac in vacancies:
            count = db.query(models.Application).filter(models.Application.vacancy_id == vac.id).count()
            applications_by_vacancy.append({
                "vacancy_title": vac.title,
                "count": count
            })

        # Configuración dinámica de ranking y rangos
        limit_setting = db.query(models.Setting).filter(models.Setting.key == "top_candidates_limit").first()
        try:
            top_limit = int(limit_setting.value) if limit_setting else 10
        except (ValueError, TypeError):
            top_limit = 10

        range_high_setting = db.query(models.Setting).filter(models.Setting.key == "score_range_high").first()
        try:
            score_range_high = int(range_high_setting.value) if range_high_setting else 80
        except (ValueError, TypeError):
            score_range_high = 80

        range_mid_setting = db.query(models.Setting).filter(models.Setting.key == "score_range_mid").first()
        try:
            score_range_mid = int(range_mid_setting.value) if range_mid_setting else 60
        except (ValueError, TypeError):
            score_range_mid = 60

        # Top evaluated candidates across all vacancies
        top_apps = db.query(models.Application)\
            .filter(models.Application.score.isnot(None))\
            .order_by(models.Application.score.desc())\
            .limit(max(top_limit * 5, 50))\
            .all()
            
        top_candidates = []
        for app in top_apps:
            top_candidates.append({
                "candidate_name": app.candidate.name,
                "vacancy_title": app.vacancy.title,
                "vacancy_id": app.vacancy.id,
                "score": app.score,
                "email": app.candidate.email,
                "id": app.candidate.id,
                "application_id": app.id,
                "stage": app.stage
            })

        # Calcular el tiempo promedio en cada etapa (en segundos)
        stage_durations = {
            "cv_recibido": 0.0,
            "pre_entrevista": 0.0,
            "sin_respuesta": 0.0,
            "entrevista": 0.0,
            "evaluado": 0.0,
            "roleplay": 0.0,
            "capacitacion_1": 0.0,
            "capacitacion_2": 0.0,
            "contratado": 0.0,
            "rechazado": 0.0
        }
        stage_counts = {
            "cv_recibido": 0,
            "pre_entrevista": 0,
            "sin_respuesta": 0,
            "entrevista": 0,
            "evaluado": 0,
            "roleplay": 0,
            "capacitacion_1": 0,
            "capacitacion_2": 0,
            "contratado": 0,
            "rechazado": 0
        }

        applications = db.query(models.Application).all()
        now = datetime.now(timezone.utc)

        for app in applications:
            history = db.query(models.StageHistory)\
                .filter(models.StageHistory.application_id == app.id)\
                .order_by(models.StageHistory.changed_at.asc())\
                .all()

            if not history:
                continue

            for i in range(len(history)):
                current_transition = history[i]
                stage = current_transition.stage_to

                if stage not in stage_durations:
                    continue

                if i + 1 < len(history):
                    end_time = history[i + 1].changed_at
                else:
                    end_time = now

                start_time = current_transition.changed_at
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)

                duration_seconds = (end_time - start_time).total_seconds()
                stage_durations[stage] += duration_seconds
                stage_counts[stage] += 1

        average_time_in_stages = {}
        for stage in stage_durations:
            count = stage_counts[stage]
            if count > 0:
                average_time_in_stages[stage] = round(stage_durations[stage] / count, 1)
            else:
                average_time_in_stages[stage] = 0.0

        # Tasa de conversión y efectividad por plataforma de reclutamiento (Sources)
        source_stats = {}
        all_candidates = db.query(models.Candidate).all()
        for cand in all_candidates:
            src = cand.source.strip() if cand.source and cand.source.strip() else "No especificada"
            if src not in source_stats:
                source_stats[src] = {
                    "source": src,
                    "total": 0,
                    "in_process": 0,
                    "hired": 0,
                    "rejected": 0,
                    "scores": []
                }
            source_stats[src]["total"] += 1
            
            # Revisar las postulaciones de este candidato
            for app in cand.applications:
                if app.stage == "contratado":
                    source_stats[src]["hired"] += 1
                elif app.stage in ["pre_entrevista", "entrevista", "evaluado", "roleplay", "capacitacion_1", "capacitacion_2"]:
                    source_stats[src]["in_process"] += 1
                elif app.stage in ["rechazado", "sin_respuesta"]:
                    source_stats[src]["rejected"] += 1
                    
                if app.score is not None:
                    source_stats[src]["scores"].append(float(app.score))

        conversion_by_source = []
        for src, d in source_stats.items():
            tot = d["total"]
            hired = d["hired"]
            in_proc = d["in_process"]
            conv_rate = round((hired / tot) * 100, 1) if tot > 0 else 0.0
            adv_rate = round(((hired + in_proc) / tot) * 100, 1) if tot > 0 else 0.0
            avg_sc = round(sum(d["scores"]) / len(d["scores"]), 1) if d["scores"] else None
            
            conversion_by_source.append({
                "source": src,
                "total": tot,
                "hired": hired,
                "in_process": in_proc,
                "rejected": d["rejected"],
                "conversion_rate": conv_rate,
                "advancement_rate": adv_rate,
                "avg_score": avg_sc
            })
            
        conversion_by_source.sort(key=lambda x: (x["hired"], x["total"]), reverse=True)

        return {
            "total_candidates": total_candidates,
            "total_vacancies": total_vacancies,
            "total_applications": total_applications,
            "ia_success_rate": ia_success_rate,
            "candidates_by_status": candidates_by_status,
            "applications_by_stage": applications_by_stage,
            "applications_by_vacancy": applications_by_vacancy,
            "top_candidates": top_candidates,
            "top_candidates_limit": top_limit,
            "score_range_high": score_range_high,
            "score_range_mid": score_range_mid,
            "average_time_in_stages": average_time_in_stages,
            "conversion_by_source": conversion_by_source
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al calcular estadísticas de dashboard: {str(e)}"
        )


@router.get("/{vacancy_id}", response_model=schemas.Vacancy)
async def get_vacancy(vacancy_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle de una vacante específica por su ID."""
    vacancy = VacancyService.get_vacancy(db, vacancy_id)
    if not vacancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada."
        )
    return vacancy


@router.put("/{vacancy_id}", response_model=schemas.Vacancy)
async def update_vacancy(vacancy_id: int, vacancy_update: schemas.VacancyCreate, db: Session = Depends(get_db)):
    """Actualiza la información de una vacante existente."""
    criteria = vacancy_update.evaluation_criteria or []
    if criteria:
        total_weight = sum(c.get("peso", 0.0) for c in criteria)
        if not (0.99 <= total_weight <= 1.01) and not (99 <= total_weight <= 101):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La suma de los pesos de los criterios de evaluación debe ser igual a 1.0 (o 100%)."
            )
        if total_weight > 2.0:
            for c in criteria:
                c["peso"] = c.get("peso", 0.0) / 100.0

    updated = VacancyService.update_vacancy(db, vacancy_id, vacancy_update)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada."
        )
    return updated


@router.delete("/{vacancy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vacancy(vacancy_id: int, db: Session = Depends(get_db)):
    """Elimina una vacante del sistema."""
    deleted = VacancyService.delete_vacancy(db, vacancy_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada."
        )
    return


# ==========================================================================
# ENDPOINTS DE POSTULACIONES Y EVALUACIÓN (SCORING)
# ==========================================================================

@router.post("/{vacancy_id}/apply/{candidate_id}", response_model=schemas.Application, status_code=status.HTTP_201_CREATED)
async def apply_to_vacancy(
    vacancy_id: int,
    candidate_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Postula a un candidato a una vacante específica.
    Registra el Kanban, crea el historial de etapas e inicia la evaluación por IA en segundo plano.
    """
    # 1. Verificar si la vacante existe
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada."
        )

    # 2. Verificar si el candidato existe
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidato no encontrado."
        )

    # 3. Evitar postulaciones duplicadas
    existing_app = db.query(models.Application).filter(
        models.Application.candidate_id == candidate_id,
        models.Application.vacancy_id == vacancy_id
    ).first()
    
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El candidato ya se encuentra postulado a esta vacante."
        )

    # 4. Crear postulación inicial
    db_application = models.Application(
        candidate_id=candidate_id,
        vacancy_id=vacancy_id,
        stage="cv_recibido"
    )
    
    try:
        db.add(db_application)
        db.commit()
        db.refresh(db_application)
        
        # 5. Registrar el cambio de etapa en StageHistory
        db_history = models.StageHistory(
            application_id=db_application.id,
            stage_from=None,
            stage_to="cv_recibido"
        )
        db.add(db_history)
        db.commit()
        db.refresh(db_application)
        
        # 6. Encolar evaluación por IA en segundo plano
        background_tasks.add_task(
            ScoringService.evaluate_candidate_async,
            db_application.id,
            SessionLocal
        )
        
        return db_application
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo al registrar la postulación: {str(e)}"
        )


@router.get("/{vacancy_id}/applications", response_model=List[schemas.Application])
async def list_vacancy_applications(vacancy_id: int, db: Session = Depends(get_db)):
    """Obtiene todas las postulaciones asociadas a una vacante, incluyendo sus scores."""
    # Verificar existencia de la vacante
    vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada."
        )
        
    return db.query(models.Application)\
        .filter(models.Application.vacancy_id == vacancy_id)\
        .order_by(models.Application.score.desc())\
        .all()


@router.get("/applications/{application_id}", response_model=schemas.Application)
async def get_application(application_id: int, db: Session = Depends(get_db)):
    """Obtiene el detalle de una postulación por su ID."""
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postulación no encontrada."
        )
    return application


@router.put("/applications/{application_id}/stage", response_model=schemas.Application)
async def update_application_stage(
    application_id: int,
    stage_to: str,
    db: Session = Depends(get_db)
):
    """
    Actualiza la etapa de una postulación (Kanban drag-and-drop).
    Registra la transición en StageHistory de forma automática.
    """
    valid_stages = [
        "cv_recibido", 
        "pre_entrevista", 
        "sin_respuesta",
        "entrevista", 
        "evaluado", 
        "roleplay", 
        "capacitacion_1", 
        "capacitacion_2", 
        "contratado", 
        "rechazado"
    ]
    if stage_to not in valid_stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Etapa '{stage_to}' no válida. Debe ser una de: {', '.join(valid_stages)}"
        )

    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postulación no encontrada."
        )

    stage_from = application.stage
    if stage_from == stage_to:
        return application # No hay cambios

    try:
        application.stage = stage_to
        
        # Registrar historial
        db_history = models.StageHistory(
            application_id=application_id,
            stage_from=stage_from,
            stage_to=stage_to
        )
        db.add(db_history)
        db.commit()
        db.refresh(application)
        return application
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar la etapa de postulación: {str(e)}"
        )


@router.post("/applications/{application_id}/evaluate", status_code=status.HTTP_202_ACCEPTED)
async def reevaluate_application(
    application_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Despierta y fuerza la re-evaluación con IA en segundo plano para una postulación existente.
    """
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postulación no encontrada."
        )

    # Limpiar feedback anterior y resetear score para mostrar animación de carga en UI
    application.score = None
    application.evaluation_feedback = None
    db.commit()

    background_tasks.add_task(
        ScoringService.evaluate_candidate_async,
        application_id,
        SessionLocal
    )
    return {"message": "Re-evaluación encolada exitosamente."}


@router.delete("/applications/{application_id}", status_code=status.HTTP_200_OK)
async def delete_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    """
    Elimina una postulación específica y su historial de etapas (en cascada).
    El candidato permanece intacto en el Banco General de Talento.
    """
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postulación no encontrada."
        )

    candidate_id = application.candidate_id
    vacancy_title = application.vacancy.title if application.vacancy else f"Vacante #{application.vacancy_id}"

    try:
        # Registrar nota interna en el candidato antes de eliminar la postulación
        note = models.Note(
            candidate_id=candidate_id,
            content=f"🗑️ Postulación desvinculada/eliminada de la vacante '{vacancy_title}'. El candidato regresa al Banco General de Talento.",
            author="Reclutador"
        )
        db.add(note)
        
        # Eliminar postulación (StageHistory se borra en cascada gracias a cascade="all, delete-orphan")
        db.delete(application)
        db.commit()

        return {
            "status": "success",
            "message": f"Postulación a '{vacancy_title}' eliminada exitosamente. El candidato permanece en el Banco General.",
            "candidate_id": candidate_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar la postulación: {str(e)}"
        )


@router.post("/applications/{application_id}/transfer", response_model=schemas.Application, status_code=status.HTTP_201_CREATED)
async def transfer_application(
    application_id: int,
    transfer_data: schemas.ApplicationTransfer,
    background_tasks: BackgroundTasks,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Reasigna una postulación de una vacante errónea a una nueva vacante destino.
    Elimina la postulación previa (y su historial en la vacante anterior) para no ensuciar métricas,
    crea la postulación en la vacante destino y opcionalmente inicia la re-evaluación por IA.
    """
    # 1. Obtener postulación actual
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postulación no encontrada."
        )

    candidate_id = application.candidate_id
    old_vacancy_title = application.vacancy.title if application.vacancy else f"Vacante #{application.vacancy_id}"
    target_vacancy_id = transfer_data.target_vacancy_id

    # 2. Validar que la vacante destino exista
    target_vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == target_vacancy_id).first()
    if not target_vacancy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La vacante destino #{target_vacancy_id} no existe."
        )

    # 3. Evitar transferir a la misma vacante
    if application.vacancy_id == target_vacancy_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El candidato ya se encuentra postulado a esta misma vacante."
        )

    # 4. Verificar si ya existe postulación en la vacante destino
    existing_in_target = db.query(models.Application).filter(
        models.Application.candidate_id == candidate_id,
        models.Application.vacancy_id == target_vacancy_id
    ).first()
    if existing_in_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El candidato ya cuenta con una postulación activa en '{target_vacancy.title}'."
        )

    try:
        # 5. Eliminar postulación anterior (StageHistory se borra en cascada)
        db.delete(application)
        db.flush()

        # 6. Crear nueva postulación en la vacante destino en etapa cv_recibido
        new_application = models.Application(
            candidate_id=candidate_id,
            vacancy_id=target_vacancy_id,
            stage="cv_recibido",
            score=None,
            evaluation_feedback=None
        )
        db.add(new_application)
        db.flush()

        # 7. Registrar historial inicial en la nueva vacante
        db_history = models.StageHistory(
            application_id=new_application.id,
            stage_from=None,
            stage_to="cv_recibido"
        )
        db.add(db_history)

        # 8. Registrar nota interna documentando la reasignación
        note = models.Note(
            candidate_id=candidate_id,
            content=f"🔄 Postulación reasignada de '{old_vacancy_title}' a '{target_vacancy.title}' por corrección de reclutador.",
            author="Reclutador"
        )
        db.add(note)

        db.commit()
        db.refresh(new_application)

        # Registrar evento de auditoría
        curr_user = get_current_user_optional(
            authorization=request.headers.get("Authorization") if request else None,
            x_auth_token=request.headers.get("X-Auth-Token") if request else None,
            db=db
        ) if request else None
        log_audit_event(
            db=db,
            action="TRANSFER_CANDIDATE",
            resource_type="candidate",
            resource_id=candidate_id,
            user_id=curr_user.id if curr_user else None,
            user_email=curr_user.email if curr_user else None,
            details={
                "application_id": new_application.id,
                "from_vacancy": old_vacancy_title,
                "to_vacancy": target_vacancy.title
            },
            request=request
        )

        # 9. Encolar evaluación por IA si se solicitó
        if transfer_data.reevaluate:
            background_tasks.add_task(
                ScoringService.evaluate_candidate_async,
                new_application.id,
                SessionLocal
            )

        return new_application

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo al transferir la postulación: {str(e)}"
        )

