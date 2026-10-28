# Guía de Despliegue e Instalación

Este documento detalla la instalación, configuración e interconexión del sistema híbrido de JPM Talento, que utiliza **Docker** para la aplicación y **Ollama nativo (Host)** para la inferencia de Inteligencia Artificial con Gemma.

---

## 1. Configuración de Ollama en el Host

Ollama debe ejecutarse directamente en la máquina física (Host) para poder aprovechar la aceleración de hardware por GPU de manera directa y simple, sin necesidad de lidiar con controladores CUDA o configuraciones de contenedor complejas.

### Paso 1.1: Instalación de Ollama
* **Windows/macOS:** Descarga el instalador oficial desde [ollama.com](https://ollama.com) y ejecútalo.
* **Linux:** Ejecuta el script de instalación oficial:
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

### Paso 1.2: Configurar Ollama para escuchar peticiones externas
Por defecto, Ollama se ejecuta escuchando únicamente en `127.0.0.1` (localhost). Para permitir que el contenedor Docker del backend se comunique con él, debemos configurar Ollama para escuchar en todas las interfaces de red (`0.0.0.0`).

#### En Windows:
1. Cierra la aplicación de Ollama desde la barra de tareas (systray).
2. Abre la consola de comandos o PowerShell y ejecuta:
   ```powershell
   [Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0", "User")
   ```
3. Reinicia Ollama para aplicar el cambio.

#### En Linux:
1. Edita el servicio de systemd de Ollama:
   ```bash
   sudo systemctl edit ollama.service
   ```
2. Añade las siguientes líneas en la sección `[Service]`:
   ```ini
   [Service]
   Environment="OLLAMA_HOST=0.0.0.0"
   ```
3. Guarda el archivo y reinicia el servicio:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart ollama
   ```

---

## 2. Descarga del Modelo Gemma 4 4B

Una vez que Ollama esté corriendo, descarga el modelo Gemma de 4B parámetros. Ejecuta en la terminal del Host:

```bash
# Descargar el modelo
ollama pull gemma:7b # O el modelo específico de Gemma configurado (ej: gemma:2b, gemma4:4b)
```
*(Nota: Actualmente, los modelos más populares son `gemma:2b`, `gemma2:2b`, o `gemma2:9b`. Asegúrate de escribir el nombre exacto del modelo en tu archivo `.env` en la propiedad `OLLAMA_MODEL`)*

Verifica que el modelo esté disponible con:
```bash
ollama list
```

---

## 3. Configuración y Despliegue de Docker

La aplicación (FastAPI + React) corre enteramente dentro de Docker.

### Paso 3.1: Configurar Variables de Entorno
Copia el archivo `.env.example` y renómbralo a `.env` en la raíz del proyecto:
```bash
cp .env.example .env
```

Asegúrate de que las variables apunten al Host correctamente:
* **Windows / macOS:**
  ```env
  OLLAMA_BASE_URL=http://host.docker.internal:11434
  OLLAMA_MODEL=gemma2:2b  # Modifica esto según el modelo descargado en Ollama
  ```
* **Linux:**
  ```env
  OLLAMA_BASE_URL=http://host.docker.internal:11434
  OLLAMA_MODEL=gemma2:2b
  ```
  *(El docker-compose.yml ya tiene mapeada la traducción de `host.docker.internal` a la IP de red del host en Linux mediante `extra_hosts` con `host-gateway`)*.

### Paso 3.2: Ejecutar los Contenedores
Para iniciar la aplicación, ejecuta desde la raíz del proyecto:
```bash
docker compose up -d --build
```

Esto compilará y levantará dos contenedores:
1. **rh_backend:** API en FastAPI (Puerto 8000).
2. **rh_frontend:** Interfaz de usuario en React (Puerto 5173).

---

## 4. Pruebas de Conectividad (Troubleshooting)

### Verificar que Docker se comunica con el Host
Si el dashboard indica que Ollama está `Offline`, puedes probar la conexión ingresando al contenedor del backend y ejecutando una prueba manual:

```bash
# Entrar al contenedor de backend
docker compose exec backend curl http://host.docker.internal:11434/api/tags
```

Si retorna un JSON con la lista de modelos de Ollama, la comunicación es correcta. Si da error de conexión:
1. Verifica que Ollama esté corriendo en el Host.
2. Asegúrate de que la variable de entorno `OLLAMA_HOST` esté configurada en `0.0.0.0` y no en `127.0.0.1`.
3. Comprueba que el Firewall del sistema no esté bloqueando el puerto `11434`.
