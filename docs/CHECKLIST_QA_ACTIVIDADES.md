# Guía de Ejecución y Checklist de Pruebas Operativas (Día 1 y Día 2)

**Proyecto**: JPM Talento v2.5 — Plataforma Integral de Reclutamiento, Evaluación y Cumplimiento LFPDPPP  
**Propósito**: Guía paso a paso para el equipo técnico y de atracción de talento para ejecutar la homologación funcional, validación de integridad referencial y auditoría de seguridad.

---

## ⚡ 0. Instrucciones de Preparación Inmediata (Hoy)

Ejecuta los siguientes comandos en tu terminal de **PowerShell** en la carpeta del proyecto (`c:\Users\JPM-PROGRAMACION\Documents\Proyectos\RRHH`):

```powershell
# 1. Confirmar cambios en Git para consolidar la fase de pruebas y documentación
git add backend/app/test_matrix_suite.py docs/BITACORA_DE_PRUEBAS_QA.md docs/CHECKLIST_QA_ACTIVIDADES.md
git commit -m "test(qa): matriz automatizada de pruebas y guia de homologacion operativa para dia 1 y dia 2"

# 2. Sincronizar el backend con el contenedor Docker
.\sync_backend.bat

# 3. Ejecutar la suite automatizada de pruebas en memoria aislada (validar 14/14 PASS)
docker exec rh_backend python app/test_matrix_suite.py
```

---

## 📅 DÍA 1: Estructura Orgánica, Vacantes y Blindaje contra Huérfanos

**Objetivo del Día 1**: Validar la vinculación entre Áreas, Gerentes y Vacantes, así como verificar que el sistema impida corromper la base de datos o dejar registros huérfanos.

### Credenciales a Utilizar:
- **SuperAdmin**: `admin@jpm.com` / `Admin1234!`
- **Gerente de Ventas**: `gerente.ventas@jpm.com` / `Gerente123!`
- **Reclutador Senior**: `reclutador@jpm.com` / `Reclutador123!`

---

### Bloque 1.1: Alta de Áreas y Resolución de Gerentes Titulares
- [ ] **Acceso a Configuración**: Iniciar sesión como `admin@jpm.com`, entrar a la sección **"⚙️ Configuración"** y abrir la subpestaña **"🏢 Áreas y Departamentos"**.
- [ ] **Creación de Área con Gerente Existente**:
  - Clic en `+ Nueva Área`.
  - Registrar Nombre: `Atención a Clientes y Soporte`, Código: `SAC`.
  - Seleccionar en el picklist a `Carlos Mendoza` como Gerente Titular.
  - Guardar y verificar que aparezca en la tabla con sus badges de titularidad.
- [ ] **Creación de Área con Alta Rápida de Gerente In-Line**:
  - Clic en `+ Nueva Área`.
  - Registrar Nombre: `Logística y Distribución`, Código: `LOG`.
  - En el selector de Gerente, elegir `+ Dar de alta nuevo colaborador como Gerente...`.
  - Capturar Nombre: `Ing. Fernando Soto` y Correo: `fernando.soto@jpm.com`.
  - Guardar y constatar:
    1. El área `LOG` se crea vinculada a Fernando Soto.
    2. En la subpestaña **"👥 Usuarios y Roles RBAC"**, Fernando Soto ya existe con el rol `Gerente_Vacante`.

---

### Bloque 1.2: Aprovisionamiento de Puestos (Template Mode)
- [ ] **Alta por Puesto**: Ir a **"👥 Usuarios y Roles RBAC"** y pulsar `+ Registrar Colaborador`.
- [ ] **Modo Plantilla Inteligente**:
  - Asegurarse de tener seleccionado el modo `🎯 Aprovisionar por Puesto`.
  - En el selector de Puesto Tipo, elegir `Gerente Titular de Operaciones`.
  - Constatar que el formulario pre-seleccione automáticamente el rol `Gerente_Vacante`.
  - Asignar correo `operaciones@jpm.com`, guardar y verificar que aparezca en la lista de colaboradores con su insignia y rol correcto.

