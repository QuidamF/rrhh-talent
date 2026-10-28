# 📋 Archivo de Seguimiento del Proyecto — JPM Talento v2.5

**Sistema**: JPM Talento — Plataforma Integral de Reclutamiento, Evaluación y Cumplimiento LFPDPPP  
**Última Actualización**: 2026-09-09  
**Estado General**: 🟢 **FASE DE ESTABILIZACIÓN Y HOMOLOGACIÓN QA**  
**Resultado de Pruebas Automatizadas**: **14 / 14 Casos Aprobados (100% PASS)**

---

## 📌 1. Estado Actual y Registro de Hitos

| Fase / Hito | Descripción | Estado | Documento / Referencia |
|:---|:---|:---:|:---|
| **Fase P0: Core ATS** | Carga de CVs, parsing OCR, embudo de candidatos y scoring con IA local. | ✅ Completado | [`docs/scoring.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/scoring.md) |
| **Fase P1: Seguridad RBAC** | Criptografía PBKDF2, tokens HMAC, matriz de 13 permisos y 7 roles de usuario. | ✅ Completado | [`docs/architecture.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/architecture.md) |
| **Fase P1.2: Áreas y Estructura** | Catálogo dinámico de Áreas, Gerentes Titulares y efecto cascada en vacantes. | ✅ Completado | [`docs/database.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/database.md) |
| **Fase P1.3: Integridad & Hard Delete** | Bloqueo de huérfanos en eliminación de áreas/usuarios y blindaje de cuenta raíz. | ✅ Completado | [`backend/app/routers/auth_rbac.py`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/backend/app/routers/auth_rbac.py) |
| **Fase P1.4: Suite de Pruebas QA** | Runner de 14 pruebas unitarias/integración en SQLite en memoria aislada. | ✅ Completado | [`backend/app/test_matrix_suite.py`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/backend/app/test_matrix_suite.py) |
| **Fase QA: Homologación Operativa** | Pruebas funcionales de campo en interfaz gráfica para Día 1 y Día 2. | 🟡 **En Curso** | [`docs/CHECKLIST_QA_ACTIVIDADES.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/CHECKLIST_QA_ACTIVIDADES.md) |

---

## ⚡ 2. Acciones Inmediatas de Ejecución (Terminal PowerShell)

Para sincronizar los contenedores y asentar la versión en Git:

```powershell
# 1. Registrar en Git la suite de pruebas, bitácora y archivos de seguimiento
git add backend/app/test_matrix_suite.py docs/BITACORA_DE_PRUEBAS_QA.md docs/CHECKLIST_QA_ACTIVIDADES.md SEGUIMIENTO.md
git commit -m "test(qa): incorporar suite de pruebas automatizadas, bitacora de homologacion y archivo de seguimiento"

# 2. Sincronizar backend con el contenedor Docker
.\sync_backend.bat

# 3. Ejecutar la suite automatizada de pruebas y validar el 100% PASS
docker exec rh_backend python app/test_matrix_suite.py
```

---

## 📅 3. Cronograma de Seguimiento y Tareas Operativas

### 🗓️ MAÑANA (Día 1) — Estructura Orgánica, Vacantes y Blindaje de Datos

> **Objetivo**: Validar que la interfaz opere sin errores, las áreas hereden gerentes a las vacantes y el sistema impida corromper la base de datos o dejar registros huérfanos.

| ID | Actividad / Prueba Operativa | Usuario / Rol | Resultado Esperado | Check |
|:---:|:---|:---|:---|:---:|
| **D1-01** | **Ejecución inicial en Docker** | Consola | Correr `test_matrix_suite.py` y verificar 14 pruebas en verde. | [ ] |
| **D1-02** | **Alta de Área con Gerente Existente** | `admin@jpm.com` | Crear área `SAC` asignando a Carlos Mendoza. Aparece badge en tabla. | [ ] |
| **D1-03** | **Alta Rápida de Gerente In-Line** | `admin@jpm.com` | Crear área `LOG` y dar de alta a Fernando Soto en el mismo modal. | [ ] |
| **D1-04** | **Aprovisionamiento por Puesto (Template)** | `admin@jpm.com` | Registrar colaborador con plantilla inteligente (`Gerente_Vacante`). | [ ] |
| **D1-05** | **Efecto Cascada en Vacantes** | `reclutador@jpm.com` | Crear vacante asignando área `SAC`. El gerente se auto-asigna solo. | [ ] |
| **D1-06** | **Prueba Hard Delete con Bloqueo** | `admin@jpm.com` | Intentar borrar área `SAC` con vacantes. Sistema arroja `400 Bad Request`. | [ ] |
| **D1-07** | **Prueba Soft Delete (Desactivar)** | `admin@jpm.com` | Desactivar área `SAC`. Pasa a `Inactiva` sin afectar vacantes históricas. | [ ] |
| **D1-08** | **Prueba Hard Delete sin Dependencias** | `admin@jpm.com` | Crear área temporal `TMP` y borrarla con `🗑️`. Se purga limpiamente. | [ ] |
| **D1-09** | **Blindaje de Cuenta Maestra** | `admin@jpm.com` | Intentar borrar `admin@jpm.com`. Sistema rechaza la acción. | [ ] |

