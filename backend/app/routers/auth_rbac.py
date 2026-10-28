import os
import time
import hmac
import base64
import hashlib
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.config import settings
from app.services.audit_service import log_audit_event, get_client_ip

logger = logging.getLogger("rh.auth_rbac")

router = APIRouter(prefix="/auth", tags=["Auth & RBAC"])
dept_router = APIRouter(prefix="/departments", tags=["Departments"])

# =========================================================================
# CRIPTOGRAFÍA: HASHING DE CONTRASEÑAS Y TOKENS DE SESIÓN
# =========================================================================

def hash_password(password: str) -> str:
    """Genera un hash seguro usando PBKDF2-HMAC-SHA256 con salt aleatorio de 16 bytes."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Valida una contraseña contra su hash PBKDF2."""
    try:
        salt_hex, key_hex = hashed.split(":")
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def _get_auth_secret() -> str:
    return getattr(settings, "security_secret_key", "rh-jpm-talento-secret-auth-key-2026")

def create_session_token(user_id: str, email: str, expires_in_seconds: int = 86400 * 7) -> str:
    """Genera un token de sesión criptográficamente firmado."""
    expires_at = int(time.time()) + expires_in_seconds
    payload = f"{user_id}:{email}:{expires_at}"
    secret = _get_auth_secret()
    sig = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    full_token = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(full_token.encode("utf-8")).decode("utf-8")

def decode_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifica y decodifica el token de sesión."""
    try:
        raw = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        parts = raw.split(":")
        if len(parts) != 4:
            return None
        user_id, email, str_exp, sig = parts
        expires_at = int(str_exp)
        if time.time() > expires_at:
            return None
        payload = f"{user_id}:{email}:{str_exp}"
        secret = _get_auth_secret()
        expected_sig = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected_sig):
            return {"user_id": user_id, "email": email, "expires_at": expires_at}
        return None
    except Exception:
        return None


# =========================================================================
# DEPENDENCIAS DE AUTENTICACIÓN Y PERMISOS
# =========================================================================

def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    x_auth_token: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Extrae el usuario autenticado si existe el token."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    elif x_auth_token:
        token = x_auth_token.strip()

    if not token:
        return None

    # Soporte para token de sesión inicial demo/administrador local
    if token == "demo-admin-token":
        admin = db.query(models.User).filter(models.User.email.in_(["admin@octopy.com", "admin@jpm.com"])).first()
        if admin and admin.is_active:
            return admin

    decoded = decode_session_token(token)
    if not decoded:
        return None

    user = db.query(models.User).filter(models.User.id == decoded["user_id"]).first()
    if user and user.is_active:
        return user
    return None

def get_current_user(
    authorization: Optional[str] = Header(None),
    x_auth_token: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.User:
    """Exige usuario autenticado activo o responde 401."""
    user = get_current_user_optional(authorization, x_auth_token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o no autenticada. Inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def user_has_permission(user: models.User, permission_code: str) -> bool:
    """Verifica si el usuario posee un permiso o es SuperAdmin."""
    if not user.is_active:
        return False
    user_roles = [r.id for r in user.roles]
    if "SuperAdmin" in user_roles:
        return True
    
    # Revisar permisos asignados en sus roles
    for role in user.roles:
        for perm in role.permissions:
            if perm.id == permission_code:
                return True
    return False

def require_permission(permission_code: str):
    """Dependencia para proteger endpoints según permiso."""
    def permission_checker(current_user: models.User = Depends(get_current_user)):
        if not user_has_permission(current_user, permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso insuficiente: se requiere '{permission_code}'."
            )
        return current_user
    return permission_checker


# =========================================================================
# ESQUEMAS DE ENTRADA Y SALIDA (PYDANTIC)
# =========================================================================

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreateRequest(BaseModel):
    email: str
    password: str
    full_name: str
    department: Optional[str] = "Recursos Humanos"
    department_id: Optional[int] = None
    role_ids: List[str]
    assign_as_dept_manager: Optional[int] = None
    assign_as_dept_trainer: Optional[int] = None

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[str]] = None
    new_password: Optional[str] = None

class StageEvaluationRequest(BaseModel):
    application_id: int
    stage: str  # 'entrevista', 'roleplay', 'capacitacion_1', 'capacitacion_2'
    verdict: str  # 'aprobado', 'requiere_refuerzo', 'no_aprobado'
    score: Optional[int] = None  # 0 a 100
    notes: str
    advance_stage: bool = True  # Si está aprobado, avanza a la siguiente etapa en Kanban


def serialize_user(user: models.User, db: Session) -> Dict[str, Any]:
    """Formatea los datos del usuario con sus roles, permisos y vacantes asignadas."""
    roles = [{"id": r.id, "name": r.name, "description": r.description} for r in user.roles]
    permissions_set = set()
    is_superadmin = any(r.id == "SuperAdmin" for r in user.roles)
    
    if is_superadmin:
        all_perms = db.query(models.Permission).all()
        permissions_set = {p.id for p in all_perms}
    else:
        for r in user.roles:
            for p in r.permissions:
                permissions_set.add(p.id)
                
    # Obtener vacantes donde es Gerente responsable o Evaluador asignado
    managed_vac_ids = [v.id for v in user.managed_vacancies]
    eval_vac_ids = [a.vacancy_id for a in user.evaluator_assignments]
    assigned_vacancy_ids = list(set(managed_vac_ids + eval_vac_ids))

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "department": user.department_rel.name if user.department_rel else user.department,
        "department_id": user.department_id,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "roles": roles,
        "permissions": sorted(list(permissions_set)),
        "is_superadmin": is_superadmin,
        "assigned_vacancy_ids": assigned_vacancy_ids
    }


# =========================================================================
# ENDPOINTS DE AUTENTICACIÓN
# =========================================================================

@router.post("/login")
def login(
    req: LoginRequest, 
    request: Request,
    db: Session = Depends(get_db)
):
    """Autentica usuario por correo y contraseña, emite token y registra en auditoría."""
    clean_email = req.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == clean_email).first()
    
    if not user or not verify_password(req.password, user.hashed_password):
        log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            resource_type="auth",
            user_email=clean_email,
            details={"reason": "Credenciales inválidas"},
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos."
        )
        
    if not user.is_active:
        log_audit_event(
            db=db,
            action="LOGIN_BLOCKED",
            resource_type="auth",
            user_id=user.id,
            user_email=user.email,
            details={"reason": "Usuario inactivo"},
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta de usuario se encuentra inactiva. Contacta al Administrador."
        )
        
    token = create_session_token(user.id, user.email)
    user_data = serialize_user(user, db)
    
    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        resource_type="auth",
        user_id=user.id,
        user_email=user.email,
        details={"roles": [r["id"] for r in user_data["roles"]]},
        request=request
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data
    }


@router.get("/me")
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Devuelve la información y permisos del usuario actualmente autenticado."""
    return serialize_user(current_user, db)


