/* ==========================================================================
   TALENTEXTRACT PRO - LÓGICA DE APLICACIÓN (app.js)
   ========================================================================== */

// Configuración de PDF.js
const pdfjsLib = window['pdfjs-dist/build/pdf'];
// Establecer el worker de PDF.js usando CDN compatible con la versión principal
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Base de datos de habilidades para la detección automática
const SKILLS_DATABASE = [
    'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Python', 'Java', 'C++', 'C#', '.NET',
    'PHP', 'Laravel', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'HTML', 'CSS', 'JavaScript',
    'TypeScript', 'Vite', 'Next.js', 'Django', 'Flask', 'Spring Boot', 'AWS', 'Azure', 'Docker',
    'Kubernetes', 'Git', 'GitHub', 'Scrum', 'Agile', 'Jira', 'Excel', 'Word', 'PowerPoint',
    'Power BI', 'Tableau', 'Ventas', 'Marketing', 'Finanzas', 'Contabilidad', 'Liderazgo', 'Leadership',
    'Figma', 'Photoshop', 'Illustrator', 'UI/UX', 'SEO', 'SEM', 'QA', 'Testing', 'Linux', 'DevOps',
    'Machine Learning', 'Big Data', 'Cybersecurity', 'Cobol', 'Flutter', 'React Native'
];

// Estado de la aplicación
let candidates = [];
let fileQueue = [];

// Elementos del DOM
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const queueContainer = document.getElementById('queue-container');
const processingQueue = document.getElementById('processing-queue');
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const candidatesTable = document.getElementById('candidates-table');
const candidatesBody = document.getElementById('candidates-body');
const emptyState = document.getElementById('empty-state');
const statsTotal = document.getElementById('stats-total');

// Elementos del Modal
const textModal = document.getElementById('text-modal');
const modalTitle = document.getElementById('modal-title');
const extractedTextView = document.getElementById('extracted-text-view');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeModalFooterBtn = document.getElementById('close-modal-footer-btn');

/* --- EVENTOS DE INTERFAZ --- */

// Arrastrar y soltar
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
    if (files.length > 0) {
        handleFiles(files);
    }
});

// Selección por clic
dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    if (files.length > 0) {
        handleFiles(files);
    }
    // Limpiar input para permitir cargar el mismo archivo consecutivamente
    fileInput.value = '';
});

// Búsqueda / Filtrado en tiempo real
searchInput.addEventListener('input', () => {
    renderTable();
});

// Botones de Toolbar
clearBtn.addEventListener('click', () => {
    if (candidates.length === 0) return;
    if (confirm('¿Estás seguro de que deseas limpiar toda la lista de candidatos?')) {
        candidates = [];
        updateStats();
        renderTable();
        queueContainer.classList.add('hidden');
        processingQueue.innerHTML = '';
        exportBtn.disabled = true;
    }
});

exportBtn.addEventListener('click', () => {
    if (candidates.length > 0) {
        exportToCSV();
    }
});

// Modal Cerrar
const closeModal = () => {
    textModal.classList.remove('open');
};
closeModalBtn.addEventListener('click', closeModal);
closeModalFooterBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === textModal) {
        closeModal();
    }
});

/* --- MANEJO DE ARCHIVOS Y EXTRACCIÓN --- */

// Manejar la lista de archivos cargados
async function handleFiles(files) {
    queueContainer.classList.remove('hidden');
    
    for (const file of files) {
        // Generar un ID único para la cola de procesamiento
        const queueId = 'q-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Crear elemento en el panel de progreso
        addQueueItemDOM(queueId, file.name);
        
        try {
            // Actualizar a "Procesando..."
            updateQueueItemStatus(queueId, 'loading', 'Procesando...', 30);
            
            // Extraer el texto completo del PDF
            const text = await extractTextFromPDF(file, (percent) => {
                // Actualizar porcentaje de lectura
                updateQueueItemStatus(queueId, 'loading', `Leyendo texto (${percent}%)`, 30 + (percent * 0.5));
            });
            
            updateQueueItemStatus(queueId, 'loading', 'Analizando datos...', 85);
            
            // Analizar y extraer información estructurada
            const candidateData = parseCandidateData(text, file.name);
            
            // Guardar en el estado general
            candidates.push(candidateData);
            
            // Actualizar UI a éxito
            updateQueueItemStatus(queueId, 'success', 'Completado', 100);
            
            // Actualizar estadísticas y tabla
            updateStats();
            renderTable();
            exportBtn.disabled = false;
            
        } catch (error) {
            console.error(`Error al procesar el archivo ${file.name}:`, error);
            updateQueueItemStatus(queueId, 'error', 'Error de lectura', 0);
        }
    }
}

