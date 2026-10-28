# Algoritmo de Scoring y Evaluación Explicable

Este documento describe el funcionamiento técnico del motor de evaluación y scoring automatizado implementado en el sistema, detallando el prompt dinámico, el forzado de esquema y el cálculo del promedio ponderado.

---

## 1. Flujo General de Evaluación

El proceso de scoring se ejecuta de forma asíncrona tras postular a un candidato a una vacante específica:

```text
       Reclutador asocia Candidato a Vacante
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ POST /vacancies/{vacancy_id}/apply/{candidate_id}      │
└────────────────────────────────────────────────────────┘
                        │
      [Responde 201] (Retorna la postulación con etapa "cv_recibido")
                        │
     ┌──────────────────┴────────────────────────────────┐
     │ Tarea asíncrona de Scoring (ScoringService)       │
     └───────────────────────────────────────────────────┘
                        │
                        ├──► 1. Carga CV del Candidato (raw_text)
                        │    y Criterios/Detalles de Vacante.
                        │
                        ├──► 2. Genera Prompt Dinámico y llama a Gemma.
                        │    Solicita JSON con puntuación (0-100)
                        │    y justificación por cada criterio.
                        │
                        ├──► 3. Recibe y parsea el JSON.
                        │    Calcula en Python la puntuación final
                        │    ponderada aplicando los pesos de la vacante.
                        │
                        └──► 4. Guarda score y justificaciones.
                             Actualiza postulación en SQLite.
                             Registra log de éxito o error.
```

---

## 2. Prompt Dinámico y Esquema JSON de Salida

El prompt se ensambla dinámicamente inyectando la información de la vacante, la lista de criterios específicos y el texto del CV del candidato.

### Estructura del Prompt:
```text
Eres un experto seleccionador de talento humano en el área de TI.
Tu tarea es evaluar el perfil de un candidato frente a los criterios específicos de una vacante.

=== DATOS DE LA VACANTE ===
Título: [Título de Vacante]
Descripción:
[Descripción de Vacante]
Requisitos:
[Requisitos de Vacante]

=== CRITERIOS DE EVALUACIÓN A CALIFICAR ===
- Criterio 1: "Experiencia en React" (Peso: 50%)
- Criterio 2: "Uso de TypeScript" (Peso: 30%)
- Criterio 3: "Habilidades blandas (comunicación)" (Peso: 20%)

=== CURRICULUM VITAE DEL CANDIDATO ===
"""
[Texto Plano del CV]
"""

Instrucciones de evaluación:
1. Analiza el CV detalladamente y busca evidencias para cada uno de los criterios.
2. Asigna una calificación de 0 a 100 para cada uno de los criterios.
3. Escribe una justificación ejecutiva y objetiva de máximo 2 líneas para cada criterio.
```

### Esquema JSON solicitado a Gemma:
```json
{
  "analisis_general": "Resumen general sobre la adecuación del candidato al puesto (2-3 líneas)",
  "evaluaciones_criterios": [
    {
      "criterio": "Nombre del criterio evaluado tal cual aparece listado",
      "puntuacion": 85.0,
      "explicacion": "Explicación breve de por qué se asignó esa calificación basándote en su CV."
    }
  ]
}
```

---

## 3. Algoritmo de Cálculo Ponderado

Aunque el LLM realiza el análisis de compatibilidad y califica individualmente cada criterio, **el cálculo del score final ponderado se delega al backend en Python** para garantizar exactitud matemática y mitigar alucinaciones de cálculo del LLM.

### Fórmula:
$$\text{Score Final} = \frac{\sum_{i=1}^{n} (\text{Puntuación}_i \times \text{Peso}_i)}{\sum_{i=1}^{n} \text{Peso}_i}$$

### Proceso de Mapeo:
1. Para cada criterio configurado en la vacante, el backend busca su coincidencia semántica (o por índice) dentro del arreglo de evaluaciones devuelto por Gemma.
2. Multiplica la puntuación del criterio (0-100) por su peso configurado.
3. Suma los resultados y normaliza el total dividiendo por la suma de los pesos (para asegurar que si los pesos no suman exactamente 1.0, el cálculo final siga siendo correcto y escalado a 100).
4. Redondea el resultado final a una décima decimal (ej. `83.4%`).
5. Persiste el objeto en el campo `evaluation_feedback` para ser consumido en los reportes de Recursos Humanos.