# =========================================================================
# GESTIÓN DE USUARIOS Y ROLES (ADMINISTRACIÓN)
# =========================================================================

@router.get("/users")
def list_users(
    role_id: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista usuarios registrados en el sistema con opción de filtrar por rol."""
    query = db.query(models.User).order_by(models.User.full_name.asc())
    if role_id:
        query = query.join(models.User.roles).filter(models.Role.id == role_id)
        
    users = query.all()
    return [serialize_user(u, db) for u in users]


@router.post("/users")
def create_user(
    req: UserCreateRequest,
    request: Request,
    current_user: models.User = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db)
):
    """Crea un nuevo usuario en la plataforma con uno o más roles asignados."""
    clean_email = req.email.strip().lower()
    existing = db.query(models.User).filter(models.User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un usuario registrado con este correo electrónico.")
        
    # Validar roles
    roles = db.query(models.Role).filter(models.Role.id.in_(req.role_ids)).all()
    if not roles:
        raise HTTPException(status_code=400, detail="Debes asignar al menos un rol válido existente.")
        
    hashed_pwd = hash_password(req.password)
    dept_name = req.department or "Recursos Humanos"
    if req.department_id:
        dept_obj = db.query(models.Department).filter(models.Department.id == req.department_id).first()
        if dept_obj:
            dept_name = dept_obj.name

    new_user = models.User(
        email=clean_email,
        hashed_password=hashed_pwd,
        full_name=req.full_name.strip(),
        department=dept_name,
        department_id=req.department_id,
        is_active=True
    )
    new_user.roles = roles
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Asignar como titular o evaluador de área si fue solicitado (aprovisionamiento por puesto)
    if req.assign_as_dept_manager:
        dept_m = db.query(models.Department).filter(models.Department.id == req.assign_as_dept_manager).first()
        if dept_m:
            dept_m.manager_id = new_user.id
            new_user.department_id = dept_m.id
            new_user.department = dept_m.name
            db.commit()

    if req.assign_as_dept_trainer:
        dept_t = db.query(models.Department).filter(models.Department.id == req.assign_as_dept_trainer).first()
        if dept_t:
            dept_t.trainer_id = new_user.id
            new_user.department_id = dept_t.id
            new_user.department = dept_t.name
            db.commit()
    
    log_audit_event(
        db=db,
        action="USER_CREATED",
        resource_type="users",
        resource_id=new_user.id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={
            "created_email": clean_email, 
            "roles": req.role_ids, 
            "department_id": req.department_id,
            "assigned_manager_of": req.assign_as_dept_manager,
            "assigned_trainer_of": req.assign_as_dept_trainer
        },
        request=request
    )
    
    return serialize_user(new_user, db)


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    req: UserUpdateRequest,
    request: Request,
    current_user: models.User = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db)
):
    """Actualiza datos, roles, estado o contraseña de un usuario."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        
    if req.full_name is not None:
        user.full_name = req.full_name.strip()
    if req.department_id is not None:
        user.department_id = req.department_id if req.department_id != 0 else None
        if user.department_id:
            dept_obj = db.query(models.Department).filter(models.Department.id == user.department_id).first()
            if dept_obj:
                user.department = dept_obj.name
    elif req.department is not None:
        user.department = req.department.strip()
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.role_ids is not None:
        roles = db.query(models.Role).filter(models.Role.id.in_(req.role_ids)).all()
        user.roles = roles
    if req.new_password:
        user.hashed_password = hash_password(req.new_password)
        
    db.commit()
    db.refresh(user)
    
    log_audit_event(
        db=db,
        action="USER_UPDATED",
        resource_type="users",
        resource_id=user.id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={"updated_user": user.email, "is_active": user.is_active},
        request=request
    )
    
    return serialize_user(user, db)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    request: Request,
    current_user: models.User = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db)
):
    """Elimina definitivamente a un colaborador con validación estricta de dependencias críticas."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # 1. Protección contra auto-eliminación
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de usuario en sesión activa.")

    # 2. Protección de la cuenta SuperAdmin principal
    if user.email in ("admin@octopy.com", "admin@jpm.com"):
        raise HTTPException(status_code=400, detail="No es posible eliminar la cuenta principal del Administrador del Sistema.")

    # 3. Validación de vacantes activas a su cargo
    active_vacancies = db.query(models.Vacancy).filter(
        models.Vacancy.manager_id == user.id,
        models.Vacancy.status == 'abierta'
    ).count()
    if active_vacancies > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar a {user.full_name}: es Hiring Manager titular de {active_vacancies} vacante(s) activa(s). Reasigna las vacantes antes de eliminar."
        )

    # 4. Desvincular de áreas organizacionales donde sea titular sin fracturar la estructura
    db.query(models.Department).filter(models.Department.manager_id == user.id).update(
        {"manager_id": None}, synchronize_session=False
    )
    db.query(models.Department).filter(models.Department.trainer_id == user.id).update(
        {"trainer_id": None}, synchronize_session=False
    )
    db.query(models.Vacancy).filter(models.Vacancy.manager_id == user.id).update(
        {"manager_id": None}, synchronize_session=False
    )

    user_name = user.full_name
    user_email = user.email

    db.delete(user)
    db.commit()

    log_audit_event(
        db=db,
        action="USER_PURGED",
        resource_type="users",
        resource_id=user_id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={"deleted_user": user_email, "name": user_name},
        request=request
    )

    return {"success": True, "message": f"Usuario '{user_name}' ({user_email}) eliminado definitivamente."}


@router.get("/roles")
def list_roles(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lista el catálogo de roles disponibles y sus permisos asociados."""
    roles = db.query(models.Role).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "permissions": [p.id for p in r.permissions]
        }
        for r in roles
    ]


