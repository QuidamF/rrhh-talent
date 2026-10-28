# Estructura y Esquema de Base de Datos - JPM Talento

Este documento describe la arquitectura relacional, el diagrama entidad-relación, las tablas, columnas, restricciones de integridad y llaves foráneas implementadas en la base de datos de **JPM Talento**.

---

## 1. Diagrama Entidad-Relación Lógico (ERD)

```text
┌───────────────────────────┐                      ┌───────────────────────────┐
│        departments        │                      │           users           │
├───────────────────────────┤                      ├───────────────────────────┤
│ id (PK, Int, Auto)        │                      │ id (PK, String 50, UUID)  │
│ name (VarChar 100, Unique)│◄───(ondelete=SET NULL) email (VarChar 120, Unique)│
│ code (VarChar 20)         │                      │ hashed_password (String)  │
│ description (VarChar 255) │                      │ full_name (VarChar 150)   │
│ manager_id (FK -> users)──┼──(ondelete=SET NULL)►│ department (VarChar 100) │
│ trainer_id (FK -> users)──┼──(ondelete=SET NULL)►│ department_id (FK -> depts│
│ is_active (Bool, Def True)│                      │ is_active (Bool, Def True)│
│ created_at (DateTime)     │                      │ created_at (DateTime)     │
└─────────────┬─────────────┘                      └────────┬──┬───────────────┘
              │                                             │  │
              │ 1                                           │  │ M
              │                                             │  ▼
              │ M                                           │ ┌────────────────────────┐
              ▼                                             │ │       user_roles       │
┌───────────────────────────┐                               │ ├────────────────────────┤
│         vacancies         │                               │ │ user_id (PK, FK users) │
├───────────────────────────┤                               │ │ role_id (PK, FK roles) │
│ id (PK, Int, Auto)        │                               │ └───────────▲────────────┘
│ title (VarChar 200)       │                               │             │
│ description (Text)        │                               │             │ M
│ requirements (Text)       │                               │ ┌───────────┴────────────┐
│ evaluation_criteria (JSON)│                               │ │         roles          │
│ status (VarChar 50)       │                               │ ├────────────────────────┤
│ min_age (Int)             │                               │ │ id (PK, String 50)     │
│ max_age (Int)             │                               │ │ name (VarChar 80)      │
│ department_id (FK->depts) │                               │ │ description (VarChar)  │
│ manager_id (FK -> users)──┼──(ondelete=SET NULL)──────────┤ │ is_system_role (Bool)  │
│ created_at (DateTime)     │                               │ └───────────┬────────────┘
└─────────────┬─────────────┘                               │             │ M
              │                                             │             ▼
              │ 1                                           │ ┌────────────────────────┐
              │                                             │ │    role_permissions    │
              │                                             │ ├────────────────────────┤
              │ M                                           │ │ role_id (PK, FK roles) │
              ▼                                             │ │ permission_id (PK, FK) │
┌───────────────────────────┐                               │ └───────────▲────────────┘
│    vacancy_evaluators     │                               │             │
├───────────────────────────┤                               │             │ M
│ id (PK, Int, Auto)        │                               │ ┌───────────┴────────────┐
│ vacancy_id (FK->vacancies)│                               │ │      permissions       │
│ user_id (FK -> users)─────┼──(ondelete=CASCADE)───────────┤ ├────────────────────────┤
│ stage (VarChar 50)        │                               │ │ id (PK, String 80)     │
│ created_at (DateTime)     │                               │ │ module (VarChar 50)    │
└───────────────────────────┘                               │ │ description (VarChar)  │
                                                            │ └────────────────────────┘
                                                            │
┌───────────────────────────┐                               │ ┌────────────────────────┐
│        candidates         │                               │ │       audit_logs       │
├───────────────────────────┤                               │ ├────────────────────────┤
│ id (PK, String 50, UUID)  │                               │ │ id (PK, Int, Auto)     │
│ name (VarChar 150)        │                               │ │ user_id (String 50)    │
│ email (VarChar 120)       │                               │ │ user_email (VarChar)   │
│ phone (VarChar 50)        │                               │ │ action (VarChar 80)    │
│ skills (JSON)             │                               │ │ resource_type (VarChar)│
│ raw_text (Text)           │                               │ │ resource_id (VarChar)  │
│ filename (VarChar 255)    │                               │ │ details (JSON)         │
│ status (VarChar 50)       │                               │ │ ip_address (VarChar 50)│
│ telegram_chat_id (String) │                               │ │ created_at (DateTime)  │
│ curp (EncryptedString)    │                               │ └────────────────────────┘
│ birth_date (EncryptedStr) │
│ calculated_age (Int)      │
│ id_document_path (VarChar)│
│ id_document_name (VarChar)│
│ id_validation_status (Str)│
│ id_document_expires_at    │
│ id_evidence_hash (String) │
│ id_document_purged (Bool) │
│ source (VarChar 100)      │
│ created_at (DateTime)     │
└─────────────┬─────────────┘
              │
              │ 1
              ├───────────────────────────────────┐
              │ M                                 │ M
              ▼                                   ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│       applications        │       │           notes           │
├───────────────────────────┤       ├───────────────────────────┤
│ id (PK, Int, Auto)        │       │ id (PK, Int, Auto)        │
│ candidate_id (FK->cands)  │       │ candidate_id (FK->cands)  │
│ vacancy_id (FK->vacancies)│       │ content (Text)            │
│ stage (VarChar 50)        │       │ author (VarChar 100)      │
│ score (Float, Nullable)   │       │ stage (VarChar 50)        │
│ evaluation_feedback (JSON)│       │ created_at (DateTime)     │
│ created_at (DateTime)     │       └───────────────────────────┘
└─────────────┬─────────────┘
              │ 1
              │ M
              ▼
┌───────────────────────────┐
│      stage_histories      │
├───────────────────────────┤
│ id (PK, Int, Auto)        │
│ application_id (FK->apps) │
│ stage_from (VarChar 50)   │
│ stage_to (VarChar 50)     │
│ changed_at (DateTime)     │
└───────────────────────────┘
```

