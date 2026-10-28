import hmac
import logging
from typing import Optional
from fastapi import Header, HTTPException, status, Security
from fastapi.security import APIKeyHeader
from app.config import settings

logger = logging.getLogger("rh.auth")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_admin_access(
    x_api_key: Optional[str] = Security(api_key_header),
    authorization: Optional[str] = Header(None),
    x_auth_token: Optional[str] = Header(None)
) -> bool:
    """
    Dependencia de seguridad para proteger endpoints administrativos y de reclutamiento.
    Valida la clave vía cabecera X-API-Key, Authorization: Bearer <token/key>, o X-Auth-Token.
    Acepta tanto la clave maestra del sistema como tokens de sesión RBAC activos.
    Si require_auth=False en configuración, permite el acceso general.
    """
    if not settings.require_auth:
        return True

    provided_token = x_api_key
    if not provided_token and authorization and authorization.lower().startswith("bearer "):
        provided_token = authorization[7:].strip()
    elif not provided_token and x_auth_token:
        provided_token = x_auth_token.strip()

    if not provided_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación para acceder a este recurso protegido.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 1. Validar si coincide con la clave maestra API Key
    if hmac.compare_digest(provided_token, settings.admin_api_key):
        return True

    # 2. Validar si es un token de sesión RBAC firmado
    from app.routers.auth_rbac import decode_session_token
    from app.database import SessionLocal
    from app import models

    decoded = decode_session_token(provided_token)
    if decoded and "user_id" in decoded:
        db = SessionLocal()
        try:
            user = db.query(models.User).filter(models.User.id == decoded["user_id"]).first()
            if user and user.is_active:
                return True
        finally:
            db.close()

    logger.warning("Intento de acceso no autorizado con credenciales o token inválidos.")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Clave de acceso o sesión inválida o permisos insuficientes."
    )