---

### Bloque 1.3: Efecto Cascada en Vacantes
- [ ] **Crear Vacante y Probar Cascada**:
  - Entrar al módulo de **"📋 Vacantes"** y pulsar `+ Nueva Vacante`.
  - Seleccionar el Área `Atención a Clientes y Soporte (SAC)`.
  - **Verificación**: Confirmar que el campo **Hiring Manager / Gerente Titular** se auto-asigne de inmediato al gerente del área sin tener que buscarlo manualmente.
  - Guardar la vacante como `Ejecutivo Telefónico SAC`.

---

### Bloque 1.4: Prueba de Fuego — Blindaje de Eliminación (Hard Delete vs Soft Delete)
- [ ] **Prueba de Bloqueo de Huérfanos en Áreas**:
  - Ir a **"🏢 Áreas y Departamentos"**.
  - Localizar el área `Atención a Clientes y Soporte (SAC)` (la cual tiene la vacante recién creada).
  - Hacer clic en el botón rojo `🗑️ Eliminar`.
  - Confirmar el cuadro de diálogo.
  - **Resultado Esperado**: El sistema debe emitir una advertencia clara bloqueando la eliminación:  
    *«No es posible eliminar el departamento: Tiene vacantes asociadas. Reasigne o cierre las vacantes antes de continuar.»* (Código HTTP 400).
- [ ] **Prueba de Desactivación Segura (Soft Delete)**:
  - En la misma área `SAC`, hacer clic en `Desactivar`.
  - Constatar que el área pase al estado `Inactiva` pero la vacante continúe intacta en el sistema.
  - Reactivar el área.
- [ ] **Prueba de Eliminación Limpia de Área sin Dependencias**:
  - Crear un área temporal de prueba `Área Temporal QA`, Código `TMP` sin vacantes.
  - Asignar a un usuario a dicha área.
  - Hacer clic en `🗑️ Eliminar`.
  - Constatar que el área se elimine definitivamente y el usuario asignado permanezca en el sistema con su departamento desvinculado de forma limpia (`NULL`), sin corromper la base de datos.
- [ ] **Prueba de Blindaje de Cuenta Raíz**:
  - Ir a **"👥 Usuarios y Roles RBAC"**.
  - Localizar a `admin@jpm.com` y pulsar `🗑️ Eliminar`.
  - Constatar que el sistema rechace la eliminación de la cuenta administradora maestra.

---

## 📅 DÍA 2: Evaluaciones, Dictamen Kanban y Auditoría LFPDPPP

**Objetivo del Día 2**: Validar el flujo de evaluación técnica y pedagógica, la emisión de dictámenes formales y el cumplimiento de protección de datos sensibles.

### Credenciales a Utilizar:
- **Gerente Evaluador**: `gerente.ventas@jpm.com` / `Gerente123!`
- **Capacitador Técnico**: `capacitador@jpm.com` / `Capacita123!`
- **Auditor de Privacidad**: `auditor@jpm.com` / `Auditor123!`
- **Reclutador Senior**: `reclutador@jpm.com` / `Reclutador123!`

---

### Bloque 2.1: Filtro de Evaluador en Tablero Kanban
- [ ] **Inicio de Sesión de Evaluador**:
  - Cerrar sesión e ingresar como `gerente.ventas@jpm.com`.
  - Constatar que en el Sidebar inferior figure el perfil con el rol `Gerente_Vacante`.
- [ ] **Acceso a Kanban**:
  - Ir al módulo **"📊 Tablero Kanban"**.
  - Activar el toggle de filtro *"Mis Vacantes Asignadas"*.
  - Comprobar que únicamente se desplieguen los candidatos que pertenecen a vacantes donde Carlos Mendoza es el gerente responsable.

---

