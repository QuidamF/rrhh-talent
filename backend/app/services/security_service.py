import re
from typing import Optional

def mask_curp(curp: Optional[str]) -> Optional[str]:
    """
    Enmascara la CURP preservando solo los primeros 4 caracteres y los últimos 2.
    Ejemplo: ABCD010203HDFRRN09 -> ABCD************09
    """
    if not curp:
        return curp
    clean = curp.strip()
    if len(clean) < 8:
        return "******"
    prefix = clean[:4]
    suffix = clean[-2:]
    masked_len = len(clean) - 6
    return f"{prefix}{'*' * masked_len}{suffix}"

def mask_phone(phone: Optional[str]) -> Optional[str]:
    """
    Enmascara un número telefónico mostrando únicamente los últimos 4 dígitos.
    Ejemplo: +52 55 1234 5678 -> *******5678
    """
    if not phone:
        return phone
    digits = re.sub(r"\D", "", phone)
    if len(digits) <= 4:
        return "****"
    visible_suffix = digits[-4:]
    return f"{'*' * (len(digits) - 4)}{visible_suffix}"

def mask_email(email: Optional[str]) -> Optional[str]:
    """
    Enmascara una dirección de correo electrónico.
    Ejemplo: juan.perez@empresa.com -> j***z@empresa.com
    """
    if not email or "@" not in email:
        return email
    try:
        user_part, domain_part = email.strip().split("@", 1)
        if len(user_part) <= 2:
            masked_user = f"{user_part[0]}*"
        else:
            masked_user = f"{user_part[0]}{'*' * (len(user_part) - 2)}{user_part[-1]}"
        return f"{masked_user}@{domain_part}"
    except Exception:
        return "***@***"

def mask_name(name: Optional[str]) -> Optional[str]:
    """
    Ofusca un nombre completo preservando iniciales.
    Ejemplo: Juan Pérez Gómez -> J*** P*** G***
    """
    if not name:
        return name
    parts = name.strip().split()
    masked_parts = [f"{p[0]}{'*' * (len(p) - 1)}" if len(p) > 1 else p for p in parts]
    return " ".join(masked_parts)
