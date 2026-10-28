import logging
from sqlalchemy.orm import Session
from app import models
from app.routers.auth_rbac import hash_password

logger = logging.getLogger("rh.seed_rbac")

DEFAULT_PERMISSIONS = [
    ("candidates:read", "candidates", "Ver candidatos y expedientes laborales"),
    ("candidates:create", "candidates", "Registrar o postular nuevos candidatos"),
    ("candidates:edit", "candidates", "Editar datos generales del candidato"),
    ("candidates:delete", "candidates", "Eliminar expedientes de candidatos"),
    ("candidates:transfer", "candidates", "Transferir candidato a otra vacante"),
    ("id_docs:view", "candidates", "Consultar fotografía de identificación oficial (INE)"),
    ("id_docs:purge", "candidates", "Purgar documento INE por LFPDPPP / Derecho ARCO"),
    ("vacancies:manage", "vacancies", "Crear, editar, pausar o cerrar vacantes"),
    ("kanban:manage", "kanban", "Mover candidatos entre etapas del embudo"),
    ("evaluations:submit", "evaluations", "Registrar evaluaciones y dictámenes de etapa"),
    ("settings:manage", "settings", "Configurar parámetros del bot, prompts y flujo"),
    ("audit:read", "audit", "Consultar bitácora de auditoría del sistema"),
    ("users:manage", "users", "Administrar usuarios, roles y permisos"),
]

DEFAULT_ROLES = [
    {
        "id": "SuperAdmin",
        "name": "Super Administrador",
        "description": "Acceso total a todos los módulos y configuraciones del sistema",
        "permissions": [p[0] for p in DEFAULT_PERMISSIONS]
    },
    {
        "id": "Gerente_RH",
        "name": "Gerente de Recursos Humanos",
        "description": "Gestión integral de selección, vacantes, candidatos y configuraciones",
        "permissions": [
            "candidates:read", "candidates:create", "candidates:edit", "candidates:transfer",
            "id_docs:view", "vacancies:manage", "kanban:manage", "evaluations:submit",
            "settings:manage", "audit:read", "users:manage"
        ]
    },
    {
        "id": "Reclutador_Senior",
        "name": "Reclutador Senior",
        "description": "Operación completa de vacantes, candidatos, INE y transferencias",
        "permissions": [
            "candidates:read", "candidates:create", "candidates:edit", "candidates:transfer",
            "id_docs:view", "vacancies:manage", "kanban:manage", "evaluations:submit"
        ]
    },
    {
        "id": "Reclutador_Junior",
        "name": "Reclutador Junior",
        "description": "Revisión básica de candidatos y movimiento en el embudo",
        "permissions": [
            "candidates:read", "candidates:create", "id_docs:view", "kanban:manage"
        ]
    },
    {
        "id": "Gerente_Vacante",
        "name": "Gerente de Vacante (Hiring Manager)",
        "description": "Evaluador de Entrevista y Roleplay para candidatos de sus vacantes asignadas",
        "permissions": [
            "candidates:read", "evaluations:submit", "kanban:manage"
        ]
    },
    {
        "id": "Evaluador_Capacitacion",
        "name": "Evaluador de Capacitación",
        "description": "Evaluador de Capacitación 1 y 2 para postulantes asignados",
        "permissions": [
            "candidates:read", "evaluations:submit", "kanban:manage"
        ]
    },
    {
        "id": "Auditor_Privacidad",
        "name": "Auditor de Privacidad y Cumplimiento",
        "description": "Auditoría de accesos, bitácora LFPDPPP y purga de documentos",
        "permissions": [
            "audit:read", "candidates:read", "id_docs:purge"
        ]
    }
]

DEFAULT_USERS = [
    {
        "email": "admin@octopy.com",
        "password": "Admin1234!",
        "full_name": "Administrador del Sistema",
        "department": "Tecnología e Innovación",
        "roles": ["SuperAdmin"]
    },
    {
        "email": "reclutador@octopy.com",
        "password": "Reclutador123!",
        "full_name": "Lic. Ana Martínez (RH)",
        "department": "Recursos Humanos",
        "roles": ["Reclutador_Senior"]
    },
    {
        "email": "gerente.ventas@octopy.com",
        "password": "Gerente123!",
        "full_name": "Carlos Mendoza (Gerente Comercial)",
        "department": "Ventas y Comercial",
        "roles": ["Gerente_Vacante"]
    },
    {
        "email": "capacitador@octopy.com",
        "password": "Capacita123!",
        "full_name": "Sofía Reyes (Instructor Líder)",
        "department": "Capacitación y Calidad",
        "roles": ["Evaluador_Capacitacion"]
    },
    {
        "email": "auditor@octopy.com",
        "password": "Auditor123!",
        "full_name": "Lic. Roberto Garza (Auditor)",
        "department": "Auditoría y Cumplimiento Legal",
        "roles": ["Auditor_Privacidad"]
    }
]