---

## 2. Diccionario de Tablas y Columnas

### 2.1 Tabla: `departments` (Áreas y Departamentos Organizacionales)
Define las unidades operativas de la empresa y sus líderes asignados:
* `id` (INTEGER, PK, Autoincrement): Identificador único del área.
* `name` (VARCHAR 100, Not Null, Unique): Nombre oficial (ej. *Ventas y Comercial*).
* `code` (VARCHAR 20, Nullable): Código mnemotécnico (ej. `COM`, `CAP`, `RH`).
* `description` (VARCHAR 255, Nullable): Alcance o propósito del área.
* `manager_id` (VARCHAR 50, FK -> `users.id`, `ondelete="SET NULL"`): Gerente Titular (Hiring Manager).
* `trainer_id` (VARCHAR 50, FK -> `users.id`, `ondelete="SET NULL"`): Evaluador de Capacitación Titular.
* `is_active` (BOOLEAN, Default True): Control de activación (Soft Delete).
* `created_at` (DATETIME, Default `CURRENT_TIMESTAMP`).

### 2.2 Tabla: `users` (Colaboradores y Usuarios del Sistema)
Cuentas de acceso con seguridad criptográfica:
* `id` (VARCHAR 50, PK, UUID autogenerado).
* `email` (VARCHAR 120, Unique, Index, Not Null): Correo institucional.
* `hashed_password` (VARCHAR 255, Not Null): Hash criptográfico `PBKDF2-HMAC-SHA256` (`salt:hash`).
* `full_name` (VARCHAR 150, Not Null): Nombre completo del colaborador.
* `department` (VARCHAR 100, Nullable): Nombre textual del área (compatibilidad).
* `department_id` (INTEGER, FK -> `departments.id`, `ondelete="SET NULL"`): Área formal asignada.
* `is_active` (BOOLEAN, Default True): Estado de acceso del usuario.
* `created_at` (DATETIME).

