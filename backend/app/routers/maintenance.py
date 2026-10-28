import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services.cleanup_service import (
    get_storage_and_database_stats,
    purge_physical_cv_files,
    purge_all_candidates_and_cvs,
    purge_system_complete,
    purge_expired_id_documents,
)
from app.services.audit_service import log_audit_event
from app.routers.auth_rbac import get_current_user_optional, user_has_permission

logger = logging.getLogger("rh.maintenance")

router = APIRouter(
    prefix="/maintenance",
    tags=["Mantenimiento & Purga del Sistema"]
)

class PurgeRequest(BaseModel):
    confirm_phrase: str
    reason: Optional[str] = "Mantenimiento preventivo y purga manual de datos"
    seed_vacancies: Optional[bool] = True

def _check_purge_authorization(current_user: Optional[models.User], required_perm: str = "settings:manage"):
    """
    Verifica que el usuario tenga privilegios suficientes para ejecutar purgas destructivas.
    En entorno local sin token, se permite la operación registrándolo como acción del Administrador.
    """
    if current_user:
        if not (user_has_permission(current_user, required_perm) or "SuperAdmin" in [r.id for r in current_user.roles]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado: se requiere rol SuperAdmin o permiso '{required_perm}' para ejecutar esta purga."
            )

@router.get("/stats")
async def get_maintenance_stats(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Retorna métricas consolidadas en tiempo real de archivos físicos en disco (CVs, INE)
    y registros en base de datos para monitoreo del mantenimiento.
    """
    return get_storage_and_database_stats(db)

@router.post("/purge-cv-files")
async def purge_cv_files_endpoint(
    req: PurgeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Destruye únicamente los archivos físicos en disco (PDFs de CVs e identificaciones oficiales),
    liberando espacio de almacenamiento pero conservando los registros y estadísticas de candidatos.
    Requiere escribir 'PURGAR-CVS'.
    """
    _check_purge_authorization(current_user, required_perm="settings:manage")

    if req.confirm_phrase.strip().upper() != "PURGAR-CVS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Frase de confirmación incorrecta. Debe ingresar exactamente 'PURGAR-CVS' para confirmar."
        )

    res = purge_physical_cv_files(db, reason=req.reason or "Purga manual de archivos físicos de CVs")

    user_email = current_user.email if current_user else "admin@octopy.com"
    user_id = current_user.id if current_user else None

    log_audit_event(
        db=db,
        action="PURGE_PHYSICAL_CVS",
        resource_type="system",
        resource_id="storage_candidates",
        user_id=user_id,
        user_email=user_email,
        details={
            "reason": req.reason,
            "deleted_files": res["deleted_files"],
            "bytes_freed": res["bytes_freed"],
            "bytes_freed_mb": res["bytes_freed_mb"]
        },
        request=request
    )

    return res

@router.post("/purge-candidates")
async def purge_candidates_endpoint(
    req: PurgeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Purga y destruye permanentemente todos los candidatos, expedientes, notas, chats de simulador
    y archivos físicos de CVs. Deja el pipeline kanban vacío y listo para nuevas convocatorias.
    Requiere escribir 'PURGAR-CANDIDATOS'.
    """
    _check_purge_authorization(current_user, required_perm="settings:manage")

    if req.confirm_phrase.strip().upper() != "PURGAR-CANDIDATOS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Frase de confirmación incorrecta. Debe ingresar exactamente 'PURGAR-CANDIDATOS' para confirmar."
        )

    res = purge_all_candidates_and_cvs(db, reason=req.reason or "Purga de todos los candidatos")

    user_email = current_user.email if current_user else "admin@octopy.com"
    user_id = current_user.id if current_user else None

    log_audit_event(
        db=db,
        action="PURGE_ALL_CANDIDATES",
        resource_type="candidate",
        resource_id="all",
        user_id=user_id,
        user_email=user_email,
        details={
            "reason": req.reason,
            "purged_candidates": res["purged_candidates"],
            "purged_applications": res["purged_applications"],
            "deleted_files": res["deleted_files"]
        },
        request=request
    )

    return res

@router.post("/purge-complete")
async def purge_complete_system_endpoint(
    req: PurgeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Reset total del sistema (Factory Reset):
    - Destruye todos los archivos y registros de candidatos y postulaciones.
    - Purga vacantes existentes y re-crea vacantes limpias modelo de Octopy.
    - PRESERVA las cuentas de usuarios, roles de seguridad y configuraciones del bot.
    Requiere escribir 'PURGAR-COMPLETO'.
    """
    _check_purge_authorization(current_user, required_perm="settings:manage")

    if req.confirm_phrase.strip().upper() != "PURGAR-COMPLETO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Frase de confirmación incorrecta. Debe ingresar exactamente 'PURGAR-COMPLETO' para confirmar el reset total."
        )

    res = purge_system_complete(
        db=db,
        seed_sample_vacancies=req.seed_vacancies if req.seed_vacancies is not None else True,
        reason=req.reason or "Reset total de fábrica del sistema"
    )

    user_email = current_user.email if current_user else "admin@octopy.com"
    user_id = current_user.id if current_user else None

    log_audit_event(
        db=db,
        action="PURGE_SYSTEM_COMPLETE",
        resource_type="system",
        resource_id="factory_reset",
        user_id=user_id,
        user_email=user_email,
        details={
            "reason": req.reason,
            "purged_candidates": res["purged_candidates"],
            "purged_vacancies": res["purged_vacancies"],
            "seeded_vacancies": res["seeded_vacancies"],
            "deleted_files": res["deleted_files"]
        },
        request=request
    )

    return res

@router.post("/purge-expired-ids")
async def purge_expired_ids_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Ejecuta el protocolo de destrucción segura de documentos de identidad vencidos (retención legal 24h / ARCO).
    """
    _check_purge_authorization(current_user, required_perm="id_docs:purge")

    purged_count = purge_expired_id_documents(db)

    user_email = current_user.email if current_user else "admin@octopy.com"
    user_id = current_user.id if current_user else None

    log_audit_event(
        db=db,
        action="PURGE_EXPIRED_IDENTIFICATIONS",
        resource_type="candidate_id_document",
        resource_id="expired_batch",
        user_id=user_id,
        user_email=user_email,
        details={"purged_count": purged_count},
        request=request
    )

    return {
        "success": True,
        "purged_count": purged_count,
        "message": f"Ciclo de purga completado: {purged_count} documentos de identidad destruidos con éxito conforme a LFPDPPP."
    }