// Extraer texto usando PDF.js
async function extractTextFromPDF(file, progressCallback) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    const numPages = pdf.numPages;
    
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Algoritmo para preservar el flujo de texto y saltos de línea verticales
        let lastY = -1;
        let pageText = '';
        
        for (const item of textContent.items) {
            const currentY = item.transform[5];
            
            // Si hay un cambio significativo en el eje Y (altura), es un salto de línea
            if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
                pageText += '\n';
            } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                pageText += ' ';
            }
            
            pageText += item.str;
            lastY = currentY;
        }
        
        fullText += pageText + '\n\n';
        
        if (progressCallback) {
            progressCallback(Math.round((i / numPages) * 100));
        }
    }
    
    return fullText;
}

// Analizar texto para extraer campos estructurados
function parseCandidateData(text, filename) {
    // 1. Extraer correos
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailRegex) || [];
    const email = emails.length > 0 ? emails[0].trim() : 'No detectado';
    
    // 2. Extraer teléfonos
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
    const phoneMatches = text.match(phoneRegex) || [];
    const validPhones = phoneMatches
        .map(p => p.trim())
        .filter(p => {
            const digits = p.replace(/\D/g, '');
            // Evitar años (2024, etc.) y CPs, requiriendo entre 8 y 15 dígitos
            return digits.length >= 8 && digits.length <= 15;
        });
    const phone = validPhones.length > 0 ? validPhones[0] : 'No detectado';
    
    // 3. Extraer Nombre (Heurísticas de inicio de documento y metadatos de archivo)
    const name = extractCandidateName(text, filename);
    
    // 4. Extraer habilidades
    const skills = extractSkills(text);
    
    // Devolver objeto completo
    return {
        id: 'candidate-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name,
        email,
        phone,
        skills,
        filename,
        rawText: text
    };
}

// Pre-procesar líneas para unir nombres que vienen separados en líneas consecutivas
function preprocessLines(lines) {
    const processed = [];
    let tempNameWords = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Un fragmento de nombre es una sola palabra, que contiene letras y caracteres comunes de nombres.
        // Puede iniciar con mayúscula (como Elizabeth) o ser una de las partículas comunes (de, la, del, y) en minúscula.
        const isWord = /^[A-ZÁÉÍÓÚÑa-záéíóúñ]+$/.test(line) && line.length >= 2 && line.length <= 15;
        const isNamePart = isWord && (
            /^[A-ZÁÉÍÓÚÑ]/.test(line) || // Inicia con mayúscula
            ['de', 'la', 'del', 'y'].includes(line.toLowerCase()) // O es una partícula
        );
        
        if (isNamePart) {
            tempNameWords.push(line);
        } else {
            // Si teníamos palabras acumuladas
            if (tempNameWords.length > 0) {
                if (tempNameWords.length >= 2) {
                    processed.push(tempNameWords.join(' '));
                } else {
                    processed.push(tempNameWords[0]);
                }
                tempNameWords = [];
            }
            processed.push(line);
        }
    }
    
    if (tempNameWords.length > 0) {
        if (tempNameWords.length >= 2) {
            processed.push(tempNameWords.join(' '));
        } else {
            processed.push(tempNameWords[0]);
        }
    }
    
    return processed;
}