### 2.3 Tablas RBAC: `roles`, `permissions`, `user_roles`, `role_permissions`
* **`roles`**:
  * `id` (VARCHAR 50, PK): Identificador clave (`SuperAdmin`, `Gerente_RH`, `Reclutador_Senior`, `Reclutador_Junior`, `Gerente_Vacante`, `Evaluador_Capacitacion`, `Auditor_Privacidad`).
  * `name` (VARCHAR 80, Not Null): Nombre descriptivo.
  * `description` (VARCHAR 255, Nullable).
  * `is_system_role` (BOOLEAN, Default True).
* **`permissions`**:
  * `id` (VARCHAR 80, PK): Código del permiso (ej. `candidates:read`, `evaluations:submit`).
  * `module` (VARCHAR 50, Not Null): Módulo funcional (`candidates`, `vacancies`, `settings`, `audit`, etc.).
  * `description` (VARCHAR 255, Nullable).
* **`user_roles`** (Tabla intermedia N:M con cascade): `user_id` + `role_id`.
* **`role_permissions`** (Tabla intermedia N:M con cascade): `role_id` + `permission_id`.

### 2.4 Tabla: `vacancies` (Perfiles de Vacantes)
* `id` (INTEGER, PK, Autoincrement).
* `title` (VARCHAR 200, Not Null).
* `description` (TEXT, Not Null).
* `requirements` (TEXT, Nullable).
* `evaluation_criteria` (JSON): Lista de criterios ponderados de compatibilidad.
* `status` (VARCHAR 50, Default "abierta"): Estado (`abierta`, `cerrada`).
* `min_age` (INTEGER, Nullable): Edad mínima deseada.
* `max_age` (INTEGER, Nullable): Edad máxima deseada.
* `department_id` (INTEGER, FK -> `departments.id`, `ondelete="SET NULL"`): Área de pertenencia.
* `manager_id` (VARCHAR 50, FK -> `users.id`, `ondelete="SET NULL"`): Hiring Manager responsable.
* `created_at` (DATETIME).

### 2.5 Tabla: `vacancy_evaluators` (Evaluadores Específicos por Etapa)
Asocia colaboradores a etapas de una vacante:
* `id` (INTEGER, PK, Autoincrement).
* `vacancy_id` (INTEGER, FK -> `vacancies.id`, `ondelete="CASCADE"`).
* `user_id` (VARCHAR 50, FK -> `users.id`, `ondelete="CASCADE"`).
* `stage` (VARCHAR 50, Default "todas"): `entrevista`, `roleplay`, `capacitacion_1`, `capacitacion_2`, `todas`.
* `created_at` (DATETIME).

### 2.6 Tabla: `candidates` (Expedientes de Postulantes)
* `id` (VARCHAR 50, PK, UUID).
* `name` (VARCHAR 150, Not Null), `email`, `phone`, `skills` (JSON), `raw_text` (TEXT), `filename`.
* `status` (VARCHAR 50, Default "creado"): `creado`, `procesando`, `completado`, `error`.
* `telegram_chat_id` (VARCHAR 50, Nullable): Identificador de chat para vinculación con Samanta.
* `curp` (EncryptedString, Nullable): Clave CURP de 18 caracteres.
* `birth_date` (EncryptedString, Nullable): Fecha de nacimiento.
* `calculated_age` (INTEGER, Nullable): Edad calculada a la fecha de consulta.
* `id_document_path` (VARCHAR 255, Nullable): Ruta de la foto de la credencial oficial.
* `id_document_name` (VARCHAR 200, Nullable): Nombre extraído de la credencial para cotejo.
* `id_validation_status` (VARCHAR 50, Default "no_solicitado"): `no_solicitado`, `solicitado`, `validado`, `validado_prueba`, `discrepancia`.
* `id_document_expires_at` (DATETIME, Nullable): Límite temporal de conservación.
* `id_evidence_hash` (VARCHAR 64, Nullable): Hash criptográfico SHA-256 de la imagen.
* `id_document_purged` (BOOLEAN, Default False): Indicador de purga física de archivo (Derecho ARCO).
* `source` (VARCHAR 100, Default "No especificada"): Canal de captación (OCC, Computrabajo, etc.).
* `created_at` (DATETIME).

