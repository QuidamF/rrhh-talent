# Procesamiento de Información con IA (Gemma)

Este documento detalla el diseño, la implementación y los patrones de integración utilizados para la extracción de información y evaluación de CVs con el LLM **Gemma** a través de **Ollama**.

---

## 1. Diseño del Servicio de IA (`AIService`)

Para evitar el acoplamiento rígido con la API de Ollama, se implementa una arquitectura basada en interfaces:

* **[`AIService`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/backend/app/services/ai_service.py):** Clase abstracta base que define los contratos de entrada y salida para el motor de Inteligencia Artificial.
* **[`OllamaService`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/backend/app/services/ai_service.py):** Implementación específica de Ollama. Utiliza el cliente HTTP asíncrono `httpx` para realizar llamadas hacia el host en `/api/generate`.

Esta estructura permite que, en el futuro, se pueda migrar a modelos en la nube (como Google Gemini API o Vertex AI) o a otros servicios locales simplemente heredando de `AIService` y cambiando la inyección de dependencias, sin tocar una sola línea de código del flujo de negocio.

---

## 2. Inferencia y Formato Estructurado (JSON)

Para que el backend pueda guardar la información en la base de datos de manera consistente, las respuestas del LLM deben ser estructuradas. 

### 2.1 Forzado de Formato mediante Ollama
Ollama expone el parámetro `"format": "json"`. Al activarlo, Ollama fuerza al modelo a estructurar su respuesta sintácticamente como un JSON válido.
El `OllamaService` implementa este comportamiento y se asegura de configurar una **temperatura baja (0.1)** para garantizar respuestas deterministas y evitar la "creatividad" del modelo al estructurar claves.

### 2.2 Patrón de Inferencia con Esquema
El método `generate_json` permite inyectar una cadena descriptiva de formato (`schema_instruction`). El prompt final se enriquece de la siguiente forma:

```text
[Instrucciones del usuario o texto del CV]

IMPORTANTE: Debes responder EXCLUSIVAMENTE en formato JSON que cumpla con la siguiente estructura:
{
  "nombre_completo": "Nombre completo del candidato (encontrado generalmente al inicio del documento)",
  "email": "Correo electrónico principal del candidato o null si no se encuentra",
  "telefono": "Teléfono de contacto o null si no se encuentra",
  "habilidades": ["Lista de hasta 10 habilidades técnicas, tecnologías o competencias clave descritas en el CV"]
}
No agregues texto de introducción, explicaciones, ni etiquetas de código de markdown.
```

---

## 3. Flujo Asíncrono de Extracción de CVs (Hitos 04 y 05)

El pipeline de procesamiento se ejecuta en segundo plano para no bloquear el hilo de ejecución HTTP principal de la API. Se gestionan logs de auditoría en la tabla `processing_logs` por cada paso del pipeline:

```text
  Reclutador sube PDF
          │
          ▼
┌──────────────────┐
│ POST /upload     │ ──► Guarda PDF con UUID del Candidato
└──────────────────┘     Inserta Candidato en BD (estado: "procesando")
          │              Lanza BackgroundTask de FastAPI
          ▼
    [Responde 201] (Retorna de inmediato al Cliente para no bloquear)
          │
  ┌───────┴────────────────────────┐
  │ Tarea en Segundo Plano (Host)   │
  └────────────────────────────────┘
          │
          ├──► Paso 1: "lectura_pdf"
          │    Extrae texto plano usando PyPDF.
          │    Guarda texto en candidate.raw_text.
          │    Registra log "lectura_pdf" -> status: "exito".
          │
          └──► Paso 2: "extraccion_ia"
               Envía el texto al modelo Gemma (Ollama en Host).
               Espera inferencia y recibe JSON estructurado.
               Valida e inserta en BD: name, email, phone, skills.
               Cambia candidate.status -> "completado".
               Registra log "extraccion_ia" -> status: "exito".
```

---

## 4. Robustez frente a Fallos

Si ocurre un error en cualquiera de los pasos (por ejemplo, el PDF no tiene texto legible o el servicio Ollama está offline):
1. La tarea captura la excepción sin interrumpir el servidor.
2. Actualiza la columna `candidate.status` a `"error"`.
3. Registra un `ProcessingLog` detallando el paso que falló y la descripción técnica de la excepción para facilitar la depuración desde el dashboard.
4. Si la lectura de PDF fue exitosa pero falló la IA, la columna `raw_text` se mantiene persistida en SQLite para poder reintentar o auditar el documento de forma manual.
