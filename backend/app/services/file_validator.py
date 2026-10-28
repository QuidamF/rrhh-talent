import os
import re
from typing import Tuple

class SecurityValidationError(ValueError):
    """Excepción lanzada cuando un archivo o ruta viola las políticas de seguridad."""
    pass

def validate_pdf_magic_bytes(header_bytes: bytes) -> bool:
    """
    Verifica que los primeros bytes de un archivo correspondan a la firma binaria real de un PDF (%PDF-).
    """
    if not header_bytes or len(header_bytes) < 5:
        return False
    # Los PDFs legítimos inician con %PDF- (hex: 25 50 44 46 2D)
    return header_bytes.startswith(b"%PDF-")

def validate_image_magic_bytes(header_bytes: bytes) -> Tuple[bool, str]:
    """
    Verifica que los primeros bytes correspondan a una imagen real (JPEG, PNG, WEBP).
    Retorna (es_valido, formato_detectado).
    """
    if not header_bytes or len(header_bytes) < 3:
        return False, "unknown"
    
    # JPEG (SOI marker FF D8 FF o FF D8)
    if header_bytes.startswith(b"\xff\xd8\xff") or header_bytes.startswith(b"\xff\xd8"):
        return True, "jpeg"
    
    # PNG (89 50 4E 47 0D 0A 1A 0A)
    if header_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return True, "png"
    
    # WEBP (RIFF .... WEBP)
    if len(header_bytes) >= 12 and header_bytes.startswith(b"RIFF") and header_bytes[8:12] == b"WEBP":
        return True, "webp"
    
    return False, "unknown"

def sanitize_filename(filename: str) -> str:
    """
    Elimina caracteres peligrosos, secuencias de salto de directorio y caracteres nulos.
    """
    if not filename:
        return "unnamed_file"
    # Tomar solo el nombre base (eliminar cualquier directorio previo)
    base_name = os.path.basename(filename.strip().replace("\\", "/"))
    # Remover caracteres nulos y no imprimibles
    clean_name = re.sub(r'[\x00-\x1f\x7f]', '', base_name)
    # Reemplazar secuencias peligrosas
    clean_name = clean_name.replace("..", "_")
    return clean_name or "safe_document"

def resolve_safe_storage_path(base_directory: str, filename: str) -> str:
    """
    Resuelve una ruta de archivo dentro de un directorio base y verifica
    que no haya escape de directorio (Path Traversal Protection).
    Lanza SecurityValidationError si detecta secuencias de escape.
    """
    if not filename:
        raise SecurityValidationError("Nombre de archivo no proporcionado.")

    # Detección explícita de secuencias de escape de directorio o caracteres prohibidos
    normalized = filename.replace("\\", "/")
    if ".." in normalized or normalized.startswith("/") or re.search(r'[\x00-\x1f\x7f]', filename):
        raise SecurityValidationError(
            f"Intento de Path Traversal o caracteres ilícitos detectados en: {filename}"
        )

    clean_name = sanitize_filename(filename)
    abs_base = os.path.abspath(base_directory)
    target_path = os.path.abspath(os.path.join(abs_base, clean_name))

    # Verificar que el destino se encuentre estrictamente dentro del directorio base
    if not target_path.startswith(abs_base + os.sep) and target_path != abs_base:
        raise SecurityValidationError(
            f"Intento de Path Traversal detectado al acceder a: {filename}"
        )
    return target_path
