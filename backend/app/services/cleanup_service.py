import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models

logger = logging.getLogger("rh.cleanup_service")

def secure_delete_file(file_path: str) -> bool:
    """
    Elimina físicamente un archivo de forma segura.
    Realiza una sobreescritura previa de bytes con ceros antes de invocar os.remove.
    """
    if not file_path or not os.path.exists(file_path):
        return False
    try:
        file_size = os.path.getsize(file_path)
        # Sobreescritura segura (1 pasada con ceros)
        with open(file_path, "ba+", buffering=0) as f:
            f.write(b"\x00" * file_size)
        os.remove(file_path)
        logger.info(f"Archivo eliminado de forma segura con sobreescritura: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error durante la destrucción segura del archivo {file_path}: {e}")
        # Intento de eliminación estándar si falló la sobreescritura
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception as fallback_err:
            logger.error(f"Fallo crítico al eliminar archivo {file_path}: {fallback_err}")
        return False

def purge_candidate_id_document(
    candidate_id: str, 
    db: Session, 
    reason: str = "Expiración de TTL de retención temporal"
) -> Dict[str, Any]:
    """
    Purga y destruye permanentemente la imagen física del documento de identidad
    de un candidato, conservando el estatus de validación y el hash criptográfico como constancia.
    """
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        return {"success": False, "message": "Candidato no encontrado."}

    original_path = candidate.id_document_path
    file_deleted = False

    if original_path:
        file_deleted = secure_delete_file(original_path)

    # Actualizar estado en base de datos
    candidate.id_document_path = None
    candidate.id_document_purged = True

    # Registrar nota de auditoría interna
    purge_note = models.Note(
        candidate_id=candidate.id,
        content=(
            f"🛡️ **Destrucción Segura de Documento de Identidad**:\n"
            f"- **Motivo**: {reason}\n"
            f"- **Archivo físico destruido**: {'Sí' if file_deleted else 'No existía en disco'}\n"
            f"- **Hash Criptográfico de Evidencia**: `{candidate.id_evidence_hash or 'N/A'}`\n"
            f"- **Estatus de Identidad Mantenido**: {candidate.id_validation_status}"
        ),
        author="Sistema de Seguridad (Auto-Purga)",
        stage=None
    )
    db.add(purge_note)
    db.commit()

    logger.info(f"Identificación purgada exitosamente para candidato {candidate.id} ({candidate.name}). Motivo: {reason}")
    return {
        "success": True,
        "candidate_id": candidate.id,
        "file_deleted": file_deleted,
        "evidence_hash": candidate.id_evidence_hash,
        "message": "Documento purgado y destruido con éxito."
    }

def purge_expired_id_documents(db: Session) -> int:
    """
    Busca todas las identificaciones cuya fecha de expiración haya sido rebasada
    y las destruye de forma segura.
    """
    now = datetime.now(timezone.utc)
    expired_candidates = db.query(models.Candidate).filter(
        models.Candidate.id_document_path.isnot(None),
        models.Candidate.id_document_expires_at.isnot(None),
        models.Candidate.id_document_expires_at <= now
    ).all()

    purged_count = 0
    for cand in expired_candidates:
        res = purge_candidate_id_document(cand.id, db, reason="Expiración automática de retención temporal (TTL cumplido)")
        if res.get("success"):
            purged_count += 1

    if purged_count > 0:
        logger.info(f"Ciclo de auto-purga completado: {purged_count} documentos de identidad destruidos.")
    return purged_count

def get_storage_and_database_stats(db: Session) -> Dict[str, Any]:
    """
    Calcula estadísticas en tiempo real del almacenamiento físico y registros de base de datos.
    """
    from app.config import settings
    storage_dir = settings.storage_path
    cv_files_count = 0
    cv_files_bytes = 0

    if os.path.exists(storage_dir):
        for fname in os.listdir(storage_dir):
            fpath = os.path.join(storage_dir, fname)
            if os.path.isfile(fpath):
                try:
                    cv_files_bytes += os.path.getsize(fpath)
                    cv_files_count += 1
                except Exception:
                    pass

    candidates_total = db.query(models.Candidate).count()
    applications_total = db.query(models.Application).count()
    vacancies_total = db.query(models.Vacancy).count()
    chat_messages_total = db.query(models.ChatMessage).count()
    notes_total = db.query(models.Note).count()
    logs_total = db.query(models.ProcessingLog).count()
    users_total = db.query(models.User).count()
    audit_logs_total = db.query(models.AuditLog).count()

    id_docs_active = db.query(models.Candidate).filter(
        models.Candidate.id_document_path.isnot(None),
        models.Candidate.id_document_purged.is_(False)
    ).count()

    id_docs_purged = db.query(models.Candidate).filter(
        models.Candidate.id_document_purged.is_(True)
    ).count()

    return {
        "candidates_total": candidates_total,
        "applications_total": applications_total,
        "vacancies_total": vacancies_total,
        "chat_messages_total": chat_messages_total,
        "notes_total": notes_total,
        "logs_total": logs_total,
        "users_total": users_total,
        "audit_logs_total": audit_logs_total,
        "cv_files_count": cv_files_count,
        "cv_files_bytes": cv_files_bytes,
        "cv_files_mb": round(cv_files_bytes / (1024 * 1024), 2),
        "id_docs_active": id_docs_active,
        "id_docs_purged": id_docs_purged,
        "storage_path": storage_dir,
        "storage_accessible": os.path.exists(storage_dir) and os.access(storage_dir, os.W_OK)
    }