// Algoritmo de detección de Nombres basado en puntuación heurística
function extractCandidateName(text, filename) {
    // Nombre de respaldo basado en limpiar el nombre del archivo
    let backupName = filename.replace(/\.[^/.]+$/, ""); // quitar extensión
    backupName = backupName.replace(/\b(cv|curriculum|vitae|hoja|de|vida|resume|pdf)\b/gi, ""); // quitar palabras genéricas
    backupName = backupName.replace(/[_-]+/g, " "); // guiones a espacios
    backupName = backupName.replace(/\s+/g, " ").trim();
    // Capitalizar palabras
    backupName = backupName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

    let lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // Unir fragmentos de nombres en líneas consecutivas (ej: ELIZABETH \n AGUIRRE \n SARMIENTO)
    lines = preprocessLines(lines);

    const COMMON_NAMES = new Set([
        'juan', 'jose', 'maría', 'maria', 'luis', 'carlos', 'ana', 'guadalupe', 'alejandro', 'alejandra', 
        'francisco', 'jorge', 'miguel', 'angel', 'ángel', 'antonio', 'jesus', 'jesús', 'pedro', 'daniel', 'daniela', 
        'manuel', 'santiago', 'sebastian', 'sebastián', 'david', 'fernando', 'fernanda', 'ricardo', 'sofía', 'sofia', 
        'javier', 'elizabeth', 'oscar', 'óscar', 'ruben', 'rubén', 'julio', 'cesar', 'césar', 'gael', 'karla', 
        'agustin', 'agustín', 'gabriela', 'patricia', 'rosa', 'eduardo', 'arturo', 'roberto', 'enrique', 'hugo', 
        'pablo', 'andrea', 'leticia', 'silvia', 'monica', 'mónica', 'alberto', 'raul', 'raúl', 'sergio', 'claudia',
        'hernandez', 'hernández', 'garcia', 'garcía', 'martinez', 'martínez', 'lopez', 'lópez', 'gonzalez', 'gonzález', 
        'rodriguez', 'rodríguez', 'perez', 'pérez', 'sanchez', 'sánchez', 'ramirez', 'ramírez', 'cruz', 'flores', 
        'gomez', 'gómez', 'diaz', 'díaz', 'reyes', 'morales', 'munoz', 'muñoz', 'gutierrez', 'gutiérrez', 'alvarez', 
        'álvarez', 'ruiz', 'aguilar', 'ortiz', 'ortíz', 'mendoza', 'estrada', 'sarmiento', 'escobar', 'vega', 
        'resendiz', 'reséndiz', 'aguirre', 'munguia', 'munguía'
    ]);

    const excludeKeywords = [
        'tel', 'cel', 'phone', 'correo', 'email', 'e-mail', 'mail', 'contacto', 'address', 'dirección', 'dir',
        'curriculum', 'vitae', 'cv', 'hoja de vida', 'resume', 'perfil', 'experiencia', 'educación', 'habilidades',
        'skills', 'idiomas', 'certificaciones', 'página', 'web', 'github', 'linkedin', 'portafolio',
        'nacionalidad', 'fecha de nacimiento', 'edad', 'soltero', 'casado', 'c.p.', 'cp', 'colonia', 'méxico',
        'calle', 'avenida', 'av.', 'no.', 'número', 'col.', 'zumpango', 'edo', 'estado', 'bogota', 'lima',
        'madrid', 'ciudad', 'fraccionamiento', 'delegación', 'municipio', 'mexico', 'cdmx', 'domicilio',
        'residencia', 'laboral', 'profesional', 'formación', 'formacion', 'aptitudes', 'objetivo', 'sobre mí',
        'sobre mi', 'sika', 'mexicana', 'kpis', 'kpi', 'trunca', 'mercadotecnia', 'mercadoctenia', 'licenciatura',
        'ingeniería', 'ingenieria', 'bachillerato', 'secundaria', 'universidad', 'carrera', 'estudios', 'proyecto',
        'proyectos', 'puesto', 'puestos', 'funciones', 'logros', 'empresa', 'empresas', 'cliente', 'clientes'
    ];

    const professionalTitles = [
        'ingeniero', 'licenciado', 'doctor', 'magister', 'msc', 'ing.', 'lic.', 'dr.', 'dra.',
        'desarrollador', 'developer', 'analista', 'consultor', 'especialista', 'arquitecto',
        'software', 'systems', 'sistemas', 'web', 'diseñador', 'designer', 'representante',
        'comercial', 'gerente', 'director', 'jefe', 'supervisor', 'lider', 'líder', 'auxiliar',
        'tecnico', 'técnico', 'practicante', 'becario', 'encargado', 'ventas', 'operador',
        'promotor', 'asistente', 'administrador', 'soporte', 'asesor', 'ejecutivo'
    ];

    let bestName = '';
    let highestScore = -999;

    // Escanear las primeras 35 líneas del CV
    const searchRange = Math.min(lines.length, 35);
    for (let i = 0; i < searchRange; i++) {
        const line = lines[i];
        
        if (line.length < 5 || line.length > 40) continue;
        if (line.includes('@') || line.includes('/') || line.toLowerCase().includes('.com') || line.toLowerCase().includes('http')) continue;
        
        const digitCount = (line.match(/\d/g) || []).length;
        if (digitCount > 3) continue;

        // Comprobación de palabras clave excluidas
        const hasExclude = excludeKeywords.some(keyword => 
            new RegExp('\\b' + keyword + '\\b', 'i').test(line)
        );
        if (hasExclude) continue;

        const words = line.split(/\s+/);
        
        // Calcular Score
        let score = 0;

        // 1. Proximidad al inicio (los nombres suelen estar arriba, max +10 pts)
        score += Math.max(0, 10 - i);

        // 2. Coincidencia con base de nombres comunes (+12 pts por palabra que coincida con nombre/apellido común)
        let nameMatchCount = 0;
        words.forEach(w => {
            const cleanWord = w.toLowerCase().replace(/[^a-záéíóúñ]/g, '');
            if (COMMON_NAMES.has(cleanWord)) {
                nameMatchCount++;
            }
        });
        score += nameMatchCount * 12;

        // 3. Estructura de capitalización (todas las palabras inician con mayúscula, +6 pts)
        const capitalWordCount = words.filter(word => /^[A-ZÁÉÍÓÚÑ]/.test(word)).length;
        if (capitalWordCount === words.length) {
            score += 6;
        } else if (capitalWordCount >= words.length - 1) {
            score += 3;
        }

        // 4. Cantidad ideal de palabras (2 a 4 palabras es lo óptimo, +5 pts)
        if (words.length >= 2 && words.length <= 4) {
            score += 5;
        } else if (words.length > 5) {
            score -= 10; // Penalizar líneas demasiado largas
        }

        // 5. Penalización por títulos profesionales al inicio
        const firstWordLower = words[0].toLowerCase().replace(/[^a-z]/g, '');
        if (professionalTitles.includes(firstWordLower)) {
            score -= 15;
        }

        // 6. Penalización si contiene palabras de puestos o académicas en cualquier parte
        let containsJobWords = false;
        words.forEach(w => {
            const cleanWord = w.toLowerCase().replace(/[^a-z]/g, '');
            if (professionalTitles.includes(cleanWord)) {
                containsJobWords = true;
            }
        });
        if (containsJobWords) {
            score -= 10;
        }

        // Evaluar si es el mejor candidato
        if (score > highestScore && score > 0) { // Requiere score positivo para ser considerado
            highestScore = score;
            bestName = line;
        }
    }

    // Si encontramos un nombre con heurística con score positivo, lo devolvemos
    if (bestName) {
        return bestName;
    }

    // Si fallan todas las heurísticas del documento, usar el nombre del archivo limpio como respaldo
    return backupName || "Candidato Desconocido";
}