### 2.7 Tabla: `applications` (Postulaciones a Vacante)
* `id` (INTEGER, PK, Autoincrement).
* `candidate_id` (VARCHAR 50, FK -> `candidates.id`, `ondelete="CASCADE"`).
* `vacancy_id` (INTEGER, FK -> `vacancies.id`, `ondelete="CASCADE"`).
* `stage` (VARCHAR 50, Default "cv_recibido"): Etapa activa en el embudo Kanban.
* `score` (FLOAT, Nullable): Calificación de afinidad calculada por IA (0 a 100).
* `evaluation_feedback` (JSON, Nullable): Retroalimentación por criterio.
* `created_at` (DATETIME).

### 2.8 Tabla: `notes` (Bitácora de Notas y Dictámenes Firmados)
* `id` (INTEGER, PK, Autoincrement).
* `candidate_id` (VARCHAR 50, FK -> `candidates.id`, `ondelete="CASCADE"`).
* `content` (TEXT, Not Null): Texto de la nota o dictamen formal con veredicto.
* `author` (VARCHAR 100, Default "Reclutador"): Firma inmutable del colaborador evaluador.
* `stage` (VARCHAR 50, Nullable): Etapa en la que fue emitido el dictamen.
* `created_at` (DATETIME).

### 2.9 Tabla: `audit_logs` (Bitácora Inmutable LFPDPPP)
* `id` (INTEGER, PK, Autoincrement).
* `user_id` (VARCHAR 50, Nullable): ID del colaborador que realizó la operación.
* `user_email` (VARCHAR 120, Nullable): Correo institucional del autor.
* `action` (VARCHAR 80, Not Null): Acción auditada (`LOGIN`, `VIEW_INE_DOCUMENT`, `DOWNLOAD_CV`, `SUBMIT_EVALUATION`, `TRANSFER_CANDIDATE`, `PURGE_INE_DOCUMENT`, `USER_PURGED`, `DEPARTMENT_PURGED`, etc.).
* `resource_type` (VARCHAR 50, Not Null): Tipo de entidad (`candidate`, `vacancy`, `users`, `department`, `settings`).
* `resource_id` (VARCHAR 100, Nullable): Identificador del registro afectado.
* `details` (JSON, Nullable): Diccionario con parámetros, valores anteriores y nuevos.
* `ip_address` (VARCHAR 50, Nullable): Dirección IP del cliente.
* `created_at` (DATETIME, Default `CURRENT_TIMESTAMP`).

---

## 3. Integridad Referencial y Reglas de Borrado

| Relación | Llave Foránea | Política `ON DELETE` | Razón de Diseño |
|---|---|---|---|
| `departments.manager_id` | `users.id` | `SET NULL` | Al eliminar un colaborador, el área no se borra; su puesto queda vacante. |
| `departments.trainer_id` | `users.id` | `SET NULL` | Al eliminar un evaluador, el puesto formativo queda vacante. |
| `users.department_id` | `departments.id` | `SET NULL` | Al eliminar un área, los colaboradores pasan a estado "Sin Área Asignada". |
| `vacancies.department_id` | `departments.id` | `SET NULL` | Previene borrado accidental; validado además por la API para impedir huérfanos. |
| `vacancies.manager_id` | `users.id` | `SET NULL` | La vacante permanece abierta sin gerente titular hasta reasignarse. |
| `applications.candidate_id` | `candidates.id` | `CASCADE` | Si se elimina el candidato, sus postulaciones se eliminan. |
| `applications.vacancy_id` | `vacancies.id` | `CASCADE` | Si se elimina la vacante, sus postulaciones se eliminan limpiamente. |
| `notes.candidate_id` | `candidates.id` | `CASCADE` | Las notas pertenecen al expediente del candidato. |
| `vacancy_evaluators.user_id`| `users.id` | `CASCADE` | Al eliminar un usuario, sus asignaciones técnicas se eliminan. |

---

*Especificación de Esquema de Base de Datos - JPM Talento | Versión 2.5.*
