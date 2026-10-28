from abc import ABC, abstractmethod
import json
import logging
from typing import Any, Dict, Optional
import httpx
from app.config import settings

logger = logging.getLogger("rh.ai_service")


def _extract_json(response_text: str) -> Dict[str, Any]:
    """Parsea JSON tolerando bloques de markdown (```json ... ```)."""
    text = (response_text or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)


ID_DOCUMENT_PROMPT = (
    "Analiza detalladamente esta imagen de documento de identidad oficial (INE, Pasaporte mexicano o Licencia). "
    "ORIENTACIÓN: El documento puede estar en su orientación normal (horizontal) o puede haber sido fotografiado de lado/en vertical. "
    "Detecta primero la orientación del texto y léelo en el sentido correcto.\n\n"
    "Guía de lectura para Credenciales para Votar del INE (México):\n"
    "1. El NOMBRE suele estar en 3 renglones verticales con este orden:\n"
    "   - Renglón 1: Apellido Paterno (ej: LOPEZ)\n"
    "   - Renglón 2: Apellido Materno (ej: DIAZ)\n"
    "   - Renglón 3: Nombre(s) de pila (ej: EDGAR)\n"
    "   -> Debes reconstruir el nombre completo en orden natural: 'EDGAR LOPEZ DIAZ'.\n"
    "2. La CURP consta exactamente de 18 caracteres alfanuméricos (ej: LODE910317HHGPZD00) y se ubica junto a la etiqueta 'CURP'.\n"
    "3. La FECHA DE NACIMIENTO aparece en formato DD/MM/AAAA (ej: 17/03/1991).\n\n"
    "Extrae con máxima precisión los siguientes datos en formato JSON:\n"
    "{\n"
    '  "tipo_documento": "INE" | "PASAPORTE" | "LICENCIA" | "OTRO",\n'
    '  "nombre_completo": "NOMBRE(S) APELLIDO_PATERNO APELLIDO_MATERNO",\n'
    '  "curp": "18 caracteres alfanuméricos de la CURP o null",\n'
    '  "fecha_nacimiento": "AAAA-MM-DD o DD/MM/AAAA o null",\n'
    '  "sexo": "H" | "M" | null\n'
    "}\n"
    "IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON válido, sin bloques de código ni texto adicional."
)


def _json_prompt(prompt: str, schema_instruction: Optional[str]) -> str:
    if not schema_instruction:
        return prompt
    return (
        f"{prompt}\n\n"
        f"IMPORTANTE: Debes responder EXCLUSIVAMENTE en formato JSON que cumpla con la siguiente estructura:\n"
        f"{schema_instruction}\n"
        f"No agregues texto de introducción, explicaciones, ni etiquetas de código de markdown (como ```json)."
    )

