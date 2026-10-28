import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Database, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  LayoutDashboard,
  Briefcase,
  Users,
  KanbanSquare,
  BarChart3,
  Settings as SettingsIcon,
  FileText,
  Search,
  UploadCloud,
  Eye,
  Plus,
  Trash2,
  Calendar,
  User,
  ExternalLink,
  MessageSquare,
  ClipboardList,
  Clock,
  ArrowUpDown,
  Layers,
  Filter,
  Edit,
  Shield,
  Send,
  MessageCircle,
  UserPlus,
  ArrowRightLeft,
  Globe,
  Tag,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Bot,
  Paperclip,
  Sparkles,
  Terminal,
  Lock,
  LogOut,
  LogIn,
  UserCheck,
  ShieldCheck,
  Key,
  Award,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';

// Determinar la URL del API:
// 1. Si VITE_API_URL está definida en el .env, tiene prioridad absoluta (para producción con dominios).
// 2. Si no se especifica, fallback dinámico a window.location.hostname:8000 (para desarrollo o acceso por IP local).
const getApiUrl = () => {
  let envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl !== '') {
    // Si la aplicación se cargó sobre HTTPS, forzar que la API use https:// para evitar bloqueos por Mixed Content
    if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && envUrl.startsWith('http://')) {
      envUrl = envUrl.replace(/^http:\/\//, 'https://');
    }
    return envUrl.replace(/\/+$/, '');
  }
  const backendPort = (import.meta.env.VITE_BACKEND_PORT || '8001').trim();
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:${backendPort}`;
  }
  return `http://localhost:${backendPort}`;
};


const API_URL = getApiUrl();
console.log("Octopy Talento API Conectada a:", API_URL);

const RECOMMENDED_BOT_PROMPT = `Eres el Cerebro Estratégico y la Voz de OctyBot, el Reclutador y Asistente de IA de Octopy (octopy.com).
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
- NO REVELAR SUELDOS EXACTOS: Si el candidato pregunta cuánto pagan, indícale amablemente que las propuestas económicas se detallan en la entrevista formal con Recursos Humanos tras conocer su perfil.`;

const RECOMMENDED_PRIVACY_NOTICE = `🔒 **Aviso de Privacidad y Tratamiento de Datos Personales Laborales**:
En Octopy protegemos tus datos conforme a la legislación aplicable (LFPDPPP). La información, respuestas y documentos compartidos en esta conversación serán tratados de forma estrictamente confidencial por el área de Recursos Humanos de Octopy exclusivamente para la evaluación de tu postulación y fines del proceso de selección laboral. Al continuar con esta conversación, manifiestas tu consentimiento para el tratamiento de tus datos para dichos fines.`;

