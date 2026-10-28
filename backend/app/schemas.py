from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

# ==========================================================================
# NOTAS
# ==========================================================================
class NoteBase(BaseModel):
    content: str
    author: Optional[str] = "Reclutador"
    stage: Optional[str] = None

class NoteCreate(NoteBase):
    candidate_id: Optional[str] = None

class Note(NoteBase):
    id: int
    candidate_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================================================
# LOGS DE PROCESAMIENTO
# ==========================================================================
class ProcessingLogBase(BaseModel):
    step: str
    status: str
    message: Optional[str] = None

class ProcessingLog(ProcessingLogBase):
    id: int
    candidate_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================================================
# HISTORIAL DE ETAPAS KANBAN
# ==========================================================================
class StageHistoryBase(BaseModel):
    stage_from: Optional[str] = None
    stage_to: str

class StageHistory(StageHistoryBase):
    id: int
    application_id: int
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================================================
# VACANTES
# ==========================================================================
class UserSimple(BaseModel):
    id: str
    email: str
    full_name: str
    department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# ==========================================================================
# DEPARTAMENTOS / ÁREAS ORGANIZACIONALES
# ==========================================================================
class DepartmentSimple(BaseModel):
    id: int
    name: str
    code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DepartmentBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[str] = None
    trainer_id: Optional[str] = None
    is_active: Optional[bool] = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[str] = None
    trainer_id: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    manager: Optional[UserSimple] = None
    trainer: Optional[UserSimple] = None
    active_vacancies_count: int = 0
    users_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class VacancyEvaluatorSimple(BaseModel):
    id: int
    user_id: str
    stage: str
    user: Optional[UserSimple] = None

    model_config = ConfigDict(from_attributes=True)

class VacancyBase(BaseModel):
    title: str
    description: str
    requirements: Optional[str] = None
    evaluation_criteria: Optional[List[Dict[str, Any]]] = None # Lista de criterios [{name: "X", weight: 0.3}]
    status: Optional[str] = "abierta"
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    department_id: Optional[int] = None
    manager_id: Optional[str] = None

class VacancyCreate(VacancyBase):
    evaluator_ids: Optional[List[Dict[str, Any]]] = None  # [{"user_id": "...", "stage": "capacitacion_1"}]

class Vacancy(VacancyBase):
    id: int
    created_at: datetime
    department: Optional[DepartmentSimple] = None
    manager: Optional[UserSimple] = None
    evaluator_assignments: List[VacancyEvaluatorSimple] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================================================
# ESQUEMAS SIMPLES DE RELACIONES (Para evitar imports circulares)
# ==========================================================================
class VacancySimple(BaseModel):
    id: int
    title: str
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    department_id: Optional[int] = None
    department: Optional[DepartmentSimple] = None
    manager_id: Optional[str] = None
    manager: Optional[UserSimple] = None

    model_config = ConfigDict(from_attributes=True)

class ApplicationSimple(BaseModel):
    id: int
    vacancy_id: int
    vacancy: VacancySimple
    stage: str
    score: Optional[float] = None
    created_at: datetime
    stage_history: List[StageHistory] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================================================
# CANDIDATOS
# ==========================================================================
class CandidateBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[List[str]] = None
    filename: str
    status: Optional[str] = "creado"
    curp: Optional[str] = None
    birth_date: Optional[str] = None
    calculated_age: Optional[int] = None
    id_document_path: Optional[str] = None
    id_document_name: Optional[str] = None
    id_validation_status: Optional[str] = "no_solicitado"
    id_document_expires_at: Optional[datetime] = None
    id_evidence_hash: Optional[str] = None
    id_document_purged: Optional[bool] = False
    source: Optional[str] = "No especificada"

class CandidateCreate(CandidateBase):
    raw_text: Optional[str] = None

class CandidateSourceUpdate(BaseModel):
    source: str

class SourceCreate(BaseModel):
    name: str

class SourceRename(BaseModel):
    old_name: str
    new_name: str

class SourceItem(BaseModel):
    name: str
    count: int = 0
    is_default: bool = False

class Candidate(CandidateBase):
    id: str
    created_at: datetime
    notes: List[Note] = []
    logs: List[ProcessingLog] = []
    applications: List[ApplicationSimple] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================================================
# POSTULACIONES
# ==========================================================================
class ApplicationBase(BaseModel):
    candidate_id: str
    vacancy_id: int
    stage: Optional[str] = "cv_recibido"
    score: Optional[float] = None
    evaluation_feedback: Optional[Dict[str, Any]] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    stage: Optional[str] = None
    score: Optional[float] = None
    evaluation_feedback: Optional[Dict[str, Any]] = None

class ApplicationTransfer(BaseModel):
    target_vacancy_id: int
    reevaluate: bool = True

class Application(ApplicationBase):
    id: int
    created_at: datetime
    candidate: Candidate
    vacancy: Vacancy
    stage_history: List[StageHistory] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================================================
# CONFIGURACIONES (SETTINGS)
# ==========================================================================
class SettingResponse(BaseModel):
    key: str
    value: str

    model_config = ConfigDict(from_attributes=True)

class SettingsUpdate(BaseModel):
    bot_name: Optional[str] = None
    telegram_bot_username: Optional[str] = None
    bot_core_prompt: Optional[str] = None
    privacy_notice: Optional[str] = None
    top_candidates_limit: Optional[str] = None
    score_range_high: Optional[str] = None
    score_range_mid: Optional[str] = None
