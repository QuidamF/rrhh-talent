import base64
import hashlib
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger("rh.crypto_service")

# Marcador mágico para distinguir archivos cifrados de archivos legados en texto plano
FILE_MAGIC_HEADER = b"RHENC\x01\x00"
STR_MAGIC_PREFIX = "RHENC1:"

try:
    from cryptography.fernet import Fernet
    CRYPTOGRAPHY_AVAILABLE = True
except ImportError:
    CRYPTOGRAPHY_AVAILABLE = False
    logger.warning("Librería 'cryptography' no encontrada. Las operaciones criptográficas correrán en modo pass-through.")

def _derive_fernet_key(secret_phrase: str) -> bytes:
    """Deriva una clave compatible con Fernet (32 bytes base64) a partir de la frase secreta."""
    digest = hashlib.sha256(secret_phrase.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)

def get_cipher() -> Optional["Fernet"]:
    """Obtiene una instancia del cifrador Fernet."""
    if not CRYPTOGRAPHY_AVAILABLE:
        return None
    try:
        secret = getattr(settings, "security_secret_key", "rh-default-secret-key-32b-min")
        key = _derive_fernet_key(secret)
        return Fernet(key)
    except Exception as e:
        logger.error(f"Error inicializando cifrador Fernet: {e}")
        return None

def encrypt_bytes(raw_bytes: bytes) -> bytes:
    """
    Cifra un buffer de bytes binarios (ej. PDF o JPG) en reposo.
    Si ya está cifrado o si cryptography no está disponible, lo preserva.
    """
    if not raw_bytes:
        return raw_bytes
    if raw_bytes.startswith(FILE_MAGIC_HEADER):
        return raw_bytes  # Ya está cifrado
    
    cipher = get_cipher()
    if not cipher:
        return raw_bytes
    
    try:
        encrypted_token = cipher.encrypt(raw_bytes)
        return FILE_MAGIC_HEADER + encrypted_token
    except Exception as e:
        logger.error(f"Error al cifrar bytes en reposo: {e}")
        return raw_bytes

def decrypt_bytes(data: bytes) -> bytes:
    """
    Descifra un buffer de bytes en reposo al vuelo (streaming).
    Si el archivo no posee el encabezado mágico de cifrado (archivo legado),
    se retorna íntegro en texto plano de forma transparente.
    """
    if not data:
        return data
    if not data.startswith(FILE_MAGIC_HEADER):
        # Archivo legado no cifrado
        return data
    
    cipher = get_cipher()
    if not cipher:
        logger.error("Se detectó archivo cifrado pero el motor criptográfico no está disponible.")
        return data
    
    try:
        payload = data[len(FILE_MAGIC_HEADER):]
        return cipher.decrypt(payload)
    except Exception as e:
        logger.error(f"Error al descifrar archivo en reposo (posible clave inválida): {e}")
        raise ValueError("No se pudo descifrar el documento confidencial.") from e

def encrypt_string(plaintext: Optional[str]) -> Optional[str]:
    """Cifra una cadena de texto sensible para almacenamiento en BD."""
    if not plaintext:
        return plaintext
    if plaintext.startswith(STR_MAGIC_PREFIX):
        return plaintext
    
    cipher = get_cipher()
    if not cipher:
        return plaintext
    
    try:
        token = cipher.encrypt(plaintext.encode("utf-8")).decode("utf-8")
        return f"{STR_MAGIC_PREFIX}{token}"
    except Exception as e:
        logger.error(f"Error al cifrar cadena PII: {e}")
        return plaintext

def decrypt_string(ciphertext: Optional[str]) -> Optional[str]:
    """Descifra una cadena de texto almacenada en BD."""
    if not ciphertext or not ciphertext.startswith(STR_MAGIC_PREFIX):
        return ciphertext
    
    cipher = get_cipher()
    if not cipher:
        return ciphertext
    
    try:
        raw_token = ciphertext[len(STR_MAGIC_PREFIX):]
        return cipher.decrypt(raw_token.encode("utf-8")).decode("utf-8")
    except Exception as e:
        logger.error(f"Error al descifrar cadena PII: {e}")
        return ciphertext
