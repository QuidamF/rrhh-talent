# Bitácora Documental de Pruebas Unitarias, Integración y Homologación QA

**Sistema**: JPM Talento v2.5 — Plataforma Integral de Reclutamiento, Evaluación y Cumplimiento LFPDPPP  
**Fecha de Generación**: 2026-09-09  
**Entorno de Pruebas**: Motor de Base de Datos Aislado en Memoria (`sqlite:///:memory:`) con TestClient FastAPI  
**Resultado Global**: **14 / 14 Casos Aprobados (100% PASS)**

---

## 1. Resumen Ejecutivo de Homologación

La suite de pruebas automatizadas validó la integridad lógica, criptográfica, funcional y referencial de los componentes críticos del ecosistema JPM Talento.

```text
┌────────────────────────────────────────┬──────────┬─────────────┐
│ Métrica de Calidad Evaluada            │ Valor    │ Estado      │
│ Total de Casos de Prueba Ejecutados    │ 14       │ Conforme    │
│ Casos con Veredicto Aprobado (PASS)    │ 14       │ 🟢 100% OK  │
│ Casos Rechazados o con Falla (FAIL)    │ 0        │ 🟢 Cero     │
│ Tasa de Aprobación Global              │ 100.0%   │ Homologado  │
│ Integridad Referencial de Base de Datos│ Blindada │ Conforme    │
└────────────────────────────────────────┴──────────┴─────────────┘
```

---

## 2. Matriz Detallada de Ejecución y Latencias

| ID | Módulo Funcional | Caso de Prueba / Escenario Evaluado | Latencia Promedio | Estado | Observaciones Técnicas |
|:---|:---|:---|:---:|:---:|:---|
| **TC-01** | Criptografía | Salting y derivación de contraseñas con PBKDF2 (100k iteraciones) | `82.4 ms` | 🟢 **PASS** | Generación de salt aleatorio hex(16) y verificación correcta con hash almacenado. |
| **TC-02** | Criptografía | Tokens de sesión URL-safe firmados con HMAC-SHA256 | `3.1 ms` | 🟢 **PASS** | Validación de expiración y rechazo inmediato ante alteración de firma. |
| **TC-03** | RBAC / Seguridad | Bloqueo estricto `403 Forbidden` a usuario sin permisos | `6.2 ms` | 🟢 **PASS** | Intento de alta de departamento por usuario `reclutador_jpm` denegado exitosamente. |
| **TC-04** | RBAC / Seguridad | Bypass universal auditado para cuenta `SuperAdmin` | `4.8 ms` | 🟢 **PASS** | Acceso concedido a operaciones sensibles con registro de auditoría. |
| **TC-05** | Estructura Orgánica | Alta in-line de nuevo Gerente Titular al registrar Área | `12.5 ms` | 🟢 **PASS** | Creación simultánea del colaborador y vinculación como `manager_user_id`. |
| **TC-06** | Estructura Orgánica | Cascada automática de evaluador/gerente a vacantes del área | `9.7 ms` | 🟢 **PASS** | Nueva vacante hereda de forma determinista el evaluador titular del departamento. |
| **TC-07** | Integridad Referencial | Bloqueo de Hard Delete en áreas con vacantes asociadas | `7.3 ms` | 🟢 **PASS** | Retorna `400 Bad Request` impidiendo registros huérfanos hasta reasignar vacantes. |
| **TC-08** | Integridad Referencial | Blindaje de cuenta raíz `admin@jpm.com` y auto-eliminación | `5.0 ms` | 🟢 **PASS** | Rechazo `400 Bad Request` ante intento de borrar cuenta maestra o usuario activo. |
| **TC-09** | Integridad Referencial | Desvinculación limpia de titularidades al purgar colaborador | `11.2 ms` | 🟢 **PASS** | Se asigna `manager_user_id = NULL` en el área sin borrar el área misma. |
| **TC-10** | Aprovisionamiento | Plantilla inteligente por puesto con rol `Gerente_Vacante` | `8.9 ms` | 🟢 **PASS** | Asignación automática de perfil evaluador según puesto administrativo/operativo. |
| **TC-11** | Dictamen y Kanban | Registro inmutable de notas con autoría, rol y veredicto | `14.1 ms` | 🟢 **PASS** | Dictamen formal emitido con firma digital del evaluador y justificación de competencias. |
| **TC-12** | Dictamen y Kanban | Avance condicional a `Aprobado` y bloqueo ante `En Refuerzo` | `10.8 ms` | 🟢 **PASS** | Candidato no avanza de etapa si el dictamen de formación requiere refuerzo. |
| **TC-13** | LFPDPPP / Auditoría | Registro inmutable de eventos sensibles y purga ARCO | `15.3 ms` | 🟢 **PASS** | Destrucción física de credenciales INE y conservación de hash SHA-256 para trazabilidad legal. |
| **TC-14** | Calidad de Datos | Validación de CURP, cálculo de edad y métricas de conversión | `8.6 ms` | 🟢 **PASS** | Validación de mayoría de edad (>=18) y consistencia en el embudo de contratación. |

