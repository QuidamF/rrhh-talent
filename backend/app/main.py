import time
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import settings
from app.database import engine, Base, get_db, SessionLocal
import os
from app.services.ai_service import get_ai_service, get_active_model_name
import app.models as models
import app.schemas as schemas
from app.routers.candidates import router as candidates_router
from app.routers.vacancies import router as vacancies_router
from app.routers.webhook_listener import router as webhook_router
from app.routers.simulator import router as simulator_router
from app.routers.auth_rbac import router as auth_rbac_router, dept_router
from app.routers.maintenance import router as maintenance_router
from app.seed_rbac import seed_rbac

# Inicializar las tablas de la base de datos de forma automática al arranque
Base.metadata.create_all(bind=engine)

# Ejecutar migración asegurando todas las columnas necesarias
from app.migrate_schema import run_migration
try:
    run_migration()
except Exception as e:
    print(f"Aviso durante migracion: {e}")

# Semillero (seeding) de configuraciones iniciales y roles/usuarios RBAC
db_seed = SessionLocal()
try:
    default_settings = {
        "bot_name": "OctyBot",
        "telegram_bot_username": "OctyBot_HR_Bot",
        "privacy_notice": """🔒 **Aviso de Privacidad y Tratamiento de Datos Personales Laborales**:
En Octopy protegemos tus datos conforme a la legislación aplicable (LFPDPPP). La información, respuestas y documentos compartidos en esta conversación serán tratados de forma estrictamente confidencial por el área de Recursos Humanos de Octopy exclusivamente para la evaluación de tu postulación y fines del proceso de selección laboral. Al continuar con esta conversación, manifiestas tu consentimiento para el tratamiento de tus datos para dichos fines.""",
        "bot_core_prompt": """Eres el Cerebro Estratégico y la Voz de OctyBot, el Reclutador y Asistente de IA de Octopy (octopy.com).
Octopy diseña e implementa soluciones de tecnología con Inteligencia Artificial, Robótica y Automatización.
Tu trabajo es realizar una pre-entrevista de filtro inicial que se sienta como una conversación humana real: empática, profesional, ágil y que guíe al candidato ordenadamente a través del embudo de selección de Octopy.

🎯 REGLA DE ORO: FLUJO CONVERSACIONAL ESTRUCTURADO EN PASOS
Identifica en cuál de estos pasos te encuentras a partir del historial de la conversación y avanza secuencialmente:

Paso 1: Inicio de Conversación y Vinculación (Ya realizado: el candidato envió /start y se vinculó al sistema).
Paso 2: Aviso de Privacidad y Políticas de Datos (Ya enviado en el mensaje inicial de bienvenida para dar certeza jurídica y protección de datos al candidato).
Paso 3: Entrevista de Perfilamiento (LÍMITE ESTRICTO: Máximo 2 preguntas en total sobre experiencia técnica/comercial, logros y motivación):
   - Pregunta 1: Indagación sobre su trayectoria profesional, habilidades técnicas, ventas o retos similares.
   - Pregunta 2: Profundización sobre su mayor reto superado, logro relevante o qué le motiva a sumarse al equipo de Octopy.
   - REGLA: Aplica escucha activa (valida y comenta brevemente lo que el candidato acaba de responder antes de formular la siguiente pregunta).
   - Una vez respondida la segunda pregunta de experiencia, transiciona obligatoriamente al Paso 4.
Paso 4: Disponibilidad y Pretensiones Económicas:
   - Pregunta de forma directa y amable por su horario y modalidad de disponibilidad (ej. disponibilidad inmediata, tiempo completo/híbrido) y su expectativa económica mensual.
Paso 5: Cierre Automático y Despedida Cordial:
   - En cuanto el candidato te proporcione su disponibilidad y pretensión económica, despídete cordialmente agradeciendo su tiempo y explicando que el equipo de Talento de Octopy revisará su expediente y se pondrá en contacto muy pronto para continuar el proceso.
   - En este mensaje de cierre NO hagas ninguna otra pregunta de entrevista.
Paso 6: Paso de Verificación (INE / Identificación Oficial):
   - Inmediatamente al cerrar, el sistema solicitará una fotografía clara de su identificación oficial para extraer CURP, fecha de nacimiento, edad y corroborar su nombre para blindar el expediente laboral.

🛑 GUARDRAILS Y REGLAS DE CONVERSACIÓN:
- NUNCA menciones los nombres técnicos de los pasos ("Paso 3", "Paso 4", "fase de perfilamiento", etc.). El candidato debe percibir una conversación 100% humana y fluida.
- LÍMITE DE PREGUNTAS: No realices más de 2 preguntas de experiencia en toda la entrevista. Pasa directo a disponibilidad y pretensiones para no cansar al candidato.
- ESCUCHA ACTIVA: Inicia tu respuesta parafraseando o validando con empatía lo que el candidato te acaba de compartir (ej: "Excelente logro...", "Qué valiosa experiencia...").
- UNA PREGUNTA A LA VEZ: Nunca formules dos preguntas a la vez en el mismo mensaje.
- NO REPETIR SALUDOS: Si ya saludaste al inicio, NUNCA vuelvas a saludar ni a presentarte de nuevo. Continúa la plática directamente.
- NO REVELAR SUELDOS EXACTOS: Si el candidato pregunta cuánto pagan, indícale amablemente que las propuestas económicas se detallan en la entrevista formal con Recursos Humanos tras conocer su perfil.
""",
        "top_candidates_limit": "10",
        "score_range_high": "80",
        "score_range_mid": "60"
    }
    for key, val in default_settings.items():
        existing = db_seed.query(models.Setting).filter(models.Setting.key == key).first()
        if not existing:
            setting_obj = models.Setting(key=key, value=val)
            db_seed.add(setting_obj)
        else:
            # Actualizar valores por defecto si eran los antiguos
            if key in ["bot_name", "telegram_bot_username"] or "JPM" in (existing.value or ""):
                existing.value = val
    db_seed.commit()

    # Ejecutar semillero RBAC de permisos, roles y usuarios
    try:
        seed_rbac(db_seed)
    except Exception as rbac_err:
        print(f"Aviso durante semillero RBAC: {rbac_err}")