// Detectar habilidades cruzando el texto con la base de datos
function extractSkills(text) {
    const textLower = text.toLowerCase();
    const detected = [];
    
    for (const skill of SKILLS_DATABASE) {
        // Búsqueda con límites de palabras (para evitar coincidencias parciales como "C" en "Ventas")
        // Escapar caracteres especiales en habilidades como C++, .NET
        const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp('\\b' + escapedSkill + '\\b', 'i');
        
        if (regex.test(textLower)) {
            detected.push(skill);
        }
        
        // Limitar a un máximo de 6 habilidades representativas
        if (detected.length >= 6) break;
    }
    
    return detected;
}

/* --- RENDERIZADO Y CONTROL DE LA INTERFAZ --- */

// Renderizar tabla aplicando filtros de búsqueda
function renderTable() {
    const query = searchInput.value.toLowerCase().trim();
    
    // Filtrar candidatos
    const filteredCandidates = candidates.filter(c => {
        return c.name.toLowerCase().includes(query) || 
               c.email.toLowerCase().includes(query) || 
               c.phone.toLowerCase().includes(query) ||
               c.skills.some(s => s.toLowerCase().includes(query)) ||
               c.filename.toLowerCase().includes(query);
    });
    
    // Limpiar cuerpo de tabla
    candidatesBody.innerHTML = '';
    
    if (filteredCandidates.length === 0) {
        if (query !== '') {
            // Estado vacío para búsqueda sin resultados
            candidatesBody.innerHTML = `
                <tr class="empty-state-row">
                    <td colspan="6">
                        <div class="empty-state">
                            <i data-lucide="search-code" class="empty-state-icon"></i>
                            <h4>Sin resultados</h4>
                            <p>No encontramos candidatos que coincidan con "${query}".</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            // Estado vacío original
            candidatesBody.appendChild(emptyState);
        }
        lucide.createIcons();
        return;
    }
    
    // Generar filas dinámicamente
    filteredCandidates.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'candidate-row';
        tr.dataset.id = c.id;
        
        // Iniciales para el avatar
        const initials = c.name
            .split(/\s+/)
            .filter(w => w.length > 0)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('');
            
        // Contenido HTML de la fila
        tr.innerHTML = `
            <td>
                <div class="candidate-cell">
                    <div class="avatar">${initials || '?' }</div>
                    <div class="candidate-info">
                        <input type="text" class="editable-field name-field" value="${c.name}" data-field="name">
                    </div>
                </div>
            </td>
            <td>
                <div class="contact-item">
                    <i data-lucide="mail" class="contact-icon"></i>
                    <input type="text" class="editable-field" value="${c.email}" data-field="email">
                </div>
            </td>
            <td>
                <div class="contact-item">
                    <i data-lucide="phone" class="contact-icon"></i>
                    <input type="text" class="editable-field" value="${c.phone}" data-field="phone">
                </div>
            </td>
            <td>
                <div class="skills-container">
                    ${c.skills.length > 0 
                        ? c.skills.map(s => `<span class="skill-badge">${s}</span>`).join('') 
                        : '<span class="text-muted" style="font-size:0.8rem">Ninguna detectada</span>'}
                </div>
            </td>
            <td>
                <div class="file-cell" title="${c.filename}">${c.filename}</div>
            </td>
            <td class="actions-col">
                <div class="action-buttons">
                    <button class="btn-icon view-btn" title="Ver texto extraído">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn-icon btn-danger delete-btn" title="Eliminar candidato">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Agregar eventos de edición inline en tiempo real
        const inputs = tr.querySelectorAll('.editable-field');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const field = e.target.dataset.field;
                const value = e.target.value.trim();
                updateCandidateData(c.id, field, value);
                
                // Si cambió el nombre, refrescar las iniciales del avatar
                if (field === 'name') {
                    const avatar = tr.querySelector('.avatar');
                    const newInitials = value
                        .split(/\s+/)
                        .filter(w => w.length > 0)
                        .slice(0, 2)
                        .map(w => w[0].toUpperCase())
                        .join('');
                    avatar.textContent = newInitials || '?';
                }
            });
        });
        
        // Evento botón ver texto completo
        const viewBtn = tr.querySelector('.view-btn');
        viewBtn.addEventListener('click', () => {
            openTextModal(c.name, c.rawText);
        });
        
        // Evento botón eliminar
        const deleteBtn = tr.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            deleteCandidate(c.id);
        });
        
        candidatesBody.appendChild(tr);
    });
    
    // Volver a enlazar los iconos
    lucide.createIcons();
}

