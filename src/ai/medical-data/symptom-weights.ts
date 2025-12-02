/**
 * Symptom Weighting Matrix
 * Each symptom has severity_weight (0-1) and specificity_weight (0-1)
 * symptom_score = severity_weight * specificity_weight
 */

export interface SymptomWeight {
  severity_weight: number; // 0-1: How severe/impactful the symptom is
  specificity_weight: number; // 0-1: How specific/diagnostic the symptom is
}

export const SYMPTOM_WEIGHTS: Record<string, SymptomWeight> = {
  // Common symptoms
  'fever': { severity_weight: 0.7, specificity_weight: 0.3 },
  'headache': { severity_weight: 0.5, specificity_weight: 0.2 },
  'fatigue': { severity_weight: 0.6, specificity_weight: 0.2 },
  'weakness': { severity_weight: 0.7, specificity_weight: 0.3 },
  'pain': { severity_weight: 0.6, specificity_weight: 0.2 },
  'joint pain': { severity_weight: 0.6, specificity_weight: 0.4 },
  'muscle pain': { severity_weight: 0.5, specificity_weight: 0.3 },
  'chest pain': { severity_weight: 0.8, specificity_weight: 0.4 },
  'abdominal pain': { severity_weight: 0.7, specificity_weight: 0.3 },
  'back pain': { severity_weight: 0.6, specificity_weight: 0.2 },
  
  // Neurological symptoms
  'dizziness': { severity_weight: 0.6, specificity_weight: 0.3 },
  'vertigo': { severity_weight: 0.7, specificity_weight: 0.5 },
  'numbness': { severity_weight: 0.7, specificity_weight: 0.5 },
  'tingling': { severity_weight: 0.6, specificity_weight: 0.4 },
  'vision problems': { severity_weight: 0.8, specificity_weight: 0.6 },
  'blurred vision': { severity_weight: 0.7, specificity_weight: 0.5 },
  'double vision': { severity_weight: 0.8, specificity_weight: 0.7 },
  'memory problems': { severity_weight: 0.7, specificity_weight: 0.4 },
  'confusion': { severity_weight: 0.8, specificity_weight: 0.5 },
  'seizures': { severity_weight: 0.9, specificity_weight: 0.7 },
  
  // Systemic symptoms
  'weight loss': { severity_weight: 0.8, specificity_weight: 0.6 },
  'night sweats': { severity_weight: 0.7, specificity_weight: 0.7 },
  'swollen glands': { severity_weight: 0.6, specificity_weight: 0.5 },
  'rash': { severity_weight: 0.6, specificity_weight: 0.4 },
  'skin changes': { severity_weight: 0.5, specificity_weight: 0.4 },
  
  // Respiratory
  'cough': { severity_weight: 0.5, specificity_weight: 0.2 },
  'shortness of breath': { severity_weight: 0.8, specificity_weight: 0.4 },
  'difficulty breathing': { severity_weight: 0.9, specificity_weight: 0.5 },
  
  // Gastrointestinal
  'nausea': { severity_weight: 0.5, specificity_weight: 0.2 },
  'vomiting': { severity_weight: 0.6, specificity_weight: 0.3 },
  'diarrhea': { severity_weight: 0.5, specificity_weight: 0.2 },
  'constipation': { severity_weight: 0.4, specificity_weight: 0.2 },
  
  // Other
  'orthostatic dizziness': { severity_weight: 0.7, specificity_weight: 0.8 },
  'migratory joint pain': { severity_weight: 0.7, specificity_weight: 0.7 },
  'transient rash': { severity_weight: 0.6, specificity_weight: 0.6 },
  'dry eyes': { severity_weight: 0.4, specificity_weight: 0.5 },
  'dry mouth': { severity_weight: 0.4, specificity_weight: 0.5 },
};

/**
 * Get symptom score: severity_weight * specificity_weight
 */
export function getSymptomScore(symptom: string): number {
  const normalizedSymptom = symptom.toLowerCase().trim();
  
  // Try exact match first
  if (SYMPTOM_WEIGHTS[normalizedSymptom]) {
    const weight = SYMPTOM_WEIGHTS[normalizedSymptom];
    return weight.severity_weight * weight.specificity_weight;
  }
  
  // Try partial match
  for (const [key, weight] of Object.entries(SYMPTOM_WEIGHTS)) {
    if (normalizedSymptom.includes(key) || key.includes(normalizedSymptom)) {
      return weight.severity_weight * weight.specificity_weight;
    }
  }
  
  // Default weights for unknown symptoms
  return 0.5 * 0.3; // Moderate severity, low specificity
}