### Bloque 2.2: Emisión de Dictamen Formal y Bloqueo ante "En Refuerzo"
- [ ] **Prueba de Dictamen "En Refuerzo"**:
  - Seleccionar un candidato que se encuentre en la etapa de `Entrevista`.
  - Hacer clic en el botón superior **"📝 Dictaminar Etapa"**.
  - Asignar Calificación: `65`.
  - Seleccionar Veredicto Oficial: `En Refuerzo`.
  - Escribir retroalimentación: *"Muestra potencial en fluidez verbal, pero requiere afianzar manejo de objeciones comerciales."*
  - Pulsar **"Firmar y Registrar Dictamen"**.
  - **Verificación**:
    1. En el historial de notas del candidato debe aparecer la nota formal con el encabezado `[DICTAMEN DE ETAPA]`, calificación `65/100`, veredicto `EN REFUERZO` y la firma de Carlos Mendoza con su cargo y fecha.
    2. El candidato **NO debe avanzar** automáticamente a la siguiente etapa formativa, manteniéndose en `Entrevista` para su refuerzo.
- [ ] **Prueba de Dictamen "Aprobado" y Auto-avance**:
  - Volver a abrir el modal de dictamen para el mismo candidato.
  - Asignar Calificación: `90`.
  - Seleccionar Veredicto: `Aprobado`.
  - Retroalimentación: *"Aprobado satisfactoriamente tras sesión de nivelación."*
  - Pulsar **"Firmar y Registrar Dictamen"**.
  - **Verificación**:
    1. Se registra la nueva nota firmada.
    2. El candidato **avanza automáticamente** a la siguiente columna del Kanban (`Roleplay`).

---

### Bloque 2.3: Cumplimiento LFPDPPP y Destrucción de Documentos (ARCO)
- [ ] **Inspección de Documento Sensible**:
  - Ingresar como `auditor@jpm.com` / `Auditor123!`.
  - Acceder a un candidato que cuente con identificación oficial (INE).
  - Abrir la vista de la identificación.
- [ ] **Ejecución de Purga de Documento**:
  - En la tarjeta del documento INE, hacer clic en **"🗑️ Purgar Documento (ARCO)"**.
  - Confirmar el motivo legal de cancelación de datos personales.
  - Constatar que el archivo binario sea destruido del almacenamiento y en la ficha del candidato se reemplace por un sello criptográfico de trazabilidad (Hash SHA-256).
- [ ] **Verificación en la Bitácora de Auditoría**:
  - Ir a **"⚙️ Configuración" -> "🛡️ Bitácora de Auditoría"**.
  - Verificar que se hayan generado de forma inmutable los registros:
    - `VIEW_INE_DOCUMENT` con la IP, fecha y usuario auditor.
    - `PURGE_INE_DOCUMENT` con la referencia al documento destruido y el hash conservado.
    - `SUBMIT_EVALUATION` correspondiente a los dictámenes emitidos previamente.

---

### Bloque 2.4: Métrica de Conversión por Plataforma
- [ ] **Validación en Dashboard**:
  - Iniciar sesión como `reclutador@jpm.com`.
  - En la pantalla principal, verificar la tarjeta **"Conversión por Plataforma de Reclutamiento"**.
  - Constatar que figuren los canales (Computrabajo, OCC, LinkedIn, Bolsa Interna, etc.) con sus tasas de conversión, barras de avance porcentual y promedios de calificación IA.
  - Confirmar que el panel técnico de servidores **no se muestra** para este rol operativo.

---

## 📝 3. Cierre y Firma de Homologación QA

Al concluir satisfactoriamente el checklist anterior:

1. Abrir el archivo [`docs/BITACORA_DE_PRUEBAS_QA.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/BITACORA_DE_PRUEBAS_QA.md).
2. Completar las firmas del Responsable Técnico y de Recursos Humanos.
3. El sistema queda formalmente certificado para despliegue productivo.