// Actualizar datos del candidato en el estado
function updateCandidateData(id, field, value) {
    const index = candidates.findIndex(c => c.id === id);
    if (index !== -1) {
        candidates[index][field] = value;
    }
}

// Eliminar candidato
function deleteCandidate(id) {
    const index = candidates.findIndex(c => c.id === id);
    if (index !== -1) {
        const candidateName = candidates[index].name;
        candidates.splice(index, 1);
        updateStats();
        renderTable();
        
        if (candidates.length === 0) {
            exportBtn.disabled = true;
        }
    }
}

// Actualizar cantidad total de registros
function updateStats() {
    statsTotal.textContent = candidates.length;
}

// Abrir modal con visor de texto
function openTextModal(name, rawText) {
    modalTitle.textContent = `Texto Extraído: ${name}`;
    extractedTextView.textContent = rawText;
    textModal.classList.add('open');
}

/* --- MANEJO DE LA COLA DE CARGA (UI) --- */

function addQueueItemDOM(id, filename) {
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.id = id;
    
    div.innerHTML = `
        <div class="queue-item-icon">
            <i data-lucide="file-text"></i>
        </div>
        <div class="queue-item-info">
            <span class="queue-item-name" title="${filename}">${filename}</span>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: 10%"></div>
            </div>
        </div>
        <span class="queue-item-status status-waiting">Espera</span>
    `;
    
    processingQueue.appendChild(div);
    lucide.createIcons();
    
    // Scroll automático hacia abajo en la cola
    processingQueue.scrollTop = processingQueue.scrollHeight;
}