def purge_physical_cv_files(db: Session, reason: str = "Purga de archivos físicos de almacenamiento") -> Dict[str, Any]:
    """
    Destruye de forma segura todos los archivos PDF y fotos de identidad en disco (storage_path),
    liberando espacio pero conservando la estructura de candidatos y métricas estadísticas.
    """
    from app.config import settings
    storage_dir = settings.storage_path
    deleted_files = 0
    bytes_freed = 0

    if os.path.exists(storage_dir):
        for fname in os.listdir(storage_dir):
            fpath = os.path.join(storage_dir, fname)
            if os.path.isfile(fpath):
                try:
                    fsize = os.path.getsize(fpath)
                    if secure_delete_file(fpath):
                        deleted_files += 1
                        bytes_freed += fsize
                except Exception as e:
                    logger.error(f"Error purgando archivo en disco {fpath}: {e}")

    # Actualizar estado de documentos de identidad de candidatos
    candidates = db.query(models.Candidate).all()
    for cand in candidates:
        if cand.id_document_path:
            cand.id_document_path = None
            cand.id_document_purged = True

        note = models.Note(
            candidate_id=cand.id,
            content=f"🗑️ Archivo físico de CV / Identificación destruido de forma segura. Motivo: {reason}",
            author="Sistema de Mantenimiento",
            stage=None
        )
        db.add(note)

    db.commit()
    logger.info(f"Purga física completada: {deleted_files} archivos eliminados, {bytes_freed} bytes liberados.")
    return {
        "success": True,
        "deleted_files": deleted_files,
        "bytes_freed": bytes_freed,
        "bytes_freed_mb": round(bytes_freed / (1024 * 1024), 2),
        "candidates_updated": len(candidates),
        "message": f"Se eliminaron {deleted_files} archivos físicos ({round(bytes_freed / (1024 * 1024), 2)} MB liberados)."
    }

def purge_all_candidates_and_cvs(db: Session, reason: str = "Purga masiva de candidatos y CVs") -> Dict[str, Any]:
    """
    Purga y destruye permanentemente todos los candidatos, archivos de CV, notas, logs,
    mensajes de chat y postulaciones de todas las vacantes. Las vacantes, departamentos y usuarios se preservan.
    """
    from app.config import settings
    storage_dir = settings.storage_path
    deleted_files = 0
    bytes_freed = 0

    # 1. Destrucción física de archivos en disco
    if os.path.exists(storage_dir):
        for fname in os.listdir(storage_dir):
            fpath = os.path.join(storage_dir, fname)
            if os.path.isfile(fpath):
                try:
                    fsize = os.path.getsize(fpath)
                    if secure_delete_file(fpath):
                        deleted_files += 1
                        bytes_freed += fsize
                except Exception as e:
                    logger.error(f"Error purgando archivo {fpath}: {e}")

    # 2. Conteo previo
    candidates_count = db.query(models.Candidate).count()
    apps_count = db.query(models.Application).count()
    msgs_count = db.query(models.ChatMessage).count()

    # 3. Eliminación secuencial segura en BD
    db.query(models.ChatMessage).delete()
    db.query(models.StageHistory).delete()
    db.query(models.Note).delete()
    db.query(models.ProcessingLog).delete()
    db.query(models.Application).delete()
    db.query(models.Candidate).delete()
    db.commit()

    logger.info(f"Purga de candidatos completada: {candidates_count} candidatos, {apps_count} postulaciones, {deleted_files} archivos eliminados.")
    return {
        "success": True,
        "purged_candidates": candidates_count,
        "purged_applications": apps_count,
        "purged_messages": msgs_count,
        "deleted_files": deleted_files,
        "bytes_freed": bytes_freed,
        "bytes_freed_mb": round(bytes_freed / (1024 * 1024), 2),
        "message": f"Se eliminaron exitosamente {candidates_count} candidatos, {apps_count} postulaciones y {deleted_files} archivos físicos."
    }

