import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from app import models

logger = logging.getLogger("rh.audit")

def get_client_ip(request: Optional[Request]) -> Optional[str]:
    """Obtiene la dirección IP del cliente a partir de cabeceras de proxy o socket."""
    if not request:
        return None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return None

def log_audit_event(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
    ip_address: Optional[str] = None
) -> Optional[models.AuditLog]:
    """
    Registra un evento inmutable en la bitácora de auditoría (LFPDPPP).
    No lanza excepciones para no interrumpir el flujo principal si ocurre un error de log.
    """
    try:
        resolved_ip = ip_address or get_client_ip(request)
        audit_entry = models.AuditLog(
            user_id=user_id,
            user_email=user_email,
            action=action.upper(),
            resource_type=resource_type.lower(),
            resource_id=str(resource_id) if resource_id is not None else None,
            details=details,
            ip_address=resolved_ip
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        logger.info(f"AUDIT: [{audit_entry.action}] {resource_type}:{resource_id} por {user_email or 'Anónimo'} ({resolved_ip})")
        return audit_entry
    except Exception as e:
        db.rollback()
        logger.error(f"Error registrando evento de auditoría: {e}")
        return None