function updateQueueItemStatus(id, type, label, progressPercentage) {
    const item = document.getElementById(id);
    if (!item) return;
    
    const fill = item.querySelector('.progress-bar-fill');
    const status = item.querySelector('.queue-item-status');
    const iconWrapper = item.querySelector('.queue-item-icon');
    
    // Cambiar color/valor de la barra de progreso
    fill.style.width = progressPercentage + '%';
    
    // Cambiar texto de estado
    status.textContent = label;
    status.className = `queue-item-status status-${type}`;
    
    // Modificar interfaz basado en el tipo
    if (type === 'success') {
        fill.style.background = 'var(--success)';
        iconWrapper.innerHTML = '<i data-lucide="check-circle-2" style="color:var(--success)"></i>';
        
        // Quitar de la lista después de un tiempo para no saturar la vista
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                item.remove();
                // Ocultar el panel de cola si ya no hay ítems activos
                if (processingQueue.children.length === 0) {
                    queueContainer.classList.add('hidden');
                }
            }, 500);
        }, 3000);
        
    } else if (type === 'error') {
        fill.style.background = 'var(--danger)';
        fill.style.width = '100%';
        iconWrapper.innerHTML = '<i data-lucide="alert-triangle" style="color:var(--danger)"></i>';
    } else if (type === 'loading') {
        iconWrapper.innerHTML = '<i data-lucide="loader-2" class="loader-spin" style="color:var(--accent)"></i>';
        
        // Agregar estilo de rotación temporalmente si no existe
        if (!document.getElementById('loader-spin-style')) {
            const style = document.createElement('style');
            style.id = 'loader-spin-style';
            style.innerHTML = `
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .loader-spin { animation: spin 1.5s linear infinite; }
            `;
            document.head.appendChild(style);
        }
    }
    
    lucide.createIcons();
}

/* --- EXPORTACIÓN A CSV --- */

function exportToCSV() {
    if (candidates.length === 0) return;
    
    // Prefijo de Marca de Orden de Byte (BOM) UTF-8 para compatibilidad absoluta con MS Excel en español
    let csvContent = "\uFEFF";
    
    // Encabezados
    csvContent += "Nombre,Correo Electrónico,Teléfono,Habilidades Clave,Archivo Fuente\r\n";
    
    // Filas
    candidates.forEach(c => {
        const name = `"${c.name.replace(/"/g, '""')}"`;
        const email = `"${c.email.replace(/"/g, '""')}"`;
        const phone = `"${c.phone.replace(/"/g, '""')}"`;
        const skills = `"${c.skills.join(', ').replace(/"/g, '""')}"`;
        const filename = `"${c.filename.replace(/"/g, '""')}"`;
        
        csvContent += `${name},${email},${phone},${skills},${filename}\r\n`;
    });
    
    // Crear y gatillar descarga
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generar nombre de archivo con marca de tiempo legible
    const now = new Date();
    const dateStr = now.getFullYear() +
                    String(now.getMonth() + 1).padStart(2, '0') +
                    String(now.getDate()).padStart(2, '0') + '_' +
                    String(now.getHours()).padStart(2, '0') +
                    String(now.getMinutes()).padStart(2, '0');
                    
    link.setAttribute('href', url);
    link.setAttribute('download', `candidatos_extraidos_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
