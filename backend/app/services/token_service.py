import hmac
import hashlib
import base64
import time
from typing import Tuple, Optional
from app.config import settings

def _get_signing_key() -> bytes:
    """Obtiene la clave secreta de firmado en bytes."""
    secret = getattr(settings, "security_secret_key", "rh-default-secret-key-32b-min")
    return secret.encode("utf-8")

def generate_document_token(
    candidate_id: str, 
    doc_type: str = "pdf", 
    expires_in_seconds: int = 1800  # 30 minutos por defecto
) -> str:
    """
    Genera un token HMAC-SHA256 firmado para conceder acceso temporal
    a un archivo confidencial de un candidato (anti-IDOR).
    
    Estructura del token: Base64(candidate_id:doc_type:expires_at:signature)
    """
    expires_at = int(time.time()) + expires_in_seconds
    raw_payload = f"{candidate_id}:{doc_type}:{expires_at}"
    
    signature = hmac.new(
        _get_signing_key(),
        raw_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    full_token = f"{raw_payload}:{signature}"
    return base64.urlsafe_b64encode(full_token.encode("utf-8")).decode("utf-8")

def verify_document_token(
    token: Optional[str], 
    candidate_id: str, 
    doc_type: str = "pdf"
) -> Tuple[bool, str]:
    """
    Valida la autenticidad y vigencia de un token de acceso a documento.
    Retorna (es_valido, motivo_o_error).
    """
    if not token:
        return False, "Token de acceso requerido."
    
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        parts = decoded.split(":")
        if len(parts) != 4:
            return False, "Estructura de token inválida."
        
        token_cand_id, token_doc_type, str_expires_at, token_signature = parts
        expires_at = int(str_expires_at)
        
        # Validar candidato y tipo de documento
        if token_cand_id != candidate_id or token_doc_type != doc_type:
            return False, "El token no corresponde al documento o candidato solicitado."
        
        # Validar expiración temporal (TTL)
        if time.time() > expires_at:
            return False, "El enlace firmado temporal ha expirado."
        
        # Validar firma criptográfica con comparación en tiempo constante (anti-timing attacks)
        expected_payload = f"{token_cand_id}:{token_doc_type}:{str_expires_at}"
        expected_sig = hmac.new(
            _get_signing_key(),
            expected_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(token_signature, expected_sig):
            return False, "Firma digital del token inválida o adulterada."
        
        return True, "Token válido."
    except Exception as e:
        return False, f"Error de verificación del token: {str(e)}"