class AIService(ABC):
    """
    Clase abstracta base para la integración con servicios de Inteligencia Artificial.
    Permite desacoplar el resto de la aplicación del motor de LLM específico (Ollama, Gemini, OpenAI, etc.).
    """
    
    @abstractmethod
    async def generate_json(self, prompt: str, schema_instruction: Optional[str] = None) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Envía un prompt a la IA y obtiene la respuesta de texto simple.
        """
        pass

    @abstractmethod
    async def analyze_document_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """Extrae datos estructurados de una identificación oficial (visión multimodal)."""
        pass


class OllamaService(AIService):
    """
    Implementación del servicio de IA utilizando Ollama local ejecutado en el Host.
    """
    
    def __init__(self):
        self.base_url = (settings.ollama_base_url or "http://localhost:11434").rstrip('/')
        self.model = settings.ollama_model
        self.provider = "ollama"
        self.timeout = 120.0  # Límite de tiempo amplio para inferencia y túneles (ngrok)
        self.headers = {
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "RRHH-AI-Backend/1.0"
        }
        
    async def generate_json(self, prompt: str, schema_instruction: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/api/generate"
        
        # Enriquecer el prompt con instrucciones de formato JSON si se proporciona
        full_prompt = prompt
        if schema_instruction:
            full_prompt = (
                f"{prompt}\n\n"
                f"IMPORTANTE: Debes responder EXCLUSIVAMENTE en formato JSON que cumpla con la siguiente estructura:\n"
                f"{schema_instruction}\n"
                f"No agregues texto de introducción, explicaciones, ni etiquetas de código de markdown (como ```json)."
            )
            
        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "format": "json",  # Fuerza a Ollama a estructurar la salida como JSON
            "stream": False,
            "think": False,    # Desactiva la traza de razonamiento <think> (/set nothink) para reducir latencia
            "options": {
                "temperature": 0.1  # Baja temperatura para mayor consistencia y apego al formato
            }
        }
        
        try:
            logger.info(f"Enviando solicitud de inferencia a Ollama ({self.model})")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                
                if response.status_code != 200:
                    logger.error(f"Ollama respondió con código de error: {response.status_code}")
                    raise ValueError(f"Ollama respondió con estado {response.status_code}: {response.text}")
                
                result = response.json()
                response_text = result.get("response", "").strip()
                
                # Intentar parsear el JSON de respuesta
                try:
                    parsed_json = json.loads(response_text)
                    logger.info("Respuesta de Ollama parseada exitosamente a JSON")
                    return parsed_json
                except json.JSONDecodeError as je:
                    logger.error(f"Error al decodificar JSON de la respuesta de Ollama: {response_text}")
                    # Como fallback, intentar extraer JSON rudimentariamente si contiene markdown
                    cleaned_text = response_text
                    if "```json" in response_text:
                        cleaned_text = response_text.split("```json")[1].split("```")[0].strip()
                    elif "```" in response_text:
                        cleaned_text = response_text.split("```")[1].split("```")[0].strip()
                    
                    try:
                        return json.loads(cleaned_text)
                    except Exception:
                        raise ValueError(f"La IA no devolvió un JSON válido: {response_text}") from je
                        
        except httpx.ConnectError as ce:
            logger.error(f"Error de conexión con Ollama en {self.base_url}")
            raise ConnectionError(f"No se pudo conectar con Ollama en {self.base_url}. Asegúrate de que el servicio está activo.") from ce
        except Exception as e:
            logger.error(f"Error inesperado en OllamaService: {str(e)}")
            raise e

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "think": False,    # Desactiva la traza de razonamiento <think> (/set nothink) para respuestas inmediatas
            "options": {
                "temperature": 0.5
            }
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        try:
            logger.info(f"Enviando solicitud de texto a Ollama ({self.model})")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                if response.status_code != 200:
                    raise ValueError(f"Ollama respondió con estado {response.status_code}: {response.text}")
                result = response.json()
                return result.get("response", "").strip()
        except Exception as e:
            logger.error(f"Error inesperado en OllamaService.generate_text: {str(e)}")
            raise e

    async def analyze_document_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analiza una imagen de identificación oficial (INE, Pasaporte, Licencia)
        usando la capacidad multimodal de Ollama (gemma4:12b-it-qat).
        """
        import base64
        url = f"{self.base_url}/api/generate"
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        
        prompt = ID_DOCUMENT_PROMPT

        payload = {
            "model": self.model,
            "prompt": prompt,
            "images": [b64_image],
            "format": "json",
            "stream": False,
            "think": False,    # Desactiva traza de razonamiento para máxima velocidad en visión
            "options": {
                "temperature": 0.1
            }
        }
        
        try:
            logger.info(f"Enviando imagen de identificación a Ollama ({self.model}) para análisis de visión")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                if response.status_code != 200:
                    logger.error(f"Ollama respondió con código de error al analizar imagen: {response.status_code}")
                    raise ValueError(f"Ollama error {response.status_code}: {response.text}")
                
                result = response.json()
                response_text = result.get("response", "").strip()
                
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()
                    
                parsed = json.loads(response_text)
                logger.info(f"Identificación analizada exitosamente: {parsed.get('tipo_documento')} - {parsed.get('nombre_completo')}")
                return parsed
        except Exception as e:
            logger.error(f"Error al analizar imagen con Ollama: {e}")
            raise e


