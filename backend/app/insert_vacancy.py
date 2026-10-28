import asyncio
from app.database import SessionLocal
from app import models

def insert_executive_vacancy():
    db = SessionLocal()
    try:
        # 1. Definir criterios de evaluación con pesos que sumen 1.0 (o 100)
        criteria = [
            {"criterio": "Experiencia en Ventas Consultivas o Cierres", "peso": 0.25, "descripcion": "Experiencia comprobable cerrando negociaciones de valor medio/alto."},
            {"criterio": "Prospección y Calificación de Leads", "peso": 0.15, "descripcion": "Habilidad para buscar y calificar leads en frío y B2C/B2B."},
            {"criterio": "Experiencia en Pensiones, Seguros, AFORE o Inmobiliario", "peso": 0.20, "descripcion": "Experiencia favorable en sectores financieros, seguros, afores o afines."},
            {"criterio": "Competencias Blandas (Comunicación y Negociación)", "peso": 0.20, "descripcion": "Trato profesional, escucha activa y persuasión ética."},
            {"criterio": "Disponibilidad y Logística (Presencial CDMX, 9-6)", "peso": 0.10, "descripcion": "Disponibilidad para laborar presencial en CDMX, Narvarte, de lunes a viernes."},
            {"criterio": "Disciplina, CRM y Autonomía", "peso": 0.10, "descripcion": "Uso de herramientas digitales (CRM, hojas de cálculo) y autogestión."}
        ]

        title = "Ejecutivo de Ventas"
        
        description = """Prospectar, atender y asesorar a clientes potenciales interesados en estrategias para maximizar su pensión bajo la Ley 73 del IMSS, mediante un proceso de venta consultiva que permita identificar sus necesidades, presentar soluciones personalizadas, dar seguimiento a cada oportunidad y concretar el cierre de operaciones.

LO QUE OFRECEMOS:
- Sueldo base de $10,000 netos + vales de despensa.
- Bono mensual de $2,000 por cumplimiento.
- Comisiones sin tope (ingresos promedio de $30,000 o más).
- Cartera de clientes y leads calificados.
- Capacitación especializada en Ley 73 del IMSS.
- Coaching y coaching comercial presencial en CDMX.
- Prestaciones de ley."""

        requirements = """- Experiencia comprobable en ventas consultivas, intangibles o cierre de operaciones.
- Experiencia idealmente en AFORE, seguros, servicios financieros, sector inmobiliario o B2C de alto valor.
- Comunicación fluida, negociación y empatía comercial.
- Orientación al logro y disciplina diaria de seguimiento.
- Disponibilidad para trabajar de forma presencial en CDMX (Narvarte Poniente).
- Horario: Lunes a jueves de 10:00 a 18:00 hrs y viernes de 10:00 a 15:00 hrs."""

        # 2. Insertar en base de datos
        db_vacancy = models.Vacancy(
            title=title,
            description=description,
            requirements=requirements,
            evaluation_criteria=criteria,
            status="abierta"
        )
        db.add(db_vacancy)
        db.commit()
        db.refresh(db_vacancy)
        print(f"Vacante '{db_vacancy.title}' insertada exitosamente con ID {db_vacancy.id}.")
        
    except Exception as e:
        db.rollback()
        print(f"Error insertando vacante: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    insert_executive_vacancy()