def purge_system_complete(db: Session, seed_sample_vacancies: bool = True, reason: str = "Purga completa del ecosistema") -> Dict[str, Any]:
    """
    Reset total del ecosistema (Factory Reset):
    - Destruye todos los archivos de CVs y fotos.
    - Purga candidatos, postulaciones, notas, chats y logs.
    - Resetea vacantes y asignaciones de evaluadores (re-sembrando vacantes limpias de Octopy si se indica).
    - PRESERVA de forma inmutable usuarios, roles de seguridad, departamentos y configuraciones globales.
    """
    # 1. Purgar archivos y candidatos
    cand_res = purge_all_candidates_and_cvs(db, reason=reason)

    # 2. Purgar vacantes y evaluadores asignados
    vacancies_count = db.query(models.Vacancy).count()
    db.query(models.VacancyEvaluator).delete()
    db.query(models.Vacancy).delete()
    db.commit()

    seeded_vacancies = 0
    if seed_sample_vacancies:
        # Re-crear 2 vacantes base modelo para Octopy
        v1 = models.Vacancy(
            title="Especialista en IA & Visión Computacional",
            description="Liderar el diseño e implementación de modelos de visión artificial, redes neuronales y agentes autónomos para robótica de servicio y automatización industrial.",
            requirements="Licenciatura o Maestría en Computación, Mecatrónica o afín. Experiencia sólida con Python, PyTorch/TensorFlow, OpenCV, LLMs e integración de APIs en tiempo real.",
            evaluation_criteria=[
                {"nombre": "Experiencia en Deep Learning y Visión Artificial", "peso": 0.40},
                {"nombre": "Arquitectura y Desarrollo en Python / C++", "peso": 0.35},
                {"nombre": "Integración de Modelos de Lenguaje y Agentes", "peso": 0.25}
            ],
            status="abierta",
            min_age=23,
            max_age=45
        )
        v2 = models.Vacancy(
            title="Ingeniero de Robótica & Automatización",
            description="Desarrollo de software embebido, control cinemático y navegación autónoma para robots de servicio en entornos colaborativos y de retail.",
            requirements="Ingeniería Mecatrónica, Robótica o Electrónica. Experiencia con ROS/ROS2, microcontroladores, protocolos CAN/UART y sensores LiDAR.",
            evaluation_criteria=[
                {"nombre": "Dominio de ROS / ROS2 y Navegación Autónoma", "peso": 0.45},
                {"nombre": "Integración Electromecánica y Sensores", "peso": 0.30},
                {"nombre": "Resolución de Problemas y Trabajo en Equipo", "peso": 0.25}
            ],
            status="abierta",
            min_age=22,
            max_age=50
        )
        v3 = models.Vacancy(
            title="Programa Semillero de Talento - Becarios y Prácticas Multidisciplinarias",
            description="Convocatoria abierta para estudiantes de últimos semestres y recién egresados interesados en integrarse a proyectos de tecnología, robótica, operaciones y negocios en Octopy. Se asignará a los talentos seleccionados a uno de nuestros 4 ejes según su perfil: 1) Ingeniería y Software (Sistemas, Mecatrónica, Electrónica, Mecánica), 2) Negocios y Comercial (Ventas B2B, Prospección, Cuentas Clave), 3) Creativo y Marketing (Diseño Gráfico, UI/UX, Contenido, Redes), o 4) Administración y Operaciones (Gestión de Proyectos, Finanzas, RH).",
            requirements="Estudiante activo (últimos semestres) o recién egresado de Ingeniería, Licenciatura o Carrera Técnica afín a Sistemas, Mecatrónica, Electrónica, Mecánica, Comercial, Marketing, Administración o Diseño. Disponibilidad de 25 a 30 horas semanales. Proactividad, pensamiento analítico, iniciativa propia y alto interés en aprender e innovar.",
            evaluation_criteria=[
                {"nombre": "Afinidad Disciplinaria y Fundamentos Técnicos / Profesionales", "peso": 0.35},
                {"nombre": "Proactividad, Proyectos Prácticos y Capacidad de Aprendizaje", "peso": 0.30},
                {"nombre": "Pensamiento Lógico, Organización y Habilidades de Comunicación", "peso": 0.20},
                {"nombre": "Actitud de Servicio, Flexibilidad y Motivación por la Innovación", "peso": 0.15}
            ],
            status="abierta",
            min_age=19,
            max_age=29
        )
        db.add_all([v1, v2, v3])
        db.commit()
        seeded_vacancies = 3

    logger.info(f"Purga completa del ecosistema completada. Vacantes purgadas: {vacancies_count}, vacantes sembradas: {seeded_vacancies}.")
    return {
        "success": True,
        "purged_candidates": cand_res["purged_candidates"],
        "purged_applications": cand_res["purged_applications"],
        "purged_vacancies": vacancies_count,
        "seeded_vacancies": seeded_vacancies,
        "deleted_files": cand_res["deleted_files"],
        "bytes_freed": cand_res["bytes_freed"],
        "bytes_freed_mb": cand_res["bytes_freed_mb"],
        "message": f"Purga completa ejecutada. Sistema restablecido con {seeded_vacancies} vacantes modelo de Octopy. Cuentas de usuario y roles protegidos."
    }