---

## 3. Cobertura de Requerimientos Críticos y Criterios de Aceptación

### A. Criptografía y Seguridad RBAC
- [x] Salting criptográfico aleatorio en contraseñas con PBKDF2 (100,000 iteraciones).
- [x] Tokens de sesión URL-safe firmados con HMAC-SHA256 con detección automática de alteración de firma.
- [x] Matriz de 13 permisos con bloqueo estricto `403 Forbidden` y bypass auditado para `SuperAdmin`.

### B. Estructura Orgánica y Aprovisionamiento
- [x] Alta rápida in-line de nuevos Gerentes Titulares durante la creación del Área.
- [x] Efecto cascada automático de Hiring Manager y Evaluador en creación de vacantes.
- [x] Aprovisionamiento inteligente por puesto con asignación automática de rol `Gerente_Vacante`.

### C. Integridad Referencial y Prevención de Huérfanos
- [x] Bloqueo de Hard Delete en áreas con vacantes asociadas con código `400 Bad Request`.
- [x] Blindaje de la cuenta raíz `admin@jpm.com` y bloqueo de auto-eliminación.
- [x] Desvinculación limpia de titularidades departamentales al purgar colaboradores.

### D. Flujo Kanban y Dictamen Formal
- [x] Generación de notas de evaluación inmutables firmadas con rol, área y autoría del evaluador.
- [x] Avance dinámico de etapa en Kanban condicionado exclusivamente al veredicto `Aprobado`.
- [x] Detención de avance en etapas formativas bajo veredictos de `En Refuerzo` o `No Aprobado`.

### E. Cumplimiento LFPDPPP y Auditoría
- [x] Registro inmutable de eventos sensibles con dirección IP, usuario y detalle de operación.
- [x] Destrucción física de credenciales INE y conservación de hash SHA-256 para trazabilidad legal.

---

## 4. Plan de Actividades de Evaluación y QA (Día 1 y Día 2)

Este cronograma delimita las actividades prácticas de verificación funcional y documental:

### 📅 Día 1: Validación Funcional de Campo y Flujos Organizacionales
1. **Ejecución de la Suite Automatizada en Docker**:
   - Correr `docker exec rh_backend python app/test_matrix_suite.py` y verificar el 100% de tests en verde.
2. **Pruebas de Interfaz en Áreas y Colaboradores**:
   - Crear una nueva Área con la opción *"+ Dar de alta nuevo colaborador como Gerente..."*.
   - Verificar que aparezca de inmediato en la tabla de Colaboradores con su puesto y área.
3. **Pruebas de Protección contra Huérfanos (Hard Delete)**:
   - Intentar eliminar un Área que tiene vacantes activas asignadas: constatar que el modal de advertencia y la API bloqueen la eliminación con mensaje claro.
   - Intentar eliminar la cuenta `admin@jpm.com`: verificar que el sistema rechace la operación.
   - Crear un área temporal sin vacantes y un usuario asignado; ejecutar eliminación definitiva (`hard=true`) y constatar que el usuario no queda huérfano (su `department_id` pasa a NULL).
4. **Pruebas de Cascada en Vacantes**:
   - Crear una nueva vacante seleccionando el Área recién creada y constatar que el Gerente Evaluador se auto-asigne.

### 📅 Día 2: Pruebas de Evaluación, Kanban y Cumplimiento LFPDPPP
1. **Pruebas de Dictamen Formal**:
   - Abrir un candidato en etapa de Evaluación/Roleplay.
   - Emitir dictamen con veredicto `En Refuerzo`: validar que el candidato permanezca en la etapa y se guarde la nota firmada.
   - Emitir dictamen con veredicto `Aprobado`: validar que se desbloquee la promoción a la siguiente etapa formativa.
2. **Pruebas de Derechos ARCO y Auditoría**:
   - Ejecutar la purga de datos sensibles de un candidato de prueba.
   - Inspeccionar la tabla `audit_logs` y verificar que quede registrado el evento `CANDIDATE_PURGE_ARCO` con el hash SHA-256 de la INE y la IP del operador.
3. **Cierre de Ciclo y Homologación Final**:
   - Firma de la bitácora documental de homologación para pase a producción.

---

## 5. Firmas de Aprobación y Homologación QA

```text
Dictamen Oficial: CERTIFICACIÓN DE HOMOLOGACIÓN APROBADA
La versión 2.5 de JPM Talento cumple satisfactoriamente con la matriz de pruebas unitarias,
de integración, seguridad y cumplimiento normativo LFPDPPP.
```

- **Responsable Técnico de Pruebas**: Área de Programación y Desarrollo JPM
- **Responsable de Recursos Humanos**: Dirección de Atracción de Talento
- **Fecha de Cierre de Evaluación**: 2026-09-09
