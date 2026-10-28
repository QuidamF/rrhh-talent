import uuid
from sqlalchemy import Table, Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

from sqlalchemy.types import TypeDecorator

class EncryptedString(TypeDecorator):
    """
    Tipo de dato personalizado para SQLAlchemy que aplica cifrado simétrico en reposo
    al escribir y descifrado transparente al leer de la base de datos (Field-Level Encryption).
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            from app.services.crypto_service import encrypt_string
            return encrypt_string(str(value))
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            from app.services.crypto_service import decrypt_string
            return decrypt_string(str(value))
        return value

def generate_uuid():
    return str(uuid.uuid4())

class Department(Base):
    """Catálogo dinámico de Áreas y Departamentos de la Organización."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(20), nullable=True)  # ej. 'COM', 'CAP', 'RH', 'TI', 'OPE'
    description = Column(String(255), nullable=True)
    manager_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    trainer_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    manager = relationship("User", foreign_keys=[manager_id], lazy="joined")
    trainer = relationship("User", foreign_keys=[trainer_id], lazy="joined")
    vacancies = relationship("Vacancy", back_populates="department")
    users = relationship("User", back_populates="department_rel", foreign_keys="User.department_id")

class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    evaluation_criteria = Column(JSON, nullable=True)  # Lista de criterios con pesos
    status = Column(String(50), default="abierta")  # abierta, cerrada
    min_age = Column(Integer, nullable=True)  # Rango de edad deseado: mínima
    max_age = Column(Integer, nullable=True)  # Rango de edad deseado: máxima
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True) # Área asignada
    manager_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True) # Gerente responsable
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    applications = relationship("Application", back_populates="vacancy", cascade="all, delete-orphan")
    department = relationship("Department", back_populates="vacancies", lazy="joined")
    manager = relationship("User", foreign_keys=[manager_id], back_populates="managed_vacancies", lazy="joined")
    evaluator_assignments = relationship("VacancyEvaluator", back_populates="vacancy", cascade="all, delete-orphan", lazy="joined")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    skills = Column(JSON, nullable=True)  # Lista de habilidades extraídas
    raw_text = Column(Text, nullable=True)  # Texto completo extraído del PDF
    filename = Column(String(255), nullable=False)
    status = Column(String(50), default="creado")  # creado, procesando, completado, error
    telegram_chat_id = Column(String(50), nullable=True)
    curp = Column(EncryptedString, nullable=True)
    birth_date = Column(EncryptedString, nullable=True)
    calculated_age = Column(Integer, nullable=True)
    id_document_path = Column(String(255), nullable=True)
    id_document_name = Column(String(200), nullable=True)
    id_validation_status = Column(String(50), default="no_solicitado")  # no_solicitado, solicitado, validado, validado_prueba, discrepancia
    id_document_expires_at = Column(DateTime(timezone=True), nullable=True)  # Fecha/hora límite de retención temporal
    id_evidence_hash = Column(String(64), nullable=True)  # SHA-256 de la foto para auditoría criptográfica
    id_document_purged = Column(Boolean, default=False)  # Indica si el documento físico fue destruido
    source = Column(String(100), default="No especificada", nullable=True)  # Plataforma de origen (OCC, Indeed, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="candidate", cascade="all, delete-orphan")
    logs = relationship("ProcessingLog", back_populates="candidate", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(String(50), ForeignKey("candidates.id"), nullable=False)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id"), nullable=False)
    stage = Column(String(50), default="cv_recibido")  # cv_recibido, entrevista, oferta, contratado, rechazado
    score = Column(Float, nullable=True)  # Puntuación final de compatibilidad (0-100)
    evaluation_feedback = Column(JSON, nullable=True)  # Análisis detallado por criterio de evaluación
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    candidate = relationship("Candidate", back_populates="applications")
    vacancy = relationship("Vacancy", back_populates="applications")
    stage_history = relationship("StageHistory", back_populates="application", cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(String(50), ForeignKey("candidates.id"), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String(100), default="Reclutador")
    stage = Column(String(50), nullable=True)  # Etapa en la que se generó la nota
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    candidate = relationship("Candidate", back_populates="notes")


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(String(50), ForeignKey("candidates.id"), nullable=False)
    step = Column(String(100), nullable=False)  # lectura_pdf, extraccion_ia, evaluacion
    status = Column(String(50), nullable=False)  # exito, error
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    candidate = relationship("Candidate", back_populates="logs")


class StageHistory(Base):
    __tablename__ = "stage_histories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    stage_from = Column(String(50), nullable=True)
    stage_to = Column(String(50), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    application = relationship("Application", back_populates="stage_history")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(String(50), ForeignKey("candidates.id"), nullable=False)
    direction = Column(String(20), nullable=False)  # "inbound" o "outbound"
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    candidate = relationship("Candidate")


# =========================================================================
# MODELOS DE AUTENTICACIÓN, RBAC Y AUDITORÍA (Fase P1)
# =========================================================================

# Tabla asociativa Muchos a Muchos: Usuarios <-> Roles
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", String(50), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", String(50), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
)

# Tabla asociativa Muchos a Muchos: Roles <-> Permisos
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", String(50), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", String(80), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, default=generate_uuid)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    department = Column(String(100), nullable=True, default="Recursos Humanos")  # Compatibilidad de texto
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True) # Área asignada
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    roles = relationship("Role", secondary=user_roles, back_populates="users", lazy="joined")
    managed_vacancies = relationship("Vacancy", foreign_keys="Vacancy.manager_id", back_populates="manager")
    evaluator_assignments = relationship("VacancyEvaluator", back_populates="user", cascade="all, delete-orphan")
    department_rel = relationship("Department", back_populates="users", foreign_keys=[department_id], lazy="joined")


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(50), primary_key=True)  # 'SuperAdmin', 'Gerente_RH', 'Reclutador_Senior', 'Reclutador_Junior', 'Gerente_Vacante', 'Evaluador_Capacitacion', 'Auditor_Privacidad'
    name = Column(String(80), nullable=False)
    description = Column(String(255), nullable=True)
    is_system_role = Column(Boolean, default=True)

    # Relaciones
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="joined")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(80), primary_key=True)  # 'candidates:read', 'vacancies:edit', 'id_docs:view', etc.
    module = Column(String(50), nullable=False)  # 'candidates', 'vacancies', 'kanban', 'settings', 'audit', 'users'
    description = Column(String(255), nullable=True)

    # Relaciones
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")


class VacancyEvaluator(Base):
    """Asocia evaluadores o gerentes a vacantes y etapas específicas."""
    __tablename__ = "vacancy_evaluators"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(50), default="todas")  # 'entrevista', 'roleplay', 'capacitacion_1', 'capacitacion_2', 'todas'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    user = relationship("User", back_populates="evaluator_assignments", lazy="joined")
    vacancy = relationship("Vacancy", back_populates="evaluator_assignments")


class AuditLog(Base):
    """Bitácora inmutable de eventos sensibles y accesos a datos personales (LFPDPPP)."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=True)
    user_email = Column(String(120), nullable=True)
    action = Column(String(80), nullable=False)  # 'LOGIN', 'VIEW_INE', 'DOWNLOAD_CV', 'SUBMIT_EVALUATION', 'TRANSFER_VACANCY', 'UPDATE_SETTINGS', etc.
    resource_type = Column(String(50), nullable=False)  # 'candidate', 'vacancy', 'auth', 'settings', 'system'
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

