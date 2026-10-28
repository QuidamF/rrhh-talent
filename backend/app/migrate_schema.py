from app.database import engine
from sqlalchemy import text

def run_migration():
    columns = [
        ("curp", "VARCHAR(20)"),
        ("birth_date", "VARCHAR(50)"),
        ("calculated_age", "INTEGER"),
        ("id_document_path", "VARCHAR(255)"),
        ("id_document_name", "VARCHAR(200)"),
        ("id_validation_status", "VARCHAR(50) DEFAULT 'no_solicitado'"),
        ("id_document_expires_at", "DATETIME"),
        ("id_evidence_hash", "VARCHAR(64)"),
        ("id_document_purged", "BOOLEAN DEFAULT 0"),
        ("source", "VARCHAR(100) DEFAULT 'No especificada'")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in columns:
            try:
                conn.execute(text(f"ALTER TABLE candidates ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"Columna agregada: {col_name}")
            except Exception as e:
                # Si la columna ya existe, SQLite genera error y simplemente continuamos
                print(f"Columna {col_name} ya existia o no requirio cambio ({e})")
                
        # Asegurar columnas en vacancies
        for col_name, col_type in [("min_age", "INTEGER"), ("max_age", "INTEGER"), ("manager_id", "VARCHAR(50)"), ("department_id", "INTEGER")]:
            try:
                conn.execute(text(f"ALTER TABLE vacancies ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"Columna agregada en vacancies: {col_name}")
            except Exception as e:
                pass

        # Asegurar columnas en users
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN department_id INTEGER"))
            conn.commit()
            print("Columna department_id agregada en users")
        except Exception:
            pass
                
        # Asegurar stage en notes
        try:
            conn.execute(text("ALTER TABLE notes ADD COLUMN stage VARCHAR(50)"))
            conn.commit()
            print("Columna stage agregada en notes")
        except Exception:
            pass

    # Asegurar creación de todas las tablas nuevas (users, roles, permissions, audit_logs, vacancy_evaluators)
    try:
        from app.database import Base
        import app.models  # Importa todos los modelos
        Base.metadata.create_all(bind=engine)
        print("Tablas RBAC y Auditoria aseguradas con create_all")
    except Exception as e:
        print(f"Aviso al crear tablas: {e}")

    print("--- MIGRACION COMPLETADA CON EXITO ---")

if __name__ == "__main__":
    run_migration()
