/**
 * Multi-System Reasoning Engine
 * Classifies symptoms into body systems and prioritizes multi-system conditions
 */

export type BodySystem = 
  | 'endocrine/metabolic'
  | 'cardiac'
  | 'neurological'
  | 'autonomic'
  | 'gastrointestinal'
  | 'hematologic'
  | 'autoimmune'
  | 'respiratory';

export interface SystemInvolvement {
  system: BodySystem;
  symptoms: string[];
  score: number;
}

/**
 * Map symptoms to body systems
 */
const SYMPTOM_SYSTEM_MAP: Record<string, BodySystem[]> = {
  // Endocrine/Metabolic
  'weight loss': ['endocrine/metabolic'],
  'weight gain': ['endocrine/metabolic'],
  'heat intolerance': ['endocrine/metabolic'],
  'cold intolerance': ['endocrine/metabolic'],
  'sweating': ['endocrine/metabolic'],
  'excessive thirst': ['endocrine/metabolic'],
  'frequent urination': ['endocrine/metabolic'],
  'tremor': ['endocrine/metabolic', 'neurological'],
  
  // Cardiac
  'heart palpitations': ['cardiac', 'autonomic'],
  'chest pain': ['cardiac'],
  'shortness of breath': ['cardiac', 'respiratory'],
  'difficulty breathing': ['cardiac', 'respiratory'],
  
  // Neurological
  'numbness': ['neurological'],
  'tingling': ['neurological'],
  'weakness': ['neurological'],
  'vision problems': ['neurological'],
  'blurred vision': ['neurological'],
  'double vision': ['neurological'],
  'memory problems': ['neurological'],
  'confusion': ['neurological'],
  'seizures': ['neurological'],
  'balance problems': ['neurological'],
  
  // Autonomic
  'orthostatic dizziness': ['autonomic'],
  'dizziness': ['autonomic', 'neurological'],
  'heart palpitations': ['autonomic', 'cardiac'],
  'brain fog': ['autonomic'],
  
  // Gastrointestinal
  'nausea': ['gastrointestinal'],
  'vomiting': ['gastrointestinal'],
  'diarrhea': ['gastrointestinal'],
  'constipation': ['gastrointestinal'],
  'abdominal pain': ['gastrointestinal'],
  
  // Hematologic
  'fatigue': ['hematologic', 'endocrine/metabolic', 'autoimmune'],
  'weakness': ['hematologic', 'neurological'],
  'swollen glands': ['hematologic', 'infectious'],
  
  // Autoimmune
  'joint pain': ['autoimmune'],
  'rash': ['autoimmune'],
  'fatigue': ['autoimmune', 'hematologic'],
  'fever': ['autoimmune', 'infectious'],
  
  // Respiratory
  'cough': ['respiratory'],
  'shortness of breath': ['respiratory', 'cardiac'],
};

/**
 * Analyze symptom involvement across body systems
 */
export function analyzeSystemInvolvement(symptoms: string[]): SystemInvolvement[] {
  const systemMap = new Map<BodySystem, string[]>();
  
  symptoms.forEach(symptom => {
    const normalized = symptom.toLowerCase().trim();
    const systems = SYMPTOM_SYSTEM_MAP[normalized] || ['endocrine/metabolic']; // Default
    
    systems.forEach(system => {
      if (!systemMap.has(system)) {
        systemMap.set(system, []);
      }
      systemMap.get(system)!.push(symptom);
    });
  });
  
  const results: SystemInvolvement[] = Array.from(systemMap.entries()).map(([system, symptoms]) => ({
    system,
    symptoms,
    score: symptoms.length / symptoms.length, // Normalize by total symptoms
  }));
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * Check if condition involves multiple systems
 */
export function getConditionSystems(conditionName: string): BodySystem[] {
  // This is a simplified mapping - in a real system, this would be in the disease database
  const conditionSystemMap: Record<string, BodySystem[]> = {
    'Hyperthyroidism': ['endocrine/metabolic', 'cardiac', 'autonomic'],
    'Graves\' Disease': ['endocrine/metabolic', 'cardiac', 'autonomic'],
    'Pheochromocytoma': ['endocrine/metabolic', 'cardiac', 'autonomic'],
    'Diabetes Mellitus': ['endocrine/metabolic', 'cardiac'],
    'POTS': ['autonomic', 'cardiac', 'neurological'],
    'Multiple Sclerosis': ['neurological', 'autonomic'],
    'Lupus': ['autoimmune', 'cardiac', 'hematologic'],
    'Lymphoma': ['hematologic', 'autoimmune'],
  };
  
  for (const [key, systems] of Object.entries(conditionSystemMap)) {
    if (conditionName.includes(key)) {
      return systems;
    }
  }
  
  return ['endocrine/metabolic']; // Default
}

/**
 * Calculate multi-system overlap score
 */
export function calculateMultiSystemOverlap(
  conditionSystems: BodySystem[],
  involvedSystems: SystemInvolvement[]
): number {
  const involvedSystemNames = involvedSystems.map(s => s.system);
  const overlap = conditionSystems.filter(s => involvedSystemNames.includes(s)).length;
  const totalSystems = Math.max(conditionSystems.length, involvedSystems.length);
  
  return overlap / totalSystems;
}

