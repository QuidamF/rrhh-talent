from sqlalchemy.orm import Session
import app.models as models
import app.schemas as schemas

class VacancyService:
    """
    Servicio para la gestión de vacantes (CRUD) en la base de datos.
    """

    @staticmethod
    def create_vacancy(db: Session, vacancy: schemas.VacancyCreate) -> models.Vacancy:
        db_vacancy = models.Vacancy(
            title=vacancy.title,
            description=vacancy.description,
            requirements=vacancy.requirements,
            evaluation_criteria=vacancy.evaluation_criteria,
            status=vacancy.status,
            min_age=vacancy.min_age,
            max_age=vacancy.max_age,
            department_id=vacancy.department_id,
            manager_id=vacancy.manager_id
        )
        db.add(db_vacancy)
        db.commit()
        db.refresh(db_vacancy)

        # Asignar evaluadores adicionales si vienen en el payload
        if vacancy.evaluator_ids:
            for item in vacancy.evaluator_ids:
                if isinstance(item, dict) and item.get("user_id"):
                    eval_rec = models.VacancyEvaluator(
                        vacancy_id=db_vacancy.id,
                        user_id=item["user_id"],
                        stage=item.get("stage", "capacitacion_1")
                    )
                    db.add(eval_rec)
            db.commit()
            db.refresh(db_vacancy)

        return db_vacancy

    @staticmethod
    def get_vacancy(db: Session, vacancy_id: int) -> models.Vacancy:
        return db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()

    @staticmethod
    def list_vacancies(db: Session) -> list:
        return db.query(models.Vacancy).order_by(models.Vacancy.created_at.desc()).all()

    @staticmethod
    def update_vacancy(db: Session, vacancy_id: int, vacancy_update: schemas.VacancyCreate) -> models.Vacancy:
        db_vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
        if not db_vacancy:
            return None
        db_vacancy.title = vacancy_update.title
        db_vacancy.description = vacancy_update.description
        db_vacancy.requirements = vacancy_update.requirements
        db_vacancy.evaluation_criteria = vacancy_update.evaluation_criteria
        db_vacancy.status = vacancy_update.status
        db_vacancy.min_age = vacancy_update.min_age
        db_vacancy.max_age = vacancy_update.max_age
        if vacancy_update.department_id is not None:
            db_vacancy.department_id = vacancy_update.department_id if vacancy_update.department_id != 0 else None
        if vacancy_update.manager_id is not None:
            db_vacancy.manager_id = vacancy_update.manager_id if vacancy_update.manager_id != "" else None

        if vacancy_update.evaluator_ids is not None:
            # Reemplazar evaluadores
            db.query(models.VacancyEvaluator).filter(models.VacancyEvaluator.vacancy_id == vacancy_id).delete()
            for item in vacancy_update.evaluator_ids:
                if isinstance(item, dict) and item.get("user_id"):
                    eval_rec = models.VacancyEvaluator(
                        vacancy_id=db_vacancy.id,
                        user_id=item["user_id"],
                        stage=item.get("stage", "capacitacion_1")
                    )
                    db.add(eval_rec)

        db.commit()
        db.refresh(db_vacancy)
        return db_vacancy

    @staticmethod
    def delete_vacancy(db: Session, vacancy_id: int) -> bool:
        db_vacancy = db.query(models.Vacancy).filter(models.Vacancy.id == vacancy_id).first()
        if not db_vacancy:
            return False
        db.delete(db_vacancy)
        db.commit()
        return True
