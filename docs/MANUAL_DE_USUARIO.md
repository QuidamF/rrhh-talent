# 📖 Manual de Usuario - JPM Talento
### Plataforma Integral de Reclutamiento, Evaluación con IA y Control Organizacional

**Versión**: 2.5  
**Dirigido a**: Dirección de Recursos Humanos, Reclutadores, Hiring Managers (Gerentes de Área), Instructores de Capacitación y Auditores de Cumplimiento.  
**Empresa**: JPM (Jubilación y Pensión Máxima)

---

## 📑 Tabla de Contenido
1. [Introducción y Objetivos](#1-introducción-y-objetivos)
2. [Autenticación, Sesiones y Roles de Usuario (RBAC)](#2-autenticación-sesiones-y-roles-de-usuario-rbac)
3. [Navegación General y Dashboard Estratégico](#3-navegación-general-y-dashboard-estratégico)
4. [Estructura Organizacional: Áreas y Gerencias](#4-estructura-organizacional-áreas-y-gerencias)
5. [Aprovisionamiento y Gestión de Colaboradores](#5-aprovisionamiento-y-gestión-de-colaboradores)
6. [Gestión de Vacantes con Efecto Cascada](#6-gestión-de-vacantes-con-efecto-cascada)
7. [Carga de CVs y Evaluación Automatizada por IA](#7-carga-de-cvs-y-evaluación-automatizada-por-ia)
8. [Visor de PDF Original y Expediente Laboral](#8-visor-de-pdf-original-y-expediente-laboral)
9. [Tablero Kanban y Dictamen Formal de Etapas](#9-tablero-kanban-y-dictamen-formal-de-etapas)
10. [Flujo Conversacional de Samanta (Pre-entrevista de 6 Pasos)](#10-flujo-conversacional-de-samanta-pre-entrevista-de-6-pasos)
11. [Blindaje de Identidad con Visión Multimodal (INE / CURP)](#11-blindaje-de-identidad-con-visión-multimodal-ine--curp)
12. [Ciclo de Vida Seguro: Desactivación vs Eliminación Definitiva](#12-ciclo-de-vida-seguro-desactivación-vs-eliminación-definitiva)
13. [Bitácora de Auditoría y Cumplimiento LFPDPPP](#13-bitácora-de-auditoría-y-cumplimiento-lfpdppp)
14. [Sandbox & Simulador de IA (Pruebas de Calibración)](#14-sandbox--simulador-de-ia-pruebas-de-calibración)
15. [Preguntas Frecuentes (FAQ)](#15-preguntas-frecuentes-faq)

---

## 1. Introducción y Objetivos

**JPM Talento** es el ecosistema oficial desarrollado para optimizar, blindar y agilizar la atracción y selección de talento en JPM.

### Principales Capacidades:
* **Lectura y Scoring IA**: Analiza currículums en PDF contra los requisitos ponderados de la vacante, otorgando puntuaciones objetivas del 0% al 100%.
* **Pre-entrevistas Omnicanal (Samanta)**: Asistente conversacional que ejecuta un embudo empático de 6 pasos por Telegram y WhatsApp.
* **Gobierno y Seguridad RBAC**: Control de acceso granular para que cada colaborador (gerentes, reclutadores, capacitadores y auditores) opere únicamente dentro de su ámbito de competencia.
* **Dictámenes Formales**: Calificación estructurada y notas firmadas con autoría para avanzar de etapa en el embudo Kanban.
* **Estructura Orgánica Dinámica**: Catálogo de áreas con asignación automática de Hiring Managers a vacantes.
* **Auditoría Legal Inmutable**: Registro de trazabilidad para inspecciones conforme a la LFPDPPP y purga segura por Derechos ARCO.

---

## 2. Autenticación, Sesiones y Roles de Usuario (RBAC)

Al ingresar a la plataforma, el sistema valida tus credenciales y genera un **token de sesión firmado criptográficamente**:

### 2.1 Roles del Sistema y Alcance de Operación
| Rol | Ámbito de Acción | Permisos Clave |
|---|---|---|
| **Super Administrador (`SuperAdmin`)** | Control global de la plataforma | Gestión de usuarios, bitácoras, áreas, configuración del bot y diagnóstico técnico de infraestructura TI. |
| **Gerente de Recursos Humanos (`Gerente_RH`)** | Dirección de atracción de talento | Operación completa de vacantes, candidatos, transferencias, bitácora y administración de usuarios. |
| **Reclutador Senior (`Reclutador_Senior`)** | Operación integral de procesos | Carga de CVs, evaluación de candidatos, visualización de credenciales INE y dictámenes de etapa. |
| **Reclutador Junior (`Reclutador_Junior`)** | Apoyo operativo y filtros | Revisión de expedientes, vinculación con Samanta y avance en etapas iniciales. |
| **Gerente de Vacante (`Gerente_Vacante`)** | Hiring Manager de Área | Dictamen formal de las etapas de **Entrevista** y **Roleplay** de sus vacantes asignadas. |
| **Evaluador de Capacitación (`Evaluador_Capacitacion`)** | Formación técnica | Dictamen de **Capacitación 1** y **Capacitación 2** para candidatos asignados a su área. |
| **Auditor de Privacidad (`Auditor_Privacidad`)** | Cumplimiento legal y normativo | Consulta de la Bitácora de Auditoría y ejecución de la purga física de documentos confidenciales (LFPDPPP). |

### 2.2 Cambio de Usuario o Cierre de Sesión
En la esquina inferior de la barra lateral izquierda se muestra tu avatar, nombre y rol actual. Al hacer clic sobre tu perfil o en el botón de cerrar sesión, podrás autenticarte con otra cuenta corporativa.

---

## 3. Navegación General y Dashboard Estratégico

La barra lateral izquierda permite acceder a los 6 módulos principales:
- **📊 Dashboard**: Vista ejecutiva de KPIs.
- **👥 Candidatos**: Directorio general de postulantes y expedientes laborales.
- **💼 Vacantes**: Creación, criterios ponderados y parámetros de scoring.
- **📋 Tablero Kanban**: Embudo ágil de selección por columnas (*Drag & Drop*).
- **⚙️ Configuración**: Áreas organizacionales, usuarios RBAC, auditoría y parámetros del bot.
- **🤖 Simulador IA**: Sandbox para pruebas de prompts y lecturas de credencial sin tocar datos reales.

### 3.1 Métrica Analítica: Conversión por Plataforma
En el Dashboard principal encontrarás la tarjeta de **"Tasa de Conversión por Plataforma"**:
- **Efectividad Real**: Contratados vs Total de postulantes por bolsa de empleo (OCC Mundial, Computrabajo, Indeed, LinkedIn, Ferias, etc.).
- **Tasa de Conversión %**: Con barra visual de rendimiento (🟢 Verde ≥15%, 🟡 Ámbar ≥5%, 🔵 Azul en arranque).
- **Tasa de Avance**: Porcentaje de candidatos que superaron el filtro inicial de pre-entrevista.
- **Calidad Media (Score IA)**: Indica la afinidad promedio del talento que atrae cada canal.

---

## 4. Estructura Organizacional: Áreas y Gerencias

Ubicación: **Configuración ➔ 🏢 Áreas y Departamentos**.

El sistema utiliza un catálogo dinámico de áreas en lugar de departamentos hardcodeados, estableciendo la jerarquía real de la empresa:

### 4.1 Crear una Nueva Área
1. Haz clic en **"+ Nueva Área"**.
2. Ingresa el **Nombre del Área** (ej. *Ventas y Comercial*, *Cobranza Especializada*).
3. Ingresa el **Código** mnemotécnico (ej. `COM`, `COB`).
4. **Asignación de Líderes**:
   - **Gerente Titular**:
     - *Modo Existente*: Selecciona a un colaborador previamente registrado.
     - *Modo ➕ Crear nuevo (Alta Rápida)*: Si el gerente aún no tiene cuenta, captura su nombre y correo en el mismo formulario; el sistema le generará su acceso de inmediato con rol `Gerente_Vacante`.
     - *Sin Gerente (Opcional)*: Puedes dejar el puesto vacante para asignarlo posteriormente, evitando dependencias circulares.
   - **Evaluador de Capacitación**: Selecciona al instructor responsable de evaluar la inducción técnica de esta área.
5. Haz clic en **"Crear Área"**.

---

## 5. Aprovisionamiento y Gestión de Colaboradores

Ubicación: **Configuración ➔ 👥 Usuarios y Roles RBAC**.

### 5.1 Registrar un Nuevo Colaborador
Al presionar **"Registrar Nuevo Colaborador"**, dispones de dos modos de aprovisionamiento:

#### Modo 1: 🎯 Aprovisionar por Puesto (Recomendado)
Diseñado para dar de alta a líderes de área sin lidiar con tecnicismos de roles o permisos:
1. En el selector desplegable, elige el puesto clave que ocupará (ej. *Gerente Titular de Ventas y Comercial* o *Evaluador de Capacitación de Cobranza*). El selector te indicará si el puesto ya tiene un titular o si es una `(Posición Vacante ⭐)`.
2. Captura el Nombre Completo, Correo y Contraseña temporal.
3. El sistema **auto-configura el área, auto-asigna el rol RBAC adecuado y vincula formalmente al usuario como titular del puesto** en la estructura organizacional.

#### Modo 2: 🛠️ Configuración Manual
Para perfiles genéricos o administrativos (Reclutadores Senior/Junior, Auditores, Gerentes de RH):
1. Captura nombre, correo y contraseña.
2. Elige el área de pertenencia (opcional).
3. Selecciona el Rol Principal a otorgar.

---

## 6. Gestión de Vacantes con Efecto Cascada

Ubicación: **Vacantes ➔ "+ Nueva Vacante"**.

### 6.1 Vinculación Inteligente con Áreas
Al redactar una vacante, el campo **Área / Departamento Organizacional** activa un **efecto cascada automático**:
- Al elegir el área (ej. *Ventas y Comercial*), el formulario **auto-asigna al Gerente Titular** para las fases de *Entrevista* y *Roleplay*.
- Auto-asigna al **Evaluador Titular** para las fases de *Capacitación 1* y *Capacitación 2*.
- Si se trata de una vacante delegada a un supervisor específico, puedes modificar los evaluadores puntualmente.

### 6.2 Criterios Ponderados y Rango de Edad Deseado
- **Criterios de Scoring**: Define los factores de afinidad y sus pesos porcentuales (total 100%). La IA evaluará cada CV contra esta matriz.
- **Rango de Edad**: Establece la edad mínima y máxima deseada. Si un candidato postula con una edad calculada fuera de este rango, el sistema generará una alerta visual preventiva en su expediente sin descartarlo arbitrariamente.

---

## 7. Carga de CVs y Evaluación Automatizada por IA

1. Presiona **"Subir CVs"** desde el Dashboard o Candidatos.
2. Selecciona la **Vacante Destino** y la **Plataforma / Canal de Origen** (OCC, Indeed, LinkedIn, etc.).
3. La IA local analiza el documento en segundo plano:
   - Extrae experiencia, competencias y datos de contacto.
   - Pondera la afinidad contra los criterios de la vacante.
   - Asigna la etiqueta visual: 🟢 **Alto** (≥80%), 🟡 **Medio** (60-79%) o 🔴 **Bajo** (<60%).

---

## 8. Visor de PDF Original y Expediente Laboral

Al hacer clic en un candidato, se despliega su expediente interactivo:
* **Panel Izquierdo**: Visor del PDF original con herramientas de **Zoom In/Out**, **Rotación 90°** y **Descarga Directa**.
* **Panel Derecho**: Puntuación de afinidad, justificación en viñetas de la IA, datos extraídos, bitácora de notas y botón de acciones.

---

## 9. Tablero Kanban y Dictamen Formal de Etapas

Ubicación: **Tablero Kanban**.

Permite el seguimiento visual del embudo por columnas: `CV Recibido`, `Pre-entrevista`, `Entrevista`, `Roleplay`, `Capacitación 1`, `Capacitación 2`, `Oferta`, `Contratado` y `Rechazado`.

### 9.1 Filtro por Área y "Solo Mis Vacantes Asignadas"
- **Filtro de Área**: Permite aislar el embudo a las vacantes de un departamento específico.
- **Solo mis vacantes**: Los Hiring Managers y Evaluadores de Capacitación pueden marcar esta casilla para visualizar únicamente los candidatos de los procesos donde son responsables.

### 9.2 Procedimiento para Emitir un Dictamen Formal
1. Abre el expediente del candidato en la etapa a evaluar.
2. Haz clic en el botón superior **"📝 Dictaminar Etapa"**.
3. En el modal de evaluación:
   - **Etapa Dictaminada**: Confirma la fase evaluada (ej. *Entrevista* o *Capacitación 1*).
   - **Calificación Obtenida**: Escala de 0 a 100 (un score ≥70 muestra badge de aprobación).
   - **Veredicto Oficial**: Selecciona `Aprobado`, `En Refuerzo` (requiere soporte) o `No Aprobado`.
   - **Observaciones**: Redacta la retroalimentación técnica o conductual.
   - **Avanzar Etapa**: Si está aprobado y marcas la casilla, el candidato **avanzará automáticamente a la siguiente columna del Kanban**.
4. Haz clic en **"Firmar y Registrar Dictamen"**.
   - El sistema genera una **nota inmutable con autoría blindada** (nombre del evaluador, rol, área y hora exacta) y registra el evento en la Bitácora de Auditoría.

---

## 10. Flujo Conversacional de Samanta (Pre-entrevista de 6 Pasos)

Samanta es el agente conversacional de filtro inicial. Una vez vinculado el candidato por Telegram (`/start app_{id}`), ejecuta de forma autónoma el siguiente protocolo:
1. **Inicio y Vinculación**: Saludo institucional y vinculación al expediente.
2. **Aviso de Privacidad (LFPDPPP)**: Despacho del consentimiento legal informado.
3. **Perfilamiento Comercial**: Máximo 2 preguntas aplicando escucha activa empática (valida la respuesta antes de formular la siguiente).
4. **Disponibilidad y Pretensiones**: Consulta amable de horario y expectativa económica.
5. **Cierre y Resumen Ejecutivo**: Despedida cordial y redacción de nota ejecutiva en el expediente.
6. **Verificación Oficial**: Solicitud de fotografía de credencial oficial.

---

## 11. Blindaje de Identidad con Visión Multimodal (INE / CURP)

Cuando el candidato envía la foto de su credencial:
1. El motor de visión multimodal local extrae la **CURP** de 18 caracteres y fecha de nacimiento.
2. **Cálculo Exacto de Edad**: Determina la edad real a la fecha de consulta.
3. **Cotejo de Nombre**: Compara el nombre oficial extraído contra el nombre postulado. Si difieren significativamente, emite una alerta de discrepancia para prevenir suplantación de identidad.

---

## 12. Ciclo de Vida Seguro: Desactivación vs Eliminación Definitiva

Para mantener limpia la base de datos sin romper la integridad histórica ni crear registros huérfanos:

### 12.1 Desactivar (Soft Delete)
- **Áreas**: Oculta el departamento de los selectores de nuevas vacantes y colaboradores. Las vacantes y candidatos preexistentes conservan su histórico.
- **Usuarios**: Suspende el acceso inmediato del colaborador sin borrar sus notas ni firmas de auditoría.

### 12.2 Eliminar Definitivamente (Hard Delete / Purga)
- **Áreas**:
  - **Validación Automática de Dependencias**: Si el área tiene vacantes asignadas (activas o cerradas), el sistema **bloquea la eliminación** y te avisa que debes reasignarlas primero para no dejar postulaciones huérfanas.
  - Si el área no tiene vacantes vinculadas (ej. área de prueba o dummy), se borra físicamente y se desvincula a los usuarios asignados de forma limpia.
- **Colaboradores**:
  - **Protección Root**: La cuenta `admin@jpm.com` y tu propia cuenta activa no pueden ser eliminadas.
  - **Validación de Hiring Manager**: Si el usuario tiene vacantes activas abiertas a su cargo, se bloquea la eliminación hasta que sean reasignadas.
  - Al eliminarse, libera limpiamente las titularidades en el organigrama (`manager_id = NULL`) y purga la cuenta.

---

## 13. Bitácora de Auditoría y Cumplimiento LFPDPPP

Ubicación: **Configuración ➔ 🛡️ Bitácora de Auditoría**.

Registro inmutable de trazabilidad jurídica:
- Consulta en tiempo real de eventos: visualización de credenciales INE, descargas de CVs, dictámenes emitidos, transferencias de vacantes y purgas.
- **Filtros Avanzados**: Por tipo de acción (`LOGIN`, `VIEW_INE_DOCUMENT`, `SUBMIT_EVALUATION`, `PURGE_INE_DOCUMENT`, etc.) o por recurso (`candidate`, `vacancy`, `user`, `settings`).
- **Purga ARCO de Identificación**: Desde el expediente del candidato, un Auditor o SuperAdmin puede presionar **"Purgar Documento INE"** para destruir el archivo físico de la credencial cumpliendo con el Derecho de Cancelación, dejando constancia criptográfica en la bitácora.

---

## 14. Sandbox & Simulador de IA (Pruebas de Calibración)

Ubicación: **Simulador IA** en la barra lateral.

Permite al equipo de Recursos Humanos probar y calibrar las respuestas de Samanta en un entorno aislado:
- **Perfiles Predefinidos**: Prueba con perfiles comerciales Senior, Junior sin experiencia o vincula cualquier candidato real del sistema.
- **Chat Interactivo**: Envía mensajes, utiliza respuestas rápidas y visualiza el indicador de escritura en tiempo real.
- **Carga de Identificación de Prueba**: Adjunta fotos de credenciales para comprobar la lectura OCR y el cálculo de edad.
- **Inspector Técnico**: Visualiza el paso detectado del embudo (1 al 6), el resumen ejecutivo generado y el System Prompt exacto inyectado a Ollama.

---

## 15. Preguntas Frecuentes (FAQ)

**P: ¿Qué ocurre si intento eliminar un área que tiene vacantes activas?**  
R: El sistema bloqueará la operación y te mostrará un mensaje indicando cuántas vacantes tiene vinculadas. Para eliminar el área, primero debes transferir o eliminar dichas vacantes, o simplemente usar la opción **"Desactivar"**.

**P: ¿Cómo sabe el sistema a qué evaluador asignarle la entrevista?**  
R: Gracias a la vinculación orgánica. Al crear la vacante y seleccionar el Área, el sistema auto-asigna al Gerente Titular del área para Entrevista/Roleplay y al Evaluador Titular para Capacitación.

**P: ¿Por qué no puedo eliminar la cuenta `admin@jpm.com`?**  
R: Por seguridad del sistema. La cuenta de Administrador principal cuenta con protección contra borrado accidental para garantizar que la plataforma nunca quede inaccesible.

**P: ¿Dónde se guardan los archivos PDF y las credenciales?**  
R: En el volumen protegido de almacenamiento de Docker (`storage/candidates/`), accesible únicamente a través de la API con permisos autenticados.

---

*Manual de Operación de JPM Talento | Recursos Humanos & Tecnología.*