class GeminiService(AIService):
    """
    Implementación del servicio de IA usando Google Gemini (AI Studio) vía REST.
    Requiere GEMINI_API_KEY. Soporta texto, JSON estructurado y visión multimodal.
    """

    def __init__(self):
        if not settings.gemini_api_key:
            raise ValueError("LLM_PROVIDER=gemini pero GEMINI_API_KEY no está configurada.")
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model
        self.provider = "gemini"
        self.base_url = settings.gemini_base_url.rstrip('/')
        self.timeout = 120.0

    async def _generate(self, parts: list, system_prompt: Optional[str] = None,
                        temperature: float = 0.5, as_json: bool = False) -> str:
        url = f"{self.base_url}/models/{self.model}:generateContent"
        payload: Dict[str, Any] = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"temperature": temperature},
        }
        if as_json:
            payload["generationConfig"]["responseMimeType"] = "application/json"
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        headers = {"x-goog-api-key": self.api_key, "Content-Type": "application/json"}
        logger.info(f"Enviando solicitud a Gemini ({self.model})")
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            logger.error(f"Gemini respondió con código de error: {response.status_code}")
            raise ValueError(f"Gemini respondió con estado {response.status_code}: {response.text}")

        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise ValueError(f"Gemini no devolvió candidatos: {data.get('promptFeedback') or data}")
        resp_parts = candidates[0].get("content", {}).get("parts", [])
        return "".join(p.get("text", "") for p in resp_parts).strip()

    async def generate_json(self, prompt: str, schema_instruction: Optional[str] = None) -> Dict[str, Any]:
        text = await self._generate([{"text": _json_prompt(prompt, schema_instruction)}],
                                    temperature=0.1, as_json=True)
        try:
            return _extract_json(text)
        except Exception as e:
            raise ValueError(f"La IA no devolvió un JSON válido: {text}") from e

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        return await self._generate([{"text": prompt}], system_prompt=system_prompt, temperature=0.5)

    async def analyze_document_image(self, image_bytes: bytes) -> Dict[str, Any]:
        import base64
        mime = "image/png" if image_bytes[:8] == b"\x89PNG\r\n\x1a\n" else "image/jpeg"
        parts = [
            {"inline_data": {"mime_type": mime, "data": base64.b64encode(image_bytes).decode("utf-8")}},
            {"text": ID_DOCUMENT_PROMPT},
        ]
        text = await self._generate(parts, temperature=0.1, as_json=True)
        parsed = _extract_json(text)
        logger.info(f"Identificación analizada (Gemini): {parsed.get('tipo_documento')} - {parsed.get('nombre_completo')}")
        return parsed


class OpenAIService(AIService):
    """
    Implementación del servicio de IA usando OpenAI (GPT-4o / GPT-4o-mini) vía REST.
    Requiere OPENAI_API_KEY. Soporta texto, JSON estructurado y visión multimodal.
    """

    def __init__(self):
        if not settings.openai_api_key:
            raise ValueError("LLM_PROVIDER=openai pero OPENAI_API_KEY no está configurada.")
        self.api_key = settings.openai_api_key
        self.model = settings.openai_model
        self.provider = "openai"
        self.base_url = settings.openai_base_url.rstrip('/')
        self.timeout = 120.0

    async def _generate(self, messages: list, temperature: float = 0.5, as_json: bool = False) -> str:
        url = f"{self.base_url}/chat/completions"
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if as_json:
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        logger.info(f"Enviando solicitud a OpenAI ({self.model})")
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            logger.error(f"OpenAI respondió con código de error: {response.status_code}")
            raise ValueError(f"OpenAI respondió con estado {response.status_code}: {response.text}")

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            raise ValueError(f"OpenAI no devolvió opciones: {data}")
        return choices[0].get("message", {}).get("content", "").strip()

    async def generate_json(self, prompt: str, schema_instruction: Optional[str] = None) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": "Eres un asistente de evaluación experto. Responde siempre en formato JSON."},
            {"role": "user", "content": _json_prompt(prompt, schema_instruction)}
        ]
        text = await self._generate(messages, temperature=0.1, as_json=True)
        try:
            return _extract_json(text)
        except Exception as e:
            raise ValueError(f"La IA no devolvió un JSON válido: {text}") from e

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return await self._generate(messages, temperature=0.5)

    async def analyze_document_image(self, image_bytes: bytes) -> Dict[str, Any]:
        import base64
        mime = "image/png" if image_bytes[:8] == b"\x89PNG\r\n\x1a\n" else "image/jpeg"
        b64_img = base64.b64encode(image_bytes).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": ID_DOCUMENT_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{b64_img}"
                        }
                    }
                ]
            }
        ]
        text = await self._generate(messages, temperature=0.1, as_json=True)
        parsed = _extract_json(text)
        logger.info(f"Identificación analizada (OpenAI): {parsed.get('tipo_documento')} - {parsed.get('nombre_completo')}")
        return parsed


def get_ai_service() -> AIService:
    """Devuelve el proveedor de IA configurado en LLM_PROVIDER (ollama | gemini | openai)."""
    provider = (settings.llm_provider or "ollama").strip().lower()
    if provider == "openai":
        return OpenAIService()
    if provider == "gemini":
        return GeminiService()
    if provider != "ollama":
        logger.warning(f"LLM_PROVIDER desconocido '{provider}', usando Ollama.")
    return OllamaService()


def get_active_model_name() -> str:
    provider = (settings.llm_provider or "ollama").strip().lower()
    if provider == "openai":
        return settings.openai_model
    if provider == "gemini":
        return settings.gemini_model
    return settings.ollama_model