def seed_rbac(db: Session):
    """Puebla o sincroniza los permisos, roles y usuarios iniciales del sistema."""
    logger.info("Iniciando semillero de permisos RBAC...")
    # 1. Permisos
    for code, mod, desc in DEFAULT_PERMISSIONS:
        perm = db.query(models.Permission).filter(models.Permission.id == code).first()
        if not perm:
            perm = models.Permission(id=code, module=mod, description=desc)
            db.add(perm)
        else:
            perm.module = mod
            perm.description = desc
    db.commit()

    # 2. Roles
    for r_def in DEFAULT_ROLES:
        role = db.query(models.Role).filter(models.Role.id == r_def["id"]).first()
        if not role:
            role = models.Role(
                id=r_def["id"],
                name=r_def["name"],
                description=r_def["description"],
                is_system_role=True
            )
            db.add(role)
            db.commit()
            db.refresh(role)
        else:
            role.name = r_def["name"]
            role.description = r_def["description"]

        # Asignar permisos al rol
        perms = db.query(models.Permission).filter(models.Permission.id.in_(r_def["permissions"])).all()
        role.permissions = perms
        db.commit()

    # 3. Usuarios de demostración / iniciales
    created_users = {}
    for u_def in DEFAULT_USERS:
        u = db.query(models.User).filter(models.User.email == u_def["email"]).first()
        if not u:
            u = models.User(
                email=u_def["email"],
                hashed_password=hash_password(u_def["password"]),
                full_name=u_def["full_name"],
                department=u_def["department"],
                is_active=True
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        
        # Asignar roles
        roles = db.query(models.Role).filter(models.Role.id.in_(u_def["roles"])).all()
        u.roles = roles
        db.commit()
        created_users[u.email] = u

    # 4. Departamentos y Áreas Organizacionales
    DEFAULT_DEPARTMENTS = [
        {
            "name": "Ventas y Comercial",
            "code": "COM",
            "description": "Fuerza de ventas, prospección, desarrollo comercial y alianzas.",
            "manager_email": "gerente.ventas@octopy.com",
            "trainer_email": "capacitador@octopy.com"
        },
        {
            "name": "Capacitación y Calidad",
            "code": "CAP",
            "description": "Formación técnica, inducción institucional, roleplays y desarrollo continuo.",
            "manager_email": "capacitador@octopy.com",
            "trainer_email": "capacitador@octopy.com"
        },
        {
            "name": "Recursos Humanos",
            "code": "RH",
            "description": "Atracción de talento, selección, clima laboral y relaciones laborales.",
            "manager_email": "reclutador@octopy.com",
            "trainer_email": None
        },
        {
            "name": "Tecnología e Innovación",
            "code": "TI",
            "description": "Sistemas, inteligencia artificial, infraestructura tecnológica y desarrollo.",
            "manager_email": "admin@octopy.com",
            "trainer_email": None
        },
        {
            "name": "Auditoría Legal y Privacidad",
            "code": "AUD",
            "description": "Cumplimiento normativo, LFPDPPP, contratos y control de procesos.",
            "manager_email": "auditor@octopy.com",
            "trainer_email": None
        }
    ]

    created_depts = {}
    for d_def in DEFAULT_DEPARTMENTS:
        mgr = created_users.get(d_def["manager_email"])
        trn = created_users.get(d_def["trainer_email"]) if d_def["trainer_email"] else None
        
        dept = db.query(models.Department).filter(models.Department.name == d_def["name"]).first()
        if not dept:
            dept = models.Department(
                name=d_def["name"],
                code=d_def["code"],
                description=d_def["description"],
                manager_id=mgr.id if mgr else None,
                trainer_id=trn.id if trn else None,
                is_active=True
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
        else:
            if not dept.manager_id and mgr:
                dept.manager_id = mgr.id
            if not dept.trainer_id and trn:
                dept.trainer_id = trn.id
            db.commit()
        created_depts[dept.name] = dept

    # Asignar department_id a los usuarios existentes
    for u in created_users.values():
        for dept_name, d_obj in created_depts.items():
            if d_obj.name.lower() in u.department.lower() or u.department.lower() in d_obj.name.lower():
                u.department_id = d_obj.id
                break
    db.commit()

    # 5. Asignar al Área Comercial y Gerente a las vacantes existentes
    com_dept = created_depts.get("Ventas y Comercial")
    gerente_user = created_users.get("gerente.ventas@octopy.com")
    capacitador_user = created_users.get("capacitador@octopy.com")
    
    vacancies = db.query(models.Vacancy).all()
    for vac in vacancies:
        if not vac.department_id and com_dept:
            vac.department_id = com_dept.id
        if not vac.manager_id and gerente_user:
            vac.manager_id = gerente_user.id
        
        # Asegurar que capacitador esté como evaluador de capacitacion si no hay nadie
        if capacitador_user:
            existing_eval = db.query(models.VacancyEvaluator).filter(
                models.VacancyEvaluator.vacancy_id == vac.id,
                models.VacancyEvaluator.user_id == capacitador_user.id
            ).first()
            if not existing_eval:
                new_eval = models.VacancyEvaluator(
                    vacancy_id=vac.id,
                    user_id=capacitador_user.id,
                    stage="capacitacion_1"
                )
                db.add(new_eval)
    db.commit()

    logger.info("Semillero RBAC completado con éxito.")

if __name__ == "__main__":
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        seed_rbac(db)
        print("RBAC y usuarios sembrados exitosamente.")
    finally:
        db.close()