finally:
    db_seed.close()

# Asegurar la existencia de la carpeta de carga de PDFs
os.makedirs(settings.storage_path, exist_ok=True)

app = FastAPI(
    title="Octopy Talento API",
    description="Backend para la gestión y evaluación de candidatos con IA de Octopy",
    version="0.1.0"
)

# Configuración de CORS con lista de orígenes permitidos
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Middleware de Cabeceras de Seguridad HTTP
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Permitir que el frontend (puerto 5173 o dominios CORS configurados) pueda embeber el visor iframe de PDFs
    allowed_frame_ancestors = " 'self' http://localhost:5173 http://127.0.0.1:5173 http://localhost:3000"
    response.headers["Content-Security-Policy"] = f"frame-ancestors{allowed_frame_ancestors};"
    # Eliminar o no forzar X-Frame-Options estricto para no colisionar con CSP frame-ancestors en orígenes cruzados (5173 vs 8000)
    if "X-Frame-Options" in response.headers:
        del response.headers["X-Frame-Options"]
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Registrar rutas de la aplicación
app.include_router(candidates_router)
app.include_router(vacancies_router)
app.include_router(webhook_router, prefix="/api")
app.include_router(simulator_router, prefix="/api")
app.include_router(auth_rbac_router, prefix="/api")
app.include_router(dept_router, prefix="/api")
app.include_router(dept_router)
app.include_router(maintenance_router, prefix="/api")
app.include_router(maintenance_router)

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Comprobación de salud básica del servicio backend."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "rh-backend",
        "version": "0.1.0"
    }