# =========================================================================
# CAPTURA DE EVALUACIONES POR GERENTES Y EVALUADORES DE ETAPA
# =========================================================================

NEXT_STAGES = {
    "entrevista": "roleplay",
    "roleplay": "capacitacion_1",
    "capacitacion_1": "capacitacion_2",
    "capacitacion_2": "contratado"
}

STAGE_LABELS = {
    "entrevista": "Entrevista con Gerente",
    "roleplay": "Roleplay Comercial",
    "capacitacion_1": "Capacitación 1",
    "capacitacion_2": "Capacitación 2"
}

@router.post("/evaluations")
def submit_stage_evaluation(
    req: StageEvaluationRequest,
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite al Gerente o Evaluador capturar su dictamen y retroalimentación técnica
    para Entrevista, Roleplay o Capacitación 1/2.
    Inserta una nota firmada en el expediente y opcionalmente avanza el Kanban.
    """
    app = db.query(models.Application).filter(models.Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Postulación no encontrada.")
        
    cand = app.candidate
    vac = app.vacancy
    
    # Validar permisos sobre la vacante si es Gerente_Vacante o Evaluador
    user_role_ids = [r.id for r in current_user.roles]
    is_general_staff = any(r in ("SuperAdmin", "Gerente_RH", "Reclutador_Senior") for r in user_role_ids)
    
    if not is_general_staff:
        # Verificar si el usuario está formalmente asignado como manager o evaluador de esta vacante
        is_manager = vac.manager_id == current_user.id
        is_assigned_evaluator = db.query(models.VacancyEvaluator).filter(
            models.VacancyEvaluator.vacancy_id == vac.id,
            models.VacancyEvaluator.user_id == current_user.id
        ).first() is not None
        
        if not is_manager and not is_assigned_evaluator:
            raise HTTPException(
                status_code=403, 
                detail=f"No tienes asignada la vacante '{vac.title}' para registrar evaluaciones."
            )

    verdict_emoji = "✅" if req.verdict == "aprobado" else "⚠️" if req.verdict == "requiere_refuerzo" else "❌"
    verdict_text = req.verdict.upper().replace("_", " ")
    stage_label = STAGE_LABELS.get(req.stage, req.stage.capitalize())
    
    score_text = f" | Puntuación: {req.score}%" if req.score is not None else ""
    
    note_content = (
        f"{verdict_emoji} **Evaluación de {stage_label}**{score_text}\n"
        f"• **Dictamen**: {verdict_text}\n"
        f"• **Evaluador Responsable**: {current_user.full_name} ({current_user.department or 'Evaluador'})\n\n"
        f"**Observaciones y Retroalimentación**:\n{req.notes.strip()}"
    )
    
    # Crear nota formal en la bitácora
    db_note = models.Note(
        candidate_id=cand.id,
        content=note_content,
        author=f"{current_user.full_name} ({current_user.department or 'Evaluador'})",
        stage=req.stage
    )
    db.add(db_note)
    
    # Avanzar de etapa en el Kanban si fue aprobado y se marcó advance_stage
    stage_advanced = False
    new_stage = None
    if req.verdict == "aprobado" and req.advance_stage and req.stage in NEXT_STAGES:
        new_stage = NEXT_STAGES[req.stage]
        if app.stage != new_stage:
            old_stage = app.stage
            app.stage = new_stage
            
            # Registrar historial de etapa
            history_entry = models.StageHistory(
                application_id=app.id,
                stage_from=old_stage,
                stage_to=new_stage
            )
            db.add(history_entry)
            stage_advanced = True
            
    db.commit()
    
    log_audit_event(
        db=db,
        action="SUBMIT_EVALUATION",
        resource_type="candidate",
        resource_id=cand.id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={
            "application_id": app.id,
            "vacancy": vac.title,
            "stage": req.stage,
            "verdict": req.verdict,
            "score": req.score,
            "stage_advanced": stage_advanced,
            "new_stage": new_stage
        },
        request=request
    )
    
    return {
        "status": "evaluation_saved",
        "stage": req.stage,
        "verdict": req.verdict,
        "stage_advanced": stage_advanced,
        "new_stage": new_stage,
        "note": {
            "author": db_note.author,
            "content": db_note.content,
            "stage": db_note.stage
        }
    }


# =========================================================================
# CONSULTA DE BITÁCORA DE AUDITORÍA (LFPDPPP)
# =========================================================================

@router.get("/audit-logs")
def list_audit_logs(
    limit: int = 50,
    offset: int = 0,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    current_user: models.User = Depends(require_permission("audit:read")),
    db: Session = Depends(get_db)
):
    """Consulta la bitácora inmutable de eventos sensibles de seguridad y datos personales."""
    query = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc())
    if action:
        query = query.filter(models.AuditLog.action == action.upper())
    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type.lower())
        
    total = query.count()
    logs = query.offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": [
            {
                "id": l.id,
                "user_id": l.user_id,
                "user_email": l.user_email or "Anónimo/Sistema",
                "action": l.action,
                "resource_type": l.resource_type,
                "resource_id": l.resource_id,
                "details": l.details,
                "ip_address": l.ip_address,
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in logs
        ]
    }


# =========================================================================
# GESTIÓN DINÁMICA DE ÁREAS Y DEPARTAMENTOS
# =========================================================================

def serialize_department(dept: models.Department, db: Session) -> Dict[str, Any]:
    active_vacancies = db.query(models.Vacancy).filter(
        models.Vacancy.department_id == dept.id,
        models.Vacancy.status == "abierta"
    ).count()
    users_count = db.query(models.User).filter(
        models.User.department_id == dept.id
    ).count()

    mgr_data = None
    if dept.manager:
        mgr_data = {
            "id": dept.manager.id,
            "email": dept.manager.email,
            "full_name": dept.manager.full_name,
            "department": dept.manager.department
        }
        
    trn_data = None
    if dept.trainer:
        trn_data = {
            "id": dept.trainer.id,
            "email": dept.trainer.email,
            "full_name": dept.trainer.full_name,
            "department": dept.trainer.department
        }

    return {
        "id": dept.id,
        "name": dept.name,
        "code": dept.code,
        "description": dept.description,
        "manager_id": dept.manager_id,
        "trainer_id": dept.trainer_id,
        "is_active": dept.is_active,
        "created_at": dept.created_at.isoformat() if dept.created_at else None,
        "manager": mgr_data,
        "trainer": trn_data,
        "active_vacancies_count": active_vacancies,
        "users_count": users_count
    }

class DepartmentCreateRequest(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[str] = None
    trainer_id: Optional[str] = None
    is_active: bool = True
    quick_manager_name: Optional[str] = None
    quick_manager_email: Optional[str] = None

class DepartmentUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[str] = None
    trainer_id: Optional[str] = None
    is_active: Optional[bool] = None
    quick_manager_name: Optional[str] = None
    quick_manager_email: Optional[str] = None

@router.get("/departments")
@dept_router.get("")
@dept_router.get("/")
def list_departments(
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """Lista las áreas y departamentos organizacionales con sus líderes y métricas."""
    query = db.query(models.Department).order_by(models.Department.name.asc())
    if active_only:
        query = query.filter(models.Department.is_active == True)
    depts = query.all()
    return [serialize_department(d, db) for d in depts]

@router.post("/departments", status_code=status.HTTP_201_CREATED)
@dept_router.post("", status_code=status.HTTP_201_CREATED)
@dept_router.post("/", status_code=status.HTTP_201_CREATED)
def create_department(
    req: DepartmentCreateRequest,
    request: Request,
    current_user: models.User = Depends(require_permission("settings:manage")),
    db: Session = Depends(get_db)
):
    """Crea una nueva área organizacional con su gerente y evaluador titular."""
    name_clean = req.name.strip()
    if not name_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre del área es requerido.")
        
    existing = db.query(models.Department).filter(models.Department.name.ilike(name_clean)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un área con ese nombre.")

    dept = models.Department(
        name=name_clean,
        code=req.code.strip().upper() if req.code else None,
        description=req.description.strip() if req.description else None,
        manager_id=req.manager_id if req.manager_id else None,
        trainer_id=req.trainer_id if req.trainer_id else None,
        is_active=req.is_active
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    # Alta rápida de nuevo gerente titular si fue capturado en el mismo formulario
    if req.quick_manager_name and req.quick_manager_email:
        qm_email = req.quick_manager_email.strip().lower()
        existing_mgr = db.query(models.User).filter(models.User.email == qm_email).first()
        if existing_mgr:
            dept.manager_id = existing_mgr.id
            if not existing_mgr.department_id:
                existing_mgr.department_id = dept.id
                existing_mgr.department = dept.name
        else:
            new_mgr = models.User(
                email=qm_email,
                hashed_password=hash_password("Gerente123!"),
                full_name=req.quick_manager_name.strip(),
                department=dept.name,
                department_id=dept.id,
                is_active=True
            )
            gerente_role = db.query(models.Role).filter(models.Role.id == "Gerente_Vacante").first()
            if gerente_role:
                new_mgr.roles = [gerente_role]
            db.add(new_mgr)
            db.commit()
            db.refresh(new_mgr)
            dept.manager_id = new_mgr.id

        db.commit()
        db.refresh(dept)

    log_audit_event(
        db=db,
        action="DEPARTMENT_CREATED",
        resource_type="department",
        resource_id=str(dept.id),
        user_id=current_user.id,
        user_email=current_user.email,
        details={"name": dept.name, "code": dept.code, "manager_id": dept.manager_id},
        request=request
    )

    return serialize_department(dept, db)

@router.put("/departments/{dept_id}")
@dept_router.put("/{dept_id}")
def update_department(
    dept_id: int,
    req: DepartmentUpdateRequest,
    request: Request,
    current_user: models.User = Depends(require_permission("settings:manage")),
    db: Session = Depends(get_db)
):
    """Actualiza los datos de un área o asigna nuevos líderes."""
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Área no encontrada.")

    if req.name is not None:
        name_clean = req.name.strip()
        if not name_clean:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre no puede estar vacío.")
        dept.name = name_clean

    if req.code is not None:
        dept.code = req.code.strip().upper() if req.code else None
    if req.description is not None:
        dept.description = req.description.strip() if req.description else None
    if req.manager_id is not None:
        dept.manager_id = req.manager_id if req.manager_id != "" else None
    if req.trainer_id is not None:
        dept.trainer_id = req.trainer_id if req.trainer_id != "" else None
    if req.is_active is not None:
        dept.is_active = req.is_active

    # Alta rápida de gerente si se indicó
    if req.quick_manager_name and req.quick_manager_email:
        qm_email = req.quick_manager_email.strip().lower()
        existing_mgr = db.query(models.User).filter(models.User.email == qm_email).first()
        if existing_mgr:
            dept.manager_id = existing_mgr.id
            if not existing_mgr.department_id:
                existing_mgr.department_id = dept.id
                existing_mgr.department = dept.name
        else:
            new_mgr = models.User(
                email=qm_email,
                hashed_password=hash_password("Gerente123!"),
                full_name=req.quick_manager_name.strip(),
                department=dept.name,
                department_id=dept.id,
                is_active=True
            )
            gerente_role = db.query(models.Role).filter(models.Role.id == "Gerente_Vacante").first()
            if gerente_role:
                new_mgr.roles = [gerente_role]
            db.add(new_mgr)
            db.commit()
            db.refresh(new_mgr)
            dept.manager_id = new_mgr.id

    db.commit()
    db.refresh(dept)

    log_audit_event(
        db=db,
        action="DEPARTMENT_UPDATED",
        resource_type="department",
        resource_id=str(dept.id),
        user_id=current_user.id,
        user_email=current_user.email,
        details={"name": dept.name, "code": dept.code, "manager_id": dept.manager_id},
        request=request
    )

    return serialize_department(dept, db)

@router.delete("/departments/{dept_id}")
@dept_router.delete("/{dept_id}")
def delete_or_toggle_department(
    dept_id: int,
    request: Request,
    hard: bool = False,
    current_user: models.User = Depends(require_permission("settings:manage")),
    db: Session = Depends(get_db)
):
    """
    Si hard=False (default): Desactiva o activa un área organizacional (Soft delete).
    Si hard=True: Elimina físicamente el área siempre que no tenga vacantes vinculadas (Prevención de datos huérfanos).
    """
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Área no encontrada.")

    if not hard:
        dept.is_active = not dept.is_active
        db.commit()
        db.refresh(dept)

        log_audit_event(
            db=db,
            action="DEPARTMENT_TOGGLE_ACTIVE",
            resource_type="department",
            resource_id=str(dept.id),
            user_id=current_user.id,
            user_email=current_user.email,
            details={"name": dept.name, "is_active": dept.is_active},
            request=request
        )

        return serialize_department(dept, db)

    # Hard Delete con validación estricta de dependencias
    # 1. Validar si tiene vacantes vinculadas (evitar huérfanos)
    vacancies_count = db.query(models.Vacancy).filter(models.Vacancy.department_id == dept.id).count()
    if vacancies_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No es posible eliminar de forma definitiva el área '{dept.name}': tiene {vacancies_count} vacante(s) vinculada(s). Debes reasignar o eliminar dichas vacantes primero, o simplemente desactivar el área para preservar el histórico."
        )

    # 2. Desvincular colaboradores asociados sin romper los registros de usuario
    db.query(models.User).filter(models.User.department_id == dept.id).update(
        {"department_id": None, "department": "Sin Área Asignada"},
        synchronize_session=False
    )

    dept_name = dept.name
    db.delete(dept)
    db.commit()

    log_audit_event(
        db=db,
        action="DEPARTMENT_PURGED",
        resource_type="department",
        resource_id=str(dept_id),
        user_id=current_user.id,
        user_email=current_user.email,
        details={"name": dept_name, "message": "Área eliminada definitivamente"},
        request=request
    )

    return {"success": True, "message": f"Área '{dept_name}' eliminada definitivamente de la base de datos."}