---

### 🗓️ PASADO MAÑANA (Día 2) — Evaluaciones, Kanban, Auditoría y LFPDPPP

> **Objetivo**: Evaluar candidatos mediante dictamen formal firmado digitalmente, comprobar transiciones automáticas en Kanban y certificar la destrucción de datos sensibles ARCO.

| ID | Actividad / Prueba Operativa | Usuario / Rol | Resultado Esperado | Check |
|:---:|:---|:---|:---|:---:|
| **D2-01** | **Filtro de Evaluador en Kanban** | `gerente.ventas@jpm.com` | Activar toggle *"Mis Vacantes Asignadas"*. Solo ve sus candidatos. | [ ] |
| **D2-02** | **Dictamen "En Refuerzo" (Bloqueo)** | `gerente.ventas@jpm.com` | Calificación `<70`. Se guarda nota formal firmada y candidato **no avanza**. | [ ] |
| **D2-03** | **Dictamen "Aprobado" (Auto-avance)** | `gerente.ventas@jpm.com` | Calificación `≥70`. Se guarda nota firmada y candidato **avanza a Roleplay**. | [ ] |
| **D2-04** | **Inspección de Identificación (INE)** | `auditor@jpm.com` | Abrir documento sensible INE de candidato en proceso. | [ ] |
| **D2-05** | **Purga Legal ARCO de Documento** | `auditor@jpm.com` | Ejecutar purga de INE. Archivo binario destruido y sellado con SHA-256. | [ ] |
| **D2-06** | **Inspección de Bitácora de Auditoría** | `auditor@jpm.com` | Verificar eventos inmutables `VIEW_INE_DOCUMENT` y `PURGE_INE_DOCUMENT`. | [ ] |
| **D2-07** | **Métricas de Conversión en Dashboard** | `reclutador@jpm.com` | Validar tarjeta de efectividad por canal (Computrabajo, OCC, etc.). | [ ] |
| **D2-08** | **Cierre y Firma de Homologación** | JPM Desarrollo & RH | Completar firmas en [`docs/BITACORA_DE_PRUEBAS_QA.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/BITACORA_DE_PRUEBAS_QA.md). | [ ] |

---

## 🔑 4. Directorio de Cuentas Demo para Pruebas

| Rol | Correo Electrónico | Contraseña | Alcance Operativo |
|:---|:---|:---|:---|
| **SuperAdmin** | `admin@jpm.com` | `Admin1234!` | Acceso irrestricto, gestión de áreas, usuarios y monitor TI. |
| **Reclutador Senior** | `reclutador@jpm.com` | `Reclutador123!` | Gestión total de vacantes, candidatos y analítica de conversión. |
| **Gerente de Ventas** | `gerente.ventas@jpm.com` | `Gerente123!` | Dictamen formal en etapas de Entrevista y Roleplay. |
| **Capacitador Técnico** | `capacitador@jpm.com` | `Capacita123!` | Dictamen formativo en Capacitación 1 y Capacitación 2. |
| **Auditor de Privacidad** | `auditor@jpm.com` | `Auditor123!` | Inspección de logs de auditoría y ejercicio de purga ARCO. |

---

## 📚 5. Índice de Documentación del Repositorio

- **Manual de Usuario Completo**: [`docs/MANUAL_DE_USUARIO.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/MANUAL_DE_USUARIO.md)
- **Checklist Detallado Paso a Paso**: [`docs/CHECKLIST_QA_ACTIVIDADES.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/CHECKLIST_QA_ACTIVIDADES.md)
- **Bitácora Oficial de Homologación**: [`docs/BITACORA_DE_PRUEBAS_QA.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/BITACORA_DE_PRUEBAS_QA.md)
- **Definición de Arquitectura y Seguridad**: [`docs/architecture.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/architecture.md)
- **Diccionario de Base de Datos y Modelo ER**: [`docs/database.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/database.md)
- **Guía de Despliegue en Servidor**: [`docs/deployment.md`](file:///c:/Users/JPM-PROGRAMACION/Documents/Proyectos/RRHH/docs/deployment.md)