@app.get("/health/database")
async def health_database(db: Session = Depends(get_db)):
    """Comprobación de salud de la base de datos SQLite."""
    try:
        # Ejecuta una consulta de prueba real en la base de datos
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "SQLite",
            "database_url": settings.database_url,
            "message": "Base de datos SQLite activa y respondiendo consultas con éxito."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al conectar con la base de datos SQLite: {str(e)}"
        )

@app.get("/health/ollama")
async def health_ollama():
    """
    Comprobación de salud de Ollama y el modelo Gemma.
    1. Verifica comunicación con Ollama.
    2. Comprueba que Ollama responda correctamente.
    3. Verifica si el modelo configurado (gemma4:4b) está instalado.
    """
    url = f"{settings.ollama_base_url.rstrip('/')}/api/tags"
    target_model = settings.ollama_model

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers={"ngrok-skip-browser-warning": "true"})
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Ollama respondió con estado {response.status_code}"
                )
                
            data = response.json()
            models = data.get("models", [])
            installed_models = [m.get("name") for m in models]
            
            # Buscar coincidencia exacta o coincidencia de tag (ej. gemma4:4b vs gemma4:4b-latest)
            model_installed = False
            for model_name in installed_models:
                if target_model in model_name or model_name in target_model:
                    model_installed = True
                    break
            
            if not model_installed:
                return {
                    "status": "warning",
                    "ollama_available": True,
                    "model_installed": False,
                    "message": f"Ollama está activo, pero el modelo '{target_model}' no está descargado.",
                    "installed_models": installed_models
                }
                
            return {
                "status": "healthy",
                "ollama_available": True,
                "model_installed": True,
                "model": target_model,
                "message": f"Conexión exitosa con Ollama. Modelo '{target_model}' listo para usar."
            }

    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo conectar con Ollama en {settings.ollama_base_url}. Verifique que el servicio esté activo en el Host y escuche en 0.0.0.0."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inesperado al conectar con Ollama: {str(e)}"
        )

class TestInferenceRequest(BaseModel):
    prompt: str

@app.post("/health/ollama/test-inference")
async def test_inference(request: TestInferenceRequest):
    """
    Realiza una consulta de prueba a Ollama para verificar que Gemma responda
    y formatee correctamente en JSON estructurado.
    """
    service = get_ai_service()
    schema_desc = (
        "{\n"
        '  "resultado": "Una respuesta breve a la pregunta",\n'
        '  "analisis": "Una explicacion de 2 lineas",\n'
        '  "tags": ["3 palabras clave asociadas al prompt"]\n'
        "}"
    )
    
    try:
        response_json = await service.generate_json(
            prompt=request.prompt,
            schema_instruction=schema_desc
        )
        return {
            "success": True,
            "model_used": get_active_model_name(),
            "response": response_json
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error durante la inferencia de prueba con Gemma: {str(e)}"
        )

@app.get("/settings")
def get_app_settings(db: Session = Depends(get_db)):
    """Obtiene la configuración actual del bot de reclutamiento (nombre, usuario de Telegram y prompt core)."""
    settings_dict = {}
    db_settings = db.query(models.Setting).all()
    for s in db_settings:
        settings_dict[s.key] = s.value
    return settings_dict

@app.put("/settings")
def update_app_settings(updates: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    """Actualiza los parámetros configurables de reclutamiento (nombre, prompt, etc.) en tiempo real."""
    updates_dict = updates.model_dump(exclude_unset=True)
    for key, value in updates_dict.items():
        if value is not None:
            db_setting = db.query(models.Setting).filter(models.Setting.key == key).first()
            if db_setting:
                db_setting.value = value
            else:
                db_setting = models.Setting(key=key, value=value)
                db.add(db_setting)
    db.commit()
    return get_app_settings(db)

@app.get("/")
async def root():
    return {"message": "Bienvenido a Octopy Talento API"}