function App() {
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').trim();
      const validTabs = ['dashboard', 'candidates', 'vacancies', 'kanban', 'users', 'purge', 'settings', 'simulator'];
      if (validTabs.includes(hash)) return hash;
      try {
        const saved = localStorage.getItem('rh_active_tab');
        if (validTabs.includes(saved)) return saved;
      } catch (e) {
        // ignore
      }
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('rh_active_tab', tab);
        window.location.hash = tab;
      } catch (e) {
        // ignore
      }
    }
  };
  const [statusBackend, setStatusBackend] = useState({ loading: true, data: null, error: null });
  const [statusDb, setStatusDb] = useState({ loading: true, data: null, error: null });
  const [statusOllama, setStatusOllama] = useState({ loading: true, data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);

  // Estado para gestión de candidatos
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [candidateVacancyFilter, setCandidateVacancyFilter] = useState('Todas');
  const [candidateStageFilter, setCandidateStageFilter] = useState('Todas');
  const [candidateScoreRangeFilter, setCandidateScoreRangeFilter] = useState('Todos');
  const [candidateSourceFilter, setCandidateSourceFilter] = useState('Todas');
  const [candidateSources, setCandidateSources] = useState([
    "OCC Mundial", "Indeed", "LinkedIn", "Computrabajo", "Bolsa Interna / Referido", "WhatsApp", "Feria de Empleo"
  ]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);

  // Modal Detail Tabs & Visor PDF
  const [activeDetailTab, setActiveDetailTab] = useState('summary');
  const [pdfZoom, setPdfZoom] = useState(100);
  const [selectedCandidateApplications, setSelectedCandidateApplications] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [noteStage, setNoteStage] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Estados de control para sección Top Candidatos en Dashboard
  const [topGroupBy, setTopGroupBy] = useState('none'); // 'none' | 'vacancy'
  const [topSortOrder, setTopSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [topRangeFilter, setTopRangeFilter] = useState('all'); // 'all' | 'high' | 'mid' | 'low'

  // Estado para Configuración Dinámica del Bot y Parámetros Generales de Vacantes
  const [settingsData, setSettingsData] = useState({
    bot_name: 'OctyBot',
    telegram_bot_username: 'OctyBot_HR_Bot',
    bot_core_prompt: '',
    privacy_notice: '',
    top_candidates_limit: '10',
    score_range_high: '80',
    score_range_mid: '60'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Estado para gestión de vacantes
  const [vacancies, setVacancies] = useState([]);
  const [loadingVacancies, setLoadingVacancies] = useState(false);
  const [vacancyModalOpen, setVacancyModalOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState(null);
  const [newVacancy, setNewVacancy] = useState({
    title: '',
    description: '',
    requirements: '',
    status: 'abierta',
    min_age: '',
    max_age: '',
    department_id: '',
    manager_id: '',
    evaluator_user_id: '',
    evaluation_criteria: [{ criterio: '', peso: 0.5 }]
  });

  // Estado para postular candidato desde interfaz
  const [activeVacancyForApply, setActiveVacancyForApply] = useState(null);
  const [selectedCandidateForApply, setSelectedCandidateForApply] = useState('');
  const [postulateMode, setPostulateMode] = useState('select'); // 'select' o 'upload'
  const [vacancyApplySource, setVacancyApplySource] = useState('Bolsa Interna / Referido');

  // Estado para modal que pregunta la vacante al subir un CV
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFilesToUpload, setPendingFilesToUpload] = useState([]);
  const [targetVacancyForUpload, setTargetVacancyForUpload] = useState('');
  const [targetSourceForUpload, setTargetSourceForUpload] = useState('OCC Mundial');
  const [isCustomSource, setIsCustomSource] = useState(false);
  const [customSourceValue, setCustomSourceValue] = useState('');

  // Estados para Modal de Cambio de Plataforma de Candidato
  const [changeSourceModalOpen, setChangeSourceModalOpen] = useState(false);
  const [candidateToChangeSource, setCandidateToChangeSource] = useState(null);
  const [selectedNewSource, setSelectedNewSource] = useState('No especificada');
  const [isCustomNewSource, setIsCustomNewSource] = useState(false);
  const [customNewSourceInput, setCustomNewSourceInput] = useState('');
  const [updatingCandidateSource, setUpdatingCandidateSource] = useState(false);

  // Estados para Administrar Catálogo de Fuentes en Configuración
  const [detailedSources, setDetailedSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [newCatalogueSourceInput, setNewCatalogueSourceInput] = useState('');
  const [savingCatalogueSource, setSavingCatalogueSource] = useState(false);
  const [sourceToRename, setSourceToRename] = useState(null);
  const [renameSourceInput, setRenameSourceInput] = useState('');
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  // Estado para modal de confirmación de envío por WhatsApp
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waCandidate, setWaCandidate] = useState(null);
  const [waApplication, setWaApplication] = useState(null);
  const [waPhoneOption, setWaPhoneOption] = useState('registered'); // 'registered' o 'custom'
  const [waCustomPhone, setWaCustomPhone] = useState('');
  const [waAdvanceStage, setWaAdvanceStage] = useState(true);

  // Estados para Reasignar / Transferir Vacante (Punto 3.1)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [appToTransfer, setAppToTransfer] = useState(null);
  const [targetVacancyForTransfer, setTargetVacancyForTransfer] = useState('');
  const [transferReevaluate, setTransferReevaluate] = useState(true);
  const [transferringApp, setTransferringApp] = useState(false);

  // Estados para Postular Directamente desde perfil de candidato no asignado (Punto 3.1)
  const [directApplyModalOpen, setDirectApplyModalOpen] = useState(false);
  const [targetVacancyForDirectApply, setTargetVacancyForDirectApply] = useState('');
  const [applyingDirect, setApplyingDirect] = useState(false);

  // =========================================================================
  // ESTADOS Y HANDLERS PARA AUTENTICACIÓN Y ROLES RBAC (Fase P1)
  // =========================================================================
  const DEMO_ACCOUNTS = [
    { email: 'admin@octopy.com', roleLabel: 'SuperAdmin', name: 'Administrador del Sistema', dept: 'Tecnología', icon: '👑', pass: 'Admin1234!' },
    { email: 'reclutador@octopy.com', roleLabel: 'Reclutador Senior', name: 'Lic. Ana Martínez', dept: 'Recursos Humanos', icon: '👔', pass: 'Reclutador123!' },
    { email: 'gerente.ventas@octopy.com', roleLabel: 'Gerente Vacante (Entrevista/Roleplay)', name: 'Carlos Mendoza', dept: 'Ventas y Comercial', icon: '📈', pass: 'Gerente123!' },
    { email: 'capacitador@octopy.com', roleLabel: 'Evaluador Capacitación (Fase 1/2)', name: 'Sofía Reyes', dept: 'Capacitación y Calidad', icon: '🎓', pass: 'Capacita123!' },
    { email: 'auditor@octopy.com', roleLabel: 'Auditor Privacidad (LFPDPPP)', name: 'Lic. Roberto Garza', dept: 'Auditoría Legal', icon: '⚖️', pass: 'Auditor123!' },
  ];

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rh_user');
      if (saved) return JSON.parse(saved);
      return {
        id: 'usr-admin-seed',
        email: 'admin@octopy.com',
        full_name: 'Administrador del Sistema',
        department: 'Tecnología e Innovación',
        is_superadmin: true,
        roles: [{ id: 'SuperAdmin', name: 'Super Administrador' }],
        permissions: ['candidates:read', 'candidates:create', 'candidates:edit', 'candidates:delete', 'candidates:transfer', 'id_docs:view', 'id_docs:purge', 'vacancies:manage', 'kanban:manage', 'evaluations:submit', 'settings:manage', 'audit:read', 'users:manage'],
        assigned_vacancy_ids: []
      };
    } catch (e) {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem('rh_auth_token') || 'demo-admin-token';
    } catch (e) {
      return null;
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin@octopy.com');
  const [loginPassword, setLoginPassword] = useState('Admin1234!');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Filtro de vacantes asignadas para roles con alcance limitado (Gerentes / Evaluadores)
  const [onlyAssignedVacancies, setOnlyAssignedVacancies] = useState(() => {
    const isScoped = currentUser?.roles?.some(r => ['Gerente_Vacante', 'Evaluador_Capacitacion'].includes(r.id));
    return isScoped && !currentUser?.is_superadmin;
  });

  const hasPermission = (perm) => {
    if (!currentUser) return false;
    if (currentUser.is_superadmin) return true;
    return currentUser.permissions?.includes(perm) || false;
  };

  const hasRole = (roleId) => {
    if (!currentUser) return false;
    if (currentUser.is_superadmin) return true;
    return currentUser.roles?.some(r => r.id === roleId) || false;
  };

  // Matriz de permisos requeridos por sección del sistema (RBAC Gating)
  const SECTION_PERMISSIONS = {
    dashboard: null,
    candidates: {
      permission: 'candidates:read',
      label: 'Candidatos',
      description: 'Visualización y gestión de expedientes laborales de postulantes',
      allowedRoles: ['Super Administrador', 'Gerente de Recursos Humanos', 'Reclutador Senior', 'Reclutador Junior', 'Gerente de Vacante', 'Evaluador de Capacitación', 'Auditor de Privacidad']
    },
    vacancies: {
      permission: 'vacancies:manage',
      alternateRoles: ['Gerente_Vacante', 'Evaluador_Capacitacion'],
      label: 'Vacantes',
      description: 'Definición de perfiles de puesto, ponderaciones y asignación de responsables',
      allowedRoles: ['Super Administrador', 'Gerente de Recursos Humanos', 'Reclutador Senior', 'Gerente de Vacante']
    },
    kanban: {
      permission: 'kanban:manage',
      alternatePermission: 'evaluations:submit',
      label: 'Tablero Kanban',
      description: 'Seguimiento ágil del embudo de contratación y dictaminación de etapas',
      allowedRoles: ['Super Administrador', 'Gerente de Recursos Humanos', 'Reclutador Senior', 'Reclutador Junior', 'Gerente de Vacante', 'Evaluador de Capacitación']
    },
    users: {
      permission: 'users:manage',
      label: 'Control de Acceso y Roles (RBAC)',
      description: 'Aprovisionamiento de colaboradores, asignación jerárquica de roles y matriz de permisos',
      allowedRoles: ['Super Administrador', 'Gerente de Recursos Humanos']
    },
    purge: {
      permission: 'settings:manage',
      label: 'Mantenimiento & Purga de Datos',
      description: 'Destrucción segura de CVs, purga de expedientes, cumplimiento LFPDPPP y reset total del sistema',
      allowedRoles: ['Super Administrador', 'Gerente de Recursos Humanos']
    },
    settings: {
      permission: 'settings:manage',
      label: 'Configuración del Sistema',
      description: 'Parámetros del asistente IA OctyBot, prompts centrales y avisos de privacidad',
      allowedRoles: ['Super Administrador', 'Gerente de Recursos Humanos']
    },
    simulator: {
      permission: 'settings:manage',
      alternateRoles: ['Reclutador_Senior'],
      label: 'Simulador IA Sandbox',
      description: 'Entorno de pruebas y calibración conversacional de OctyBot',
      allowedRoles: ['Super Administrador', 'Gerente de Recursos Humanos', 'Reclutador Senior']
    }
  };

  const canAccessTab = (tabKey) => {
    if (!currentUser) return true;
    if (currentUser.is_superadmin) return true;
    const config = SECTION_PERMISSIONS[tabKey];
    if (!config) return true;
    if (config.permission && currentUser.permissions?.includes(config.permission)) return true;
    if (config.alternatePermission && currentUser.permissions?.includes(config.alternatePermission)) return true;
    if (config.alternateRoles && currentUser.roles?.some(r => config.alternateRoles.includes(r.id))) return true;
    return false;
  };

  // Estados para Panel RBAC y Modal de Edición de Usuario
  const [userPanelSubTab, setUserPanelSubTab] = useState('list'); // 'list' | 'matrix' | 'test_roles'
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    full_name: '',
    department_id: '',
    department: '',
    role_ids: [],
    is_active: true,
    new_password: ''
  });
  const [savingUser, setSavingUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userDeptFilter, setUserDeptFilter] = useState('all');

  // Estados para Dictamen Formal de Evaluación de Etapa
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalCandidate, setEvalCandidate] = useState(null);
  const [evalApplication, setEvalApplication] = useState(null);
  const [evalStage, setEvalStage] = useState('entrevista');
  const [evalVerdict, setEvalVerdict] = useState('aprobado');
  const [evalScore, setEvalScore] = useState(85);
  const [evalNotes, setEvalNotes] = useState('');
  const [evalAdvanceStage, setEvalAdvanceStage] = useState(true);
  const [submittingEval, setSubmittingEval] = useState(false);

  // Estados para Administración RBAC y Auditoría en Configuración
  const [settingsSubTab, setSettingsSubTab] = useState('bot'); // 'bot' | 'sources' | 'users' | 'departments' | 'audit'
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [rolesList, setRolesList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditResourceTypeFilter, setAuditResourceTypeFilter] = useState('');
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    department: 'Recursos Humanos',
    department_id: '',
    role_ids: ['Reclutador_Senior'],
    provisionMode: 'template',
    selectedPositionKey: '',
    assign_as_dept_manager: null,
    assign_as_dept_trainer: null
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Estados para Departamentos y Áreas Organizacionales
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: '',
    manager_id: '',
    trainer_id: '',
    is_active: true,
    managerMode: 'select',
    quick_manager_name: '',
    quick_manager_email: ''
  });
  const [savingDept, setSavingDept] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Estados para Mantenimiento y Purga de Datos
  const [maintenanceStats, setMaintenanceStats] = useState(null);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeType, setPurgeType] = useState(null); // 'cv_files' | 'candidates' | 'complete' | 'expired_ids'
  const [purgeConfirmInput, setPurgeConfirmInput] = useState('');
  const [purgeReasonInput, setPurgeReasonInput] = useState('');
  const [purgeExecuting, setPurgeExecuting] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  const fetchMaintenanceStats = async () => {
    setLoadingMaintenance(true);
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`${API_URL}/api/maintenance/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceStats(data);
      }
    } catch (err) {
      console.error("Error al obtener estadísticas de mantenimiento:", err);
    } finally {
      setLoadingMaintenance(false);
    }
  };

  const handleOpenPurgeModal = (type) => {
    setPurgeType(type);
    setPurgeConfirmInput('');
    setPurgeReasonInput('');
    setPurgeResult(null);
    setPurgeModalOpen(true);
  };

  const handleExecutePurge = async () => {
    if (!purgeType) return;
    setPurgeExecuting(true);
    setPurgeResult(null);

    let endpoint = '';
    let body = {};

    if (purgeType === 'cv_files') {
      endpoint = `${API_URL}/api/maintenance/purge-cv-files`;
      body = {
        confirm_phrase: purgeConfirmInput.trim(),
        reason: purgeReasonInput.trim() || 'Purga de archivos físicos de CVs e identificaciones'
      };
    } else if (purgeType === 'candidates') {
      endpoint = `${API_URL}/api/maintenance/purge-candidates`;
      body = {
        confirm_phrase: purgeConfirmInput.trim(),
        reason: purgeReasonInput.trim() || 'Purga masiva de candidatos y expedientes'
      };
    } else if (purgeType === 'complete') {
      endpoint = `${API_URL}/api/maintenance/purge-complete`;
      body = {
        confirm_phrase: purgeConfirmInput.trim(),
        seed_vacancies: true,
        reason: purgeReasonInput.trim() || 'Reset total de fábrica del sistema'
      };
    } else if (purgeType === 'expired_ids') {
      endpoint = `${API_URL}/api/maintenance/purge-expired-ids`;
      body = {
        confirm_phrase: 'CONFIRMAR'
      };
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setPurgeResult({
          success: true,
          message: data.message || 'Purga completada exitosamente.',
          details: data
        });
        // Refrescar datos globales
        fetchMaintenanceStats();
        fetchCandidates(true);
        fetchVacancies(true);
        fetchStats();
      } else {
        setPurgeResult({
          success: false,
          message: data.detail || 'Ocurrió un error al ejecutar la purga.'
        });
      }
    } catch (err) {
      setPurgeResult({
        success: false,
        message: err.message || 'Error de conexión con el servidor.'
      });
    } finally {
      setPurgeExecuting(false);
    }
  };

  const handleLogin = async (e, directCreds = null) => {
    if (e) e.preventDefault();
    const emailToUse = directCreds ? directCreds.email : loginEmail;
    const passToUse = directCreds ? directCreds.pass : loginPassword;

    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, password: passToUse })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setAuthToken(data.token);
        localStorage.setItem('rh_user', JSON.stringify(data.user));
        localStorage.setItem('rh_auth_token', data.token);
        setAuthModalOpen(false);
        const isScoped = data.user.roles?.some(r => ['Gerente_Vacante', 'Evaluador_Capacitacion'].includes(r.id));
        setOnlyAssignedVacancies(isScoped && !data.user.is_superadmin);
        fetchVacancies(true);
        fetchCandidates(true);
      } else {
        setLoginError(data.detail || 'Credenciales inválidas');
      }
    } catch (err) {
      setLoginError(`Fallo de conexión: ${err.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('rh_user');
    localStorage.removeItem('rh_auth_token');
    setAuthModalOpen(true);
  };

  const fetchUsersAndRoles = async () => {
    setLoadingUsers(true);
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const [uRes, rRes] = await Promise.all([
        fetch(`${API_URL}/api/auth/users`, { headers }),
        fetch(`${API_URL}/api/auth/roles`, { headers })
      ]);
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsersList(uData);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        setRolesList(rData);
      }
    } catch (e) {
      console.error("Error al cargar usuarios y roles:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      let url = `${API_URL}/api/auth/audit-logs?limit=100`;
      if (auditActionFilter) url += `&action=${encodeURIComponent(auditActionFilter)}`;
      if (auditResourceTypeFilter) url += `&resource_type=${encodeURIComponent(auditResourceTypeFilter)}`;
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Error al cargar bitácora de auditoría:", e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const payload = {
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        full_name: newUserForm.full_name.trim(),
        department: newUserForm.department,
        department_id: newUserForm.department_id ? parseInt(newUserForm.department_id) : null,
        role_ids: newUserForm.role_ids,
        assign_as_dept_manager: newUserForm.provisionMode === 'template' ? newUserForm.assign_as_dept_manager : null,
        assign_as_dept_trainer: newUserForm.provisionMode === 'template' ? newUserForm.assign_as_dept_trainer : null
      };
      const res = await fetch(`${API_URL}/api/auth/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        const userName = data.full_name || data.user?.full_name || 'Nuevo';
        alert(`Usuario "${userName}" creado exitosamente.`);
        setNewUserModalOpen(false);
        setNewUserForm({
          email: '',
          password: '',
          full_name: '',
          department: 'Recursos Humanos',
          department_id: '',
          role_ids: ['Reclutador_Senior'],
          provisionMode: 'template',
          selectedPositionKey: '',
          assign_as_dept_manager: null,
          assign_as_dept_trainer: null
        });
        fetchUsersAndRoles();
        fetchDepartments(); // Refrescar catálogo de áreas si se le asignó titularidad
      } else {
        alert(`Error al crear usuario: ${data.detail || 'Fallo en el servidor'}`);
      }
    } catch (err) {
      alert(`Error de conexión: ${err.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenEditUserModal = (u) => {
    setEditingUser(u);
    setEditUserForm({
      full_name: u.full_name || '',
      department_id: u.department_id || '',
      department: u.department || '',
      role_ids: u.roles ? u.roles.map(r => r.id) : [],
      is_active: u.is_active !== false,
      new_password: ''
    });
    setEditUserModalOpen(true);
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editUserForm.role_ids.length === 0) {
      alert("Debes asignar al menos un rol al colaborador.");
      return;
    }
    setSavingUser(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const payload = {
        full_name: editUserForm.full_name.trim(),
        department_id: editUserForm.department_id ? parseInt(editUserForm.department_id) : 0,
        department: editUserForm.department,
        is_active: editUserForm.is_active,
        role_ids: editUserForm.role_ids,
        ...(editUserForm.new_password ? { new_password: editUserForm.new_password } : {})
      };
      const res = await fetch(`${API_URL}/api/auth/users/${editingUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Usuario "${editUserForm.full_name}" actualizado exitosamente.`);
        setEditUserModalOpen(false);
        setEditingUser(null);
        fetchUsersAndRoles();
        if (currentUser?.id === editingUser.id) {
          setCurrentUser(data);
          localStorage.setItem('rh_user', JSON.stringify(data));
        }
      } else {
        alert(`Error al actualizar usuario: ${data.detail || 'Fallo en servidor'}`);
      }
    } catch (err) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleUserActive = async (user) => {
    const actionText = user.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Estás seguro de que deseas ${actionText} la cuenta de ${user.full_name}?`)) return;

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };
      const res = await fetch(`${API_URL}/api/auth/users/${user.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !user.is_active })
      });
      if (res.ok) {
        fetchUsersAndRoles();
      } else {
        const err = await res.json();
        alert(`Error al actualizar usuario: ${err.detail || 'Fallo'}`);
      }
    } catch (err) {
      alert(`Error de red: ${err.message}`);
    }
  };

  const handlePurgeUser = async (user) => {
    if (user.id === currentUser?.id) {
      alert("No puedes eliminar tu propia cuenta de usuario en sesión activa.");
      return;
    }
    if (user.email === 'admin@octopy.com' || user.email === 'admin@jpm.com') {
      alert("No es posible eliminar la cuenta principal del Administrador del Sistema.");
      return;
    }

    if (!window.confirm(`¿Estás seguro de ELIMINAR DEFINITIVAMENTE al colaborador "${user.full_name}" (${user.email})?\n\n⚠️ Esta acción borrará permanentemente la cuenta, roles y accesos asociados.\n\nNota: Si el usuario es Hiring Manager de vacantes activas, el sistema bloqueará la operación para evitar registros huérfanos.`)) {
      return;
    }

    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`${API_URL}/api/auth/users/${user.id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Usuario "${user.full_name}" eliminado definitivamente.`);
        fetchUsersAndRoles();
        fetchDepartments();
      } else {
        alert(data.detail || "Error al eliminar el usuario.");
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    }
  };

  // Handlers para Gestión Dinámica de Departamentos y Áreas Organizacionales
  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`${API_URL}/api/departments`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (e) {
      console.error("Error al cargar áreas y departamentos:", e);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleOpenNewDeptModal = () => {
    fetchUsersAndRoles();
    setEditingDept(null);
    setDeptForm({
      name: '',
      code: '',
      description: '',
      manager_id: '',
      trainer_id: '',
      is_active: true,
      managerMode: 'select',
      quick_manager_name: '',
      quick_manager_email: ''
    });
    setDeptModalOpen(true);
  };

  const handleOpenEditDeptModal = (dept) => {
    fetchUsersAndRoles();
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
      manager_id: dept.manager_id || '',
      trainer_id: dept.trainer_id || '',
      is_active: dept.is_active,
      managerMode: 'select',
      quick_manager_name: '',
      quick_manager_email: ''
    });
    setDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    setSavingDept(true);
    try {
      const url = editingDept 
        ? `${API_URL}/api/departments/${editingDept.id}` 
        : `${API_URL}/api/departments`;
      const method = editingDept ? 'PUT' : 'POST';
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      };

      const payload = {
        name: deptForm.name,
        code: deptForm.code,
        description: deptForm.description,
        manager_id: deptForm.managerMode === 'select' ? (deptForm.manager_id || null) : null,
        trainer_id: deptForm.trainer_id || null,
        is_active: deptForm.is_active,
        quick_manager_name: deptForm.managerMode === 'new' ? (deptForm.quick_manager_name?.trim() || null) : null,
        quick_manager_email: deptForm.managerMode === 'new' ? (deptForm.quick_manager_email?.trim() || null) : null
      };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setDeptModalOpen(false);
        fetchDepartments();
        fetchUsersAndRoles(); // Refrescar lista de usuarios si se creó un nuevo gerente
      } else {
        const err = await res.json();
        alert(err.detail || 'Error al guardar el área.');
      }
    } catch (e) {
      alert('Error de conexión al guardar el área: ' + e.message);
    } finally {
      setSavingDept(false);
    }
  };

  const handleToggleDeptActive = async (dept) => {
    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`${API_URL}/api/departments/${dept.id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchDepartments();
      }
    } catch (e) {
      console.error("Error al alternar estado del área:", e);
    }
  };

  const handlePurgeDepartment = async (dept) => {
    if (!window.confirm(`¿Estás seguro de ELIMINAR DEFINITIVAMENTE el área "${dept.name}"?\n\n⚠️ Esta acción borrará el registro de la base de datos de forma permanente.\n\nNota: Si el área tiene vacantes asignadas, la eliminación será bloqueada automáticamente para evitar datos huérfanos.`)) {
      return;
    }

    try {
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      const res = await fetch(`${API_URL}/api/departments/${dept.id}?hard=true`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Área "${dept.name}" eliminada definitivamente.`);
        fetchDepartments();
        fetchUsersAndRoles();
      } else {
        alert(data.detail || "Error al eliminar el área.");
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    }
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!evalApplication) return;
    setSubmittingEval(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          application_id: evalApplication.id,
          stage: evalStage,
          verdict: evalVerdict,
          score: evalScore ? Number(evalScore) : null,
          notes: evalNotes,
          advance_stage: evalAdvanceStage
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Dictamen registrado con éxito: ${evalVerdict.toUpperCase()} en etapa ${evalStage}.`);
        setEvalModalOpen(false);
        setEvalNotes('');
        if (selectedCandidate?.id) {
          const notesRes = await fetch(`${API_URL}/candidates/${selectedCandidate.id}/notes`);
          if (notesRes.ok) {
            const notesData = await notesRes.json();
            setSelectedCandidate(prev => ({ ...prev, notes: notesData }));
          }
          const appRes = await fetch(`${API_URL}/candidates/${selectedCandidate.id}/applications`);
          if (appRes.ok) {
            const appData = await appRes.json();
            setSelectedCandidateApplications(appData);
          }
        }
        fetchCandidates(true);
        fetchKanbanData();
        fetchVacancies(true);
      } else {
        alert(`Error al registrar evaluación: ${data.detail || 'Operación no permitida'}`);
      }
    } catch (err) {
      alert(`Error de conexión al registrar evaluación: ${err.message}`);
    } finally {
      setSubmittingEval(false);
    }
  };

  // =========================================================================
  // ESTADOS Y HANDLERS PARA SANDBOX / SIMULADOR DE OCTYBOT (Punto 7 Test Runner)
  // =========================================================================
  const [simulatorSessionId, setSimulatorSessionId] = useState(null);
  const [simulatorMessages, setSimulatorMessages] = useState([]);
  const [simulatorInput, setSimulatorInput] = useState('');
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorProfileType, setSimulatorProfileType] = useState('mock_commercial'); // 'mock_commercial' | 'mock_junior' | 'candidate'
  const [simulatorSelectedCandidateId, setSimulatorSelectedCandidateId] = useState('');
  const [simulatorStep, setSimulatorStep] = useState(2);
  const [simulatorLatency, setSimulatorLatency] = useState(null);
  const [simulatorExecutiveSummary, setSimulatorExecutiveSummary] = useState(null);
  const [simulatorExtractedId, setSimulatorExtractedId] = useState(null);
  const [simulatorSystemPrompt, setSimulatorSystemPrompt] = useState(null);
  const [simulatorUploadingId, setSimulatorUploadingId] = useState(false);
  const [showPromptInspector, setShowPromptInspector] = useState(false);
  const chatMessagesEndRef = useRef(null);
  const simulatorFileInputRef = useRef(null);

  const handleStartSimulator = async (profileType = simulatorProfileType, candId = simulatorSelectedCandidateId) => {
    setSimulatorLoading(true);
    try {
      let payload = {};
      if (profileType === 'mock_commercial') {
        payload = {
          mock_name: "Carlos Mendoza Silva",
          mock_vacancy: "Asesor Comercial Senior",
          mock_skills: ["Ventas consultivas", "Prospección en frío", "Cierre comercial", "Negociación"],
          mock_experience: "4 años de experiencia en ventas de servicios financieros y cambaceo. Logro del 120% de metas comerciales y manejo de objeciones."
        };
      } else if (profileType === 'mock_junior') {
        payload = {
          mock_name: "Mariana Morales Ramos",
          mock_vacancy: "Ejecutiva de Atención y Ventas",
          mock_skills: ["Atención al cliente", "Facilidad de palabra", "Empatía"],
          mock_experience: "Recién egresada, experiencia previa de 6 meses en servicio al cliente en cafetería y call center de soporte. Sin experiencia en ventas directas."
        };
      } else if (profileType === 'candidate' && candId) {
        payload = { candidate_id: candId };
      }

      const res = await fetch(`${API_URL}/api/simulator/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSimulatorSessionId(data.session_id);
        setSimulatorMessages(data.history || []);
        setSimulatorStep(data.detected_step || 2);
        setSimulatorExecutiveSummary(null);
        setSimulatorExtractedId(null);
        setSimulatorLatency(null);
        setSimulatorSystemPrompt(null);
      } else {
        alert(`Error al iniciar simulador: ${data.detail || 'Ocurrió un problema'}`);
      }
    } catch (err) {
      console.error('Error starting simulator:', err);
      alert('No se pudo conectar con el servicio de simulación. Verifica que el backend esté activo.');
    } finally {
      setSimulatorLoading(false);
    }
  };

  const handleSendSimulatorMessage = async (msgToSend = null) => {
    const text = (msgToSend !== null ? msgToSend : simulatorInput).trim();
    if (!text || simulatorLoading || !simulatorSessionId) return;

    const optimisticMsg = { role: 'user', body: text, timestamp: Date.now() / 1000 };
    setSimulatorMessages(prev => [...prev, optimisticMsg]);
    setSimulatorInput('');
    setSimulatorLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/simulator/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: simulatorSessionId,
          message: text
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSimulatorMessages(data.history || []);
        setSimulatorStep(data.detected_step || 3);
        setSimulatorLatency(data.latency_ms);
        if (data.executive_summary) {
          setSimulatorExecutiveSummary(data.executive_summary);
        }
        if (data.system_prompt_used) {
          setSimulatorSystemPrompt(data.system_prompt_used);
        }
      } else {
        setSimulatorMessages(prev => [...prev, {
          role: 'assistant',
          body: `⚠️ Error del servidor: ${data.detail || 'No se pudo generar respuesta'}`,
          timestamp: Date.now() / 1000
        }]);
      }
    } catch (err) {
      console.error('Error sending simulator message:', err);
      setSimulatorMessages(prev => [...prev, {
        role: 'assistant',
        body: `⚠️ Error de red: No se pudo comunicar con el servidor backend (${err.message}).`,
        timestamp: Date.now() / 1000
      }]);
    } finally {
      setSimulatorLoading(false);
    }
  };

  const handleSimulatorUploadId = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !simulatorSessionId) return;

    const formData = new FormData();
    formData.append('session_id', simulatorSessionId);
    formData.append('file', file);

    setSimulatorUploadingId(true);
    setSimulatorLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/simulator/upload-id`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setSimulatorMessages(data.history || []);
        setSimulatorExtractedId(data.extracted_data);
        setSimulatorStep(6);
        setSimulatorLatency(data.latency_ms);
      } else {
        alert(`Error al procesar identificación con visión multimodal: ${data.detail || 'Formato o imagen inválida'}`);
      }
    } catch (err) {
      console.error('Error uploading ID to simulator:', err);
      alert('Error de conexión al procesar la imagen de identificación.');
    } finally {
      setSimulatorUploadingId(false);
      setSimulatorLoading(false);
      if (simulatorFileInputRef.current) {
        simulatorFileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'simulator' && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulatorMessages, simulatorLoading, activeTab]);

  useEffect(() => {
    if (activeTab === 'simulator' && !simulatorSessionId && !simulatorLoading) {
      handleStartSimulator('mock_commercial');
    }
  }, [activeTab]);

  // Estado para estadísticas del Dashboard
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettingsData(data);
      }
    } catch (e) {
      console.error("Error al cargar configuración:", e);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      if (res.ok) {
        const data = await res.json();
        setSettingsData(data);
        alert("Configuración guardada exitosamente en el servidor.");
      } else {
        alert("Error al actualizar la configuración.");
      }
    } catch (err) {
      console.error(err);
      alert("Fallo de red al conectar.");
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchStats = async (silent = false) => {
    if (!silent) setLoadingStats(true);
    try {
      const res = await fetch(`${API_URL}/vacancies/stats/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Error al cargar estadísticas:", e);
    } finally {
      if (!silent) setLoadingStats(false);
    }
  };

  const fetchCandidateSources = async () => {
    try {
      const res = await fetch(`${API_URL}/candidates/sources`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCandidateSources(data);
        }
      }
    } catch (e) {
      console.error("Error al cargar fuentes de candidatos:", e);
    }
  };

  const fetchDetailedSources = async () => {
    setLoadingSources(true);
    try {
      const res = await fetch(`${API_URL}/candidates/sources/detailed`);
      if (res.ok) {
        const data = await res.json();
        setDetailedSources(data);
      }
    } catch (e) {
      console.error("Error al cargar detalle de fuentes:", e);
    } finally {
      setLoadingSources(false);
    }
  };

  const fetchVacancies = async (silent = false) => {
    if (!silent) setLoadingVacancies(true);
    try {
      const res = await fetch(`${API_URL}/vacancies`);
      if (res.ok) {
        const data = await res.json();
        setVacancies(data);
      }
    } catch (e) {
      console.error("Error al cargar vacantes:", e);
    } finally {
      if (!silent) setLoadingVacancies(false);
    }
  };

  // Estado para Tablero Kanban (Hito M09)
  const [kanbanVacancyId, setKanbanVacancyId] = useState('');
  const [kanbanApplications, setKanbanApplications] = useState([]);
  const [loadingKanban, setLoadingKanban] = useState(false);
  const [kanbanSearchQuery, setKanbanSearchQuery] = useState('');
  const [kanbanScoreFilter, setKanbanScoreFilter] = useState('todos');
  const [kanbanSourceFilter, setKanbanSourceFilter] = useState('todas');

  // Filtrado reactivo en tiempo real para candidatos del Kanban
  const filteredKanbanApplications = kanbanApplications.filter(app => {
    // 1. Filtro de búsqueda rápida (nombre, email o nombre de archivo PDF)
    if (kanbanSearchQuery.trim()) {
      const q = kanbanSearchQuery.trim().toLowerCase();
      const cand = app.candidate || {};
      const nameMatch = cand.name?.toLowerCase().includes(q);
      const emailMatch = cand.email?.toLowerCase().includes(q);
      const fileMatch = cand.filename?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !fileMatch) return false;
    }
    // 2. Filtro por Rango de Calificación IA
    if (kanbanScoreFilter !== 'todos') {
      const score = app.score;
      const highThresh = parseInt(settingsData.score_range_high || stats?.score_range_high || 80);
      const midThresh = parseInt(settingsData.score_range_mid || stats?.score_range_mid || 60);
      if (kanbanScoreFilter === 'high') {
        if (score === null || score < highThresh) return false;
      } else if (kanbanScoreFilter === 'mid') {
        if (score === null || score < midThresh || score >= highThresh) return false;
      } else if (kanbanScoreFilter === 'low') {
        if (score === null || score >= midThresh) return false;
      } else if (kanbanScoreFilter === 'unscored') {
        if (score !== null) return false;
      }
    }
    // 3. Filtro por Plataforma / Fuente de Origen
    if (kanbanSourceFilter !== 'todas') {
      const cand = app.candidate || {};
      const src = cand.source || 'No especificada';
      if (kanbanSourceFilter === 'no_especificada') {
        if (src !== 'No especificada' && src !== '') return false;
      } else if (src !== kanbanSourceFilter) {
        return false;
      }
    }
    return true;
  });

  const fetchKanbanData = async (targetVacancyId = null) => {
    let activeId = targetVacancyId || kanbanVacancyId;
    
    // Si no hay vacante seleccionada, intentar usar la primera de la lista
    if (!activeId) {
      if (vacancies.length > 0) {
        activeId = vacancies[0].id;
        setKanbanVacancyId(activeId);
      } else {
        // Cargar vacantes primero
        try {
          const res = await fetch(`${API_URL}/vacancies`);
          if (res.ok) {
            const data = await res.json();
            setVacancies(data);
            if (data.length > 0) {
              activeId = data[0].id;
              setKanbanVacancyId(activeId);
            }
          }
        } catch (e) {
          console.error("Error cargando vacantes para Kanban:", e);
        }
      }
    }

    if (!activeId) {
      setKanbanApplications([]);
      return;
    }

    setLoadingKanban(true);
    try {
      const res = await fetch(`${API_URL}/vacancies/${activeId}/applications`);
      if (res.ok) {
        const data = await res.json();
        setKanbanApplications(data);
      }
    } catch (e) {
      console.error("Error al cargar postulaciones del Kanban:", e);
    } finally {
      setLoadingKanban(false);
    }
  };

  const handleUpdateStage = async (applicationId, newStage) => {
    // 1. Encontrar la postulación actual
    const app = kanbanApplications.find(a => a.id === applicationId);
    if (!app || app.stage === newStage) return;

    // 2. Actualizar localmente de inmediato para UX fluida
    const prevApps = [...kanbanApplications];
    setKanbanApplications(prev => prev.map(a => a.id === applicationId ? { ...a, stage: newStage } : a));

    try {
      const res = await fetch(`${API_URL}/vacancies/applications/${applicationId}/stage?stage_to=${newStage}`, {
        method: 'PUT'
      });

      if (!res.ok) {
        // Revertir si hay error
        setKanbanApplications(prevApps);
        const err = await res.json();
        alert("Error al mover candidato: " + (err.detail || "No se pudo actualizar"));
      } else {
        // Refrescar estadísticas y lista de candidatos en segundo plano
        fetchStats(true);
        fetchCandidates(true);
      }
    } catch (e) {
      setKanbanApplications(prevApps);
      alert("Error de red al actualizar etapa: " + e.message);
    }
  };

  const handleAddCriterionField = () => {
    setNewVacancy(prev => ({
      ...prev,
      evaluation_criteria: [...prev.evaluation_criteria, { criterio: '', peso: 0.1 }]
    }));
  };

  const handleRemoveCriterionField = (index) => {
    setNewVacancy(prev => ({
      ...prev,
      evaluation_criteria: prev.evaluation_criteria.filter((_, idx) => idx !== index)
    }));
  };

  const handleCriterionChange = (index, field, value) => {
    setNewVacancy(prev => {
      const updated = [...prev.evaluation_criteria];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, evaluation_criteria: updated };
    });
  };

  const handleOpenCreateVacancy = () => {
    fetchUsersAndRoles();
    fetchDepartments();
    setEditingVacancy(null);
    setNewVacancy({
      title: '',
      description: '',
      requirements: '',
      status: 'abierta',
      min_age: '',
      max_age: '',
      department_id: '',
      manager_id: '',
      evaluator_user_id: '',
      evaluation_criteria: [{ criterio: '', peso: 0.5 }]
    });
    setVacancyModalOpen(true);
  };

  const handleOpenEditVacancy = (vac) => {
    fetchUsersAndRoles();
    fetchDepartments();
    setEditingVacancy(vac);
    const criteria = vac.evaluation_criteria && vac.evaluation_criteria.length > 0 
      ? vac.evaluation_criteria.map(c => ({
          criterio: c.criterio,
          peso: parseFloat(c.peso) > 2.0 ? parseFloat(c.peso) / 100.0 : parseFloat(c.peso)
        }))
      : [{ criterio: '', peso: 0.5 }];
    setNewVacancy({
      title: vac.title || '',
      description: vac.description || '',
      requirements: vac.requirements || '',
      status: vac.status || 'abierta',
      min_age: vac.min_age !== null && vac.min_age !== undefined ? vac.min_age : '',
      max_age: vac.max_age !== null && vac.max_age !== undefined ? vac.max_age : '',
      department_id: vac.department_id || '',
      manager_id: vac.manager_id || '',
      evaluator_user_id: vac.evaluator_assignments?.[0]?.user_id || '',
      evaluation_criteria: criteria
    });
    setVacancyModalOpen(true);
  };

  const handleSaveVacancy = async (e) => {
    e.preventDefault();
    const totalWeight = newVacancy.evaluation_criteria.reduce((sum, c) => sum + parseFloat(c.peso || 0), 0);
    if (Math.abs(totalWeight - 1.0) > 0.01 && Math.abs(totalWeight - 100) > 1) {
      alert("La suma de los pesos de los criterios debe ser igual a 1.0 (o 100%). Actualmente es: " + totalWeight);
      return;
    }
    
    const normalizedCriteria = newVacancy.evaluation_criteria.map(c => ({
      criterio: c.criterio,
      peso: parseFloat(c.peso) > 2.0 ? parseFloat(c.peso) / 100.0 : parseFloat(c.peso)
    }));

    const payload = {
      title: newVacancy.title,
      description: newVacancy.description,
      requirements: newVacancy.requirements,
      status: newVacancy.status || 'abierta',
      min_age: newVacancy.min_age ? parseInt(newVacancy.min_age) : null,
      max_age: newVacancy.max_age ? parseInt(newVacancy.max_age) : null,
      department_id: newVacancy.department_id ? parseInt(newVacancy.department_id) : null,
      manager_id: newVacancy.manager_id || null,
      evaluator_ids: newVacancy.evaluator_user_id ? [{ user_id: newVacancy.evaluator_user_id, stage: 'capacitacion_1' }] : [],
      evaluation_criteria: normalizedCriteria
    };

    try {
      const url = editingVacancy ? `${API_URL}/vacancies/${editingVacancy.id}` : `${API_URL}/vacancies`;
      const method = editingVacancy ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setVacancyModalOpen(false);
        setEditingVacancy(null);
        setNewVacancy({ title: '', description: '', requirements: '', status: 'abierta', evaluation_criteria: [{ criterio: '', peso: 0.5 }] });
        fetchVacancies();
        fetchStats(true);
      } else {
        const err = await res.json();
        alert("Error al guardar vacante: " + (err.detail || "Fallo en el servidor"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    }
  };

  const handleApplyCandidate = async (e) => {
    e.preventDefault();
    if (!activeVacancyForApply || !selectedCandidateForApply) return;

    try {
      const res = await fetch(`${API_URL}/vacancies/${activeVacancyForApply.id}/apply/${selectedCandidateForApply}`, {
        method: 'POST'
      });
      if (res.ok) {
        alert("¡Candidato postulado con éxito! La IA ha comenzado la evaluación.");
        setActiveVacancyForApply(null);
        setSelectedCandidateForApply('');
        fetchVacancies();
        fetchCandidates(true);
      } else {
        const err = await res.json();
        alert("Error: " + (err.detail || "No se pudo postular"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    }
  };

  // Handlers para Desvincular, Reasignar y Postular Directamente (Punto 3.1)
  const handleDeleteApplication = async (applicationId, vacancyTitle) => {
    if (!window.confirm(`¿Estás seguro de que deseas desvincular al candidato de la vacante "${vacancyTitle || 'esta vacante'}"?\n\nEsta acción eliminará su postulación y su historial de etapas de forma limpia. El candidato permanecerá en el Banco General de Talento.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/vacancies/applications/${applicationId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("Postulación eliminada exitosamente. El candidato ha regresado al Banco General.");
        // Refrescar lista de postulaciones del candidato en el modal
        if (selectedCandidate?.id) {
          const appRes = await fetch(`${API_URL}/candidates/${selectedCandidate.id}/applications`);
          if (appRes.ok) {
            const data = await appRes.json();
            setSelectedCandidateApplications(data);
          }
        }
        fetchCandidates(true);
        fetchVacancies(true);
        fetchStats(true);
      } else {
        const err = await res.json();
        alert("Error al eliminar postulación: " + (err.detail || "Fallo en el servidor"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    }
  };

  const handleOpenTransferModal = (app) => {
    setAppToTransfer(app);
    setTargetVacancyForTransfer('');
    setTransferReevaluate(true);
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!appToTransfer || !targetVacancyForTransfer) return;

    setTransferringApp(true);
    try {
      const res = await fetch(`${API_URL}/vacancies/applications/${appToTransfer.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_vacancy_id: parseInt(targetVacancyForTransfer),
          reevaluate: transferReevaluate
        })
      });

      if (res.ok) {
        alert("¡Candidato reasignado exitosamente a la nueva vacante!");
        setTransferModalOpen(false);
        setAppToTransfer(null);
        setTargetVacancyForTransfer('');
        // Refrescar modal de detalle
        if (selectedCandidate?.id) {
          const appRes = await fetch(`${API_URL}/candidates/${selectedCandidate.id}/applications`);
          if (appRes.ok) {
            const data = await appRes.json();
            setSelectedCandidateApplications(data);
          }
        }
        fetchCandidates(true);
        fetchVacancies(true);
        fetchStats(true);
      } else {
        const err = await res.json();
        alert("Error al reasignar vacante: " + (err.detail || "Fallo en el servidor"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    } finally {
      setTransferringApp(false);
    }
  };

  const handleOpenDirectApplyModal = (candidate) => {
    setSelectedCandidate(candidate);
    setTargetVacancyForDirectApply('');
    setDirectApplyModalOpen(true);
  };

  const handleConfirmDirectApply = async (e) => {
    e.preventDefault();
    if (!selectedCandidate || !targetVacancyForDirectApply) return;

    setApplyingDirect(true);
    try {
      const res = await fetch(`${API_URL}/vacancies/${targetVacancyForDirectApply}/apply/${selectedCandidate.id}`, {
        method: 'POST'
      });

      if (res.ok) {
        alert("¡Candidato postulado con éxito!");
        setDirectApplyModalOpen(false);
        setTargetVacancyForDirectApply('');
        if (selectedCandidate?.id) {
          const appRes = await fetch(`${API_URL}/candidates/${selectedCandidate.id}/applications`);
          if (appRes.ok) {
            const data = await appRes.json();
            setSelectedCandidateApplications(data);
          }
        }
        fetchCandidates(true);
        fetchVacancies(true);
        fetchStats(true);
      } else {
        const err = await res.json();
        alert("Error al postular: " + (err.detail || "No se pudo completar la postulación"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    } finally {
      setApplyingDirect(false);
    }
  };
 
  // Gestores de Plataforma / Fuente de Reclutamiento
  const getSourceBadgeClass = (source) => {
    if (!source || source === 'No especificada') return 'badge-source-none';
    const s = source.toLowerCase();
    if (s.includes('occ')) return 'badge-source-occ';
    if (s.includes('indeed')) return 'badge-source-indeed';
    if (s.includes('linkedin')) return 'badge-source-linkedin';
    if (s.includes('computrabajo')) return 'badge-source-computrabajo';
    if (s.includes('interna') || s.includes('referido')) return 'badge-source-interna';
    if (s.includes('whatsapp')) return 'badge-source-whatsapp';
    return 'badge-source-custom';
  };

  const handleOpenChangeSourceModal = (cand) => {
    if (!cand) return;
    setCandidateToChangeSource(cand);
    const curr = cand.source || 'No especificada';
    if (candidateSources.includes(curr) || curr === 'No especificada') {
      setSelectedNewSource(curr);
      setIsCustomNewSource(false);
      setCustomNewSourceInput('');
    } else {
      setSelectedNewSource('__custom__');
      setIsCustomNewSource(true);
      setCustomNewSourceInput(curr);
    }
    setChangeSourceModalOpen(true);
  };

  const handleSaveCandidateSource = async (e) => {
    e.preventDefault();
    if (!candidateToChangeSource) return;

    let targetSource = isCustomNewSource ? customNewSourceInput.trim() : selectedNewSource;
    if (!targetSource) targetSource = 'No especificada';

    setUpdatingCandidateSource(true);
    try {
      const res = await fetch(`${API_URL}/candidates/${candidateToChangeSource.id}/source`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: targetSource })
      });
      if (res.ok) {
        const updated = await res.json();
        setCandidates(prev => prev.map(c => c.id === candidateToChangeSource.id ? { ...c, source: updated.source } : c));
        if (selectedCandidate?.id === candidateToChangeSource.id) {
          setSelectedCandidate(prev => ({ ...prev, source: updated.source }));
        }
        setChangeSourceModalOpen(false);
        setCandidateToChangeSource(null);
        fetchCandidateSources();
        fetchDetailedSources();
        alert(`Plataforma actualizada exitosamente a: "${updated.source}"`);
      } else {
        const err = await res.json();
        alert("Error al actualizar la plataforma: " + (err.detail || "Fallo en el servidor"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    } finally {
      setUpdatingCandidateSource(false);
    }
  };

  const handleCreateCatalogueSource = async (e) => {
    e.preventDefault();
    const name = newCatalogueSourceInput.trim();
    if (!name) return;

    setSavingCatalogueSource(true);
    try {
      const res = await fetch(`${API_URL}/candidates/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setNewCatalogueSourceInput('');
        fetchCandidateSources();
        fetchDetailedSources();
        alert(`Plataforma "${name}" añadida al catálogo.`);
      } else {
        const err = await res.json();
        alert("Error al agregar plataforma: " + (err.detail || "Fallo en el servidor"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    } finally {
      setSavingCatalogueSource(false);
    }
  };

  const handleOpenRenameSourceModal = (sourceItem) => {
    setSourceToRename(sourceItem.name);
    setRenameSourceInput(sourceItem.name);
    setRenameModalOpen(true);
  };

  const handleConfirmRenameSource = async (e) => {
    e.preventDefault();
    if (!sourceToRename || !renameSourceInput.trim()) return;

    const newName = renameSourceInput.trim();
    try {
      const res = await fetch(`${API_URL}/candidates/sources`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_name: sourceToRename, new_name: newName })
      });
      if (res.ok) {
        setRenameModalOpen(false);
        setSourceToRename(null);
        setRenameSourceInput('');
        fetchCandidates(true);
        fetchCandidateSources();
        fetchDetailedSources();
        alert(`Plataforma renombrada a "${newName}" y candidatos actualizados.`);
      } else {
        const err = await res.json();
        alert("Error al renombrar: " + (err.detail || "Fallo en el servidor"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    }
  };

  const handleDeleteCatalogueSource = async (sourceName) => {
    if (!window.confirm(`¿Estás seguro de eliminar la plataforma "${sourceName}" del catálogo?\n\nLos candidatos que actualmente la tengan asignada pasarán a tener "No especificada".`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/candidates/sources?name=${encodeURIComponent(sourceName)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCandidates(true);
        fetchCandidateSources();
        fetchDetailedSources();
        alert(`Plataforma "${sourceName}" eliminada del catálogo.`);
      } else {
        const err = await res.json();
        alert("Error al eliminar: " + (err.detail || "Fallo en el servidor"));
      }
    } catch (e) {
      alert("Error de conexión: " + e.message);
    }
  };

  const fileInputRef = useRef(null);

  const checkHealth = async () => {
    setRefreshing(true);
    
    // Backend health
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        setStatusBackend({ loading: false, data, error: null });
      } else {
        setStatusBackend({ loading: false, data: null, error: `Estado ${res.status}` });
      }
    } catch (e) {
      setStatusBackend({ loading: false, data: null, error: e.message || 'Error de conexión' });
    }

    // Database health
    try {
      const res = await fetch(`${API_URL}/health/database`);
      if (res.ok) {
        const data = await res.json();
        setStatusDb({ loading: false, data, error: null });
      } else {
        setStatusDb({ loading: false, data: null, error: `Estado ${res.status}` });
      }
    } catch (e) {
      setStatusDb({ loading: false, data: null, error: e.message || 'Error de conexión' });
    }

    // Ollama health
    try {
      const res = await fetch(`${API_URL}/health/ollama`);
      const data = await res.json();
      if (res.ok) {
        setStatusOllama({ loading: false, data, error: null });
      } else {
        setStatusOllama({ loading: false, data: null, error: data.detail || 'Error en servicio de Ollama' });
      }
    } catch (e) {
      setStatusOllama({ loading: false, data: null, error: e.message || 'Error de conexión' });
    }

    setRefreshing(false);
  };

  const fetchCandidates = async (silent = false) => {
    if (!silent) setLoadingCandidates(true);
    try {
      const res = await fetch(`${API_URL}/candidates`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (e) {
      console.error("Error al cargar candidatos:", e);
    } finally {
      if (!silent) setLoadingCandidates(false);
    }
  };

  // Carga inicial y chequeos de salud
  useEffect(() => {
    checkHealth();
    fetchCandidates();
    fetchVacancies();
    fetchStats();
    fetchSettings();
    fetchCandidateSources();
    fetchDetailedSources();
    fetchDepartments();
    fetchMaintenanceStats();
  }, []);

  // Desactivado: El polling continuo cada 3s provocaba re-renderizados constantes e innecesarios de la interfaz
  // La actualización de candidatos y vacantes se ejecuta bajo demanda (al subir CVs, editar o refrescar)

  // Si se abre el modal de detalle, cargar sus postulaciones una sola vez (sin polling persistente)
  useEffect(() => {
    if (!selectedCandidate?.id) return;
    setPdfZoom(100);

    let isSubscribed = true;

    const loadExtraData = async () => {
      try {
        const appRes = await fetch(`${API_URL}/candidates/${selectedCandidate.id}/applications`);
        if (appRes.ok && isSubscribed) {
          const appData = await appRes.json();
          setSelectedCandidateApplications(appData);
          if (appData.length > 0 && !noteStage) {
            setNoteStage(appData[0].stage || 'cv_recibido');
          }
        }
      } catch (e) {
        console.error("Error cargando datos extra de candidato:", e);
      }
    };
    
    loadExtraData();

    // Solo activar polling temporal si el candidato está en estado 'procesando'
    let interval = null;
    if (selectedCandidate.status === 'procesando') {
      interval = setInterval(() => {
        loadExtraData();
      }, 5000);
    }

    return () => {
      isSubscribed = false;
      if (interval) clearInterval(interval);
    };
  }, [selectedCandidate?.id, selectedCandidate?.status]);

  const handleFileUpload = (filesList) => {
    const pdfs = Array.from(filesList).filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) return;
    setPendingFilesToUpload(pdfs);
    setTargetVacancyForUpload('');
    setTargetSourceForUpload('OCC Mundial');
    setIsCustomSource(false);
    setCustomSourceValue('');
    setUploadModalOpen(true);
  };

  const executeFileUpload = async () => {
    setUploadModalOpen(false);
    const pdfs = pendingFilesToUpload;
    const vacancyId = targetVacancyForUpload;
    const chosenSource = isCustomSource && customSourceValue.trim()
      ? customSourceValue.trim()
      : (targetSourceForUpload || 'No especificada');

    setPendingFilesToUpload([]);

    // Crear estados de carga locales
    const newUploads = pdfs.map(f => ({
      name: f.name,
      status: 'cargando',
      progress: 20
    }));
    setUploadingFiles(prev => [...newUploads, ...prev]);

    for (let i = 0; i < pdfs.length; i++) {
      const file = pdfs[i];
      const formData = new FormData();
      formData.append('file', file);
      if (chosenSource) {
        formData.append('source', chosenSource);
      }

      try {
        setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, progress: 50, status: 'procesando' } : u));
        
        const res = await fetch(`${API_URL}/candidates/upload`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const candidateData = await res.json();
          
          // Si seleccionó una vacante, postular de inmediato
          if (vacancyId) {
            setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, progress: 80, status: 'procesando' } : u));
            await fetch(`${API_URL}/vacancies/${vacancyId}/apply/${candidateData.id}`, {
              method: 'POST'
            });
          }

          setUploadingFiles(prev => prev.filter(u => u.name !== file.name));
          fetchCandidates(true); // Refrescar lista de candidatos
          fetchVacancies(true);
          fetchCandidateSources(); // Actualizar lista de fuentes
        } else {
          const errData = await res.json();
          setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', progress: 0, error: errData.detail || 'Fallo de subida' } : u));
        }
      } catch (e) {
        setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', progress: 0, error: e.message || 'Error de conexión' } : u));
      }
    }
  };

  const uploadAndApplyForVacancy = async (filesList, vacancyId, chosenSource = 'Bolsa Interna / Referido') => {
    const pdfs = Array.from(filesList).filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) return;

    // Cierra el modal de postulación para mostrar la cola de carga en la lista
    setActiveVacancyForApply(null);
    setActiveTab('candidates'); // Cambiar a la vista de candidatos para ver el progreso de carga y logs

    // Crear estados de carga locales
    const newUploads = pdfs.map(f => ({
      name: f.name,
      status: 'cargando',
      progress: 20
    }));
    setUploadingFiles(prev => [...newUploads, ...prev]);

    for (let i = 0; i < pdfs.length; i++) {
      const file = pdfs[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', chosenSource || 'Bolsa Interna / Referido');

      try {
        setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, progress: 50, status: 'procesando' } : u));
        
        const res = await fetch(`${API_URL}/candidates/upload`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const candidateData = await res.json();
          
          setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, progress: 80, status: 'procesando' } : u));
          await fetch(`${API_URL}/vacancies/${vacancyId}/apply/${candidateData.id}`, {
            method: 'POST'
          });

          setUploadingFiles(prev => prev.filter(u => u.name !== file.name));
          fetchCandidates(true);
          fetchVacancies(true);
          fetchCandidateSources();
        } else {
          const errData = await res.json();
          setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', progress: 0, error: errData.detail || 'Fallo de subida' } : u));
        }
      } catch (e) {
        setUploadingFiles(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', progress: 0, error: e.message || 'Error de conexión' } : u));
      }
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCandidate) return;
    setSubmittingNote(true);

    try {
      const res = await fetch(`${API_URL}/candidates/${selectedCandidate.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newNote, 
          author: "Reclutador",
          stage: noteStage || null
        })
      });

      if (res.ok) {
        const addedNote = await res.json();
        // Actualizar el candidato localmente en el modal
        setSelectedCandidate(prev => ({
          ...prev,
          notes: [addedNote, ...(prev.notes || [])]
        }));
        // Actualizar también en la lista de candidatos principal
        setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, notes: [addedNote, ...(c.notes || [])] } : c));
        setNewNote('');
      }
    } catch (e) {
      console.error("Error al registrar nota:", e);
    } finally {
      setSubmittingNote(false);
    }
  };



  const getStatusBadge = (statusObj) => {
    if (statusObj.loading) {
      return (
        <span className="badge badge-warning">
          <RefreshCw className="icon-spin icon-sm" /> Comprobando
        </span>
      );
    }
    if (statusObj.error) {
      return (
        <span className="badge badge-danger">
          <XCircle className="icon-sm" /> Offline
        </span>
      );
    }
    if (statusObj.data?.status === 'warning') {
      return (
        <span className="badge badge-warning">
          <AlertTriangle className="icon-sm" /> Alerta
        </span>
      );
    }
    return (
      <span className="badge badge-success">
        <CheckCircle className="icon-sm" /> Online
      </span>
    );
  };

  const handleCopyDeepLink = (appId) => {
    const username = settingsData.telegram_bot_username || 'OctyBot_HR_Bot';
    const link = `https://t.me/${username}?start=app_${appId}`;
    navigator.clipboard.writeText(link);
    alert(`Enlace de pre-entrevista copiado al portapapeles:\n${link}`);
  };

  const handleOpenWhatsAppModal = (cand, app) => {
    if (!cand) return;
    const targetApp = app || (cand.applications && cand.applications.length > 0 ? cand.applications[0] : null);
    setWaCandidate(cand);
    setWaApplication(targetApp);
    setWaPhoneOption(cand.phone ? 'registered' : 'custom');
    setWaCustomPhone('');
    setWaAdvanceStage(true);
    setWaModalOpen(true);
  };

  const handleConfirmSendWhatsApp = async (e) => {
    if (e) e.preventDefault();
    if (!waCandidate) return;

    let targetPhone = '';
    if (waPhoneOption === 'registered') {
      targetPhone = (waCandidate.phone || '').trim();
      if (!targetPhone) {
        alert("El candidato no tiene un teléfono registrado. Por favor selecciona 'Número alternativo o de prueba'.");
        return;
      }
    } else {
      targetPhone = waCustomPhone.trim();
      if (!targetPhone) {
        alert("Por favor ingresa un número de WhatsApp (10 dígitos).");
        return;
      }
    }

    let cleanDigits = targetPhone.replace(/\D/g, '');
    if (cleanDigits.length === 10) {
      cleanDigits = `52${cleanDigits}`;
    }

    if (!cleanDigits || cleanDigits.length < 8) {
      alert("El número telefónico no es válido para WhatsApp (mínimo 10 dígitos).");
      return;
    }

    const firstName = waCandidate.name ? waCandidate.name.trim().split(' ')[0] : 'Candidato';
    const vacancyTitle = waApplication?.vacancy?.title || 'la vacante';
    const username = settingsData.telegram_bot_username || 'OctyBot_HR_Bot';
    const appId = waApplication?.id || (waCandidate.applications?.[0]?.id);
    const interviewLink = appId ? `https://t.me/${username}?start=app_${appId}` : `https://t.me/${username}`;

    const message = `Hola ${firstName} 👋

Hemos revisado tu postulación para la vacante de ${vacancyTitle}.

Para continuar con el proceso de selección, te invitamos a realizar una breve preentrevista con nuestro asistente de IA OctyBot en Telegram.

Puedes comenzar aquí:
${interviewLink}

¡Mucho éxito en tu proceso!`;

    const waUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    const isTestNumber = waPhoneOption === 'custom';

    // Registrar nota de auditoría interna
    try {
      await fetch(`${API_URL}/candidates/${waCandidate.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: `📱 Invitación a pre-entrevista abierta para envío por WhatsApp (+${cleanDigits})${isTestNumber ? ' [NÚMERO DE PRUEBA / ALTERNATIVO]' : ''} para la vacante "${vacancyTitle}".`, 
          author: "Reclutador (WhatsApp)",
          stage: "pre_entrevista"
        })
      });

      // Si la casilla de avanzar etapa está marcada y la postulación está en cv_recibido, mover automáticamente a pre_entrevista
      if (waAdvanceStage && appId && (waApplication?.stage === 'cv_recibido' || (!waApplication?.stage))) {
        handleUpdateStage(appId, 'pre_entrevista');
        setSelectedCandidateApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: 'pre_entrevista' } : a));
      }
    } catch (err) {
      console.error("Error al registrar auditoría de WhatsApp:", err);
    }

    setWaModalOpen(false);
  };

  const handleReevaluate = async (appId) => {
    try {
      const res = await fetch(`${API_URL}/vacancies/applications/${appId}/evaluate`, {
        method: 'POST'
      });
      if (res.ok) {
        // Forzar actualización inmediata del loading en UI reseteando localmente el score de esa postulación
        setSelectedCandidateApplications(prev => prev.map(app => app.id === appId ? { ...app, score: null, evaluation_feedback: null } : app));
      } else {
        alert("No se pudo iniciar la re-evaluación.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al conectar con el servidor.");
    }
  };

  const getCandidateStatusBadge = (status) => {
    switch (status) {
      case 'procesando':
        return <span className="badge badge-warning"><RefreshCw className="icon-spin icon-sm" /> Procesando</span>;
      case 'completado':
        return <span className="badge badge-success"><CheckCircle className="icon-sm" /> Completado</span>;
      case 'error':
        return <span className="badge badge-danger"><XCircle className="icon-sm" /> Error IA</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getStageBadge = (stage) => {
    const stageLabels = {
      cv_recibido: "CV Recibido",
      pre_entrevista: "Pre-entrevista",
      sin_respuesta: "Sin Respuesta Pre-entrevista",
      entrevista: "Entrevista",
      evaluado: "Evaluado",
      roleplay: "Roleplay",
      capacitacion_1: "Capacitación 1",
      capacitacion_2: "Capacitación 2",
      contratado: "Contratado",
      rechazado: "Rechazado"
    };
    const stageClasses = {
      cv_recibido: "badge-blue",
      pre_entrevista: "badge-orange",
      sin_respuesta: "badge-rose",
      entrevista: "badge-purple",
      evaluado: "badge-warning",
      roleplay: "badge-indigo",
      capacitacion_1: "badge-teal",
      capacitacion_2: "badge-emerald",
      contratado: "badge-success",
      rechazado: "badge-danger"
    };
    return (
      <span className={`badge ${stageClasses[stage] || 'badge-blue'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', lineHeight: '1.2' }}>
        {stageLabels[stage] || stage}
      </span>
    );
  };

  const getScoreRangeInfo = (score) => {
    const high = parseInt(settingsData.score_range_high || stats?.score_range_high || 80);
    const mid = parseInt(settingsData.score_range_mid || stats?.score_range_mid || 60);

    if (score >= high) {
      return { 
        tier: 'high', 
        label: 'Rango Alto', 
        badgeClass: 'badge-success', 
        color: '#16a34a',
        bg: 'rgba(22, 163, 74, 0.1)'
      };
    }
    if (score >= mid) {
      return { 
        tier: 'mid', 
        label: 'Rango Medio', 
        badgeClass: 'badge-warning', 
        color: '#ca8a04',
        bg: 'rgba(202, 138, 4, 0.1)'
      };
    }
    return { 
      tier: 'low', 
      label: 'Rango Bajo', 
      badgeClass: 'badge-danger', 
      color: '#dc2626',
      bg: 'rgba(220, 38, 38, 0.1)'
    };
  };

  const getStageBorderClass = (cand) => {
    if (!cand.applications || cand.applications.length === 0) return '';
    const mainApp = cand.applications[0];
    return `stage-border-${mainApp.stage}`;
  };

  const checkCandidateAlerts = (cand) => {
    const missing = [];
    if (!cand.phone || cand.phone.trim() === '' || cand.phone.toLowerCase() === 'n/a') missing.push('Teléfono');
    if (!cand.email || cand.email.trim() === '' || cand.email.toLowerCase() === 'n/a') missing.push('Correo');
    if (!cand.skills || cand.skills.length === 0) missing.push('Habilidades');
    return missing;
  };

  const formatCandidateDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = minutes / 60;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = hours / 24;
    return `${days.toFixed(1)}d`;
  };

  const getStageHistoryDurations = (history) => {
    if (!history || history.length === 0) return [];
    
    const sorted = [...history].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
    const timeline = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const stage = current.stage_to;
      const start = new Date(current.changed_at);
      
      let end = new Date();
      if (i + 1 < sorted.length) {
        end = new Date(sorted[i + 1].changed_at);
      }
      
      const durationSeconds = (end - start) / 1000;
      timeline.push({
        stage,
        changedAt: current.changed_at,
        durationSeconds
      });
    }

    return timeline;
  };

  // Filtrar y buscar candidatos
  const filteredCandidates = candidates.filter(c => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      c.name.toLowerCase().includes(query) ||
      (c.skills && c.skills.some(s => s.toLowerCase().includes(query))) ||
      (c.email && c.email.toLowerCase().includes(query));

    // Filtro por Vacante
    let matchesVacancy = true;
    if (candidateVacancyFilter === 'sin_postular') {
      matchesVacancy = !c.applications || c.applications.length === 0;
    } else if (candidateVacancyFilter !== 'Todas') {
      matchesVacancy = c.applications && c.applications.some(app => 
        String(app.vacancy_id) === candidateVacancyFilter || 
        String(app.vacancy?.id) === candidateVacancyFilter ||
        app.vacancy?.title === candidateVacancyFilter
      );
    }

    // Filtro por Etapa del Proceso
    const matchesStage = candidateStageFilter === 'Todas' || 
      (c.applications && c.applications.some(app => app.stage === candidateStageFilter));

    // Filtro por Rango de Calificación IA
    const highThresh = parseInt(settingsData.score_range_high || stats?.score_range_high || 80);
    const midThresh = parseInt(settingsData.score_range_mid || stats?.score_range_mid || 60);
    const primaryScore = (c.applications && c.applications.length > 0 && c.applications[0].score != null)
      ? c.applications[0].score
      : null;

    let matchesScoreRange = true;
    if (candidateScoreRangeFilter === 'high') {
      matchesScoreRange = primaryScore !== null && primaryScore >= highThresh;
    } else if (candidateScoreRangeFilter === 'mid') {
      matchesScoreRange = primaryScore !== null && primaryScore >= midThresh && primaryScore < highThresh;
    } else if (candidateScoreRangeFilter === 'low') {
      matchesScoreRange = primaryScore !== null && primaryScore < midThresh;
    } else if (candidateScoreRangeFilter === 'unscored') {
      matchesScoreRange = primaryScore === null;
    }

    // Filtro por Plataforma / Fuente de Empleo
    let matchesSource = true;
    if (candidateSourceFilter !== 'Todas') {
      if (candidateSourceFilter === 'no_especificada') {
        matchesSource = !c.source || c.source === 'No especificada';
      } else {
        matchesSource = c.source === candidateSourceFilter;
      }
    }

    return matchesSearch && matchesVacancy && matchesStage && matchesScoreRange && matchesSource;
  });

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon-wrapper">
            <Bot className="logo-icon" />
          </div>
          <div className="logo-text">
            <h2>OCTOPY <span className="logo-accent">Talento</span></h2>
            <p>Ecosistema IA & Robótica</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              fetchStats();
            }}
          >
            <LayoutDashboard className="nav-icon" />
            <span>Dashboard</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'candidates' ? 'active' : ''} ${!canAccessTab('candidates') ? 'nav-restricted' : ''}`}
            onClick={() => {
              setActiveTab('candidates');
              if (canAccessTab('candidates')) fetchCandidates();
            }}
            title={!canAccessTab('candidates') ? 'Requiere permiso: candidates:read' : 'Administración de Candidatos'}
          >
            <Users className="nav-icon" />
            <span>Candidatos</span>
            {!canAccessTab('candidates') && <Lock style={{ width: '12px', height: '12px', marginLeft: 'auto', opacity: 0.55 }} />}
          </button>

          <button 
            className={`nav-item ${activeTab === 'vacancies' ? 'active' : ''} ${!canAccessTab('vacancies') ? 'nav-restricted' : ''}`}
            onClick={() => {
              setActiveTab('vacancies');
              if (canAccessTab('vacancies')) fetchVacancies();
            }}
            title={!canAccessTab('vacancies') ? 'Requiere permiso: vacancies:manage' : 'Gestión de Vacantes'}
          >
            <Briefcase className="nav-icon" />
            <span>Vacantes</span>
            {!canAccessTab('vacancies') && <Lock style={{ width: '12px', height: '12px', marginLeft: 'auto', opacity: 0.55 }} />}
          </button>

          <button 
            className={`nav-item ${activeTab === 'kanban' ? 'active' : ''} ${!canAccessTab('kanban') ? 'nav-restricted' : ''}`}
            onClick={() => {
              setActiveTab('kanban');
              if (canAccessTab('kanban')) fetchKanbanData();
            }}
            title={!canAccessTab('kanban') ? 'Requiere permiso: kanban:manage' : 'Tablero Kanban'}
          >
            <KanbanSquare className="nav-icon" />
            <span>Tablero Kanban</span>
            {!canAccessTab('kanban') && <Lock style={{ width: '12px', height: '12px', marginLeft: 'auto', opacity: 0.55 }} />}
          </button>

          <button 
            className={`nav-item ${activeTab === 'users' ? 'active' : ''} ${!canAccessTab('users') ? 'nav-restricted' : ''}`}
            onClick={() => {
              setActiveTab('users');
              if (canAccessTab('users')) {
                fetchUsersAndRoles();
                fetchDepartments();
              }
            }}
            style={{ position: 'relative' }}
            title={!canAccessTab('users') ? 'Requiere permiso: users:manage (SuperAdmin / Gerente RH)' : 'Control de Acceso y Gestión de Usuarios (RBAC)'}
          >
            <ShieldCheck className="nav-icon" />
            <span>Usuarios & Roles</span>
            {!canAccessTab('users') ? (
              <Lock style={{ width: '12px', height: '12px', marginLeft: 'auto', opacity: 0.55 }} />
            ) : (
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '0.62rem', 
                fontWeight: '700', 
                background: 'rgba(21, 93, 252, 0.18)', 
                color: '#60a5fa', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '9999px',
                border: '1px solid rgba(96, 165, 250, 0.3)'
              }}>
                RBAC
              </span>
            )}
          </button>

          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''} ${!canAccessTab('settings') ? 'nav-restricted' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              if (canAccessTab('settings')) fetchSettings();
            }}
            title={!canAccessTab('settings') ? 'Requiere permiso: settings:manage' : 'Configuración del Sistema'}
          >
            <SettingsIcon className="nav-icon" />
            <span>Configuración</span>
            {!canAccessTab('settings') && <Lock style={{ width: '12px', height: '12px', marginLeft: 'auto', opacity: 0.55 }} />}
          </button>

          <button 
            className={`nav-item ${activeTab === 'purge' ? 'active' : ''} ${!canAccessTab('purge') ? 'nav-restricted' : ''}`}
            onClick={() => {
              setActiveTab('purge');
              if (canAccessTab('purge')) fetchMaintenanceStats();
            }}
            style={{ position: 'relative' }}
            title={!canAccessTab('purge') ? 'Requiere permiso: settings:manage (SuperAdmin / Gerente RH)' : 'Centro de Mantenimiento y Purga de Datos'}
          >
            <Trash2 className="nav-icon" />
            <span>Purga & Mantenimiento</span>
            {!canAccessTab('purge') ? (
              <Lock style={{ width: '12px', height: '12px', marginLeft: 'auto', opacity: 0.55 }} />
            ) : (
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '0.62rem', 
                fontWeight: '700', 
                background: 'rgba(239, 68, 68, 0.15)', 
                color: '#f87171', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '9999px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                ADMIN
              </span>
            )}
          </button>

          <button 
            className={`nav-item ${activeTab === 'simulator' ? 'active' : ''} ${!canAccessTab('simulator') ? 'nav-restricted' : ''}`}
            onClick={() => {
              setActiveTab('simulator');
            }}
            style={{ position: 'relative' }}
            title={!canAccessTab('simulator') ? 'Requiere permiso: settings:manage / Reclutador Senior' : 'Sandbox de Pruebas de OctyBot'}
          >
            <Bot className="nav-icon" />
            <span>Simulador IA</span>
            {!canAccessTab('simulator') ? (
              <Lock style={{ width: '12px', height: '12px', marginLeft: 'auto', opacity: 0.55 }} />
            ) : (
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '0.62rem', 
                fontWeight: '700', 
                background: 'linear-gradient(135deg, #155dfc, #615fff)', 
                color: '#fff', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '9999px',
                letterSpacing: '0.5px'
              }}>
                SANDBOX
              </span>
            )}
          </button>
        </nav>

        {/* TARJETA DE USUARIO Y ROL ACTUAL (P1 RBAC) */}
        {currentUser && (
          <div className="sidebar-user-card">
            <div className="sidebar-user-header">
              <div className="sidebar-user-avatar" title={currentUser.full_name}>
                {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name" title={currentUser.full_name}>
                  {currentUser.full_name}
                </span>
                <span className="sidebar-user-role">
                  {currentUser.roles?.[0]?.name || (currentUser.is_superadmin ? 'Super Administrador' : 'Usuario')}
                </span>
              </div>
            </div>
            <div className="sidebar-user-actions">
              <button 
                type="button" 
                className="sidebar-user-btn" 
                onClick={() => setAuthModalOpen(true)}
                title="Cambiar de rol o iniciar sesión como otro usuario"
              >
                <UserCheck style={{ width: '12px', height: '12px' }} /> Cambiar Rol
              </button>
              <button 
                type="button" 
                className="sidebar-user-btn" 
                onClick={handleLogout}
                title="Cerrar sesión"
                style={{ color: '#fca5a5' }}
              >
                <LogOut style={{ width: '12px', height: '12px' }} /> Salir
              </button>
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="version-info">
            <p>Vite + React v18.2 | RBAC P1</p>
            <p>FastAPI v0.110 | Bitácora LFPDPPP</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="main-container">
        {/* HEADER */}
        <header className="main-header">
          <div className="header-title">
            <h1>
              {activeTab === 'dashboard' && 'Plataforma de Gestión y Evaluación'}
              {activeTab === 'candidates' && 'Administración de Candidatos'}
              {activeTab === 'vacancies' && 'Gestión de Vacantes'}
              {activeTab === 'kanban' && 'Tablero Kanban de Selección'}
              {activeTab === 'users' && 'Control de Acceso y Gestión de Usuarios (RBAC)'}
              {activeTab === 'purge' && 'Centro de Mantenimiento y Purga de Datos'}
              {activeTab === 'settings' && 'Configuración de Parámetros y Asistente'}
              {activeTab === 'simulator' && 'Sandbox & Simulador de OctyBot IA'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'Infraestructura base lista - M01 Foundation'}
              {activeTab === 'candidates' && 'Visualiza, busca y evalúa perfiles en tiempo real'}
              {activeTab === 'vacancies' && 'Define perfiles, criterios de evaluación y pesos ponderados'}
              {activeTab === 'kanban' && 'Flujo y seguimiento ágil de candidatos por etapas'}
              {activeTab === 'users' && 'Aprovisionamiento de colaboradores, asignación jerárquica de roles y matriz de permisos'}
              {activeTab === 'purge' && 'Destrucción segura de CVs, purga de expedientes, cumplimiento LFPDPPP y reset total del sistema'}
              {activeTab === 'settings' && 'Personaliza la identidad, el usuario de Telegram y el prompt de pre-entrevista'}
              {activeTab === 'simulator' && 'Prueba el flujo de 6 pasos, calibración de prompts y verificación multimodal de INE sin afectar datos reales'}
            </p>
          </div>
          <div className="header-actions">
            {activeTab === 'dashboard' && (
              <button 
                className={`btn btn-secondary ${refreshing ? 'btn-loading' : ''}`} 
                onClick={async () => {
                  await checkHealth();
                  await fetchStats();
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`icon-sm ${refreshing ? 'icon-spin' : ''}`} />
                Actualizar Estado
              </button>
            )}
            {activeTab === 'candidates' && (
              <button 
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="icon-sm" />
                Cargar CVs (PDF)
              </button>
            )}
            {activeTab === 'vacancies' && (
              <button 
                className="btn btn-primary"
                onClick={handleOpenCreateVacancy}
              >
                <Plus className="icon-sm" />
                Nueva Vacante
              </button>
            )}
            {activeTab === 'users' && hasPermission('users:manage') && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    fetchUsersAndRoles();
                    fetchDepartments();
                  }}
                  disabled={loadingUsers}
                >
                  <RefreshCw className={`icon-sm ${loadingUsers ? 'icon-spin' : ''}`} />
                  Actualizar
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    fetchDepartments();
                    setNewUserModalOpen(true);
                  }}
                >
                  <UserPlus className="icon-sm" />
                  Registrar Colaborador
                </button>
              </div>
            )}
            {activeTab === 'purge' && (
              <button 
                className={`btn btn-secondary ${loadingMaintenance ? 'btn-loading' : ''}`} 
                onClick={fetchMaintenanceStats}
                disabled={loadingMaintenance}
              >
                <RefreshCw className={`icon-sm ${loadingMaintenance ? 'icon-spin' : ''}`} />
                Actualizar Métricas
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple 
              accept=".pdf" 
              onChange={(e) => handleFileUpload(e.target.files)} 
            />
          </div>
        </header>

        {/* CONTENT */}
        <main className="content">
          {!canAccessTab(activeTab) ? (
            <div className="card" style={{ maxWidth: '820px', margin: '2.5rem auto', padding: '2.75rem 2rem', textAlign: 'center', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '1.25rem', border: '2px solid rgba(239, 68, 68, 0.2)' }}>
                <ShieldAlert style={{ width: '38px', height: '38px' }} />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Acceso Restringido por Control de Acceso (RBAC)
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '600px', margin: '0 auto 1.75rem auto', lineHeight: '1.5' }}>
                Tu rol actual no dispone de los privilegios necesarios para acceder a la sección <strong style={{ color: 'var(--accent-light)' }}>{SECTION_PERMISSIONS[activeTab]?.label || activeTab}</strong>.
              </p>

              <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', maxWidth: '580px', margin: '0 auto 2rem auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>👤 Usuario en Sesión:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.full_name || 'Anónimo'} ({currentUser?.email || 'Sin sesión'})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>🏷️ Rol Actual:</span>
                  <span className="badge badge-purple" style={{ fontWeight: '700' }}>
                    {currentUser?.roles?.[0]?.name || (currentUser?.is_superadmin ? 'Super Administrador' : 'Sin rol asignado')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>🔑 Permiso Requerido:</span>
                  <code style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '700' }}>
                    {SECTION_PERMISSIONS[activeTab]?.permission || 'Acceso Restringido'}
                  </code>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>🛡️ Roles Autorizados para este Módulo:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {SECTION_PERMISSIONS[activeTab]?.allowedRoles?.map((rName, i) => (
                      <span key={i} className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                        ✓ {rName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setActiveTab('dashboard')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem' }}
                >
                  <LayoutDashboard className="icon-sm" /> Volver al Dashboard
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => setAuthModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem' }}
                >
                  <UserCheck className="icon-sm" /> Cambiar de Rol / Iniciar Sesión
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
            <div className="dashboard-view-container">
              {/* 1. KPI CARDS */}
              <div className="kpi-grid">
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-blue">
                    <Users className="icon-blue kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Candidatos Totales</h4>
                    <p className="kpi-value">{stats?.total_candidates ?? 0}</p>
                  </div>
                </div>
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-purple">
                    <Briefcase className="icon-purple kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Vacantes Activas</h4>
                    <p className="kpi-value">{stats?.total_vacancies ?? 0}</p>
                  </div>
                </div>
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-green">
                    <ClipboardList className="icon-green kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Postulaciones Totales</h4>
                    <p className="kpi-value">{stats?.total_applications ?? 0}</p>
                  </div>
                </div>
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-orange" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                    <Cpu className="kpi-icon" style={{ color: '#f59e0b', width: '24px', height: '24px' }} />
                  </div>
                  <div className="kpi-info">
                    <h4>Tasa de Éxito IA</h4>
                    <p className="kpi-value">{stats?.ia_success_rate ?? 100}%</p>
                  </div>
                </div>
              </div>

              {/* 2. GRÁFICOS SVG DINÁMICOS */}
              <div className="dashboard-charts-grid">
                
                {/* Distribución Procesamiento IA */}
                <div className="card chart-card">
                  <div className="chart-header">
                    <h4>Distribución Procesamiento IA</h4>
                    <p>Estados de candidatos analizados por Gemma</p>
                  </div>
                  <div className="donut-chart-layout">
                    <div className="donut-chart-svg-wrapper">
                      {/* Circular Progress Ring for Success Rate */}
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                        <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--success)" strokeWidth="12" 
                          strokeDasharray="314.16" 
                          strokeDashoffset={314.16 - (314.16 * (stats?.ia_success_rate ?? 100)) / 100}
                          strokeLinecap="round" 
                          transform="rotate(-90 60 60)" 
                        />
                      </svg>
                      <div className="donut-center-text">
                        <span className="percent">{stats?.ia_success_rate ?? 100}%</span>
                        <span className="label">Éxito</span>
                      </div>
                    </div>
                    
                    <div className="donut-legend">
                      <div className="legend-row">
                        <span className="dot bg-success"></span>
                        <span className="name">Completado</span>
                        <span className="val">{stats?.candidates_by_status?.completado ?? 0}</span>
                      </div>
                      <div className="legend-row">
                        <span className="dot bg-warning"></span>
                        <span className="name">Procesando</span>
                        <span className="val">{stats?.candidates_by_status?.procesando ?? 0}</span>
                      </div>
                      <div className="legend-row">
                        <span className="dot bg-danger"></span>
                        <span className="name">Error IA</span>
                        <span className="val">{stats?.candidates_by_status?.error ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Embudo de Etapas Kanban */}
                <div className="card chart-card">
                  <div className="chart-header">
                    <h4>Embudo del Proceso de Selección</h4>
                    <p>Postulantes distribuidos por etapas de contratación</p>
                  </div>
                  <div className="funnel-chart-bars">
                    {Object.entries(stats?.applications_by_stage ?? {}).map(([stage, count]) => {
                      const maxCount = Math.max(...Object.values(stats?.applications_by_stage ?? {}), 1);
                      const barPercent = Math.max(10, (count / maxCount) * 100);
                      
                      const stageLabels = {
                        cv_recibido: "CV Recibido",
                        pre_entrevista: "Pre-entrevista",
                        sin_respuesta: "Sin Respuesta",
                        entrevista: "Entrevista",
                        evaluado: "Evaluado",
                        roleplay: "Roleplay",
                        capacitacion_1: "Capacitación 1",
                        capacitacion_2: "Capacitación 2",
                        contratado: "Contratado",
                        rechazado: "Rechazado"
                      };
                      
                      const stageClasses = {
                        cv_recibido: "bg-blue",
                        pre_entrevista: "bg-orange",
                        sin_respuesta: "bg-rose",
                        entrevista: "bg-purple",
                        evaluado: "bg-warning",
                        roleplay: "bg-indigo",
                        capacitacion_1: "bg-teal",
                        capacitacion_2: "bg-emerald",
                        contratado: "bg-success",
                        rechazado: "bg-danger"
                      };

                      return (
                        <div key={stage} className="funnel-row">
                          <span className="stage-name">{stageLabels[stage] || stage}</span>
                          <div className="funnel-bar-wrapper">
                            <div 
                              className={`funnel-bar-fill ${stageClasses[stage] || 'bg-blue'}`}
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '85px' }}>
                            <span className="stage-count" style={{ textAlign: 'right' }}>
                              <strong>{count}</strong> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({stats?.total_applications > 0 ? Math.round((count / stats.total_applications) * 100) : 0}%)</span>
                            </span>
                            {stats?.average_time_in_stages && stats.average_time_in_stages[stage] > 0 && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--accent-light)', fontWeight: '600', marginTop: '0.1rem' }} title="Tiempo promedio de permanencia en esta etapa">
                                Prom. {formatDuration(stats.average_time_in_stages[stage])}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Postulantes por Vacante */}
                <div className="card chart-card">
                  <div className="chart-header">
                    <h4>Postulantes por Vacante</h4>
                    <p>Distribución de candidaturas activas</p>
                  </div>
                  <div className="vacancies-bar-chart">
                    {stats?.applications_by_vacancy?.length === 0 ? (
                      <p className="muted-text text-center py-2">No hay postulaciones registradas en el sistema.</p>
                    ) : (
                      stats?.applications_by_vacancy?.map((item, idx) => {
                        const maxCount = Math.max(...stats.applications_by_vacancy.map(v => v.count), 1);
                        const widthPercent = Math.max(10, (item.count / maxCount) * 100);
                        
                        return (
                          <div key={idx} className="vacancy-bar-row">
                            <span className="vac-title-label" title={item.vacancy_title}>
                              {item.vacancy_title}
                            </span>
                            <div className="bar-wrapper">
                              <div 
                                className="bar-fill" 
                                style={{ width: `${widthPercent}%` }}
                              />
                            </div>
                            <span className="count-label">{item.count}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* 3. GRID INFERIOR (CANDIDATOS TOP & ESTADO SERVICIOS) */}
              <div className="dashboard-bottom-grid">
                
                {/* Tabla de Top Candidatos */}
                <div className="card col-2">
                  {(() => {
                    const rawTop = stats?.top_candidates || [];
                    const topLimit = parseInt(settingsData.top_candidates_limit || stats?.top_candidates_limit || 10);
                    const highThresh = parseInt(settingsData.score_range_high || stats?.score_range_high || 80);
                    const midThresh = parseInt(settingsData.score_range_mid || stats?.score_range_mid || 60);

                    const countHigh = rawTop.filter(c => c.score >= highThresh).length;
                    const countMid = rawTop.filter(c => c.score >= midThresh && c.score < highThresh).length;
                    const countLow = rawTop.filter(c => c.score < midThresh).length;

                    // Filtrado por rango
                    const filtered = rawTop.filter(c => {
                      if (topRangeFilter === 'high') return c.score >= highThresh;
                      if (topRangeFilter === 'mid') return c.score >= midThresh && c.score < highThresh;
                      if (topRangeFilter === 'low') return c.score < midThresh;
                      return true;
                    });

                    // Ordenamiento por calificación
                    const sorted = [...filtered].sort((a, b) => {
                      return topSortOrder === 'desc' ? b.score - a.score : a.score - b.score;
                    });

                    const displayed = topGroupBy === 'none' ? sorted.slice(0, topLimit) : sorted;

                    // Agrupado por vacante
                    const byVacancy = {};
                    sorted.forEach(c => {
                      const vTitle = c.vacancy_title || 'Sin Vacante Asignada';
                      if (!byVacancy[vTitle]) byVacancy[vTitle] = [];
                      byVacancy[vTitle].push(c);
                    });

                    return (
                      <>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div>
                            <h3 style={{ margin: 0 }}>Top Candidatos Mejor Calificados</h3>
                            <p className="card-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                              Ranking de perfiles con mejores scores ponderados por IA
                            </p>
                          </div>
                          
                          {/* Controles de Agrupación y Orden */}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${topGroupBy === 'vacancy' ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setTopGroupBy(prev => prev === 'vacancy' ? 'none' : 'vacancy')}
                              title="Agrupar candidatos por vacante"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                            >
                              <Layers className="icon-sm" />
                              {topGroupBy === 'vacancy' ? 'Agrupado por Vacante' : 'Agrupar por Vacante'}
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setTopSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                              title="Alternar orden por calificación"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                            >
                              <ArrowUpDown className="icon-sm" />
                              Score: {topSortOrder === 'desc' ? 'Mayor a Menor (↓)' : 'Menor a Mayor (↑)'}
                            </button>
                          </div>
                        </div>

                        {/* Filtro y Separación por los 3 Rangos de Calificación */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0.75rem 0', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.25rem' }}>
                            <Filter className="icon-sm" /> Rangos de CV:
                          </span>
                          <button
                            type="button"
                            onClick={() => setTopRangeFilter('all')}
                            style={{ 
                              border: 'none', 
                              cursor: 'pointer', 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '8px', 
                              fontSize: '0.72rem', 
                              background: topRangeFilter === 'all' ? 'var(--accent)' : 'rgba(0,0,0,0.05)', 
                              color: topRangeFilter === 'all' ? '#fff' : 'var(--text-primary)', 
                              fontWeight: '600',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            Todos ({rawTop.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopRangeFilter('high')}
                            style={{ 
                              border: 'none', 
                              cursor: 'pointer', 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '8px', 
                              fontSize: '0.72rem', 
                              background: topRangeFilter === 'high' ? '#16a34a' : 'rgba(22, 163, 74, 0.1)', 
                              color: topRangeFilter === 'high' ? '#fff' : '#16a34a', 
                              fontWeight: '700',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            🟢 Alto (≥{highThresh}%) ({countHigh})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopRangeFilter('mid')}
                            style={{ 
                              border: 'none', 
                              cursor: 'pointer', 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '8px', 
                              fontSize: '0.72rem', 
                              background: topRangeFilter === 'mid' ? '#ca8a04' : 'rgba(202, 138, 4, 0.1)', 
                              color: topRangeFilter === 'mid' ? '#fff' : '#ca8a04', 
                              fontWeight: '700',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            🟡 Medio ({midThresh}-{highThresh - 1}%) ({countMid})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopRangeFilter('low')}
                            style={{ 
                              border: 'none', 
                              cursor: 'pointer', 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '8px', 
                              fontSize: '0.72rem', 
                              background: topRangeFilter === 'low' ? '#dc2626' : 'rgba(220, 38, 38, 0.1)', 
                              color: topRangeFilter === 'low' ? '#fff' : '#dc2626', 
                              fontWeight: '700',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            🔴 Bajo (&lt;{midThresh}%) ({countLow})
                          </button>
                        </div>
                        
                        {rawTop.length === 0 ? (
                          <p className="muted-text py-2">Ningún candidato evaluado aún con puntuación de IA.</p>
                        ) : displayed.length === 0 ? (
                          <p className="muted-text py-2">No hay candidatos en el rango seleccionado ({topRangeFilter}).</p>
                        ) : topGroupBy === 'vacancy' ? (
                          /* Vista Agrupada por Vacante */
                          <div className="top-grouped-by-vacancy-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                            {Object.entries(byVacancy).map(([vTitle, vCands]) => (
                              <div key={vTitle} style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                                <div style={{ padding: '0.65rem 1rem', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Briefcase className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{vTitle}</strong>
                                  </div>
                                  <span className="badge badge-blue" style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}>
                                    {vCands.length} {vCands.length === 1 ? 'postulante' : 'postulantes'}
                                  </span>
                                </div>
                                <div className="table-wrapper">
                                  <table className="candidates-table mini-table" style={{ margin: 0 }}>
                                    <thead>
                                      <tr>
                                        <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                                        <th>Candidato</th>
                                        <th style={{ textAlign: 'center' }}>Score IA</th>
                                        <th style={{ textAlign: 'center' }}>Rango de CV</th>
                                        <th className="actions-header" style={{ textAlign: 'center', width: '85px' }}>Acción</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {vCands.map((c, idx) => {
                                        const rangeInfo = getScoreRangeInfo(c.score);
                                        return (
                                          <tr 
                                            key={idx} 
                                            className="candidate-row"
                                          >
                                            <td style={{ textAlign: 'center', color: idx < 3 ? 'var(--gold-bg)' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                              #{idx + 1}
                                            </td>
                                            <td className="name-col" style={{ padding: '0.65rem 0.75rem' }}>
                                              <div className="name-col-inner">
                                                <div className="avatar-profile-icon" style={{ width: '28px', height: '28px' }} title="Candidato">
                                                  <User className="icon-sm" />
                                                </div>
                                                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.candidate_name}</strong>
                                              </div>
                                            </td>
                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '0.65rem 0.75rem' }}>
                                              <span 
                                                className={`badge ${rangeInfo.badgeClass}`} 
                                                style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.15rem 0.5rem' }}
                                              >
                                                {c.score}%
                                              </span>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '0.65rem 0.75rem' }}>
                                              <span 
                                                style={{ 
                                                  fontSize: '0.72rem', 
                                                  fontWeight: '600', 
                                                  color: rangeInfo.color, 
                                                  background: rangeInfo.bg, 
                                                  padding: '0.15rem 0.45rem', 
                                                  borderRadius: '6px',
                                                  border: `1px solid ${rangeInfo.color}30`
                                                }}
                                              >
                                                {rangeInfo.label}
                                              </span>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem' }}>
                                              <button 
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => {
                                                  const fullCand = candidates.find(cand => cand.id === c.id);
                                                  if (fullCand) {
                                                    setSelectedCandidate(fullCand);
                                                    setActiveDetailTab('summary');
                                                    setDetailModalOpen(true);
                                                  }
                                                }}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                                title="Ver detalle del candidato"
                                              >
                                                <Eye className="icon-sm" />
                                                Detalle
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Vista General Plana */
                          <div className="table-wrapper">
                            <table className="candidates-table mini-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                                  <th>Candidato</th>
                                  <th>Vacante Postulada</th>
                                  <th style={{ textAlign: 'center' }}>Score IA</th>
                                  <th style={{ textAlign: 'center' }}>Rango de CV</th>
                                  <th className="actions-header" style={{ textAlign: 'center', width: '85px' }}>Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {displayed.map((c, idx) => {
                                  const rangeInfo = getScoreRangeInfo(c.score);
                                  return (
                                    <tr 
                                      key={idx} 
                                      className="candidate-row"
                                    >
                                      <td style={{ textAlign: 'center', color: idx < 3 ? 'var(--gold-bg)' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        #{idx + 1}
                                      </td>
                                      <td className="name-col" style={{ padding: '0.65rem 0.75rem' }}>
                                        <div className="name-col-inner">
                                          <div className="avatar-profile-icon" style={{ width: '28px', height: '28px' }} title="Candidato">
                                            <User className="icon-sm" />
                                          </div>
                                          <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.candidate_name}</strong>
                                        </div>
                                      </td>
                                      <td style={{ padding: '0.65rem 0.75rem' }}>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                          <Briefcase className="icon-xs" style={{ color: 'var(--accent-light)', width: '13px', height: '13px' }} />
                                          {c.vacancy_title}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '0.65rem 0.75rem' }}>
                                        <span 
                                          className={`badge ${rangeInfo.badgeClass}`} 
                                          style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0.15rem 0.5rem' }}
                                        >
                                          {c.score}%
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'center', padding: '0.65rem 0.75rem' }}>
                                        <span 
                                          style={{ 
                                            fontSize: '0.72rem', 
                                            fontWeight: '600', 
                                            color: rangeInfo.color, 
                                            background: rangeInfo.bg, 
                                            padding: '0.15rem 0.45rem', 
                                            borderRadius: '6px',
                                            border: `1px solid ${rangeInfo.color}30`
                                          }}
                                        >
                                          {rangeInfo.label}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem' }}>
                                        <button 
                                          className="btn btn-secondary btn-sm"
                                          onClick={() => {
                                            const fullCand = candidates.find(cand => cand.id === c.id);
                                            if (fullCand) {
                                              setSelectedCandidate(fullCand);
                                              setActiveDetailTab('summary');
                                              setDetailModalOpen(true);
                                            }
                                          }}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                          title="Ver detalle del candidato"
                                        >
                                          <Eye className="icon-sm" />
                                          Detalle
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* 4. TASA DE CONVERSIÓN Y CALIDAD POR PLATAFORMA DE RECLUTAMIENTO */}
                <div className="card">
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                        <h3 style={{ margin: 0 }}>Conversión por Plataforma</h3>
                      </div>
                      <p className="card-subtitle" style={{ margin: '0.25rem 0 0 0' }}>
                        Efectividad de contratación y avance por canal de reclutamiento
                      </p>
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                      {stats?.conversion_by_source?.length || 0} canales
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', maxHeight: '430px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                    {(!stats?.conversion_by_source || stats.conversion_by_source.length === 0) ? (
                      <p className="muted-text py-2" style={{ textAlign: 'center', fontSize: '0.84rem' }}>
                        No hay postulaciones suficientes para calcular conversión.
                      </p>
                    ) : (
                      stats.conversion_by_source.map((src, sIdx) => {
                        const isHigh = src.conversion_rate >= 15;
                        const isMid = src.conversion_rate >= 5 && src.conversion_rate < 15;
                        const barColor = isHigh ? '#10b981' : isMid ? '#f59e0b' : 'var(--accent-light)';

                        return (
                          <div 
                            key={sIdx} 
                            style={{ 
                              background: 'var(--bg-app)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '10px', 
                              padding: '0.75rem 0.85rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.45rem',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <Globe className="icon-xs" style={{ color: 'var(--accent-light)', width: '14px', height: '14px' }} />
                                <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{src.source}</strong>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  <strong>{src.hired}</strong> contratados / <strong>{src.total}</strong> total
                                </span>
                                <span 
                                  className="badge"
                                  style={{ 
                                    fontSize: '0.72rem', 
                                    fontWeight: '700',
                                    background: isHigh ? 'rgba(16, 185, 129, 0.15)' : isMid ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                    color: isHigh ? '#059669' : isMid ? '#d97706' : '#2563eb',
                                    padding: '0.12rem 0.45rem'
                                  }}
                                >
                                  {src.conversion_rate}% Conv.
                                </span>
                              </div>
                            </div>

                            {/* Barra de Conversión y Embudo */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    width: `${Math.min(src.conversion_rate * 2.5 + 4, 100)}%`, 
                                    background: barColor, 
                                    borderRadius: '4px',
                                    transition: 'width 0.4s ease'
                                  }} 
                                />
                              </div>
                            </div>

                            {/* Submétricas de calidad y avance */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <span>🚀 Avance: <strong style={{ color: 'var(--text-secondary)' }}>{src.advancement_rate}%</strong> ({src.in_process} en proceso)</span>
                              {src.avg_score !== null && (
                                <span>⭐ Score prom: <strong style={{ color: 'var(--text-secondary)' }}>{src.avg_score}%</strong></span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* 5. DIAGNÓSTICO TÉCNICO DE INFRAESTRUCTURA (EXCLUSIVO PARA SUPERADMIN) */}
              {currentUser?.roles?.some(r => r.id === 'SuperAdmin') && (
                <div className="card" style={{ marginTop: '1.25rem', border: '1px dashed var(--accent-light)', background: 'rgba(59, 130, 246, 0.02)' }}>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldAlert className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.92rem' }}>Diagnóstico de Infraestructura y Conectividad</h3>
                        <p className="card-subtitle" style={{ margin: 0, fontSize: '0.75rem' }}>Panel técnico visible únicamente para el perfil Super Administrador</p>
                      </div>
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>TI & DevOps</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="compact-status-item" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                      <div className="status-title-box">
                        <Activity className="icon-blue icon-sm" />
                        <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>API Backend (:8000)</span>
                      </div>
                      {getStatusBadge(statusBackend)}
                    </div>
                    
                    <div className="compact-status-item" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                      <div className="status-title-box">
                        <Database className="icon-green icon-sm" />
                        <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>Base de Datos SQLite</span>
                      </div>
                      {getStatusBadge(statusDb)}
                    </div>

                    <div className="compact-status-item" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                      <div className="status-title-box">
                        <Cpu className="icon-purple icon-sm" />
                        <span style={{ fontSize: '0.82rem', fontWeight: '500' }}>Ollama Local (Gemma)</span>
                      </div>
                      {getStatusBadge(statusOllama)}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="candidates-view-container">
              
              {/* ZONA DE CARGA DROPZONE */}
              <div 
                className="dropzone-interactive"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
                }}
              >
                <div className="dropzone-content">
                  <UploadCloud className="upload-icon" />
                  <h3>Arrastra tus archivos CV en PDF aquí</h3>
                  <p>o haz clic para explorar tus documentos locales</p>
                  <span className="limits">Soporta múltiples archivos PDF de hasta 10MB</span>
                </div>
              </div>

              {/* COLA DE PROCESAMIENTO ACTIVO */}
              {uploadingFiles.length > 0 && (
                <div className="uploads-queue-card">
                  <h4>Cola de procesamiento de archivos ({uploadingFiles.length})</h4>
                  <div className="queue-items">
                    {uploadingFiles.map((upFile, idx) => (
                      <div key={idx} className="queue-item">
                        <div className="item-info">
                          <span className="name">{upFile.name}</span>
                          <span className={`status-label ${upFile.status}`}>{upFile.status}</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div 
                            className={`progress-bar-fill ${upFile.status}`}
                            style={{ width: `${upFile.progress}%` }}
                          />
                        </div>
                        {upFile.error && <span className="error-message">{upFile.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LISTADO Y TABLA */}
              <div className="card list-card">
                <div className="toolbar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Búsqueda por Nombre o Habilidad */}
                  <div className="search-wrapper" style={{ minWidth: '280px' }}>
                    <Search className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre o habilidad clave..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Filtro por Vacante */}
                  <div className="filter-wrapper">
                    <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Vacante:</label>
                    <select 
                      value={candidateVacancyFilter}
                      onChange={(e) => setCandidateVacancyFilter(e.target.value)}
                    >
                      <option value="Todas">Todas las vacantes</option>
                      <option value="sin_postular">🟡 Sin postular (Banco General)</option>
                      {vacancies.map(v => (
                        <option key={v.id} value={String(v.id)}>{v.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Etapa del Proceso */}
                  <div className="filter-wrapper">
                    <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Etapa:</label>
                    <select 
                      value={candidateStageFilter}
                      onChange={(e) => setCandidateStageFilter(e.target.value)}
                    >
                      <option value="Todas">Todas las etapas</option>
                      <option value="cv_recibido">CV Recibido</option>
                      <option value="pre_entrevista">Pre-entrevista</option>
                      <option value="sin_respuesta">Sin Respuesta Pre-entrevista</option>
                      <option value="entrevista">Entrevista</option>
                      <option value="evaluado">Evaluado</option>
                      <option value="roleplay">Roleplay</option>
                      <option value="capacitacion_1">Capacitación 1</option>
                      <option value="capacitacion_2">Capacitación 2</option>
                      <option value="contratado">Contratado</option>
                      <option value="rechazado">Rechazado</option>
                    </select>
                  </div>

                  {/* Filtro por Rango de Calificación IA */}
                  <div className="filter-wrapper">
                    <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Calificación:</label>
                    <select 
                      value={candidateScoreRangeFilter}
                      onChange={(e) => setCandidateScoreRangeFilter(e.target.value)}
                    >
                      <option value="Todos">Todos los rangos</option>
                      <option value="high">🟢 Alto (≥ {settingsData.score_range_high || stats?.score_range_high || 80}%)</option>
                      <option value="mid">🟡 Medio ({settingsData.score_range_mid || stats?.score_range_mid || 60}% - {(settingsData.score_range_high || stats?.score_range_high || 80) - 1}%)</option>
                      <option value="low">🔴 Bajo (&lt; {settingsData.score_range_mid || stats?.score_range_mid || 60}%)</option>
                      <option value="unscored">⚪ Sin Calificar</option>
                    </select>
                  </div>

                  {/* Filtro por Plataforma / Fuente de Reclutamiento */}
                  <div className="filter-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Plataforma:</label>
                    <select 
                      value={candidateSourceFilter}
                      onChange={(e) => setCandidateSourceFilter(e.target.value)}
                    >
                      <option value="Todas">Todas las plataformas ({candidates.length})</option>
                      {candidateSources.map((src, idx) => {
                        const count = candidates.filter(c => c.source === src).length;
                        return (
                          <option key={idx} value={src}>{src} ({count})</option>
                        );
                      })}
                      <option value="no_especificada">⚪ Sin especificar ({candidates.filter(c => !c.source || c.source === 'No especificada').length})</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setActiveTab('settings');
                        fetchDetailedSources();
                      }}
                      title="Administrar catálogo de plataformas (renombrar, eliminar, agregar)"
                      style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                    >
                      <SettingsIcon style={{ width: '12px', height: '12px' }} /> Catálogo
                    </button>
                  </div>

                  {/* Acceso Rápido a Telegram para Pruebas */}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    <a 
                      href={`https://t.me/${settingsData.telegram_bot_username || 'OctyBot_HR_Bot'}${candidates[0]?.applications?.[0]?.id ? `?start=app_${candidates[0].applications[0].id}` : ''}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        padding: '0.45rem 0.85rem',
                        background: '#0284c7',
                        borderColor: '#0284c7',
                        color: '#fff',
                        textDecoration: 'none',
                        fontWeight: '600'
                      }}
                      title="Probar flujo en Telegram: Pre-entrevista y validación de fotografía de INE/identificación"
                    >
                      <Send className="icon-sm" /> 📱 Probar en Telegram
                    </a>
                  </div>
                </div>

                {loadingCandidates ? (
                  <div className="loader-box">
                    <RefreshCw className="icon-spin icon-lg" />
                    <p>Cargando lista de candidatos...</p>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="empty-box">
                    <Users className="empty-icon" />
                    <h4>No se encontraron candidatos</h4>
                    <p>Prueba ajustando los filtros de búsqueda, vacante o etapa del proceso.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="candidates-table">
                      <thead>
                        <tr>
                          <th style={{ width: '36px', textAlign: 'center' }} title="Indicador de datos pendientes">!</th>
                          <th>Candidato</th>
                          <th>Vacante Postulada</th>
                          <th>Plataforma / Origen</th>
                          <th style={{ textAlign: 'center' }}>Score IA</th>
                          <th>Habilidades Clave</th>
                          <th>Etapa del Proceso</th>
                          <th>Fecha Registro</th>
                          <th className="actions-header" style={{ textAlign: 'center', width: '95px' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCandidates.map((cand) => {
                          const missing = checkCandidateAlerts(cand);
                          const hasAlert = missing.length > 0;
                          const primaryApp = cand.applications && cand.applications.length > 0 ? cand.applications[0] : null;
                          const highThresh = parseInt(settingsData.score_range_high || stats?.score_range_high || 80);
                          const midThresh = parseInt(settingsData.score_range_mid || stats?.score_range_mid || 60);

                          // Verificar si su edad calculada está fuera del rango deseado de su vacante
                          const appWithAgeAlert = cand.applications?.find(app => {
                            const age = cand.calculated_age;
                            if (!age) return false;
                            const vac = vacancies.find(v => v.id === app.vacancy_id) || app.vacancy;
                            if (!vac) return false;
                            if (vac.min_age && age < vac.min_age) return true;
                            if (vac.max_age && age > vac.max_age) return true;
                            return false;
                          });

                          const isUnassigned = !cand.applications || cand.applications.length === 0;

                          return (
                            <tr 
                              key={cand.id} 
                              className={`candidate-row ${hasAlert ? 'row-alert-pending' : ''} ${isUnassigned ? 'row-unassigned' : ''}`}
                            >
                              {/* 1. Alerta / Punto Indicador */}
                              <td style={{ width: '36px', textAlign: 'center', padding: '0.65rem 0.4rem' }}>
                                {hasAlert ? (
                                  <span 
                                    className="alert-dot-indicator" 
                                    title={`Atención: Falta registrar ${missing.join(', ')}`}
                                  />
                                ) : (
                                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border-color)', opacity: 0.25 }} />
                                )}
                              </td>

                              {/* 2. Candidato (Avatar Compacto + Nombre + ID status + Alerta Edad) */}
                              <td className="name-col" style={{ padding: '0.65rem 0.75rem' }}>
                                <div className="name-col-inner">
                                  <div className="avatar-profile-icon" title="Candidato">
                                    <User className="icon-sm" />
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{cand.name}</strong>
                                      {cand.id_validation_status === 'validado' && (
                                        <span style={{ fontSize: '0.65rem', background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', padding: '0.05rem 0.35rem', borderRadius: '4px', fontWeight: '700' }} title="Identidad oficial corroborada con documento">
                                          ✓ ID Corroborada
                                        </span>
                                      )}
                                      {cand.id_validation_status === 'validado_prueba' && (
                                        <span style={{ fontSize: '0.65rem', background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', padding: '0.05rem 0.35rem', borderRadius: '4px', fontWeight: '700' }} title="Identificación procesada en modo prueba">
                                          🧪 ID Prueba
                                        </span>
                                      )}
                                      {appWithAgeAlert && (
                                        <span 
                                          style={{ 
                                            fontSize: '0.65rem', 
                                            background: 'rgba(239, 68, 68, 0.12)', 
                                            color: '#ef4444', 
                                            padding: '0.05rem 0.35rem', 
                                            borderRadius: '4px', 
                                            fontWeight: '600',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.2rem'
                                          }} 
                                          title={`Alerta: Postulante fuera del rango de edad deseado para la vacante (${appWithAgeAlert.vacancy?.title || 'Vacante'}).`}
                                        >
                                          <AlertTriangle style={{ width: '10px', height: '10px' }} />
                                          Rango Edad
                                        </span>
                                      )}
                                    </div>
                                    {hasAlert && (
                                      <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: '500' }}>
                                        Falta: {missing.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 3. Vacante Postulada */}
                              <td style={{ padding: '0.65rem 0.75rem' }}>
                                {cand.applications && cand.applications.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    {cand.applications.map(app => (
                                      <span key={app.id} style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <Briefcase className="icon-xs" style={{ color: 'var(--accent-light)', width: '13px', height: '13px' }} />
                                        {app.vacancy.title}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="badge-unassigned" title="Candidato registrado sin postulación activa">
                                    🟡 Sin postular (Banco)
                                  </span>
                                )}
                              </td>

                              {/* 3.5 Plataforma / Origen */}
                              <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span 
                                    className={`source-pill ${getSourceBadgeClass(cand.source)}`}
                                    style={{ 
                                      fontSize: '0.74rem', 
                                      padding: '0.2rem 0.55rem', 
                                      borderRadius: '6px', 
                                      fontWeight: '600',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}
                                  >
                                    <Globe style={{ width: '11px', height: '11px' }} />
                                    {cand.source && cand.source !== 'No especificada' ? cand.source : 'Sin especificar'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenChangeSourceModal(cand)}
                                    title={`Cambiar plataforma de origen para ${cand.name}`}
                                    style={{ 
                                      background: 'rgba(255, 255, 255, 0.05)', 
                                      border: '1px solid var(--border-color)', 
                                      borderRadius: '4px',
                                      cursor: 'pointer', 
                                      padding: '0.2rem 0.35rem', 
                                      color: 'var(--text-secondary)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Edit style={{ width: '11px', height: '11px' }} />
                                  </button>
                                </div>
                              </td>

                              {/* 4. Score IA (Calificación) */}
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '0.65rem 0.75rem' }}>
                                {cand.status === 'procesando' ? (
                                  <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                    <RefreshCw className="icon-spin icon-xs" style={{ width: '10px', height: '10px', marginRight: '3px' }} /> Extrayendo...
                                  </span>
                                ) : primaryApp ? (
                                  primaryApp.score != null ? (
                                    <span 
                                      className={`badge ${primaryApp.score >= highThresh ? 'badge-success' : primaryApp.score >= midThresh ? 'badge-warning' : 'badge-danger'}`}
                                      style={{ fontSize: '0.78rem', fontWeight: '700', padding: '0.15rem 0.45rem' }}
                                    >
                                      {primaryApp.score}%
                                    </span>
                                  ) : (
                                    <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }} title="Evaluando con IA...">
                                      <RefreshCw className="icon-spin icon-xs" style={{ width: '10px', height: '10px', marginRight: '3px' }} /> Calculando...
                                    </span>
                                  )
                                ) : (
                                  <span className="muted-text" style={{ fontSize: '0.78rem' }}>-</span>
                                )}
                              </td>

                              {/* 5. Habilidades Clave (Top 3) */}
                              <td className="skills-col" style={{ padding: '0.65rem 0.75rem' }}>
                                <div className="skills-badge-list">
                                  {cand.skills && cand.skills.length > 0 ? (
                                    <>
                                      {cand.skills.slice(0, 3).map((s, idx) => (
                                        <span key={idx} className="skill-pill" title={s} style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem' }}>{s}</span>
                                      ))}
                                      {cand.skills.length > 3 && (
                                        <span className="skill-pill-more" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>+{cand.skills.length - 3}</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="muted-text">-</span>
                                  )}
                                </div>
                              </td>

                              {/* 6. Etapa Actual del Proceso */}
                              <td style={{ padding: '0.65rem 0.75rem' }}>
                                {cand.status === 'procesando' ? (
                                  <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>
                                    <RefreshCw className="icon-spin icon-sm" /> Extrayendo CV...
                                  </span>
                                ) : cand.status === 'error' ? (
                                  <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>
                                    <XCircle className="icon-sm" /> Error IA
                                  </span>
                                ) : primaryApp ? (
                                  getStageBadge(primaryApp.stage)
                                ) : (
                                  <span className="muted-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>

                              {/* 7. Fecha de Registro en Sistema */}
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', padding: '0.65rem 0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Calendar className="icon-xs" style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
                                  {formatCandidateDate(cand.created_at)}
                                </div>
                              </td>

                              {/* 8. Acciones */}
                              <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {primaryApp ? (
                                    <button 
                                      className="btn btn-sm"
                                      onClick={() => handleOpenWhatsAppModal(cand, primaryApp)}
                                      title="Enviar invitación a pre-entrevista por WhatsApp"
                                      style={{ 
                                        padding: '0.25rem 0.45rem', 
                                        fontSize: '0.75rem', 
                                        background: 'rgba(34, 197, 94, 0.15)', 
                                        borderColor: 'rgba(34, 197, 94, 0.4)', 
                                        color: '#22c55e',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <MessageCircle style={{ width: '13px', height: '13px' }} />
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-sm"
                                      onClick={() => handleOpenDirectApplyModal(cand)}
                                      title="Postular a una vacante disponible"
                                      style={{
                                        padding: '0.25rem 0.45rem',
                                        fontSize: '0.75rem',
                                        background: 'rgba(245, 158, 11, 0.15)',
                                        borderColor: 'rgba(245, 158, 11, 0.4)',
                                        color: '#f59e0b',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <UserPlus style={{ width: '13px', height: '13px' }} />
                                    </button>
                                  )}
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                      setSelectedCandidate(cand);
                                      setActiveDetailTab('summary');
                                      setDetailModalOpen(true);
                                    }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                  >
                                    <Eye className="icon-sm" />
                                    Detalle
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'vacancies' && (
            <div className="vacancies-view-container">
              {/* Panel de Parámetros Generales de Evaluación y Ranking */}
              <div className="card vacancy-general-params-card" style={{ marginBottom: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      <SettingsIcon className="icon-sm" style={{ color: 'var(--accent-light)' }} /> Parámetros Generales de Evaluación y Ranking
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                      Configura el número de candidatos a destacar en el Top del Dashboard y los 3 rangos de calificación por CV.
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={async (e) => {
                      await handleSaveSettings(e);
                      fetchStats(true);
                    }}
                    disabled={savingSettings}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {savingSettings ? <RefreshCw className="icon-spin icon-sm" /> : <CheckCircle className="icon-sm" />}
                    Guardar Parámetros
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', padding: '1rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Elementos en Tabla de Top:
                    </label>
                    <select
                      value={settingsData.top_candidates_limit || '10'}
                      onChange={(e) => setSettingsData(prev => ({ ...prev, top_candidates_limit: e.target.value }))}
                      style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: '600' }}
                    >
                      <option value="5">Mostrar Top 5 Candidatos</option>
                      <option value="10">Mostrar Top 10 Candidatos</option>
                      <option value="15">Mostrar Top 15 Candidatos</option>
                      <option value="20">Mostrar Top 20 Candidatos</option>
                      <option value="30">Mostrar Top 30 Candidatos</option>
                    </select>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Máximo de perfiles visibles en el ranking general.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#16a34a', marginBottom: '0.35rem' }}>
                      🟢 Rango Alto (Sobresaliente):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mínimo:</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="100"
                        value={settingsData.score_range_high || '80'}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, score_range_high: e.target.value }))}
                        style={{ width: '70px', padding: '0.4rem 0.5rem', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: '700' }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>%</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Candidatos con {settingsData.score_range_high || '80'}% a 100% de compatibilidad.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#ca8a04', marginBottom: '0.35rem' }}>
                      🟡 Rango Medio (Aceptable):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mínimo:</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="99"
                        value={settingsData.score_range_mid || '60'}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, score_range_mid: e.target.value }))}
                        style={{ width: '70px', padding: '0.4rem 0.5rem', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: '700' }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>%</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Candidatos con {settingsData.score_range_mid || '60'}% a {(parseInt(settingsData.score_range_high || '80') - 1)}% de compatibilidad.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#dc2626', marginBottom: '0.35rem' }}>
                      🔴 Rango Bajo (Insuficiente):
                    </label>
                    <div style={{ padding: '0.4rem 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                      Menor a {settingsData.score_range_mid || '60'}%
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Candidatos con puntuación de 0% a {(parseInt(settingsData.score_range_mid || '60') - 1)}%.
                    </span>
                  </div>
                </div>
              </div>

              {loadingVacancies ? (
                <div className="loader-box">
                  <RefreshCw className="icon-spin icon-lg" />
                  <p>Cargando lista de vacantes...</p>
                </div>
              ) : vacancies.length === 0 ? (
                <div className="empty-box">
                  <Briefcase className="empty-icon" />
                  <h4>No hay vacantes activas</h4>
                  <p>Crea una nueva vacante para postular y evaluar candidatos con IA.</p>
                  <button className="btn btn-primary" onClick={handleOpenCreateVacancy}>
                    <Plus className="icon-sm" /> Crear Primera Vacante
                  </button>
                </div>
              ) : (
                <>
                  {/* Barra de Filtro de Vacantes por Área Organizacional */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Filter className="icon-xs" style={{ color: 'var(--text-muted)' }} />
                  <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Filtrar por Área:</label>
                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: '600' }}
                  >
                    <option value="all">🏢 Todas las Áreas ({vacancies.length})</option>
                    {departments.map(d => {
                      const count = vacancies.filter(v => v.department_id === d.id).length;
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.code ? `(${d.code})` : ''} — {count} vacante(s)
                        </option>
                      );
                    })}
                    <option value="none">Sin Área Asignada ({vacancies.filter(v => !v.department_id).length})</option>
                  </select>
                </div>
                {hasPermission('vacancies:manage') && (
                  <button className="btn btn-primary btn-sm" onClick={handleOpenCreateVacancy} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Plus className="icon-xs" /> Nueva Vacante
                  </button>
                )}
              </div>

              {(() => {
                const displayedVacancies = vacancies.filter(v => {
                  if (selectedDeptFilter === 'all') return true;
                  if (selectedDeptFilter === 'none') return !v.department_id;
                  return String(v.department_id) === String(selectedDeptFilter);
                });

                return displayedVacancies.length === 0 ? (
                  <div className="empty-box" style={{ padding: '2rem' }}>
                    <Briefcase className="empty-icon" />
                    <h4>No hay vacantes en esta área</h4>
                    <p>No se encontraron vacantes para el filtro seleccionado. Prueba con "Todas las Áreas".</p>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDeptFilter('all')}>
                      Ver Todas las Vacantes
                    </button>
                  </div>
                ) : (
                  <div className="vacancies-grid">
                    {displayedVacancies.map((vac) => {
                      // Postulantes a esta vacante para calcular alertas de rango de edad
                      const vacCands = candidates.filter(c => 
                        c.applications && c.applications.some(a => a.vacancy_id === vac.id)
                      );
                      const outOfRangeCands = vacCands.filter(c => {
                        const age = c.calculated_age;
                        if (!age) return false;
                        if (vac.min_age && age < vac.min_age) return true;
                        if (vac.max_age && age > vac.max_age) return true;
                        return false;
                      });

                      return (
                        <div key={vac.id} className="card vacancy-card">
                          <div className="vacancy-card-header">
                            <div className="title-section" style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <Briefcase className="vacancy-icon" />
                                <h3 style={{ margin: 0 }}>{vac.title}</h3>
                                {vac.department && (
                                  <span className="badge badge-blue" style={{ fontSize: '0.72rem', fontWeight: '700' }}>
                                    🏢 {vac.department.name} {vac.department.code ? `(${vac.department.code})` : ''}
                                  </span>
                                )}
                              </div>
                              {vac.manager && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  <UserCheck className="icon-xs" style={{ color: 'var(--accent-light)', width: '12px', height: '12px' }} />
                                  <span>Gerente: <strong style={{ color: 'var(--text-primary)' }}>{vac.manager.full_name}</strong></span>
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className={`status-badge-inline ${vac.status}`}>
                                {vac.status === 'abierta' ? 'Abierta' : 'Cerrada'}
                              </span>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditVacancy(vac)}
                                title="Editar vacante, criterios y rango de edad"
                                style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                              >
                                <Edit className="icon-sm" /> Editar
                              </button>
                            </div>
                          </div>
                          
                          <div className="vacancy-card-body">
                            <p className="desc">{vac.description}</p>
                            {vac.requirements && (
                              <div className="req-block">
                                <strong>Requisitos:</strong>
                                <p>{vac.requirements}</p>
                              </div>
                            )}

                            {/* Rango de Edad Deseado & Alertas */}
                            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <User className="icon-xs" style={{ color: 'var(--accent-light)' }} />
                                  <strong>Rango de Edad Deseado:</strong>
                                </span>
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {vac.min_age || vac.max_age ? `${vac.min_age || 18} - ${vac.max_age || '65+'} años` : 'Sin restricción'}
                                </strong>
                              </div>
                              {outOfRangeCands.length > 0 && (
                                <div style={{ 
                                  marginTop: '0.45rem', 
                                  padding: '0.35rem 0.55rem', 
                                  borderRadius: '5px', 
                                  background: 'rgba(239, 68, 68, 0.12)', 
                                  border: '1px solid rgba(239, 68, 68, 0.25)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.4rem', 
                                  fontSize: '0.75rem', 
                                  color: '#ef4444' 
                                }}>
                                  <AlertTriangle className="icon-xs" style={{ flexShrink: 0 }} />
                                  <span><strong>Alerta:</strong> {outOfRangeCands.length} postulante(s) con edad fuera del rango deseado.</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="criteria-section">
                              <strong>Criterios de Evaluación:</strong>
                              <div className="criteria-list-visual">
                                {vac.evaluation_criteria?.map((crit, idx) => (
                                  <div key={idx} className="criteria-item-visual">
                                    <span className="name">{crit.criterio}</span>
                                    <span className="weight-badge">{Math.round(crit.peso * 100)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                        <div className="vacancy-card-footer">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditVacancy(vac)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Edit className="icon-sm" /> Editar
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setActiveVacancyForApply(vac);
                              setSelectedCandidateForApply('');
                              setPostulateMode('select');
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Plus className="icon-sm" /> Postular Candidato
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setKanbanVacancyId(vac.id);
                              fetchKanbanData(vac.id);
                              setActiveTab('kanban');
                            }}
                          >
                            Ver Kanban
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                );
              })()}
                </>
              )}
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="kanban-view-container">
              {/* Header con Filtro de Vacante y Herramientas de Búsqueda Rápida */}
              <div className="kanban-toolbar">
                <div className="kanban-top-bar">
                  <div className="toolbar-left">
                    <KanbanSquare className="toolbar-icon" />
                    <div>
                      <h3 style={{ margin: 0 }}>Tablero Kanban</h3>
                      {kanbanVacancyId && (() => {
                        const currentVac = vacancies.find(v => String(v.id) === String(kanbanVacancyId));
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {currentVac?.title || 'Vacante en seguimiento'}
                            </span>
                            {currentVac?.department && (
                              <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                                🏢 {currentVac.department.code || currentVac.department.name}
                              </span>
                            )}
                            {currentVac?.manager && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                • Gerente: {currentVac.manager.full_name}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div className="toolbar-select-vacancy">
                      <label>Área:</label>
                      <select 
                        value={selectedDeptFilter}
                        onChange={(e) => setSelectedDeptFilter(e.target.value)}
                        style={{ fontSize: '0.82rem', padding: '0.35rem 0.6rem' }}
                      >
                        <option value="all">Todas las Áreas</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ''}</option>
                        ))}
                        <option value="none">Sin Área Asignada</option>
                      </select>
                    </div>
                    <div className="toolbar-select-vacancy">
                      <label>Vacante:</label>
                      <select 
                        value={kanbanVacancyId}
                        onChange={(e) => {
                          const vId = e.target.value;
                          setKanbanVacancyId(vId);
                          fetchKanbanData(vId);
                        }}
                      >
                        <option value="">-- Elige una Vacante --</option>
                        {vacancies
                          .filter(vac => {
                            if (selectedDeptFilter === 'all') return true;
                            if (selectedDeptFilter === 'none') return !vac.department_id;
                            return String(vac.department_id) === String(selectedDeptFilter);
                          })
                          .map(vac => (
                            <option key={vac.id} value={vac.id}>
                              {vac.title} {vac.department ? `[${vac.department.code || vac.department.name}]` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Filtros Rápidos de Candidatos dentro del Tablero */}
                {kanbanVacancyId && (
                  <div className="kanban-filters-row">
                    {/* Búsqueda rápida por candidato / correo / archivo */}
                    <div className="kanban-search-wrapper">
                      <Search className="search-icon" />
                      <input 
                        type="text" 
                        placeholder="Buscar candidato en fases..."
                        value={kanbanSearchQuery}
                        onChange={(e) => setKanbanSearchQuery(e.target.value)}
                        className="kanban-search-input"
                      />
                      {kanbanSearchQuery && (
                        <button 
                          type="button" 
                          className="kanban-clear-search-btn"
                          onClick={() => setKanbanSearchQuery('')}
                          title="Limpiar búsqueda"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    {/* Filtro por Calificación IA */}
                    <div className="kanban-filter-item">
                      <label>Calificación:</label>
                      <select 
                        value={kanbanScoreFilter}
                        onChange={(e) => setKanbanScoreFilter(e.target.value)}
                        className="kanban-filter-select"
                      >
                        <option value="todos">Todos los scores</option>
                        <option value="high">🟢 Alto (≥ {settingsData.score_range_high || stats?.score_range_high || 80}%)</option>
                        <option value="mid">🟡 Medio ({settingsData.score_range_mid || stats?.score_range_mid || 60}% - {(settingsData.score_range_high || stats?.score_range_high || 80) - 1}%)</option>
                        <option value="low">🔴 Bajo (&lt; {settingsData.score_range_mid || stats?.score_range_mid || 60}%)</option>
                        <option value="unscored">⚪ Sin Calificar</option>
                      </select>
                    </div>

                    {/* Filtro por Plataforma / Canal de Origen */}
                    <div className="kanban-filter-item">
                      <label>Plataforma:</label>
                      <select 
                        value={kanbanSourceFilter}
                        onChange={(e) => setKanbanSourceFilter(e.target.value)}
                        className="kanban-filter-select"
                      >
                        <option value="todas">Todas las plataformas</option>
                        {candidateSources.map((src, idx) => (
                          <option key={idx} value={src}>{src}</option>
                        ))}
                        <option value="no_especificada">⚪ Sin especificar</option>
                      </select>
                    </div>

                    {/* Conteo de Resultados */}
                    <div className="kanban-results-count">
                      Mostrando <strong>{filteredKanbanApplications.length}</strong> de {kanbanApplications.length} postulantes
                    </div>

                    {(kanbanSearchQuery || kanbanScoreFilter !== 'todos' || kanbanSourceFilter !== 'todas') && (
                      <button 
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setKanbanSearchQuery('');
                          setKanbanScoreFilter('todos');
                          setKanbanSourceFilter('todas');
                        }}
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!kanbanVacancyId ? (
                <div className="empty-box">
                  <Briefcase className="empty-icon" />
                  <h4>Ninguna vacante seleccionada</h4>
                  <p>Selecciona una vacante en el menú superior para ver su embudo de postulación.</p>
                </div>
              ) : loadingKanban ? (
                <div className="loader-box">
                  <RefreshCw className="icon-spin icon-lg" />
                  <p>Cargando postulantes de la vacante...</p>
                </div>
              ) : (
                <div className="kanban-board">
                  
                  {/* Etapa 1: CV Recibido */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "cv_recibido");
                    }}
                  >
                    <div className="column-header border-blue">
                      <span className="dot bg-blue"></span>
                      <h4>CV Recibido</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'cv_recibido').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'cv_recibido')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions" style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ flex: '1', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Detalle
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ flex: '1', padding: '0.2rem 0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                                title="Copiar enlace de pre-entrevista para Telegram"
                                onClick={() => handleCopyDeepLink(app.id)}
                              >
                                <ExternalLink className="icon-sm" /> Link
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 1.5: Pre-entrevista */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "pre_entrevista");
                    }}
                  >
                    <div className="column-header border-orange">
                      <span className="dot bg-orange"></span>
                      <h4>Pre-entrevista</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'pre_entrevista').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'pre_entrevista')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions" style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ flex: '1', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Detalle
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ flex: '1', padding: '0.2rem 0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                                title="Copiar enlace de pre-entrevista para Telegram"
                                onClick={() => handleCopyDeepLink(app.id)}
                              >
                                <ExternalLink className="icon-sm" /> Link
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 1.8: Sin Respuesta Pre-entrevista (Fase extra solicitada) */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "sin_respuesta");
                    }}
                  >
                    <div className="column-header border-rose">
                      <span className="dot bg-rose"></span>
                      <h4>Sin Respuesta Pre-entrevista</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'sin_respuesta').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'sin_respuesta')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions" style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ flex: '1', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Detalle
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ flex: '1', padding: '0.2rem 0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', color: '#e11d48' }}
                                title="Copiar enlace para reenviar recordatorio por WhatsApp o correo"
                                onClick={() => handleCopyDeepLink(app.id)}
                              >
                                <ExternalLink className="icon-sm" /> Reenviar
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 2: Entrevista */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "entrevista");
                    }}
                  >
                    <div className="column-header border-purple">
                      <span className="dot bg-purple"></span>
                      <h4>Entrevista</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'entrevista').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'entrevista')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions">
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 3: Evaluado */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "evaluado");
                    }}
                  >
                    <div className="column-header border-warning">
                      <span className="dot bg-warning"></span>
                      <h4>Evaluado / Aprobado</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'evaluado').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'evaluado')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions">
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 3.5: Roleplay */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "roleplay");
                    }}
                  >
                    <div className="column-header border-indigo">
                      <span className="dot bg-indigo"></span>
                      <h4>Roleplay</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'roleplay').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'roleplay')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions">
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 3.6: Capacitación 1 */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "capacitacion_1");
                    }}
                  >
                    <div className="column-header border-teal">
                      <span className="dot bg-teal"></span>
                      <h4>Capacitación 1</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'capacitacion_1').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'capacitacion_1')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions">
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 3.7: Capacitación 2 */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "capacitacion_2");
                    }}
                  >
                    <div className="column-header border-emerald">
                      <span className="dot bg-emerald"></span>
                      <h4>Capacitación 2</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'capacitacion_2').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'capacitacion_2')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions">
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 4: Contratado */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "contratado");
                    }}
                  >
                    <div className="column-header border-success">
                      <span className="dot bg-success"></span>
                      <h4>Contratado</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'contratado').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'contratado')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions">
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Etapa 5: Rechazado */}
                  <div 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const appId = parseInt(e.dataTransfer.getData("applicationId"));
                      handleUpdateStage(appId, "rechazado");
                    }}
                  >
                    <div className="column-header border-danger">
                      <span className="dot bg-danger"></span>
                      <h4>Rechazado</h4>
                      <span className="count-badge">
                        {filteredKanbanApplications.filter(a => a.stage === 'rechazado').length}
                      </span>
                    </div>
                    <div className="column-cards-list">
                      {filteredKanbanApplications
                        .filter(a => a.stage === 'rechazado')
                        .map(app => (
                          <div 
                            key={app.id} 
                            className="kanban-card-item"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("applicationId", app.id.toString())}
                          >
                            <div className="card-top">
                              <strong>{app.candidate.name}</strong>
                              {app.score !== null && (
                                <span className={`badge ${app.score >= 80 ? 'badge-success' : app.score >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                                  {app.score}%
                                </span>
                              )}
                            </div>
                            {app.candidate.source && app.candidate.source !== 'No especificada' && (
                              <span className="kanban-card-source-tag">
                                🌐 {app.candidate.source}
                              </span>
                            )}
                            <span className="card-sub">{app.candidate.email || app.candidate.filename}</span>
                            <div className="card-actions">
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSelectedCandidate(app.candidate);
                                  setActiveDetailTab('summary');
                                  setDetailModalOpen(true);
                                }}
                              >
                                Ver Detalle
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-rbac-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 1. KPI CARDS */}
              <div className="kpi-grid">
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-blue">
                    <Users className="icon-blue kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Colaboradores Totales</h4>
                    <p className="kpi-value">{usersList.length}</p>
                  </div>
                </div>
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-green">
                    <CheckCircle className="icon-green kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Cuentas Activas</h4>
                    <p className="kpi-value">{usersList.filter(u => u.is_active).length}</p>
                  </div>
                </div>
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-purple">
                    <ShieldCheck className="icon-purple kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Roles del Sistema</h4>
                    <p className="kpi-value">{rolesList.length || 7}</p>
                  </div>
                </div>
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-orange">
                    <Briefcase className="icon-orange kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Áreas Organizacionales</h4>
                    <p className="kpi-value">{departments.length}</p>
                  </div>
                </div>
              </div>

              {/* 2. SUB-TABS SELECTOR */}
              <div className="card" style={{ padding: '0.5rem 0.75rem', display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', borderRadius: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${userPanelSubTab === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUserPanelSubTab('list')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Users className="icon-xs" /> Directorio y Asignación de Roles
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${userPanelSubTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUserPanelSubTab('matrix')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Layers className="icon-xs" /> Matriz de Permisos por Rol
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${userPanelSubTab === 'test_roles' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUserPanelSubTab('test_roles')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <UserCheck className="icon-xs" /> Simulación de Acceso en Vivo
                </button>
              </div>

              {/* 3. SUBTAB: DIRECTORIO Y ASIGNACIÓN DE ROLES */}
              {userPanelSubTab === 'list' && (
                <div className="card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        Colaboradores y Asignación de Roles
                      </h3>
                      <p className="card-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                        Gestiona el acceso al sistema, asigna uno o varios roles jerárquicos y vincula a departamentos.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={fetchUsersAndRoles}
                        disabled={loadingUsers}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <RefreshCw className={`icon-xs ${loadingUsers ? 'icon-spin' : ''}`} />
                        Refrescar
                      </button>
                      {hasPermission('users:manage') && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            fetchDepartments();
                            setNewUserModalOpen(true);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <UserPlus className="icon-xs" />
                          Registrar Nuevo Colaborador
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BARRA DE BÚSQUEDA Y FILTROS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem', background: 'var(--bg-app)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ position: 'relative' }}>
                      <Search className="icon-xs" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Buscar por nombre o correo..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2.2rem', fontSize: '0.82rem', width: '100%' }}
                      />
                    </div>

                    <div>
                      <select
                        className="form-input"
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        style={{ fontSize: '0.82rem', width: '100%' }}
                      >
                        <option value="all">-- Todos los Roles --</option>
                        <option value="SuperAdmin">Super Administrador</option>
                        <option value="Gerente_RH">Gerente de Recursos Humanos</option>
                        <option value="Reclutador_Senior">Reclutador Senior</option>
                        <option value="Reclutador_Junior">Reclutador Junior</option>
                        <option value="Gerente_Vacante">Gerente de Vacante</option>
                        <option value="Evaluador_Capacitacion">Evaluador de Capacitación</option>
                        <option value="Auditor_Privacidad">Auditor de Privacidad</option>
                      </select>
                    </div>

                    <div>
                      <select
                        className="form-input"
                        value={userDeptFilter}
                        onChange={(e) => setUserDeptFilter(e.target.value)}
                        style={{ fontSize: '0.82rem', width: '100%' }}
                      >
                        <option value="all">-- Todos los Departamentos --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* TABLA DE USUARIOS */}
                  <div className="users-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th>Colaborador</th>
                          <th>Correo Electrónico</th>
                          <th>Departamento</th>
                          <th>Roles Asignados</th>
                          <th>Vacantes Asignadas</th>
                          <th style={{ textAlign: 'center' }}>Estado</th>
                          <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filtered = usersList.filter(u => {
                            const q = userSearchQuery.trim().toLowerCase();
                            const matchesQ = !q || (u.full_name && u.full_name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q));
                            const matchesR = userRoleFilter === 'all' || (u.roles && u.roles.some(r => r.id === userRoleFilter));
                            const matchesD = userDeptFilter === 'all' || (u.department && u.department.toLowerCase() === userDeptFilter.toLowerCase());
                            return matchesQ && matchesR && matchesD;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                  {loadingUsers ? 'Cargando colaboradores...' : 'No se encontraron colaboradores con los filtros seleccionados.'}
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((u) => (
                            <tr key={u.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <div className="sidebar-user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.82rem', fontWeight: '700' }}>
                                    {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)', display: 'block' }}>{u.full_name}</strong>
                                    {u.id === currentUser?.id && (
                                      <span style={{ fontSize: '0.68rem', color: '#155dfc', fontWeight: '700' }}>● Sesión Actual</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{u.email}</td>
                              <td>
                                <span className="badge" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                                  {u.department || 'General'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                  {u.roles?.map((r) => (
                                    <span 
                                      key={r.id} 
                                      className="badge" 
                                      style={{ 
                                        fontSize: '0.72rem', 
                                        background: r.id === 'SuperAdmin' ? 'rgba(21, 93, 252, 0.15)' : 'rgba(97, 95, 255, 0.12)',
                                        color: r.id === 'SuperAdmin' ? '#155dfc' : '#615fff',
                                        fontWeight: '700'
                                      }}
                                    >
                                      {r.name}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  {u.assigned_vacancy_ids?.length > 0 ? `${u.assigned_vacancy_ids.length} vacante(s)` : 'Todas / No asignado'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                                  {u.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                  {hasPermission('users:manage') && (
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-xs"
                                      onClick={() => handleOpenEditUserModal(u)}
                                      title="Editar datos, contraseña y asignar roles"
                                      style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.5rem' }}
                                    >
                                      <Edit className="icon-xs" style={{ width: '12px', height: '12px' }} /> Asignar Roles
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-xs"
                                    onClick={() => handleToggleUserActive(u)}
                                    style={{ fontSize: '0.72rem' }}
                                  >
                                    {u.is_active ? 'Desactivar' : 'Activar'}
                                  </button>
                                  {u.email !== 'admin@octopy.com' && u.email !== 'admin@jpm.com' && u.id !== currentUser?.id && hasPermission('users:manage') && (
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-xs"
                                      onClick={() => handlePurgeUser(u)}
                                      title="Eliminar definitivamente al colaborador"
                                      style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.5rem' }}
                                    >
                                      <Trash2 className="icon-xs" style={{ width: '12px', height: '12px' }} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. SUBTAB: MATRIZ DE ROLES Y PERMISOS */}
              {userPanelSubTab === 'matrix' && (
                <div className="card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        Matriz de Control de Acceso y Permisos por Rol
                      </h3>
                    </div>
                    <p className="card-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                      Consulta los privilegios asignados a cada perfil jerárquico dentro de Octopy Talento.
                    </p>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="users-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={{ minWidth: '220px' }}>Permiso del Sistema</th>
                          <th style={{ textAlign: 'center', background: 'rgba(21, 93, 252, 0.08)' }}>SuperAdmin</th>
                          <th style={{ textAlign: 'center' }}>Gerente RH</th>
                          <th style={{ textAlign: 'center' }}>Reclutador Senior</th>
                          <th style={{ textAlign: 'center' }}>Reclutador Junior</th>
                          <th style={{ textAlign: 'center' }}>Gerente Vacante</th>
                          <th style={{ textAlign: 'center' }}>Evaluador Capacita</th>
                          <th style={{ textAlign: 'center' }}>Auditor Privacidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: 'candidates:read', desc: 'Ver candidatos y expedientes laborales', roles: ['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior', 'Reclutador_Junior', 'Gerente_Vacante', 'Evaluador_Capacitacion', 'Auditor_Privacidad'] },
                          { id: 'candidates:create', desc: 'Registrar o postular nuevos candidatos', roles: ['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior', 'Reclutador_Junior'] },
                          { id: 'candidates:edit', desc: 'Editar datos generales del candidato', roles: ['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior'] },
                          { id: 'candidates:transfer', desc: 'Transferir candidato a otra vacante', roles: ['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior'] },
                          { id: 'candidates:delete', desc: 'Eliminar expedientes de candidatos', roles: ['SuperAdmin'] },
                          { id: 'id_docs:view', desc: 'Consultar identificación oficial (INE)', roles: ['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior', 'Reclutador_Junior'] },
                          { id: 'id_docs:purge', desc: 'Purgar documento INE por LFPDPPP / ARCO', roles: ['SuperAdmin', 'Auditor_Privacidad'] },
                          { id: 'vacancies:manage', desc: 'Crear, editar, pausar o cerrar vacantes', roles: ['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior'] },
                          { id: 'kanban:manage', desc: 'Mover candidatos entre etapas del embudo', roles: ['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior', 'Reclutador_Junior', 'Gerente_Vacante', 'Evaluador_Capacitacion'] },
                          { id: 'evaluations:submit', desc: 'Registrar dictámenes de etapa y notas', roles: ['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior', 'Gerente_Vacante', 'Evaluador_Capacitacion'] },
                          { id: 'users:manage', desc: 'Administrar usuarios, roles y permisos', roles: ['SuperAdmin', 'Gerente_RH'] },
                          { id: 'settings:manage', desc: 'Configurar parámetros del bot y prompts', roles: ['SuperAdmin', 'Gerente_RH'] },
                          { id: 'audit:read', desc: 'Consultar bitácora inmutable de auditoría', roles: ['SuperAdmin', 'Gerente_RH', 'Auditor_Privacidad'] },
                        ].map((p, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)', display: 'block' }}>{p.id}</strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.desc}</span>
                            </td>
                            {['SuperAdmin', 'Gerente_RH', 'Reclutador_Senior', 'Reclutador_Junior', 'Gerente_Vacante', 'Evaluador_Capacitacion', 'Auditor_Privacidad'].map(rKey => {
                              const granted = p.roles.includes(rKey);
                              return (
                                <td key={rKey} style={{ textAlign: 'center', background: rKey === 'SuperAdmin' ? 'rgba(21, 93, 252, 0.03)' : 'transparent' }}>
                                  {granted ? (
                                    <span style={{ color: '#10b981', fontWeight: '800', fontSize: '1rem' }} title="Concedido">✓</span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', opacity: 0.3 }}>—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. SUBTAB: SIMULACIÓN DE ACCESO EN VIVO */}
              {userPanelSubTab === 'test_roles' && (
                <div className="card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UserCheck className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        Simulador Interactivo de Acceso por Rol
                      </h3>
                    </div>
                    <p className="card-subtitle" style={{ margin: '0.2rem 0 0 0' }}>
                      Cambia de sesión con 1 clic para validar cómo se adaptan la barra lateral, las secciones permitidas y las pantallas de restricción de acceso en vivo.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {[
                      {
                        name: 'Super Administrador',
                        email: 'admin@octopy.com',
                        pass: 'Admin1234!',
                        role: 'SuperAdmin',
                        icon: '👑',
                        color: '#155dfc',
                        allowed: ['Dashboard', 'Candidatos', 'Vacantes', 'Kanban', 'Usuarios & Roles', 'Configuración', 'Simulador IA'],
                        restricted: []
                      },
                      {
                        name: 'Reclutador Senior',
                        email: 'reclutador@octopy.com',
                        pass: 'Reclutador123!',
                        role: 'Reclutador_Senior',
                        icon: '🎯',
                        color: '#615fff',
                        allowed: ['Dashboard', 'Candidatos', 'Vacantes', 'Kanban', 'Simulador IA'],
                        restricted: ['Usuarios & Roles', 'Configuración']
                      },
                      {
                        name: 'Gerente Comercial (Hiring Manager)',
                        email: 'gerente.ventas@octopy.com',
                        pass: 'Gerente123!',
                        role: 'Gerente_Vacante',
                        icon: '💼',
                        color: '#f59e0b',
                        allowed: ['Dashboard (Asignadas)', 'Candidatos (Asignados)', 'Kanban (Entrevistas y Roleplay)'],
                        restricted: ['Vacantes (Creación)', 'Usuarios & Roles', 'Configuración', 'Simulador IA']
                      },
                      {
                        name: 'Evaluador de Capacitación',
                        email: 'capacitador@octopy.com',
                        pass: 'Capacita123!',
                        role: 'Evaluador_Capacitacion',
                        icon: '🎓',
                        color: '#06b6d4',
                        allowed: ['Dashboard', 'Candidatos (Asignados)', 'Kanban (Capacitación 1 y 2)'],
                        restricted: ['Vacantes', 'Usuarios & Roles', 'Configuración', 'Simulador IA']
                      },
                      {
                        name: 'Auditor de Privacidad (LFPDPPP)',
                        email: 'auditor@octopy.com',
                        pass: 'Auditor123!',
                        role: 'Auditor_Privacidad',
                        icon: '🛡️',
                        color: '#10b981',
                        allowed: ['Dashboard', 'Candidatos (Purga ARCO)', 'Bitácora LFPDPPP'],
                        restricted: ['Vacantes', 'Kanban', 'Usuarios & Roles', 'Configuración', 'Simulador IA']
                      }
                    ].map((sim, sIdx) => {
                      const isCurrent = currentUser?.email === sim.email;
                      return (
                        <div 
                          key={sIdx} 
                          style={{ 
                            background: 'var(--bg-app)', 
                            border: `1.5px solid ${isCurrent ? sim.color : 'var(--border-color)'}`, 
                            borderRadius: '12px', 
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            boxShadow: isCurrent ? `0 8px 20px -6px ${sim.color}40` : 'none',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '1.6rem' }}>{sim.icon}</span>
                              <div>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>{sim.name}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sim.email}</span>
                              </div>
                            </div>
                            {isCurrent && (
                              <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: '700' }}>
                                Activo
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.75rem' }}>
                            <div style={{ marginBottom: '0.3rem', color: '#10b981', fontWeight: '600' }}>
                              ✅ Secciones Permitidas ({sim.allowed.length}):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                              {sim.allowed.map((sec, i) => (
                                <span key={i} className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>{sec}</span>
                              ))}
                            </div>

                            {sim.restricted.length > 0 && (
                              <>
                                <div style={{ marginBottom: '0.3rem', color: '#ef4444', fontWeight: '600' }}>
                                  🔒 Restringidas ({sim.restricted.length}):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                  {sim.restricted.map((sec, i) => (
                                    <span key={i} className="badge badge-danger" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>{sec}</span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            className={`btn btn-sm ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleLogin(null, { email: sim.email, pass: sim.pass })}
                            disabled={isCurrent}
                            style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                          >
                            <UserCheck className="icon-xs" />
                            {isCurrent ? 'Sesión Actual' : `Simular Rol ${sim.role}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VISTA: CENTRO DE MANTENIMIENTO Y PURGA DE DATOS (RBAC / ADMIN)            */}
          {/* ========================================================================= */}
          {activeTab === 'purge' && (
            <div className="purge-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* BANNER INFORMATIVO DE SEGURIDAD Y CUMPLIMIENTO */}
              <div className="card" style={{ 
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(21, 93, 252, 0.06) 100%)', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                borderRadius: '16px', 
                padding: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.15)', 
                    color: '#ef4444', 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0 
                  }}>
                    <ShieldAlert style={{ width: '24px', height: '24px' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        Zona de Operaciones Sensibles y Destrucción Segura
                      </h3>
                      <span className="badge badge-danger" style={{ fontSize: '0.68rem', fontWeight: '700' }}>
                        LFPDPPP & ARCO
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '780px', lineHeight: '1.45' }}>
                      Este panel permite ejecutar la destrucción de archivos de currículums, depuración de candidatos o reset controlado del sistema.
                      Todas las acciones son auditadas inmutablemente con sello de tiempo, usuario responsable y dirección IP.
                    </p>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={fetchMaintenanceStats}
                  disabled={loadingMaintenance}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw className={`icon-xs ${loadingMaintenance ? 'icon-spin' : ''}`} />
                  Refrescar Almacenamiento
                </button>
              </div>

              {/* KPI CARDS DE ESTADO EN TIEMPO REAL */}
              <div className="kpi-grid">
                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-blue">
                    <Users className="icon-blue kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Candidatos en Sistema</h4>
                    <p className="kpi-value">{maintenanceStats?.candidates_total ?? 0}</p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {maintenanceStats?.applications_total ?? 0} postulaciones activas
                    </span>
                  </div>
                </div>

                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-orange">
                    <FileText className="icon-orange kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Archivos Físicos de CVs</h4>
                    <p className="kpi-value">{maintenanceStats?.cv_files_count ?? 0}</p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {maintenanceStats?.cv_files_mb ?? 0} MB en disco
                    </span>
                  </div>
                </div>

                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-purple">
                    <ShieldCheck className="icon-purple kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Identificaciones (INE)</h4>
                    <p className="kpi-value">{maintenanceStats?.id_docs_active ?? 0}</p>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '600' }}>
                      {maintenanceStats?.id_docs_purged ?? 0} ya purgadas por TTL
                    </span>
                  </div>
                </div>

                <div className="card kpi-card">
                  <div className="kpi-icon-wrapper bg-green">
                    <Database className="icon-green kpi-icon" />
                  </div>
                  <div className="kpi-info">
                    <h4>Almacenamiento Seguro</h4>
                    <p className="kpi-value" style={{ fontSize: '1.1rem', color: maintenanceStats?.storage_accessible ? '#10b981' : '#f59e0b' }}>
                      {maintenanceStats?.storage_accessible ? 'Operativo' : 'Verificar'}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                      {maintenanceStats?.storage_path || '/app/storage/candidates'}
                    </span>
                  </div>
                </div>
              </div>

              {/* GRID CON LAS 4 OPCIONES DE PURGA */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
                
                {/* OPCIÓN 1: PURGAR ARCHIVOS FÍSICOS DE CVS */}
                <div className="card" style={{ 
                  background: 'var(--bg-card)', 
                  padding: '1.5rem', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  position: 'relative'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText style={{ width: '20px', height: '20px' }} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                          Purgar Solo Archivos Físicos (CVs)
                        </h4>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.68rem', fontWeight: '700' }}>
                        Libera Almacenamiento
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: '1.45' }}>
                      Destruye con sobreescritura de ceros todos los documentos <strong>.pdf</strong> y fotos en disco. 
                      <strong> Conserva los expedientes en la base de datos</strong> (nombres, puntuaciones de IA, notas de reclutadores y postulaciones).
                    </p>

                    <div style={{ background: 'var(--bg-app)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div>💾 <strong>Archivos en disco:</strong> {maintenanceStats?.cv_files_count ?? 0} archivos ({maintenanceStats?.cv_files_mb ?? 0} MB)</div>
                      <div>🛡️ <strong>Expedientes conservados:</strong> {maintenanceStats?.candidates_total ?? 0} candidatos</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenPurgeModal('cv_files')}
                    style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.5rem' }}
                  >
                    <Trash2 className="icon-xs" /> Purgar Archivos Físicos de CVs
                  </button>
                </div>

                {/* OPCIÓN 2: PURGAR CANDIDATOS Y EXPEDIENTES COMPLETOS */}
                <div className="card" style={{ 
                  background: 'var(--bg-card)', 
                  padding: '1.5rem', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users style={{ width: '20px', height: '20px' }} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                          Purgar Todos los Candidatos y CVs
                        </h4>
                      </div>
                      <span className="badge badge-danger" style={{ fontSize: '0.68rem', fontWeight: '700' }}>
                        Reset de Candidaturas
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: '1.45' }}>
                      Elimina de forma irreversible todos los candidatos registrados, archivos de CVs, historial de etapas, 
                      calificaciones de IA, notas internas y mensajes de pre-entrevista.
                      <strong> Las vacantes, departamentos y usuarios se conservan intactos.</strong>
                    </p>

                    <div style={{ background: 'var(--bg-app)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div>🗑️ <strong>Se eliminarán:</strong> {maintenanceStats?.candidates_total ?? 0} candidatos y {maintenanceStats?.applications_total ?? 0} postulaciones</div>
                      <div>🔒 <strong>Se conservan:</strong> {maintenanceStats?.vacancies_total ?? 0} vacantes y {maintenanceStats?.users_total ?? 0} usuarios</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenPurgeModal('candidates')}
                    style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.5rem' }}
                  >
                    <Trash2 className="icon-xs" /> Purgar Todos los Candidatos y CVs
                  </button>
                </div>

                {/* OPCIÓN 3: PURGA COMPLETA DEL SISTEMA (FACTORY RESET) */}
                <div className="card" style={{ 
                  background: 'var(--bg-card)', 
                  padding: '1.5rem', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ background: 'rgba(220, 38, 38, 0.2)', color: '#dc2626', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShieldAlert style={{ width: '20px', height: '20px' }} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                          Purga Completa del Sistema (Factory Reset)
                        </h4>
                      </div>
                      <span className="badge badge-danger" style={{ fontSize: '0.68rem', fontWeight: '700', background: '#dc2626', color: '#fff' }}>
                        Reset Total
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: '1.45' }}>
                      Restablece el ecosistema completo a estado de fábrica. Destruye todos los CVs, candidatos, postulaciones 
                      y vacantes de prueba, re-sembrando 2 vacantes modelo limpias de Octopy.
                      <strong> Las cuentas de usuario (SuperAdmin), roles RBAC y configuraciones se protegen.</strong>
                    </p>

                    <div style={{ background: 'var(--bg-app)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div>💥 <strong>Destrucción total de:</strong> Candidatos, CVs, vacantes y chats de pre-entrevista</div>
                      <div>🛡️ <strong>Protección garantizada:</strong> Usuario administrador, catálogo de roles y ajustes del bot</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpenPurgeModal('complete')}
                    style={{ background: '#dc2626', borderColor: '#b91c1c', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.5rem' }}
                  >
                    <RefreshCw className="icon-xs" /> Ejecutar Purga Completa del Sistema
                  </button>
                </div>

                {/* OPCIÓN 4: PURGAR IDENTIFICACIONES OFICIALES VENCIDAS (LFPDPPP) */}
                <div className="card" style={{ 
                  background: 'var(--bg-card)', 
                  padding: '1.5rem', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShieldCheck style={{ width: '20px', height: '20px' }} />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                          Purga de Identificaciones Vencidas (LFPDPPP)
                        </h4>
                      </div>
                      <span className="badge badge-purple" style={{ fontSize: '0.68rem', fontWeight: '700' }}>
                        Cumplimiento ARCO
                      </span>
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0', lineHeight: '1.45' }}>
                      Ejecuta el protocolo de destrucción física de fotografías de identificaciones (INE/Pasaporte) cuyo periodo de 
                      retención temporal de 24 horas haya expirado. 
                      <strong> Conserva el estatus de validación y el hash SHA-256 como constancia legal.</strong>
                    </p>

                    <div style={{ background: 'var(--bg-app)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div>⏱️ <strong>Retención configurada:</strong> 24 horas posteriores a la captura</div>
                      <div>🔒 <strong>Evidencia inmutable:</strong> Hash SHA-256 de evidencia registrado en auditoría</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenPurgeModal('expired_ids')}
                    style={{ borderColor: 'rgba(99, 102, 241, 0.4)', color: '#818cf8', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.5rem' }}
                  >
                    <Clock className="icon-xs" /> Purgar Identificaciones Vencidas
                  </button>
                </div>

              </div>

              {/* DETALLES DE AUDITORÍA Y SEGURIDAD */}
              <div className="card" style={{ background: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Shield style={{ width: '18px', height: '18px', color: 'var(--accent-light)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Bitácora inmutable: Se han registrado <strong>{maintenanceStats?.audit_logs_total ?? 0}</strong> eventos de auditoría conforme a normativas de protección de datos.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setActiveTab('settings');
                    setSettingsSubTab('audit');
                    fetchAuditLogs();
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Eye className="icon-xs" /> Ver Bitácora de Auditoría
                </button>
              </div>

            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-view-container">
              {/* SUB-NAVEGACIÓN DE CONFIGURACIÓN (P1 RBAC Y AUDITORÍA) */}
              <div className="settings-subnav">
                <button 
                  type="button" 
                  className={`settings-subnav-btn ${settingsSubTab === 'bot' ? 'active' : ''}`}
                  onClick={() => setSettingsSubTab('bot')}
                >
                  <Bot className="icon-xs" /> Asistente y Prompts
                </button>
                <button 
                  type="button" 
                  className={`settings-subnav-btn ${settingsSubTab === 'sources' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('sources'); fetchDetailedSources(); }}
                >
                  <Globe className="icon-xs" /> Fuentes de Reclutamiento
                </button>
                <button 
                  type="button" 
                  className={`settings-subnav-btn ${settingsSubTab === 'users' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('users'); fetchUsersAndRoles(); }}
                >
                  <Users className="icon-xs" /> Usuarios y Roles RBAC
                </button>
                <button 
                  type="button" 
                  className={`settings-subnav-btn ${settingsSubTab === 'departments' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('departments'); fetchDepartments(); }}
                >
                  <Briefcase className="icon-xs" /> Áreas y Departamentos
                </button>
                <button 
                  type="button" 
                  className={`settings-subnav-btn ${settingsSubTab === 'audit' ? 'active' : ''}`}
                  onClick={() => { setSettingsSubTab('audit'); fetchAuditLogs(); }}
                >
                  <ShieldCheck className="icon-xs" /> Bitácora de Auditoría (LFPDPPP)
                </button>
                <button 
                  type="button" 
                  className="settings-subnav-btn"
                  onClick={() => { setActiveTab('purge'); fetchMaintenanceStats(); }}
                  style={{ color: '#f87171' }}
                >
                  <Trash2 className="icon-xs" /> Mantenimiento & Purga
                </button>
              </div>

              {settingsSubTab === 'bot' && (
                <>
                  {/* CARD: FLUJO CONVERSACIONAL OFICIAL DEL ASISTENTE VIRTUAL (Punto 7) */}
                  <div className="card settings-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '16px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>🤖</span>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                        Flujo Conversacional del Asistente Virtual ({settingsData.bot_name || 'OctyBot'})
                      </h3>
                      <span className="badge badge-indigo" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                        Punto 7 RH
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '750px' }}>
                      Embudo estandarizado de pre-entrevista omnicanal para candidatos vinculados. OctyBot ejecuta automáticamente este ciclo de 6 pasos para evaluar, perfilar y blindar el expediente laboral.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveTab('simulator')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Bot className="icon-xs" /> Probar en Simulador IA
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (window.confirm('¿Deseas restablecer el Prompt Core y el Aviso de Privacidad a los valores oficiales recomendados del Flujo de 6 Pasos?')) {
                          setSettingsData(prev => ({
                            ...prev,
                            bot_core_prompt: RECOMMENDED_BOT_PROMPT,
                            privacy_notice: RECOMMENDED_PRIVACY_NOTICE
                          }));
                        }
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: 'var(--text-primary)' }}
                    >
                      <RefreshCw className="icon-xs" /> Restablecer Flujo Oficial Recomendado
                    </button>
                  </div>
                </div>

                {/* 6 PASOS DEL FLUJO VISUAL */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>1</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Inicio de Conversación</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      El candidato hace clic en el enlace de invitación e inicia el chat enviando el comando de vinculación <code>/start app_{'{id}'}</code>.
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>2</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Aviso y Políticas de Privacidad</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Envío automático del aviso formal y consentimiento para uso y protección de datos conforme a la legislación laboral.
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>3</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Entrevista de Perfilamiento</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Máximo 2 preguntas enfocadas en trayectoria comercial, mayores logros y motivación laboral, con validación por escucha activa.
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>4</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Disponibilidad y Pretensiones</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      OctyBot indaga amablemente el horario / disponibilidad de incorporación y la expectativa económica mensual del candidato.
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>5</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Cierre y Resumen Ejecutivo</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Despedida cordial indicando seguimiento por RRHH y generación automática del reporte de pre-entrevista en el expediente.
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-card)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>6</span>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Verificación Oficial (INE / CURP)</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Solicitud de foto de identificación oficial para corroborar identidad mediante IA multimodal (CURP, edad y cotejo de nombre).
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD: FORMULARIO DE IDENTIDAD, AVISO DE PRIVACIDAD Y PROMPT CORE */}
              <div className="card settings-card">
                <div className="card-header">
                  <h3>Parámetros de Personalización del Asistente</h3>
                  <p className="card-subtitle">Configura los mensajes, identidad y reglas de inferencia para OctyBot.</p>
                </div>
                
                <form onSubmit={handleSaveSettings} className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Nombre del Asistente de IA</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={settingsData.bot_name || ''} 
                        onChange={(e) => setSettingsData(prev => ({ ...prev, bot_name: e.target.value }))}
                        placeholder="Ej: OctyBot"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Usuario del Bot de Telegram (Para Deep Links)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={settingsData.telegram_bot_username || ''} 
                        onChange={(e) => setSettingsData(prev => ({ ...prev, telegram_bot_username: e.target.value }))}
                        placeholder="Ej: OctyBot_HR_Bot"
                        required
                      />
                      <small className="muted-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Construye el enlace: <code>https://t.me/usuario_bot?start=app_id</code></small>
                    </div>
                  </div>

                  {/* CAMPO: AVISO DE PRIVACIDAD Y POLÍTICAS (PASO 2) */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        🔒 Aviso de Privacidad y Tratamiento de Datos (Paso 2)
                      </label>
                      <button
                        type="button"
                        className="btn btn-text btn-xs"
                        onClick={() => setSettingsData(prev => ({ ...prev, privacy_notice: RECOMMENDED_PRIVACY_NOTICE }))}
                        style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}
                      >
                        Cargar Texto Legal Estándar
                      </button>
                    </div>
                    <textarea 
                      className="form-input" 
                      rows={4} 
                      value={settingsData.privacy_notice || ''} 
                      onChange={(e) => setSettingsData(prev => ({ ...prev, privacy_notice: e.target.value }))}
                      placeholder="Redacta el aviso de privacidad y consentimiento que recibirá el candidato al enviar /start..."
                      style={{ resize: 'vertical', fontSize: '0.85rem' }}
                    />
                    <small className="muted-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Este texto se enviará automáticamente en el mensaje de bienvenida inicial de OctyBot para garantizar el cumplimiento legal y la confianza del candidato.
                    </small>
                  </div>

                  {/* CAMPO: PROMPT CORE DE RECLUTAMIENTO */}
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        🧠 Instrucciones y Prompt Core de Reclutamiento (Flujo de Pasos)
                      </label>
                      <button
                        type="button"
                        className="btn btn-text btn-xs"
                        onClick={() => setSettingsData(prev => ({ ...prev, bot_core_prompt: RECOMMENDED_BOT_PROMPT }))}
                        style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}
                      >
                        Cargar Prompt Estándar (6 Pasos)
                      </button>
                    </div>
                    <textarea 
                      className="form-input" 
                      rows={14} 
                      value={settingsData.bot_core_prompt || ''} 
                      onChange={(e) => setSettingsData(prev => ({ ...prev, bot_core_prompt: e.target.value }))}
                      placeholder="Prompt de sistema para guiar la pre-entrevista..."
                      style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: '1.45' }}
                      required
                    />
                    <small className="muted-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Define las directrices operativas de OctyBot: límite estricto de preguntas comerciales, empatía, escucha activa y transición a disponibilidad y pretensiones.
                    </small>
                  </div>

                  <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {savingSettings ? <RefreshCw className="icon-spin icon-sm" /> : <CheckCircle className="icon-sm" />}
                      {savingSettings ? 'Guardando Configuración...' : 'Guardar Configuración'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}

          {settingsSubTab === 'sources' && (
            /* CARD: GESTIÓN DE CATÁLOGO DE PLATAFORMAS / FUENTES DE RECLUTAMIENTO */
            <div className="card settings-card" style={{ marginTop: '0.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Globe className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                      Catálogo de Plataformas y Fuentes de Reclutamiento
                    </h3>
                    <p className="card-subtitle">Administra las plataformas disponibles (OCC, Indeed, etc.), renombra fuentes para corregir errores ortográficos o elimina canales no deseados.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={fetchDetailedSources}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <RefreshCw className={`icon-xs ${loadingSources ? 'icon-spin' : ''}`} /> Refrescar
                  </button>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  {/* Formulario para agregar nueva plataforma */}
                  <form onSubmit={handleCreateCatalogueSource} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Nombre de la nueva plataforma (ej. Talenteca, Bolsa UNAM, Ferias)..."
                      value={newCatalogueSourceInput}
                      onChange={(e) => setNewCatalogueSourceInput(e.target.value)}
                      style={{ flex: '1', minWidth: '240px' }}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={savingCatalogueSource} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                      <Plus className="icon-sm" /> Agregar Plataforma
                    </button>
                  </form>

                  {/* Tabla / Lista de Plataformas */}
                  <div className="table-wrapper">
                    <table className="candidates-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Plataforma</th>
                          <th style={{ textAlign: 'center' }}>Candidatos Registrados</th>
                          <th style={{ textAlign: 'center' }}>Tipo</th>
                          <th className="actions-header" style={{ textAlign: 'center', width: '170px' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedSources.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                              Cargando plataformas...
                            </td>
                          </tr>
                        ) : (
                          detailedSources.map((src, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className={`source-pill ${getSourceBadgeClass(src.name)}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: '600' }}>
                                  🌐 {src.name}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', fontWeight: '600' }}>
                                  {src.count} candidato(s)
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {src.is_default ? 'Predeterminada' : 'Personalizada'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleOpenRenameSourceModal(src)}
                                    title="Renombrar o corregir ortografía"
                                    style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                  >
                                    <Edit style={{ width: '11px', height: '11px' }} /> Renombrar
                                  </button>
                                  {!src.is_default && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleDeleteCatalogueSource(src.name)}
                                      title="Eliminar esta plataforma del catálogo"
                                      style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                    >
                                      <Trash2 style={{ width: '11px', height: '11px' }} /> Eliminar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN 3: GESTIÓN DE USUARIOS Y ROLES (RBAC) */}
            {settingsSubTab === 'users' && (
              <div className="card settings-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                      Gestión de Usuarios, Roles y Evaluadores Asignados
                    </h3>
                    <p className="card-subtitle">
                      Control de acceso basado en roles (RBAC). Define qué colaboradores pueden evaluar vacantes, consultar expedientes o purgar documentos oficiales.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={fetchUsersAndRoles}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <RefreshCw className={`icon-xs ${loadingUsers ? 'icon-spin' : ''}`} /> Refrescar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setNewUserModalOpen(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <UserPlus className="icon-xs" /> Registrar Nuevo Usuario
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem' }} className="users-table-wrapper">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Nombre Completo</th>
                        <th>Correo Electrónico</th>
                        <th>Departamento</th>
                        <th>Roles del Sistema</th>
                        <th>Vacantes Asignadas</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            {loadingUsers ? 'Cargando usuarios...' : 'No hay usuarios cargados. Haz clic en Refrescar.'}
                          </td>
                        </tr>
                      ) : (
                        usersList.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="sidebar-user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                                  {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <strong>{u.full_name}</strong>
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                            <td>
                              <span className="badge" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                                {u.department || 'General'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                {u.roles?.map((r) => (
                                  <span 
                                    key={r.id} 
                                    className="badge" 
                                    style={{ 
                                      fontSize: '0.72rem', 
                                      background: r.id === 'SuperAdmin' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(139, 35, 124, 0.12)',
                                      color: r.id === 'SuperAdmin' ? '#4f46e5' : 'var(--accent-light)',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {u.assigned_vacancy_ids?.length > 0 ? `${u.assigned_vacancy_ids.length} vacante(s)` : 'Todas / No asignado'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                                {u.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => handleToggleUserActive(u)}
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  {u.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                                {u.email !== 'admin@octopy.com' && u.email !== 'admin@jpm.com' && u.id !== currentUser?.id && hasPermission('users:manage') && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-xs"
                                    onClick={() => handlePurgeUser(u)}
                                    title="Eliminar definitivamente al colaborador (Validará dependencias)"
                                    style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.45rem' }}
                                  >
                                    <Trash2 className="icon-xs" style={{ width: '12px', height: '12px' }} /> Eliminar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECCIÓN 4: BITÁCORA DE AUDITORÍA (LFPDPPP) */}
            {settingsSubTab === 'audit' && (
              <div className="card settings-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck className="icon-sm" style={{ color: '#16a34a' }} />
                      <h3 style={{ margin: 0 }}>Bitácora de Auditoría y Protección de Datos Personales (LFPDPPP)</h3>
                    </div>
                    <p className="card-subtitle">
                      Registro inmutable de trazabilidad para accesos a identificaciones oficiales (INE), descargas de CVs, dictámenes de evaluación, reasignaciones y logins.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={fetchAuditLogs}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <RefreshCw className={`icon-xs ${loadingAudit ? 'icon-spin' : ''}`} /> Actualizar Bitácora
                  </button>
                </div>

                {/* Filtros de Auditoría */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Filtrar por Acción:</label>
                    <select
                      className="form-input"
                      value={auditActionFilter}
                      onChange={(e) => { setAuditActionFilter(e.target.value); }}
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
                    >
                      <option value="">Todas las acciones</option>
                      <option value="LOGIN">LOGIN</option>
                      <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                      <option value="VIEW_INE_DOCUMENT">VIEW_INE_DOCUMENT</option>
                      <option value="DOWNLOAD_CV">DOWNLOAD_CV</option>
                      <option value="SUBMIT_EVALUATION">SUBMIT_EVALUATION</option>
                      <option value="TRANSFER_CANDIDATE">TRANSFER_CANDIDATE</option>
                      <option value="PURGE_INE_DOCUMENT">PURGE_INE_DOCUMENT</option>
                      <option value="CREATE_USER">CREATE_USER</option>
                      <option value="UPDATE_USER">UPDATE_USER</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Recurso:</label>
                    <select
                      className="form-input"
                      value={auditResourceTypeFilter}
                      onChange={(e) => { setAuditResourceTypeFilter(e.target.value); }}
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
                    >
                      <option value="">Todos los recursos</option>
                      <option value="candidate">candidate</option>
                      <option value="vacancy">vacancy</option>
                      <option value="auth">auth</option>
                      <option value="user">user</option>
                      <option value="settings">settings</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={fetchAuditLogs}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    Aplicar Filtros
                  </button>
                </div>

                <div className="audit-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Fecha / Hora</th>
                        <th>Usuario Responsable</th>
                        <th>Acción Registrada</th>
                        <th>Recurso</th>
                        <th>ID Recurso</th>
                        <th>Detalles de Operación</th>
                        <th>Dirección IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            {loadingAudit ? 'Cargando eventos de bitácora...' : 'No hay registros que coincidan con los filtros seleccionados.'}
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => {
                          let badgeClass = 'badge-action-login';
                          if (log.action.includes('INE')) badgeClass = 'badge-action-view-ine';
                          if (log.action.includes('CV')) badgeClass = 'badge-action-download-cv';
                          if (log.action.includes('EVALUATION')) badgeClass = 'badge-action-evaluation';
                          if (log.action.includes('TRANSFER')) badgeClass = 'badge-action-transfer';
                          if (log.action.includes('PURGE') || log.action.includes('FAILED')) badgeClass = 'badge-action-purge';

                          return (
                            <tr key={log.id}>
                              <td style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                              </td>
                              <td>
                                <strong>{log.user_email}</strong>
                              </td>
                              <td>
                                <span className={`badge-action ${badgeClass}`}>
                                  {log.action}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>{log.resource_type}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                {log.resource_id ? (log.resource_id.length > 12 ? `${log.resource_id.slice(0, 10)}...` : log.resource_id) : '-'}
                              </td>
                              <td style={{ fontSize: '0.75rem', maxWidth: '300px', wordBreak: 'break-word' }}>
                                {log.details ? (
                                  <span title={JSON.stringify(log.details, null, 2)}>
                                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                                  </span>
                                ) : '-'}
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {log.ip_address || '127.0.0.1'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECCIÓN 5: CATÁLOGO DINÁMICO DE ÁREAS Y DEPARTAMENTOS */}
            {settingsSubTab === 'departments' && (
              <div className="card settings-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Briefcase className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                      <h3 style={{ margin: 0 }}>Estructura Organizacional: Áreas y Gerentes</h3>
                    </div>
                    <p className="card-subtitle">
                      Administra los departamentos de Octopy y define a sus Gerentes Titulares y Evaluadores de Capacitación para auto-asignación en vacantes.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={fetchDepartments}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <RefreshCw className={`icon-xs ${loadingDepartments ? 'icon-spin' : ''}`} /> Actualizar
                    </button>
                    {hasPermission('settings:manage') && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenNewDeptModal}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Plus className="icon-xs" /> Nueva Área
                      </button>
                    )}
                  </div>
                </div>

                <div className="users-table-wrapper" style={{ marginTop: '1rem' }}>
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th style={{ width: '70px', textAlign: 'center' }}>Código</th>
                        <th style={{ minWidth: '220px' }}>Área y Alcance</th>
                        <th style={{ minWidth: '220px' }}>👔 Gerente Titular</th>
                        <th style={{ minWidth: '220px' }}>🎓 Evaluador Capacitación</th>
                        <th style={{ textAlign: 'center', width: '90px', whiteSpace: 'nowrap' }}>Vacantes</th>
                        <th style={{ textAlign: 'center', width: '110px', whiteSpace: 'nowrap' }}>Colaboradores</th>
                        <th style={{ textAlign: 'center', width: '85px', whiteSpace: 'nowrap' }}>Estado</th>
                        <th style={{ textAlign: 'center', minWidth: '210px', whiteSpace: 'nowrap' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            {loadingDepartments ? 'Cargando áreas organizacionales...' : 'No hay áreas registradas. Agrega una arriba.'}
                          </td>
                        </tr>
                      ) : (
                        departments.map((dept) => (
                          <tr key={dept.id}>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-blue" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                                {dept.code || 'S/C'}
                              </span>
                            </td>
                            <td>
                              <div>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{dept.name}</strong>
                                {dept.description && (
                                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {dept.description}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td>
                              {dept.manager ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <UserCheck className="icon-xs" style={{ color: 'var(--accent-light)' }} />
                                  <div>
                                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{dept.manager.full_name}</strong>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>{dept.manager.email}</span>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin gerente asignado</span>
                              )}
                            </td>
                            <td>
                              {dept.trainer ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Award className="icon-xs" style={{ color: '#06b6d4' }} />
                                  <div>
                                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{dept.trainer.full_name}</strong>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>{dept.trainer.email}</span>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin evaluador específico</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.15rem 0.45rem' }}>
                                {dept.active_vacancies_count} activa(s)
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: '0.15rem 0.45rem' }}>
                                {dept.users_count} usuario(s)
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${dept.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.72rem' }}>
                                {dept.is_active ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', flexWrap: 'nowrap' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => handleOpenEditDeptModal(dept)}
                                  title="Editar nombre, gerente titular y evaluador de área"
                                  style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                >
                                  <Edit className="icon-xs" style={{ width: '12px', height: '12px' }} /> Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => handleToggleDeptActive(dept)}
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  {dept.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                                {hasPermission('settings:manage') && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-xs"
                                    onClick={() => handlePurgeDepartment(dept)}
                                    title="Eliminar definitivamente el área (Validará que no tenga vacantes vinculadas)"
                                    style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.45rem' }}
                                  >
                                    <Trash2 className="icon-xs" style={{ width: '12px', height: '12px' }} /> Eliminar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

          {activeTab === 'simulator' && (
            <div className="simulator-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* HEADER DE CONTROL Y SELECTOR DE PERFIL DE PRUEBA */}
              <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                      <Bot style={{ width: '26px', height: '26px' }} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                          Sandbox & Simulador de OctyBot IA
                        </h3>
                        <span className="badge badge-indigo" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                          Punto 7 RH Test
                        </span>
                      </div>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Prueba en vivo el flujo conversacional de 6 pasos, la escucha activa y la visión multimodal de INE sin alterar métricas reales.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {simulatorLatency && (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.75rem', fontWeight: '600' }}>
                        ⚡ Latencia: {simulatorLatency} ms
                      </span>
                    )}
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                      🧠 Ollama (think: false)
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartSimulator()}
                      disabled={simulatorLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <RefreshCw className={`icon-xs ${simulatorLoading ? 'icon-spin' : ''}`} />
                      Reiniciar Simulación
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('settings')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <SettingsIcon className="icon-xs" /> Ajustar Prompt
                    </button>
                  </div>
                </div>

                {/* SELECTOR DE PERFIL A EMULAR */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <User className="icon-xs" /> Perfil de Candidato a Simular:
                  </span>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: '1' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${simulatorProfileType === 'mock_commercial' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setSimulatorProfileType('mock_commercial');
                        handleStartSimulator('mock_commercial');
                      }}
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                    >
                      💼 Demo: Asesor Senior (Carlos Mendoza)
                    </button>

                    <button
                      type="button"
                      className={`btn btn-sm ${simulatorProfileType === 'mock_junior' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setSimulatorProfileType('mock_junior');
                        handleStartSimulator('mock_junior');
                      }}
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                    >
                      🌱 Demo: Junior sin exp. (Mariana Morales)
                    </button>

                    <button
                      type="button"
                      className={`btn btn-sm ${simulatorProfileType === 'candidate' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        setSimulatorProfileType('candidate');
                        if (candidates.length > 0) {
                          const firstCandId = candidates[0].id;
                          setSimulatorSelectedCandidateId(firstCandId);
                          handleStartSimulator('candidate', firstCandId);
                        }
                      }}
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                    >
                      📂 Elegir Candidato Real de la Base ({candidates.length})
                    </button>
                  </div>

                  {simulatorProfileType === 'candidate' && candidates.length > 0 && (
                    <div style={{ minWidth: '240px' }}>
                      <select
                        className="form-input"
                        value={simulatorSelectedCandidateId}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setSimulatorSelectedCandidateId(newId);
                          handleStartSimulator('candidate', newId);
                        }}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                      >
                        {candidates.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} • {c.applications?.[0]?.vacancy?.title || 'General'} ({c.score || 0}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* GRID PRINCIPAL: CHAT DE TELEGRAM (IZQ) + INSPECTOR DE IA & EXPEDIENTE (DER) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.35fr) minmax(340px, 0.9fr)', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* PANEL IZQUIERDO: SIMULADOR DE CHAT TELEGRAM */}
                <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '680px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                  
                  {/* HEADER DEL CHAT (ESTILO TELEGRAM) */}
                  <div style={{ padding: '0.9rem 1.25rem', background: 'var(--bg-sidebar)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', color: '#fff', boxShadow: '0 2px 8px rgba(21, 93, 252, 0.4)' }}>
                          🤖
                        </div>
                        <span style={{ position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', border: '2px solid var(--bg-sidebar)' }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>
                          OctyBot (Reclutador IA)
                        </h4>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.75)' }}>
                          En línea • Octopy Talento Agent
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.7rem' }}>
                        Paso {simulatorStep} de 6
                      </span>
                    </div>
                  </div>

                  {/* CUERPO DE MENSAJES (SCROLL) */}
                  <div style={{ flex: '1', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0, 0, 0, 0.02)' }}>
                    {simulatorMessages.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '100%' 
                          }}
                        >
                          <div 
                            style={{ 
                              maxWidth: '85%', 
                              padding: '0.85rem 1.1rem', 
                              borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                              background: isUser ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'var(--bg-card)',
                              color: isUser ? '#ffffff' : 'var(--text-primary)',
                              border: isUser ? 'none' : '1px solid var(--border-color)',
                              boxShadow: isUser ? '0 4px 12px rgba(99, 102, 241, 0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                              fontSize: '0.88rem',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}
                          >
                            {!isUser && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.72rem', fontWeight: '700', color: 'var(--accent-light)' }}>
                                <Bot style={{ width: '12px', height: '12px' }} /> OctyBot
                              </div>
                            )}
                            {msg.body}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', padding: '0 0.35rem' }}>
                            {isUser ? 'Tú (Candidato)' : 'OctyBot (IA)'}
                          </span>
                        </div>
                      );
                    })}

                    {simulatorLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', alignSelf: 'flex-start', maxWidth: '300px' }}>
                        <RefreshCw className="icon-spin icon-xs" style={{ color: 'var(--accent-light)' }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {simulatorUploadingId ? 'Analizando credencial con visión multimodal...' : 'OctyBot está escribiendo...'}
                        </span>
                      </div>
                    )}
                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* BARRA DE ATAJOS RÁPIDOS DE PRUEBA */}
                  <div style={{ padding: '0.6rem 0.9rem', background: 'var(--bg-app)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.4rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.2rem' }}>
                      Atajos:
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => handleSendSimulatorMessage("Tengo 4 años de experiencia en ventas de cambaceo y colocación de productos financieros. Mi mayor logro fue liderar el equipo superando la meta al 135% mensual.")}
                      disabled={simulatorLoading}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    >
                      💼 Exp. Comercial & Logro
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => handleSendSimulatorMessage("Cuento con disponibilidad inmediata de tiempo completo para laborar, y mi pretensión económica es de $18,000 libres al mes.")}
                      disabled={simulatorLoading}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    >
                      ⏱️ Disponibilidad & Sueldo
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => handleSendSimulatorMessage("¿Cuánto están pagando para esta vacante exactamente?")}
                      disabled={simulatorLoading}
                      title="Probar regla: no dar sueldos exactos"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    >
                      ❓ Probar Pregunta Salarial
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => handleSendSimulatorMessage("No tengo experiencia previa en ventas ni trato con clientes, pero me interesa aprender.")}
                      disabled={simulatorLoading}
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    >
                      🛑 Sin Exp. en Ventas
                    </button>
                  </div>

                  {/* INPUT Y BOTÓN DE ENVIAR / ADJUNTAR INE */}
                  <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <input
                      type="file"
                      ref={simulatorFileInputRef}
                      style={{ display: 'none' }}
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleSimulatorUploadId}
                    />

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => simulatorFileInputRef.current?.click()}
                      disabled={simulatorLoading || simulatorUploadingId}
                      title="Subir foto de credencial oficial (INE/Pasaporte) para probar visión multimodal"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.55rem 0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.25)', color: 'var(--text-primary)' }}
                    >
                      <UploadCloud className="icon-sm" style={{ color: '#6366f1' }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>Adjuntar INE</span>
                    </button>

                    <input
                      type="text"
                      className="form-input"
                      placeholder="Escribe como candidato y presiona Enter..."
                      value={simulatorInput}
                      onChange={(e) => setSimulatorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendSimulatorMessage();
                        }
                      }}
                      disabled={simulatorLoading}
                      style={{ flex: '1', fontSize: '0.88rem', padding: '0.55rem 0.85rem' }}
                    />

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleSendSimulatorMessage()}
                      disabled={!simulatorInput.trim() || simulatorLoading}
                      style={{ padding: '0.55rem 0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Send className="icon-sm" />
                    </button>
                  </div>
                </div>

                {/* PANEL DERECHO: INSPECTOR DE IA & EXPEDIENTE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* CARD 1: SEGUIMIENTO DEL FLUJO (STEPPER) */}
                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Activity className="icon-xs" style={{ color: 'var(--accent-light)' }} /> Estado del Flujo Conversacional
                      </h4>
                      <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                        Paso {simulatorStep} / 6
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {[
                        { num: 1, name: 'Inicio de Conversación (/start)', desc: 'Vinculación de chat con expediente' },
                        { num: 2, name: 'Aviso de Privacidad y Políticas', desc: 'Consentimiento para tratamiento de datos laborales' },
                        { num: 3, name: 'Entrevista de Perfilamiento', desc: 'Máximo 2 preguntas comerciales con escucha activa' },
                        { num: 4, name: 'Disponibilidad y Pretensiones', desc: 'Horario de incorporación y sueldo pretendido' },
                        { num: 5, name: 'Cierre y Resumen Ejecutivo', desc: 'Despedida cordial y reporte automático en expediente' },
                        { num: 6, name: 'Verificación Oficial (INE / CURP)', desc: 'Extracción multimodal y cotejo de identidad' }
                      ].map((s) => {
                        const isCurrent = simulatorStep === s.num;
                        const isDone = simulatorStep > s.num;
                        return (
                          <div 
                            key={s.num} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.6rem', 
                              padding: '0.45rem 0.65rem', 
                              borderRadius: '8px', 
                              background: isCurrent ? 'rgba(99, 102, 241, 0.12)' : isDone ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                              border: isCurrent ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent'
                            }}
                          >
                            <span 
                              style={{ 
                                width: '22px', 
                                height: '22px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '0.72rem', 
                                fontWeight: '700',
                                background: isCurrent ? '#6366f1' : isDone ? '#10b981' : 'var(--bg-app)',
                                color: (isCurrent || isDone) ? '#fff' : 'var(--text-muted)'
                              }}
                            >
                              {isDone ? '✓' : s.num}
                            </span>
                            <div style={{ flex: '1', minWidth: 0 }}>
                              <strong style={{ fontSize: '0.8rem', color: isCurrent ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {s.name}
                              </strong>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>
                                {s.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CARD 2: RESULTADO DE EXTRACCIÓN DE IDENTIFICACIÓN (MULTIMODAL) */}
                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Shield className="icon-xs" style={{ color: 'var(--accent-light)' }} /> Verificación de INE (Multimodal)
                      </h4>
                      {simulatorExtractedId && (
                        <span className={`badge ${simulatorExtractedId.name_match ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                          {simulatorExtractedId.name_match ? '✅ Válido' : '⚠️ Discrepancia'}
                        </span>
                      )}
                    </div>

                    {simulatorExtractedId ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', background: 'var(--bg-app)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Documento:</span>
                          <strong>{simulatorExtractedId.tipo_documento}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Nombre en Credencial:</span>
                          <strong style={{ textAlign: 'right' }}>{simulatorExtractedId.nombre_completo || 'No detectado'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>CURP Extraída:</span>
                          <code style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            {simulatorExtractedId.curp || 'No detectada'}
                          </code>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Fecha Nacimiento:</span>
                          <strong>{simulatorExtractedId.fecha_nacimiento || 'No detectada'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Edad Calculada:</span>
                          <strong>{simulatorExtractedId.calculated_age ? `${simulatorExtractedId.calculated_age} años` : 'No calculada'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Cotejo de Nombre:</span>
                          <strong style={{ color: simulatorExtractedId.name_match ? '#10b981' : '#f59e0b' }}>
                            {simulatorExtractedId.name_match ? 'Coincide con postulación' : 'Discrepancia detectada'}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-app)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                        <FileText className="icon-md" style={{ color: 'var(--text-muted)', margin: '0 auto 0.4rem auto' }} />
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Aún no se ha adjuntado una identificación oficial en esta sesión.
                        </p>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => simulatorFileInputRef.current?.click()}
                          style={{ marginTop: '0.6rem', fontSize: '0.72rem' }}
                        >
                          <UploadCloud className="icon-xs" /> Probar con imagen de INE
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CARD 3: RESUMEN EJECUTIVO DE PRE-ENTREVISTA (PASO 5) */}
                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ClipboardList className="icon-xs" style={{ color: 'var(--accent-light)' }} /> Nota Ejecutiva para Expediente
                      </h4>
                      {simulatorExecutiveSummary && (
                        <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                          Generada por IA
                        </span>
                      )}
                    </div>

                    {simulatorExecutiveSummary ? (
                      <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.9rem 1rem', borderRadius: '10px', fontSize: '0.8rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                        {simulatorExecutiveSummary}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-app)', padding: '0.85rem', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                        💡 La nota ejecutiva se redactará automáticamente cuando el candidato responda sobre su disponibilidad de horario y pretensiones económicas (Cierre del Paso 5).
                      </p>
                    )}
                  </div>

                  {/* CARD 4: AUDITORÍA TÉCNICA (SYSTEM PROMPT INYECTADO) */}
                  <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Terminal className="icon-xs" /> Auditoría de Inferencia
                      </span>
                      <button
                        type="button"
                        className="btn btn-text btn-xs"
                        onClick={() => setShowPromptInspector(!showPromptInspector)}
                        style={{ fontSize: '0.72rem', color: 'var(--accent-light)' }}
                      >
                        {showPromptInspector ? 'Ocultar Prompt' : 'Ver System Prompt Inyectado'}
                      </button>
                    </div>

                    {showPromptInspector && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <textarea
                          readOnly
                          rows={8}
                          className="form-input"
                          value={simulatorSystemPrompt || 'El prompt se mostrará tras el primer mensaje del usuario...'}
                          style={{ width: '100%', fontSize: '0.72rem', fontFamily: 'monospace', resize: 'vertical' }}
                        />
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}
            </>
          )}
        </main>

        {/* FOOTER */}
        <footer className="main-footer">
          <p>© 2026 Octopy | Ecosistema Inteligente de Reclutamiento con IA | Diseñado por Octopy</p>
        </footer>
      </div>

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedCandidate && (
        <div className="modal-overlay" onClick={() => setDetailModalOpen(false)}>
          <div className="modal-content-container" onClick={(e) => e.stopPropagation()}>
            
            {/* VISOR DE PDF (LADO IZQUIERDO 60%) */}
            <div className="pdf-viewer-pane">
              <div className="pane-header">
                <div className="pdf-pane-title-box">
                  <FileText className="pane-icon" />
                  <h4 title={selectedCandidate.filename}>PDF: {selectedCandidate.filename}</h4>
                </div>

                <div className="pdf-toolbar-actions">
                  {/* Controles de Zoom */}
                  <div className="pdf-zoom-controls">
                    <button 
                      type="button"
                      className="pdf-zoom-btn" 
                      onClick={() => setPdfZoom(prev => Math.max(prev - 20, 50))}
                      title="Alejar (Zoom Out)"
                      disabled={pdfZoom <= 50}
                    >
                      <ZoomOut className="icon-sm" />
                    </button>
                    <button 
                      type="button"
                      className="pdf-zoom-indicator" 
                      onClick={() => setPdfZoom(100)}
                      title="Click para restablecer zoom al 100%"
                    >
                      {pdfZoom}%
                    </button>
                    <button 
                      type="button"
                      className="pdf-zoom-btn" 
                      onClick={() => setPdfZoom(prev => Math.min(prev + 20, 250))}
                      title="Acercar (Zoom In)"
                      disabled={pdfZoom >= 250}
                    >
                      <ZoomIn className="icon-sm" />
                    </button>
                  </div>

                  {/* Botón de Descarga directa de PDF */}
                  <a 
                    href={`${API_URL}/candidates/${selectedCandidate.id}/pdf`} 
                    download={selectedCandidate.filename || `CV_${selectedCandidate.name || 'candidato'}.pdf`}
                    className="pdf-tool-action-btn download-btn"
                    title="Descargar archivo PDF original"
                  >
                    <Download className="icon-sm" />
                    <span className="btn-label-text">Descargar</span>
                  </a>

                  {/* Abrir en pestaña nueva */}
                  <a 
                    href={`${API_URL}/candidates/${selectedCandidate.id}/pdf`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="pdf-tool-action-btn"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink className="icon-sm" />
                  </a>
                </div>
              </div>
              <div className="iframe-container">
                <iframe 
                  key={`${selectedCandidate.id}-${pdfZoom}`}
                  src={`${API_URL}/candidates/${selectedCandidate.id}/pdf#toolbar=1&navpanes=0&zoom=${pdfZoom}`}
                  title="Visor de CV PDF"
                />
              </div>
            </div>

            {/* PANEL DE INFORMACION (LADO DERECHO 40%) */}
            <div className="info-details-pane">
              
              <div className="pane-header">
                <div className="cand-info" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{selectedCandidate.name}</h3>
                    <button className="close-btn" onClick={() => setDetailModalOpen(false)} style={{ margin: 0, padding: 0 }}>&times;</button>
                  </div>
                  <p style={{ margin: '0.2rem 0 0.4rem 0' }}>{selectedCandidate.email || 'Sin correo registrado'}</p>
                  {selectedCandidateApplications.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                      <button 
                        className="btn btn-sm"
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          padding: '0.35rem 0.75rem', 
                          fontSize: '0.78rem', 
                          background: '#16a34a', 
                          borderColor: '#16a34a', 
                          color: '#fff', 
                          fontWeight: '600',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                        }}
                        title="Abrir WhatsApp con mensaje de pre-entrevista pre-cargado para el candidato"
                        onClick={() => handleOpenWhatsAppModal(selectedCandidate, selectedCandidateApplications[0])}
                      >
                        <MessageCircle className="icon-sm" style={{ width: '14px', height: '14px' }} />
                        🟢 Enviar por WhatsApp
                      </button>
                      <a 
                        href={`https://t.me/${settingsData.telegram_bot_username || 'OctyBot_HR_Bot'}?start=app_${selectedCandidateApplications[0].id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', fontSize: '0.78rem', textDecoration: 'none', background: '#0284c7', borderColor: '#0284c7', borderRadius: '8px' }}
                        title="Abrir chat en Telegram para pre-entrevista y validación de fotografía de identificación"
                      >
                        <Send className="icon-sm" style={{ width: '13px', height: '13px' }} /> 📱 Telegram
                      </a>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', alignSelf: 'flex-start', padding: '0.35rem 0.6rem', fontSize: '0.78rem', borderRadius: '8px' }}
                        title="Copiar enlace de Telegram al portapapeles"
                        onClick={() => handleCopyDeepLink(selectedCandidateApplications[0].id)}
                      >
                        <ExternalLink className="icon-sm" style={{ width: '13px', height: '13px' }} /> Copiar Enlace
                      </button>
                      <button 
                        type="button"
                        className="btn btn-sm"
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          padding: '0.35rem 0.75rem', 
                          fontSize: '0.78rem', 
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                          borderColor: '#6366f1', 
                          color: '#fff', 
                          fontWeight: '600',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)'
                        }}
                        title="Registrar evaluación formal de etapa con firma del evaluador responsable"
                        onClick={() => {
                          setEvalCandidate(selectedCandidate);
                          const app = selectedCandidateApplications[0];
                          setEvalApplication(app);
                          const currentStage = app.stage || 'entrevista';
                          const validEvalStages = ['entrevista', 'roleplay', 'capacitacion_1', 'capacitacion_2'];
                          setEvalStage(validEvalStages.includes(currentStage) ? currentStage : 'entrevista');
                          setEvalVerdict('aprobado');
                          setEvalScore(85);
                          setEvalNotes('');
                          setEvalAdvanceStage(true);
                          setEvalModalOpen(true);
                        }}
                      >
                        <Award className="icon-sm" style={{ width: '14px', height: '14px' }} /> 📝 Dictaminar Etapa
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                      <button
                        className="btn btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.82rem',
                          background: '#f59e0b',
                          borderColor: '#f59e0b',
                          color: '#fff',
                          fontWeight: '600',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                        }}
                        title="Vincular a este candidato con una vacante activa"
                        onClick={() => handleOpenDirectApplyModal(selectedCandidate)}
                      >
                        <UserPlus className="icon-sm" style={{ width: '15px', height: '15px' }} />
                        ➕ Postular a Vacante
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* TABS DE INFORMACIÓN */}
              <div className="tabs-bar">
                <button 
                  className={`tab-btn ${activeDetailTab === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('summary')}
                >
                  <User className="icon-sm" /> Resumen
                </button>
                <button 
                  className={`tab-btn ${activeDetailTab === 'identity' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('identity')}
                >
                  <Shield className="icon-sm" /> Identidad {selectedCandidate.id_validation_status === 'validado' ? '✅' : selectedCandidate.id_validation_status === 'validado_prueba' ? '🟡' : ''}
                </button>
                <button 
                  className={`tab-btn ${activeDetailTab === 'evaluations' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('evaluations')}
                >
                  <ClipboardList className="icon-sm" /> Evaluaciones
                </button>
                <button 
                  className={`tab-btn ${activeDetailTab === 'notes' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('notes')}
                >
                  <MessageSquare className="icon-sm" /> Notas ({selectedCandidate.notes?.length || 0})
                </button>
                <button 
                  className={`tab-btn ${activeDetailTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('logs')}
                >
                  <Activity className="icon-sm" /> Bitácora
                </button>
              </div>

              {/* CONTENIDO DE TABS */}
              <div className="tab-pane-content">
                
                {/* TAB 1: RESUMEN IA */}
                {activeDetailTab === 'summary' && (
                  <div className="summary-tab">
                    <div className="info-block">
                      <h5>Datos de Contacto</h5>
                      <div className="contact-list">
                        <div className="contact-item">
                          <span><strong>Teléfono:</strong></span>
                          <span>{selectedCandidate.phone || 'No detectado'}</span>
                        </div>
                        <div className="contact-item">
                          <span><strong>Correo:</strong></span>
                          <span>{selectedCandidate.email || 'No detectado'}</span>
                        </div>
                        <div className="contact-item">
                          <span><strong>Fecha de Carga:</strong></span>
                          <span>{new Date(selectedCandidate.created_at).toLocaleString()}</span>
                        </div>
                        <div className="contact-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                          <span><strong>Plataforma de Origen:</strong></span>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span 
                              className={`source-pill ${getSourceBadgeClass(selectedCandidate.source)}`}
                              style={{ 
                                fontSize: '0.78rem', 
                                padding: '0.15rem 0.5rem', 
                                borderRadius: '6px', 
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Globe style={{ width: '12px', height: '12px' }} />
                              {selectedCandidate.source && selectedCandidate.source !== 'No especificada' ? selectedCandidate.source : 'Sin especificar'}
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={() => handleOpenChangeSourceModal(selectedCandidate)}
                              title="Cambiar plataforma de procedencia"
                            >
                              <Edit style={{ width: '11px', height: '11px' }} /> Cambiar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="info-block">
                      <h5>Habilidades Técnicas y Profesionales Extraídas por Gemma</h5>
                      <div className="detail-skills-list">
                        {selectedCandidate.skills && selectedCandidate.skills.length > 0 ? (
                          selectedCandidate.skills.map((s, idx) => (
                            <span key={idx} className="skill-pill-large">{s}</span>
                          ))
                        ) : (
                          <span className="muted-text">Ninguna habilidad extraída aún.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB IDENTIDAD: VALIDACIÓN OFICIAL DE DOCUMENTO */}
                {activeDetailTab === 'identity' && (
                  <div className="identity-tab" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: selectedCandidate.id_validation_status === 'validado' ? 'rgba(34, 197, 94, 0.1)' : selectedCandidate.id_validation_status === 'validado_prueba' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${selectedCandidate.id_validation_status === 'validado' ? 'rgba(34, 197, 94, 0.3)' : selectedCandidate.id_validation_status === 'validado_prueba' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`
                    }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>
                          Estado: {
                            selectedCandidate.id_validation_status === 'validado' ? '✅ Identidad y Nombre Corroborados' :
                            selectedCandidate.id_validation_status === 'validado_prueba' ? '🟡 Modo Prueba (Procesado con Éxito)' :
                            selectedCandidate.id_validation_status === 'solicitado' ? '⏳ Esperando Fotografía en Telegram' :
                            '⚪ No Solicitado Aún'
                          }
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {selectedCandidate.id_validation_status === 'validado' ? 'El nombre del documento oficial coincide con el postulante del CV.' :
                           selectedCandidate.id_validation_status === 'validado_prueba' ? 'Identificación procesada. El nombre en el documento difiere del CV (tolerancia para pruebas).' :
                           'Validación con visión de IA Gemma 4 sobre fotografía oficial.'}
                        </span>
                      </div>
                      {selectedCandidate.id_validation_status === 'validado' && (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '700', padding: '0.2rem 0.5rem', background: 'rgba(34, 197, 94, 0.15)', borderRadius: '6px' }}>
                            COTEJO EXITOSO
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ficha de datos extraídos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="card" style={{ padding: '0.75rem', margin: 0 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nombre Oficial en Documento</span>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block', marginTop: '0.2rem' }}>
                          {selectedCandidate.id_document_name || 'No detectado aún'}
                        </strong>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', margin: 0 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CURP Detectada</span>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block', marginTop: '0.2rem' }}>
                          {selectedCandidate.curp || 'No registrada'}
                        </strong>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', margin: 0 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fecha de Nacimiento</span>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block', marginTop: '0.2rem' }}>
                          {selectedCandidate.birth_date || 'No registrada'}
                        </strong>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', margin: 0 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Edad (Cálculo Interno Auditoría)</span>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block', marginTop: '0.2rem' }}>
                          {selectedCandidate.calculated_age ? `${selectedCandidate.calculated_age} años` : 'No determinada'}
                        </strong>
                      </div>
                    </div>

                    {/* Visor de la fotografía de la credencial */}
                    {selectedCandidate.id_document_path ? (
                      <div style={{ marginTop: '0.5rem' }}>
                        <h6 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Shield className="icon-sm" style={{ color: 'var(--accent-light)' }} /> Fotografía de Identificación Oficial Adjunta
                        </h6>
                        <div style={{ 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          border: '1px solid var(--border-color)',
                          background: '#090d16',
                          textAlign: 'center',
                          padding: '0.5rem'
                        }}>
                          <img 
                            src={`${API_URL}/candidates/${selectedCandidate.id}/id-document`} 
                            alt="Identificación oficial del candidato"
                            style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '4px' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '1.5rem', 
                        textAlign: 'center', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        borderRadius: '8px',
                        border: '1px dashed rgba(255, 255, 255, 0.1)',
                        marginTop: '0.5rem'
                      }}>
                        <Shield className="icon-lg" style={{ opacity: 0.3, margin: '0 auto 0.5rem auto' }} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                          El candidato aún no ha enviado su fotografía de identificación en Telegram.
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                          Puedes probar abriendo el chat con el botón <strong>"📱 Abrir en Telegram"</strong> y enviando la foto o escribiendo el comando <code>/test_id</code>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: POSTULACIONES Y EVALUACIÓN IA */}
                {activeDetailTab === 'evaluations' && (
                  <div className="evaluations-tab">
                    <h5>Postulaciones y Scores de Compatibilidad</h5>
                    {selectedCandidateApplications.length === 0 ? (
                      <div style={{
                        padding: '2rem 1.5rem',
                        textAlign: 'center',
                        background: 'rgba(245, 158, 11, 0.04)',
                        border: '1px dashed rgba(245, 158, 11, 0.3)',
                        borderRadius: '10px',
                        marginTop: '0.75rem'
                      }}>
                        <Briefcase style={{ width: '32px', height: '32px', color: '#f59e0b', opacity: 0.8, margin: '0 auto 0.75rem auto' }} />
                        <h6 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                          Candidato en Banco General
                        </h6>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 1rem auto' }}>
                          Este candidato está registrado en la base de datos pero actualmente no tiene ninguna postulación activa a vacantes.
                        </p>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleOpenDirectApplyModal(selectedCandidate)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.45rem 1rem',
                            fontSize: '0.82rem',
                            background: '#f59e0b',
                            borderColor: '#f59e0b',
                            color: '#fff',
                            fontWeight: '600',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          <UserPlus className="icon-sm" style={{ width: '14px', height: '14px' }} />
                          Postular a una Vacante Activa
                        </button>
                      </div>
                    ) : (
                      <div className="app-evaluations-list">
                        {selectedCandidateApplications.map((app) => (
                          <div key={app.id} className="app-eval-card">
                            <div className="card-top">
                              <div className="vacancy-title">
                                <strong>{app.vacancy.title}</strong>
                                <span className="stage-label">{app.stage}</span>
                              </div>
                              <div className={`score-badge ${app.score >= 80 ? 'high' : app.score >= 60 ? 'medium' : 'low'}`}>
                                {app.score ? `${app.score}%` : 'Eval...'}
                              </div>
                            </div>

                            {app.evaluation_feedback ? (
                              <div className="eval-details-box">
                                <p className="overall-comment">
                                  <strong>Resumen de compatibilidad:</strong> {app.evaluation_feedback.analisis_general}
                                </p>
                                <div className="criterias-list">
                                  {app.evaluation_feedback.detalles?.map((det, idx) => (
                                    <div key={idx} className="criteria-detail-item">
                                      <div className="crit-header">
                                        <span className="name">{det.criterio}</span>
                                        <span className="weight">(Peso: {det.peso * 100}%)</span>
                                        <span className="score">Calificación: <strong>{det.puntuacion}</strong></span>
                                      </div>
                                      <p className="exp">{det.explicacion}</p>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleReevaluate(app.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                  >
                                    <RefreshCw className="icon-sm" /> Reevaluar Perfil con IA
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="loader-small">
                                <RefreshCw className="icon-spin icon-sm" /> <span>Calculando score explicable con Gemma...</span>
                              </div>
                            )}

                            {/* Historial de Tiempos por Etapa */}
                            <div className="kanban-timeline-section" style={{ marginTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                              <h6 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock className="icon-sm" style={{ color: 'var(--accent-light)' }} />
                                Tiempo de Permanencia en Etapas
                              </h6>
                              <div className="timeline-stages-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {getStageHistoryDurations(app.stage_history).map((t, idx) => {
                                  const stageLabels = {
                                    cv_recibido: "CV Recibido",
                                    pre_entrevista: "Pre-entrevista",
                                    sin_respuesta: "Sin Respuesta Pre-entrevista",
                                    entrevista: "Entrevista",
                                    evaluado: "Evaluado",
                                    roleplay: "Roleplay",
                                    capacitacion_1: "Capacitación 1",
                                    capacitacion_2: "Capacitación 2",
                                    contratado: "Contratado",
                                    rechazado: "Rechazado"
                                  };
                                  return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>{stageLabels[t.stage] || t.stage}</span>
                                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                        {formatDuration(t.durationSeconds)}
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '0.4rem' }}>
                                           (desde {new Date(t.changedAt).toLocaleDateString()} {new Date(t.changedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                                        </span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Acciones de Postulación (Reasignar y Eliminar / Desvincular) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenTransferModal(app)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-light)' }}
                                title="Reasignar o transferir este candidato a otra vacante activa"
                              >
                                <ArrowRightLeft className="icon-xs" style={{ width: '13px', height: '13px' }} />
                                Reasignar a otra vacante
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => handleDeleteApplication(app.id, app.vacancy?.title)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                                title="Eliminar postulación errónea y limpiar historial del proceso"
                              >
                                <Trash2 className="icon-xs" style={{ width: '13px', height: '13px' }} />
                                Desvincular de vacante
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: NOTAS DE RECLUTADORES */}
                {activeDetailTab === 'notes' && (
                  <div className="notes-tab">
                    {/* Formulario Nota */}
                    <form onSubmit={handleAddNote} className="note-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                          Fase asociada a la observación:
                        </label>
                        <select 
                          value={noteStage} 
                          onChange={(e) => setNoteStage(e.target.value)}
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '0.3rem 0.6rem', 
                            borderRadius: '6px', 
                            background: 'var(--bg-app)', 
                            border: '1px solid var(--border-color)', 
                            color: 'var(--text-primary)',
                            outline: 'none'
                          }}
                        >
                          <option value="">Nota General (Sin fase específica)</option>
                          <option value="cv_recibido">CV Recibido</option>
                          <option value="pre_entrevista">Pre-entrevista</option>
                          <option value="sin_respuesta">Sin Respuesta Pre-entrevista</option>
                          <option value="entrevista">Entrevista</option>
                          <option value="evaluado">Evaluado / Aprobado</option>
                          <option value="roleplay">Roleplay</option>
                          <option value="capacitacion_1">Capacitación 1</option>
                          <option value="capacitacion_2">Capacitación 2</option>
                          <option value="contratado">Contratado</option>
                          <option value="rechazado">Rechazado</option>
                        </select>
                      </div>
                      <textarea 
                        placeholder="Escribe una observación o nota interna sobre este perfil..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        required
                        rows={3}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-sm"
                          disabled={submittingNote || !newNote.trim()}
                        >
                          <Plus className="icon-sm" /> Registrar Nota
                        </button>
                      </div>
                    </form>

                    {/* Historial de Notas */}
                    <div className="notes-history-list">
                      <h5>Historial de Observaciones</h5>
                      {(!selectedCandidate.notes || selectedCandidate.notes.length === 0) ? (
                        <p className="muted-text">No hay observaciones registradas. Agrega una arriba.</p>
                      ) : (
                        <div className="notes-timeline">
                          {selectedCandidate.notes.map((note) => (
                            <div key={note.id} className="note-item-card">
                              <div className="note-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span className="author"><User className="icon-sm inline-icon" /> {note.author}</span>
                                  {note.stage && (
                                    <span>{getStageBadge(note.stage)}</span>
                                  )}
                                </div>
                                <span className="date"><Calendar className="icon-sm inline-icon" /> {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <p className="note-text" style={{ marginTop: '0.4rem' }}>{note.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: BITÁCORA DE PROCESAMIENTO IA */}
                {activeDetailTab === 'logs' && (
                  <div className="logs-tab">
                    <h5>Bitácora de Procesamiento de IA</h5>
                    {(!selectedCandidate.logs || selectedCandidate.logs.length === 0) ? (
                      <p className="muted-text">No hay logs de procesamiento registrados.</p>
                    ) : (
                      <div className="logs-timeline">
                        {selectedCandidate.logs.map((log) => (
                          <div key={log.id} className={`log-event-card ${log.status}`}>
                            <div className="log-event-header">
                              <span className="step-name">{log.step === 'lectura_pdf' ? 'Lectura y Extracción PDF' : 'Extracción Semántica Gemma'}</span>
                              <span className={`status-pill ${log.status}`}>{log.status}</span>
                            </div>
                            {log.message && <p className="log-msg">{log.message}</p>}
                            <span className="log-time">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

      {/* CREAR / EDITAR VACANTE MODAL */}
      {vacancyModalOpen && (
        <div className="modal-overlay" onClick={() => { setVacancyModalOpen(false); setEditingVacancy(null); }}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pane-header">
              <h3>{editingVacancy ? `Editar Vacante: ${editingVacancy.title}` : 'Crear Nueva Vacante de Empleo'}</h3>
              <button className="close-btn" onClick={() => { setVacancyModalOpen(false); setEditingVacancy(null); }}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveVacancy} className="vacancy-form">
              <div className="form-group">
                <label>Título del Puesto</label>
                <input 
                  type="text" 
                  placeholder="Ej: Ejecutivo de Ventas IMSS, Desarrollador React..." 
                  value={newVacancy.title}
                  onChange={(e) => setNewVacancy(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Estado de la Vacante</label>
                <select
                  value={newVacancy.status || 'abierta'}
                  onChange={(e) => setNewVacancy(prev => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    outline: 'none'
                  }}
                >
                  <option value="abierta">Abierta (Recepción de postulaciones y evaluación activa)</option>
                  <option value="cerrada">Cerrada (Concluida o pausada)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Descripción General</label>
                <textarea 
                  placeholder="Objetivos del puesto y funciones principales..."
                  value={newVacancy.description}
                  onChange={(e) => setNewVacancy(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Requisitos Exigidos</label>
                <textarea 
                  placeholder="Escolaridad, experiencia técnica, conocimientos..."
                  value={newVacancy.requirements}
                  onChange={(e) => setNewVacancy(prev => ({ ...prev, requirements: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Rango de Edad Deseado */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.88rem' }}>
                  <User className="icon-xs" style={{ color: 'var(--accent-light)' }} />
                  Rango de Edad Deseado (Parámetro General para Alertas)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.35rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Edad Mínima (Años)</label>
                    <input 
                      type="number" 
                      placeholder="Ej: 25" 
                      value={newVacancy.min_age ?? ''}
                      onChange={(e) => setNewVacancy(prev => ({ ...prev, min_age: e.target.value }))}
                      min="18"
                      max="99"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Edad Máxima (Años)</label>
                    <input 
                      type="number" 
                      placeholder="Ej: 55" 
                      value={newVacancy.max_age ?? ''}
                      onChange={(e) => setNewVacancy(prev => ({ ...prev, max_age: e.target.value }))}
                      min="18"
                      max="99"
                      style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', marginTop: '0.2rem' }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                  Define los límites deseados para generar alertas visuales automáticas cuando los postulantes queden fuera de este rango.
                </span>
              </div>

              {/* Asignación de Evaluadores y Gerente Responsable (P1 RBAC + Áreas Dinámicas) */}
              <div className="form-group" style={{ background: 'var(--bg-app)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
                  <Users className="icon-xs" style={{ color: 'var(--accent-light)' }} />
                  Estructura Organizacional y Evaluadores Asignados
                </label>

                {/* Selector de Área con Efecto Cascada */}
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    🏢 Área / Departamento Organizacional
                  </label>
                  <select
                    value={newVacancy.department_id || ''}
                    onChange={(e) => {
                      const dId = e.target.value ? parseInt(e.target.value) : '';
                      const selectedDept = departments.find(d => d.id === dId);
                      setNewVacancy(prev => ({
                        ...prev,
                        department_id: dId,
                        // Auto-asignación inteligente de los líderes de dicha área:
                        manager_id: selectedDept?.manager_id || prev.manager_id,
                        evaluator_user_id: selectedDept?.trainer_id || prev.evaluator_user_id
                      }));
                    }}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.82rem', fontWeight: '600' }}
                  >
                    <option value="">-- Sin Área Organizacional Específica --</option>
                    {departments.filter(d => d.is_active).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''} {d.manager ? `• Gerente: ${d.manager.full_name}` : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    ⚡ Al seleccionar un área se auto-asignan su Gerente titular (Entrevista/Roleplay) y Evaluador (Capacitación).
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      👔 Gerente Responsable (Entrevista & Roleplay)
                    </label>
                    <select
                      value={newVacancy.manager_id || ''}
                      onChange={(e) => setNewVacancy(prev => ({ ...prev, manager_id: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.8rem' }}
                    >
                      <option value="">-- Sin Gerente Asignado --</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.department || 'Ventas'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      🎓 Evaluador de Capacitación (Fase 1 y 2)
                    </label>
                    <select
                      value={newVacancy.evaluator_user_id || ''}
                      onChange={(e) => setNewVacancy(prev => ({ ...prev, evaluator_user_id: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.8rem' }}
                    >
                      <option value="">-- Sin Evaluador Específico --</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.department || 'Capacitación'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="criteria-header-form">
                  <label>Criterios de Evaluación de IA (La suma de pesos debe ser 1.0 o 100%)</label>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddCriterionField}
                  >
                    <Plus className="icon-sm" /> Agregar Criterio
                  </button>
                </div>

                <div className="criteria-inputs-list">
                  {newVacancy.evaluation_criteria.map((crit, idx) => (
                    <div key={idx} className="criteria-input-row">
                      <input 
                        type="text" 
                        placeholder={`Criterio ${idx + 1} (Ej: Negociación, React)`}
                        value={crit.criterio}
                        onChange={(e) => handleCriterionChange(idx, 'criterio', e.target.value)}
                        required
                        className="crit-input-name"
                      />
                      <input 
                        type="number" 
                        step="0.05" 
                        placeholder="Peso"
                        value={crit.peso}
                        onChange={(e) => handleCriterionChange(idx, 'peso', e.target.value)}
                        required
                        className="crit-input-weight"
                      />
                      {newVacancy.evaluation_criteria.length > 1 && (
                        <button 
                          type="button" 
                          className="btn-remove-row"
                          onClick={() => handleRemoveCriterionField(idx)}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer-form">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { setVacancyModalOpen(false); setEditingVacancy(null); }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingVacancy ? 'Guardar Cambios' : 'Crear Vacante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POSTULAR CANDIDATO MODAL */}
      {activeVacancyForApply && (
        <div className="modal-overlay" onClick={() => setActiveVacancyForApply(null)}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pane-header">
              <h3>Postular a: {activeVacancyForApply.title}</h3>
              <button className="close-btn" onClick={() => setActiveVacancyForApply(null)}>&times;</button>
            </div>

            {/* Sub-pestañas para elegir modo */}
            <div className="tabs-bar" style={{ padding: '0 2rem' }}>
              <button 
                type="button"
                className={`tab-btn ${postulateMode === 'select' ? 'active' : ''}`}
                onClick={() => setPostulateMode('select')}
              >
                Candidato Existente
              </button>
              <button 
                type="button"
                className={`tab-btn ${postulateMode === 'upload' ? 'active' : ''}`}
                onClick={() => setPostulateMode('upload')}
              >
                Subir Nuevo PDF
              </button>
            </div>
            
            {postulateMode === 'select' ? (
              <form onSubmit={handleApplyCandidate} className="apply-form">
                <p className="form-info-text">
                  Selecciona uno de los candidatos ya procesados del sistema para evaluarlo frente a esta vacante.
                </p>

                <div className="form-group">
                  <label>Selecciona un Candidato</label>
                  <select 
                    value={selectedCandidateForApply}
                    onChange={(e) => setSelectedCandidateForApply(e.target.value)}
                    required
                  >
                    <option value="">-- Elige un Candidato --</option>
                    {candidates
                      .filter(cand => cand.status === 'completado')
                      .map(cand => (
                        <option key={cand.id} value={cand.id}>
                          {cand.name} ({cand.email || cand.filename})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="modal-footer-form">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setActiveVacancyForApply(null)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!selectedCandidateForApply}
                  >
                    Confirmar Postulación
                  </button>
                </div>
              </form>
            ) : (
              <div className="apply-form">
                <p className="form-info-text">
                  Sube directamente el currículum de este nuevo prospecto. Se extraerá su información y se evaluará frente a esta vacante de inmediato en segundo plano.
                </p>

                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <Globe className="icon-xs" style={{ color: 'var(--accent-light)' }} />
                    Plataforma o Fuente de Reclutamiento:
                  </label>
                  <select 
                    value={vacancyApplySource}
                    onChange={(e) => setVacancyApplySource(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                  >
                    {candidateSources.map((src, idx) => (
                      <option key={idx} value={src}>{src}</option>
                    ))}
                    <option value="No especificada">⚪ No especificada</option>
                  </select>
                </div>
                
                <div 
                  className="dropzone-interactive"
                  style={{ padding: '1.5rem', margin: '0.5rem 0' }}
                >
                  <div className="dropzone-content">
                    <UploadCloud className="upload-icon" />
                    <h4>Selecciona el currículum PDF</h4>
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => uploadAndApplyForVacancy(e.target.files, activeVacancyForApply.id, vacancyApplySource)} 
                      style={{ display: 'block', margin: '0.5rem auto 0 auto' }}
                    />
                  </div>
                </div>

                <div className="modal-footer-form">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setActiveVacancyForApply(null)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PREGUNTA ASOCIACIÓN DE VACANTE AL SUBIR CV DESDE POOL */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pane-header">
              <h3>Subir y Postular Candidato</h3>
              <button className="close-btn" onClick={() => setUploadModalOpen(false)}>&times;</button>
            </div>
            
            <div className="apply-form">
              <p className="form-info-text">
                Has seleccionado {pendingFilesToUpload.length} archivo(s) para subir al sistema. <br />
                ¿Deseas postular al candidato automáticamente a alguna de las vacantes activas?
              </p>

              <div className="form-group">
                <label>Vincular a Vacante (Opcional)</label>
                <select 
                  value={targetVacancyForUpload}
                  onChange={(e) => setTargetVacancyForUpload(e.target.value)}
                >
                  <option value="">Ninguna (Solo registrar candidato en el pool general)</option>
                  {vacancies.map(vac => (
                    <option key={vac.id} value={vac.id}>
                      {vac.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Globe className="icon-xs" style={{ color: 'var(--accent-light)' }} />
                  Plataforma o Fuente de Reclutamiento:
                </label>
                <select 
                  value={isCustomSource ? '__custom__' : targetSourceForUpload}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomSource(true);
                      setCustomSourceValue('');
                    } else {
                      setIsCustomSource(false);
                      setTargetSourceForUpload(e.target.value);
                    }
                  }}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)' }}
                >
                  {candidateSources.map((src, idx) => (
                    <option key={idx} value={src}>{src}</option>
                  ))}
                  <option value="No especificada">⚪ No especificada</option>
                  <option value="__custom__">➕ Agregar nueva fuente...</option>
                </select>

                {isCustomSource && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Escribe el nombre de la plataforma (ej. OCC, Indeed, Talenteca, Bolsa UNAM)..."
                      value={customSourceValue}
                      onChange={(e) => setCustomSourceValue(e.target.value)}
                      autoFocus
                      required
                      style={{ fontSize: '0.85rem' }}
                    />
                    <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      Esta nueva fuente se guardará automáticamente en el catálogo para futuras postulaciones.
                    </small>
                  </div>
                )}
              </div>

              <div className="modal-footer-form">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setUploadModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={executeFileUpload}
                >
                  Subir y Procesar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ENVÍO POR WHATSAPP */}
      {waModalOpen && waCandidate && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setWaModalOpen(false)}>
          <div 
            className="modal-content-container small-modal" 
            style={{ maxWidth: '520px', height: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pane-header" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                  <MessageCircle style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Enviar Invitación por WhatsApp</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pre-entrevista con Asistente Virtual OctyBot</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setWaModalOpen(false)} style={{ fontSize: '1.6rem' }}>&times;</button>
            </div>

            <form onSubmit={handleConfirmSendWhatsApp} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* Tarjeta con datos del postulante */}
              <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{waCandidate.name}</strong>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: '600' }}>
                    {waApplication?.vacancy?.title || 'Vacante General'}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {waCandidate.email || 'Sin correo registrado'}
                </span>
              </div>

              {/* Selector de número telefónico destino */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                  ¿A qué número deseas enviar la invitación?
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {/* Opción 1: Número registrado */}
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.6rem', 
                    padding: '0.65rem 0.85rem', 
                    borderRadius: '8px', 
                    border: `1px solid ${waPhoneOption === 'registered' ? '#22c55e' : 'var(--border-color)'}`,
                    background: waPhoneOption === 'registered' ? 'rgba(34, 197, 94, 0.06)' : 'transparent',
                    cursor: waCandidate.phone ? 'pointer' : 'not-allowed',
                    opacity: waCandidate.phone ? 1 : 0.6
                  }}>
                    <input 
                      type="radio" 
                      name="waPhoneOption" 
                      value="registered" 
                      checked={waPhoneOption === 'registered'} 
                      onChange={() => waCandidate.phone && setWaPhoneOption('registered')}
                      disabled={!waCandidate.phone}
                    />
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                        Número registrado en el CV
                      </span>
                      <span style={{ fontSize: '0.75rem', color: waCandidate.phone ? '#22c55e' : 'var(--text-muted)' }}>
                        {waCandidate.phone ? `📱 ${waCandidate.phone}` : '(El CV no tiene teléfono registrado)'}
                      </span>
                    </div>
                  </label>

                  {/* Opción 2: Número de prueba / cambiar número */}
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '0.6rem', 
                    padding: '0.65rem 0.85rem', 
                    borderRadius: '8px', 
                    border: `1px solid ${waPhoneOption === 'custom' ? '#22c55e' : 'var(--border-color)'}`,
                    background: waPhoneOption === 'custom' ? 'rgba(34, 197, 94, 0.06)' : 'transparent',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="waPhoneOption" 
                      value="custom" 
                      checked={waPhoneOption === 'custom'} 
                      onChange={() => setWaPhoneOption('custom')}
                      style={{ marginTop: '0.25rem' }}
                    />
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                        🧪 Número alternativo o de prueba
                      </span>
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                        Ideal para enviarte el enlace a tu propio WhatsApp y probar el flujo antes de enviarlo al candidato.
                      </span>
                      {waPhoneOption === 'custom' && (
                        <input 
                          type="tel" 
                          placeholder="Ej: 55 1234 5678 (10 dígitos)" 
                          value={waCustomPhone} 
                          onChange={(e) => setWaCustomPhone(e.target.value)}
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-app)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            outline: 'none'
                          }}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Casilla para avanzar etapa */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  checked={waAdvanceStage} 
                  onChange={(e) => setWaAdvanceStage(e.target.checked)} 
                />
                <span>Avanzar automáticamente la postulación a etapa <strong>Pre-entrevista</strong></span>
              </label>

              {/* Vista previa del mensaje */}
              <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Vista previa del mensaje pre-cargado:
                </span>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', margin: 0, lineHeight: '1.4' }}>
                  {`Hola ${waCandidate.name?.trim().split(' ')[0] || 'Candidato'} 👋\n\nHemos revisado tu postulación para la vacante de ${waApplication?.vacancy?.title || 'la vacante'}.\n\nPara continuar con el proceso de selección, te invitamos a realizar una breve preentrevista con nuestro asistente de IA OctyBot en Telegram.\n\nPuedes comenzar aquí:\nhttps://t.me/${settingsData.telegram_bot_username || 'OctyBot_HR_Bot'}?start=app_${waApplication?.id || ''}`}
                </p>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.3rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setWaModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-sm"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    padding: '0.5rem 1.25rem', 
                    fontSize: '0.85rem', 
                    background: '#16a34a', 
                    borderColor: '#16a34a', 
                    color: '#fff', 
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <MessageCircle style={{ width: '16px', height: '16px' }} />
                  🟢 Abrir en WhatsApp
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: POSTULAR DIRECTAMENTE A VACANTE (Para candidatos en Banco General) */}
      {directApplyModalOpen && (
        <div className="modal-overlay" onClick={() => !applyingDirect && setDirectApplyModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus className="icon-md" style={{ color: '#f59e0b' }} />
                <h3>Postular Candidato a Vacante</h3>
              </div>
              <button className="close-btn" onClick={() => !applyingDirect && setDirectApplyModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleConfirmDirectApply} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Selecciona la vacante activa a la que deseas postular a <strong>{selectedCandidate?.name}</strong>. Se creará su postulación inicial y se evaluará su compatibilidad con IA.
              </p>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Vacante Destino
                </label>
                <select
                  value={targetVacancyForDirectApply}
                  onChange={(e) => setTargetVacancyForDirectApply(e.target.value)}
                  required
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Seleccionar vacante --</option>
                  {vacancies.filter(v => v.status === 'abierta').map(vac => (
                    <option key={vac.id} value={vac.id}>
                      {vac.title} ({vac.department || 'Sin depto'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={applyingDirect}
                  onClick={() => setDirectApplyModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  disabled={applyingDirect || !targetVacancyForDirectApply}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    background: '#f59e0b',
                    borderColor: '#f59e0b',
                    color: '#fff',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: applyingDirect ? 'not-allowed' : 'pointer'
                  }}
                >
                  {applyingDirect ? (
                    <>
                      <RefreshCw className="icon-spin icon-sm" /> Postulando...
                    </>
                  ) : (
                    <>
                      <UserPlus style={{ width: '15px', height: '15px' }} /> Confirmar Postulación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REASIGNAR / TRANSFERIR POSTULACIÓN A OTRA VACANTE */}
      {transferModalOpen && appToTransfer && (
        <div className="modal-overlay" onClick={() => !transferringApp && setTransferModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRightLeft className="icon-md" style={{ color: 'var(--accent-light)' }} />
                <h3>Reasignar a otra Vacante</h3>
              </div>
              <button className="close-btn" onClick={() => !transferringApp && setTransferModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleConfirmTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong>Candidato:</strong> {selectedCandidate?.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  <strong>Vacante Actual:</strong> <span style={{ color: '#ef4444' }}>{appToTransfer.vacancy?.title}</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>
                  ℹ️ La postulación actual y su historial de etapas se eliminarán de forma limpia, y se abrirá una nueva postulación en la vacante seleccionada en fase inicial (<strong>CV Recibido</strong>).
                </p>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Nueva Vacante de Destino
                </label>
                <select
                  value={targetVacancyForTransfer}
                  onChange={(e) => setTargetVacancyForTransfer(e.target.value)}
                  required
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Seleccionar vacante de destino --</option>
                  {vacancies
                    .filter(v => v.id !== appToTransfer.vacancy_id)
                    .map(vac => (
                      <option key={vac.id} value={vac.id}>
                        {vac.title} ({vac.department || 'Sin depto'})
                      </option>
                    ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={transferReevaluate}
                  onChange={(e) => setTransferReevaluate(e.target.checked)}
                />
                <span>Recalcular automáticamente el Score IA de compatibilidad para la nueva vacante</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={transferringApp}
                  onClick={() => setTransferModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={transferringApp || !targetVacancyForTransfer}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '8px',
                    cursor: transferringApp ? 'not-allowed' : 'pointer'
                  }}
                >
                  {transferringApp ? (
                    <>
                      <RefreshCw className="icon-spin icon-sm" /> Reasignando...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft style={{ width: '15px', height: '15px' }} /> Confirmar Reasignación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CAMBIAR PLATAFORMA DE ORIGEN DE CANDIDATO */}
      {changeSourceModalOpen && candidateToChangeSource && (
        <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setChangeSourceModalOpen(false)}>
          <div className="modal-content-container small-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="pane-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe className="icon-md" style={{ color: 'var(--accent-light)' }} />
                <h3 style={{ margin: 0 }}>Modificar Plataforma de Origen</h3>
              </div>
              <button className="close-btn" onClick={() => setChangeSourceModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveCandidateSource} className="apply-form" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>Candidato:</strong> {candidateToChangeSource.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Origen actual: <strong>{candidateToChangeSource.source || 'Sin especificar'}</strong>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Selecciona la plataforma o canal de origen:
                </label>
                <select 
                  value={isCustomNewSource ? '__custom__' : selectedNewSource}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomNewSource(true);
                      setCustomNewSourceInput('');
                    } else {
                      setIsCustomNewSource(false);
                      setSelectedNewSource(e.target.value);
                    }
                  }}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                >
                  <option value="No especificada">⚪ Sin especificar / No detectada</option>
                  {candidateSources.map((src, idx) => (
                    <option key={idx} value={src}>{src}</option>
                  ))}
                  <option value="__custom__">➕ Otra plataforma / Agregar nueva...</option>
                </select>
              </div>

              {isCustomNewSource && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Escribe el nombre de la nueva plataforma:</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="Ej. OCC Mundial, Indeed, Computrabajo, etc."
                    value={customNewSourceInput}
                    onChange={(e) => setCustomNewSourceInput(e.target.value)}
                    autoFocus
                    required
                  />
                  <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Se guardará automáticamente en el catálogo para futuras postulaciones.
                  </small>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setChangeSourceModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingCandidateSource}>
                  {updatingCandidateSource ? 'Guardando...' : 'Guardar Plataforma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA RENOMBRAR PLATAFORMA DEL CATÁLOGO */}
      {renameModalOpen && sourceToRename && (
        <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setRenameModalOpen(false)}>
          <div className="modal-content-container small-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="pane-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit className="icon-md" style={{ color: 'var(--accent-light)' }} />
                <h3 style={{ margin: 0 }}>Renombrar Plataforma</h3>
              </div>
              <button className="close-btn" onClick={() => setRenameModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleConfirmRenameSource} className="apply-form" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Plataforma actual: <strong style={{ color: 'var(--text-primary)' }}>{sourceToRename}</strong><br />
                Al guardar, se actualizará el nombre en el catálogo y en todos los candidatos asociados a ella.
              </p>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Nuevo Nombre de la Plataforma:</label>
                <input 
                  type="text"
                  className="form-input"
                  value={renameSourceInput}
                  onChange={(e) => setRenameSourceInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setRenameModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Nombre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EVALUACIÓN DE ETAPA (P1 EVALUADORES Y GERENTES) */}
      {evalModalOpen && evalApplication && selectedCandidate && (
        <div className="modal-overlay" onClick={() => setEvalModalOpen(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="pane-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award className="pane-icon" style={{ color: 'var(--accent-light)' }} />
                <h3 style={{ margin: 0 }}>Dictamen de Evaluación de Etapa</h3>
              </div>
              <button className="close-btn" onClick={() => setEvalModalOpen(false)}>&times;</button>
            </div>

            <div style={{ background: 'var(--bg-app)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', margin: '1rem 0', fontSize: '0.82rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div><strong>Candidato:</strong> {selectedCandidate.name}</div>
                <div><strong>Vacante:</strong> {evalApplication.vacancy?.title}</div>
                <div><strong>Evaluador:</strong> {currentUser?.full_name}</div>
                <div><strong>Departamento:</strong> {currentUser?.department || 'Evaluación'}</div>
              </div>
            </div>

            <form onSubmit={handleSubmitEvaluation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Etapa a Dictaminar</label>
                <select 
                  className="form-input"
                  value={evalStage}
                  onChange={(e) => setEvalStage(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="entrevista">💼 Entrevista Inicial (Gerente de Vacante)</option>
                  <option value="roleplay">🎭 Roleplay Comercial (Gerente de Vacante)</option>
                  <option value="capacitacion_1">🎓 Capacitación 1 (Instructor / Evaluador)</option>
                  <option value="capacitacion_2">🏆 Capacitación 2 Final (Instructor / Evaluador)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Dictamen Oficial</label>
                <div className="evaluation-verdict-selector">
                  <button
                    type="button"
                    className={`verdict-btn aprobado ${evalVerdict === 'aprobado' ? 'selected' : ''}`}
                    onClick={() => setEvalVerdict('aprobado')}
                  >
                    <CheckCircle style={{ width: '20px', height: '20px' }} />
                    <span>Aprobado</span>
                    <small style={{ fontSize: '0.68rem', fontWeight: 'normal' }}>Apto para avanzar</small>
                  </button>
                  <button
                    type="button"
                    className={`verdict-btn requiere_refuerzo ${evalVerdict === 'requiere_refuerzo' ? 'selected' : ''}`}
                    onClick={() => setEvalVerdict('requiere_refuerzo')}
                  >
                    <AlertTriangle style={{ width: '20px', height: '20px' }} />
                    <span>Refuerzo</span>
                    <small style={{ fontSize: '0.68rem', fontWeight: 'normal' }}>Con observaciones</small>
                  </button>
                  <button
                    type="button"
                    className={`verdict-btn no_aprobado ${evalVerdict === 'no_aprobado' ? 'selected' : ''}`}
                    onClick={() => setEvalVerdict('no_aprobado')}
                  >
                    <XCircle style={{ width: '20px', height: '20px' }} />
                    <span>No Aprobado</span>
                    <small style={{ fontSize: '0.68rem', fontWeight: 'normal' }}>No cumple perfil</small>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Calificación de Etapa (0-100%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={evalScore}
                    onChange={(e) => setEvalScore(e.target.value)}
                    className="form-input"
                    placeholder="Ej: 85"
                  />
                </div>

                <div style={{ paddingTop: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={evalAdvanceStage}
                      onChange={(e) => setEvalAdvanceStage(e.target.checked)}
                      disabled={evalVerdict !== 'aprobado'}
                    />
                    <span>Avanzar en Kanban si es aprobado</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Observaciones y Retroalimentación Técnica *</label>
                <textarea 
                  rows={4}
                  className="form-input"
                  value={evalNotes}
                  onChange={(e) => setEvalNotes(e.target.value)}
                  placeholder="Escribe la justificación del dictamen, fortalezas detectadas, áreas de oportunidad y retroalimentación para el expediente..."
                  required
                  style={{ fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEvalModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingEval || !evalNotes.trim()}>
                  {submittingEval ? 'Guardando dictamen...' : '✍️ Firmar y Guardar Dictamen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE LOGIN / CAMBIO DE ROL DEMO */}
      {authModalOpen && (
        <div className="modal-overlay" onClick={() => setAuthModalOpen(false)} style={{ zIndex: 1200 }}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="pane-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock className="pane-icon" style={{ color: 'var(--accent-light)' }} />
                <h3 style={{ margin: 0 }}>Acceso y Cambio de Rol (Modelo RBAC)</h3>
              </div>
              <button className="close-btn" onClick={() => setAuthModalOpen(false)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 1rem 0' }}>
              Selecciona un perfil de demostración para evaluar las vistas y permisos según el caso de uso real en Octopy:
            </p>

            {/* Selector de Cuentas Demo en 1 Clic */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {DEMO_ACCOUNTS.map((acc, idx) => {
                const isCurrent = currentUser?.email === acc.email;
                return (
                  <div 
                    key={idx}
                    className={`auth-role-card ${isCurrent ? 'active' : ''}`}
                    onClick={() => handleLogin(null, acc)}
                  >
                    <span style={{ fontSize: '1.4rem' }}>{acc.icon}</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{acc.name}</strong>
                        {isCurrent && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Sesión Activa</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {acc.roleLabel} • <span style={{ color: 'var(--text-muted)' }}>{acc.dept}</span>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '0.72rem' }}
                    >
                      {isCurrent ? 'Actual' : 'Ingresar'}
                    </button>
                  </div>
                );
              })}
            </div>

            {loginError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {loginError}
              </div>
            )}

            {/* Formulario Manual de Credenciales */}
            <details style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.8rem' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--accent-light)', fontWeight: '600' }}>
                O ingresar con correo y contraseña específicos...
              </summary>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Correo Electrónico</label>
                  <input 
                    type="email"
                    className="form-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    placeholder="usuario@octopy.com"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '600' }}>Contraseña</label>
                  <input 
                    type="password"
                    className="form-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loginLoading}>
                  {loginLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>
            </details>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO USUARIO (RBAC) */}
      {newUserModalOpen && (
        <div className="modal-overlay" onClick={() => setNewUserModalOpen(false)} style={{ zIndex: 1250 }}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="pane-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus className="pane-icon" style={{ color: 'var(--accent-light)' }} />
                <h3 style={{ margin: 0 }}>Registrar Nuevo Colaborador</h3>
              </div>
              <button className="close-btn" onClick={() => setNewUserModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem 0' }}>
              {/* Selector de Modo de Alta: Plantilla por Puesto vs Configuración Manual */}
              <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-app)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setNewUserForm(prev => ({ ...prev, provisionMode: 'template' }))}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.5rem',
                    fontSize: '0.78rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: newUserForm.provisionMode === 'template' ? 'var(--accent-light)' : 'transparent',
                    color: newUserForm.provisionMode === 'template' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  🎯 Aprovisionar por Puesto
                </button>
                <button
                  type="button"
                  onClick={() => setNewUserForm(prev => ({ ...prev, provisionMode: 'manual', selectedPositionKey: '', assign_as_dept_manager: null, assign_as_dept_trainer: null }))}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.5rem',
                    fontSize: '0.78rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: newUserForm.provisionMode === 'manual' ? 'var(--accent-light)' : 'transparent',
                    color: newUserForm.provisionMode === 'manual' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  🛠️ Configuración Manual
                </button>
              </div>

              {newUserForm.provisionMode === 'template' && (
                <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Briefcase className="icon-xs" style={{ color: 'var(--accent-light)' }} />
                    Posición u Organigrama a Cubrir:
                  </label>
                  <select
                    className="form-input"
                    value={newUserForm.selectedPositionKey || ''}
                    onChange={(e) => {
                      const key = e.target.value;
                      if (!key) {
                        setNewUserForm(prev => ({
                          ...prev,
                          selectedPositionKey: '',
                          department_id: '',
                          department: 'Recursos Humanos',
                          role_ids: ['Reclutador_Senior'],
                          assign_as_dept_manager: null,
                          assign_as_dept_trainer: null
                        }));
                        return;
                      }
                      const [posType, strId] = key.split('_');
                      const dId = parseInt(strId);
                      const dObj = departments.find(d => d.id === dId);
                      if (posType === 'manager') {
                        setNewUserForm(prev => ({
                          ...prev,
                          selectedPositionKey: key,
                          department_id: dId,
                          department: dObj ? dObj.name : '',
                          role_ids: ['Gerente_Vacante'],
                          assign_as_dept_manager: dId,
                          assign_as_dept_trainer: null
                        }));
                      } else if (posType === 'trainer') {
                        setNewUserForm(prev => ({
                          ...prev,
                          selectedPositionKey: key,
                          department_id: dId,
                          department: dObj ? dObj.name : '',
                          role_ids: ['Evaluador_Capacitacion'],
                          assign_as_dept_manager: null,
                          assign_as_dept_trainer: dId
                        }));
                      }
                    }}
                    required={newUserForm.provisionMode === 'template'}
                    style={{ fontSize: '0.82rem', fontWeight: '600', marginTop: '0.35rem' }}
                  >
                    <option value="">-- Selecciona la posición que ocupará --</option>
                    <optgroup label="👔 Gerentes Titulares de Área (Entrevista & Roleplay)">
                      {departments.filter(d => d.is_active).map(d => (
                        <option key={`manager_${d.id}`} value={`manager_${d.id}`}>
                          Gerente Titular de {d.name} {d.manager ? `(Titular actual: ${d.manager.full_name})` : '(Posición Vacante ⭐)'}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🎓 Evaluadores de Capacitación (Fases 1 y 2)">
                      {departments.filter(d => d.is_active).map(d => (
                        <option key={`trainer_${d.id}`} value={`trainer_${d.id}`}>
                          Evaluador Titular de {d.name} {d.trainer ? `(Titular actual: ${d.trainer.full_name})` : '(Posición Vacante ⭐)'}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {newUserForm.selectedPositionKey && (
                    <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.65rem', background: 'var(--bg-app)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div>🏢 <strong>Área organizacional:</strong> <span style={{ color: 'var(--text-primary)' }}>{newUserForm.department}</span></div>
                      <div>🛡️ <strong>Rol asignado automáticamente:</strong> <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>{newUserForm.role_ids[0] === 'Gerente_Vacante' ? 'Gerente de Vacante' : 'Evaluador de Capacitación'}</span></div>
                      <div style={{ color: 'var(--accent-light)', fontWeight: '600', marginTop: '0.1rem' }}>
                        ⚡ Al crearse, este usuario quedará registrado de inmediato como responsable titular de esta área y evaluador de sus vacantes.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Nombre Completo *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="Ej: Lic. Mariana Soto" 
                  value={newUserForm.full_name} 
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))} 
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Correo Electrónico Corporativo *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  required 
                  placeholder="ejemplo@octopy.com" 
                  value={newUserForm.email} 
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))} 
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Contraseña Temporal *</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  placeholder="Mínimo 8 caracteres" 
                  value={newUserForm.password} 
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))} 
                />
              </div>

              {newUserForm.provisionMode === 'manual' && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Área / Departamento Organizacional</label>
                    <select
                      className="form-input"
                      value={newUserForm.department_id || ''}
                      onChange={(e) => {
                        const dId = e.target.value ? parseInt(e.target.value) : '';
                        const dObj = departments.find(d => d.id === dId);
                        setNewUserForm(prev => ({
                          ...prev,
                          department_id: dId,
                          department: dObj ? dObj.name : 'Recursos Humanos'
                        }));
                      }}
                    >
                      <option value="">-- Sin Área Específica / General (Asignar después) --</option>
                      {departments.filter(d => d.is_active).map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.code ? `(${d.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                      Opcional. Puedes asociar el usuario a un área existente o asignarla posteriormente.
                    </span>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Rol Principal Asignado</label>
                    <select
                      className="form-input"
                      value={newUserForm.role_ids[0] || 'Reclutador_Senior'}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, role_ids: [e.target.value] }))}
                    >
                      <option value="Reclutador_Senior">Reclutador Senior (Vacantes, Candidatos y Evaluaciones)</option>
                      <option value="Reclutador_Junior">Reclutador Junior (Revisión y Movimiento)</option>
                      <option value="Gerente_Vacante">Gerente de Vacante (Entrevista y Roleplay)</option>
                      <option value="Evaluador_Capacitacion">Evaluador de Capacitación (Capacitación 1 y 2)</option>
                      <option value="Gerente_RH">Gerente de RH (Acceso Operativo Integral)</option>
                      <option value="Auditor_Privacidad">Auditor de Privacidad (LFPDPPP y Purga)</option>
                      <option value="SuperAdmin">Super Administrador (Control Total)</option>
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setNewUserModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingUser}>
                  {creatingUser ? 'Guardando...' : 'Crear Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR COLABORADOR Y ASIGNAR ROLES (RBAC) */}
      {editUserModalOpen && editingUser && (
        <div className="modal-overlay" onClick={() => setEditUserModalOpen(false)} style={{ zIndex: 1260 }}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="pane-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit className="pane-icon" style={{ color: 'var(--accent-light)' }} />
                <h3 style={{ margin: 0 }}>Editar Colaborador y Asignar Roles</h3>
              </div>
              <button className="close-btn" onClick={() => setEditUserModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveEditUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Nombre Completo *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={editUserForm.full_name} 
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))} 
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Correo Electrónico (No editable)</label>
                <input 
                  type="email" 
                  className="form-input" 
                  disabled
                  value={editingUser.email} 
                  style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Área / Departamento Organizacional</label>
                  <select
                    className="form-input"
                    value={editUserForm.department_id || ''}
                    onChange={(e) => {
                      const dId = e.target.value ? parseInt(e.target.value) : '';
                      const dObj = departments.find(d => d.id === dId);
                      setEditUserForm(prev => ({
                        ...prev,
                        department_id: dId,
                        department: dObj ? dObj.name : 'General'
                      }));
                    }}
                  >
                    <option value="">-- Sin Área / General --</option>
                    {departments.filter(d => d.is_active).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Estado Cuenta</label>
                  <select
                    className="form-input"
                    value={editUserForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Nueva Contraseña (Opcional)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Dejar en blanco para mantener la actual"
                  value={editUserForm.new_password} 
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, new_password: e.target.value }))} 
                />
              </div>

              {/* SELECTOR DE ROLES JERÁRQUICOS CON CHECKBOXES */}
              <div className="form-group" style={{ background: 'var(--bg-app)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                  🛡️ Asignación de Roles del Sistema (Multi-Rol):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { id: 'SuperAdmin', name: 'Super Administrador', desc: 'Acceso total y sin restricciones a todos los módulos y auditoría.', color: '#155dfc' },
                    { id: 'Gerente_RH', name: 'Gerente de Recursos Humanos', desc: 'Operación completa de vacantes, candidatos, configuraciones y usuarios.', color: '#2563eb' },
                    { id: 'Reclutador_Senior', name: 'Reclutador Senior', desc: 'Gestión integral de vacantes, candidatos, simulador y evaluaciones.', color: '#615fff' },
                    { id: 'Reclutador_Junior', name: 'Reclutador Junior', desc: 'Revisión y movimiento básico de candidatos en el embudo.', color: '#0ea5e9' },
                    { id: 'Gerente_Vacante', name: 'Gerente de Vacante (Hiring Manager)', desc: 'Evaluador de Entrevista y Roleplay en sus vacantes asignadas.', color: '#f59e0b' },
                    { id: 'Evaluador_Capacitacion', name: 'Evaluador de Capacitación', desc: 'Evaluador técnico de etapas Capacitación 1 y 2.', color: '#06b6d4' },
                    { id: 'Auditor_Privacidad', name: 'Auditor de Privacidad (LFPDPPP)', desc: 'Consulta de bitácoras de auditoría y derecho de purga ARCO.', color: '#10b981' }
                  ].map(r => {
                    const isChecked = editUserForm.role_ids.includes(r.id);
                    return (
                      <label 
                        key={r.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '0.6rem', 
                          padding: '0.5rem', 
                          borderRadius: '8px', 
                          background: isChecked ? 'rgba(21, 93, 252, 0.08)' : 'var(--bg-card)', 
                          border: `1px solid ${isChecked ? 'rgba(21, 93, 252, 0.3)' : 'var(--border-color)'}`,
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditUserForm(prev => ({ ...prev, role_ids: [...prev.role_ids, r.id] }));
                            } else {
                              setEditUserForm(prev => ({ ...prev, role_ids: prev.role_ids.filter(id => id !== r.id) }));
                            }
                          }}
                          style={{ marginTop: '0.2rem' }}
                        />
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '0.82rem', color: r.color, display: 'block' }}>{r.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditUserModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingUser}>
                  {savingUser ? 'Guardando Cambios...' : 'Actualizar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN DE ÁREA ORGANIZACIONAL */}
      {deptModalOpen && (
        <div className="modal-overlay" onClick={() => setDeptModalOpen(false)} style={{ zIndex: 1200 }}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="pane-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase className="pane-icon" style={{ color: 'var(--accent-light)' }} />
                <h3 style={{ margin: 0 }}>
                  {editingDept ? `Editar Área: ${editingDept.name}` : 'Nueva Área / Departamento'}
                </h3>
              </div>
              <button className="close-btn" onClick={() => setDeptModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveDepartment} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Nombre del Área *</label>
                  <input 
                    type="text"
                    className="form-input"
                    required
                    placeholder="Ej. Ventas y Comercial, Cobranza..."
                    value={deptForm.name}
                    onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Código</label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="Ej. COM, OPE"
                    maxLength={10}
                    value={deptForm.code}
                    onChange={(e) => setDeptForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>👔 Gerente Titular</label>
                    <div style={{ display: 'inline-flex', background: 'var(--bg-app)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        onClick={() => setDeptForm(prev => ({ ...prev, managerMode: 'select' }))}
                        style={{
                          padding: '0.15rem 0.45rem',
                          fontSize: '0.72rem',
                          border: 'none',
                          borderRadius: '4px',
                          background: deptForm.managerMode === 'select' ? 'var(--accent-light)' : 'transparent',
                          color: deptForm.managerMode === 'select' ? '#fff' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Existente
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeptForm(prev => ({ ...prev, managerMode: 'new', manager_id: '' }))}
                        style={{
                          padding: '0.15rem 0.45rem',
                          fontSize: '0.72rem',
                          border: 'none',
                          borderRadius: '4px',
                          background: deptForm.managerMode === 'new' ? 'var(--accent-light)' : 'transparent',
                          color: deptForm.managerMode === 'new' ? '#fff' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ➕ Crear nuevo
                      </button>
                    </div>
                  </div>

                  {deptForm.managerMode === 'select' ? (
                    <>
                      <select
                        className="form-input"
                        value={deptForm.manager_id || ''}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, manager_id: e.target.value }))}
                      >
                        <option value="">-- Sin Gerente Titular (Asignar después) --</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.roles?.map(r => r.name).join(', ') || 'Colaborador'})
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                        💡 Opcional. Puedes crear el área primero y asignar al gerente después.
                      </span>
                    </>
                  ) : (
                    <div style={{ background: 'var(--bg-app)', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nombre completo (ej. Ing. Carlos Gómez)"
                        value={deptForm.quick_manager_name}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, quick_manager_name: e.target.value }))}
                        required={deptForm.managerMode === 'new'}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.55rem' }}
                      />
                      <input
                        type="email"
                        className="form-input"
                        placeholder="Correo (ej. carlos.gomez@octopy.com)"
                        value={deptForm.quick_manager_email}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, quick_manager_email: e.target.value }))}
                        required={deptForm.managerMode === 'new'}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.55rem' }}
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                        ⚡ Se creará la cuenta con rol <strong>Gerente de Vacante</strong>.
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>🎓 Evaluador de Capacitación</label>
                  <select
                    className="form-input"
                    value={deptForm.trainer_id || ''}
                    onChange={(e) => setDeptForm(prev => ({ ...prev, trainer_id: e.target.value }))}
                  >
                    <option value="">-- Sin Evaluador Titular --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.roles?.map(r => r.name).join(', ') || 'Colaborador'})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    Evaluará Capacitación 1 y 2 para las vacantes de esta área.
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Descripción / Alcance</label>
                <textarea 
                  className="form-input"
                  rows={2}
                  placeholder="Propósito del área, equipos a cargo o tipo de operaciones..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, description: e.target.value }))}
                  style={{ resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox"
                  id="deptActiveCheck"
                  checked={deptForm.is_active}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <label htmlFor="deptActiveCheck" style={{ fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                  Área activa (disponible para nuevas vacantes y colaboradores)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDeptModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingDept || !deptForm.name.trim()}>
                  {savingDept ? 'Guardando...' : (editingDept ? 'Actualizar Área' : 'Crear Área')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN DE PURGA (DOBLE FACTOR CON PALABRA DE SEGURIDAD)     */}
      {/* ========================================================================= */}
      {purgeModalOpen && (
        <div className="modal-overlay" onClick={() => !purgeExecuting && setPurgeModalOpen(false)} style={{ zIndex: 1300 }}>
          <div className="modal-content-container small-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div className="pane-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert className="pane-icon" style={{ color: '#ef4444' }} />
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                  {purgeType === 'cv_files' && 'Confirmar Purga de Archivos Físicos (CVs)'}
                  {purgeType === 'candidates' && 'Confirmar Purga de Candidatos y CVs'}
                  {purgeType === 'complete' && 'Confirmar Purga Completa del Sistema'}
                  {purgeType === 'expired_ids' && 'Confirmar Purga de Identificaciones Vencidas'}
                </h3>
              </div>
              {!purgeExecuting && <button className="close-btn" onClick={() => setPurgeModalOpen(false)}>&times;</button>}
            </div>

            <div style={{ padding: '1.25rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* ALERTA DE RIESGO */}
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: '10px', 
                padding: '0.9rem 1rem',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                lineHeight: '1.45'
              }}>
                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>
                  ⚠️ Esta operación es destructiva e irreversible:
                </strong>
                {purgeType === 'cv_files' && (
                  <p style={{ margin: 0 }}>
                    Se sobreescribirán y eliminarán físicamente todos los PDFs de currículums en el servidor para liberar espacio. Los registros tabulares de candidatos se mantendrán.
                  </p>
                )}
                {purgeType === 'candidates' && (
                  <p style={{ margin: 0 }}>
                    Se destruirán permanentemente todos los candidatos, expedientes, currículums, evaluaciones y notas. Las vacantes y usuarios se conservarán.
                  </p>
                )}
                {purgeType === 'complete' && (
                  <p style={{ margin: 0 }}>
                    Se restablecerá todo el ecosistema (candidatos, CVs, vacantes y notas). Solo se conservarán las cuentas de usuarios (SuperAdmin) y configuraciones básicas.
                  </p>
                )}
                {purgeType === 'expired_ids' && (
                  <p style={{ margin: 0 }}>
                    Se destruirán las fotografías de credenciales oficiales cuyo plazo de retención temporal (24 horas) haya vencido conforme a la LFPDPPP.
                  </p>
                )}
              </div>

              {/* REPORTE DE RESULTADO SI SE EJECUTÓ */}
              {purgeResult && (
                <div style={{ 
                  background: purgeResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  border: `1px solid ${purgeResult.success ? '#10b981' : '#ef4444'}`, 
                  borderRadius: '10px', 
                  padding: '1rem',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ fontWeight: '700', color: purgeResult.success ? '#10b981' : '#ef4444', marginBottom: '0.35rem' }}>
                    {purgeResult.success ? '✅ Purga Ejecutada con Éxito' : '❌ Error al Ejecutar Purga'}
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-primary)' }}>{purgeResult.message}</p>
                  {purgeResult.details && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {purgeResult.details.deleted_files !== undefined && (
                        <div>• Archivos físicos eliminados: <strong>{purgeResult.details.deleted_files}</strong> ({purgeResult.details.bytes_freed_mb ?? 0} MB liberados)</div>
                      )}
                      {purgeResult.details.purged_candidates !== undefined && (
                        <div>• Candidatos purgados: <strong>{purgeResult.details.purged_candidates}</strong></div>
                      )}
                      {purgeResult.details.purged_vacancies !== undefined && (
                        <div>• Vacantes re-sembradas: <strong>{purgeResult.details.seeded_vacancies ?? 0}</strong></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CAMPOS DE CONFIRMACIÓN */}
              {!purgeResult && (
                <>
                  {purgeType !== 'expired_ids' ? (
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                        Para autorizar la destrucción, escribe exactamente:
                        <span style={{ 
                          marginLeft: '0.4rem',
                          background: 'rgba(239, 68, 68, 0.2)', 
                          color: '#f87171', 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                          fontWeight: '800'
                        }}>
                          {purgeType === 'cv_files' && 'PURGAR-CVS'}
                          {purgeType === 'candidates' && 'PURGAR-CANDIDATOS'}
                          {purgeType === 'complete' && 'PURGAR-COMPLETO'}
                        </span>
                      </label>
                      <input 
                        type="text"
                        className="form-input"
                        placeholder={
                          purgeType === 'cv_files' ? 'Escribe PURGAR-CVS' :
                          purgeType === 'candidates' ? 'Escribe PURGAR-CANDIDATOS' :
                          'Escribe PURGAR-COMPLETO'
                        }
                        value={purgeConfirmInput}
                        onChange={(e) => setPurgeConfirmInput(e.target.value)}
                        autoFocus
                        style={{ fontFamily: 'monospace', fontWeight: '700', letterSpacing: '1px' }}
                      />
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Se verificará la bitácora de documentos de identidad con TTL vencido y se procederá con la destrucción segura de bytes.
                    </p>
                  )}

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                      Motivo / Justificación de Auditoría (Opcional)
                    </label>
                    <input 
                      type="text"
                      className="form-input"
                      placeholder="Ej. Cumplimiento de retención temporal, finalización de proceso o depuración"
                      value={purgeReasonInput}
                      onChange={(e) => setPurgeReasonInput(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* BOTONES DE ACCIÓN */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPurgeModalOpen(false)}
                  disabled={purgeExecuting}
                >
                  {purgeResult ? 'Cerrar' : 'Cancelar'}
                </button>

                {!purgeResult && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleExecutePurge}
                    disabled={
                      purgeExecuting ||
                      (purgeType === 'cv_files' && purgeConfirmInput.trim().toUpperCase() !== 'PURGAR-CVS') ||
                      (purgeType === 'candidates' && purgeConfirmInput.trim().toUpperCase() !== 'PURGAR-CANDIDATOS') ||
                      (purgeType === 'complete' && purgeConfirmInput.trim().toUpperCase() !== 'PURGAR-COMPLETO')
                    }
                    style={{ 
                      background: '#dc2626', 
                      borderColor: '#b91c1c', 
                      color: '#fff', 
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      opacity: (
                        purgeType === 'expired_ids' ||
                        (purgeType === 'cv_files' && purgeConfirmInput.trim().toUpperCase() === 'PURGAR-CVS') ||
                        (purgeType === 'candidates' && purgeConfirmInput.trim().toUpperCase() === 'PURGAR-CANDIDATOS') ||
                        (purgeType === 'complete' && purgeConfirmInput.trim().toUpperCase() === 'PURGAR-COMPLETO')
                      ) ? 1 : 0.45
                    }}
                  >
                    {purgeExecuting ? (
                      <>
                        <RefreshCw className="icon-xs icon-spin" />
                        Destruyendo datos...
                      </>
                    ) : (
                      <>
                        <Trash2 className="icon-xs" />
                        Confirmar y Purgar Datos
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
