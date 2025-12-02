/**
 * Pure client-side scoring module
 * No backend dependencies - all computation in browser
 */

// Import JSON data (handled by Next.js)
import symptomWeightsData from './symptomWeights.json';
import diseasesData from './diseases.json';

export interface DiseaseData {
  name: string;
  cluster: string[];
  symptom_relevance_map: Record<string, number>;
  description: string;
  webmd_search_term: string;
}

export interface ConditionResult {
  condition: string;
  likelihood: number; // 0-1
  displayLikelihood: string; // For display (handles "Low likelihood" case)
  description: string;
  webmd_search_term: string;
  cluster: string[];
  explanation: string;
}

/**
 * Get symptom score: severity_weight * specificity_weight
 */
function getSymptomScore(symptom: string): number {
  const normalized = symptom.toLowerCase().trim();
  const weights = symptomWeightsData as Record<string, { severity_weight: number; specificity_weight: number }>;
  
  // Try exact match
  if (weights[normalized]) {
    return weights[normalized].severity_weight * weights[normalized].specificity_weight;
  }
  
  // Try partial match
  for (const [key, weight] of Object.entries(weights)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return weight.severity_weight * weight.specificity_weight;
    }
  }
  
  // Default: moderate severity, low specificity
  return 0.5 * 0.3;
}

/**
 * Get disease relevance factor for a symptom
 */
function getDiseaseRelevance(disease: DiseaseData, symptom: string): number {
  const normalized = symptom.toLowerCase().trim();
  
  // Try exact match
  if (disease.symptom_relevance_map[normalized]) {
    return disease.symptom_relevance_map[normalized];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(disease.symptom_relevance_map)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return 0;
}

/**
 * Apply condition filtering rules (client-side)
 */
function applyConditionFiltering(symptoms: string[]): string[] {
  const symptomsLower = symptoms.join(' ').toLowerCase();
  const priorityConditions: string[] = [];
  
  // Rule: weight loss + heat intolerance + palpitations → endocrine/cardiac
  if (symptomsLower.includes('weight loss') && 
      (symptomsLower.includes('heat') || symptomsLower.includes('sweating')) &&
      (symptomsLower.includes('palpitation') || symptomsLower.includes('heart'))) {
    priorityConditions.push('Hyperthyroidism', 'Graves\' Disease', 'Pheochromocytoma');
  }
  
  // Rule: thirst + weight loss → Diabetes
  if ((symptomsLower.includes('frequent urination') || symptomsLower.includes('excessive thirst')) &&
      symptomsLower.includes('weight loss')) {
    priorityConditions.push('Diabetes Mellitus Type 2');
  }
  
  // Rule: neuro + autonomic → MS, POTS
  if ((symptomsLower.includes('numbness') || symptomsLower.includes('tingling') || 
       symptomsLower.includes('weakness')) &&
      (symptomsLower.includes('dizziness') || symptomsLower.includes('orthostatic'))) {
    priorityConditions.push('Multiple Sclerosis (MS)', 'POTS (Postural Orthostatic Tachycardia Syndrome)', 'Autonomic Dysfunction');
  }
  
  return priorityConditions;
}

/**
 * Check red flags (client-side)
 */
function checkRedFlags(symptoms: string[]): { flags: string[]; urgent: boolean } {
  const text = symptoms.join(' ').toLowerCase();
  const flags: string[] = [];
  let urgent = false;
  
  // Chest pain + syncope/severe dyspnea → urgent
  if (text.includes('chest pain') && 
      (text.includes('syncope') || text.includes('fainting') || 
       text.includes('severe') && text.includes('breathing'))) {
    flags.push('Chest pain with syncope or severe breathing difficulty');
    urgent = true;
  }
  
  // Unintentional weight loss + night sweats → urgent
  if (text.includes('weight loss') && text.includes('night sweat')) {
    flags.push('Unintentional weight loss with night sweats');
    urgent = true;
  }
  
  return { flags, urgent };
}

/**
 * Calculate disease scores (pure client-side)
 * final_score_raw = sum(symptom_relevance * symptom_weight)
 * final_score = normalize_to_0_1(final_score_raw)
 * display_score = clamp(final_score, min=0.05 if >0 else 0, max=1.0)
 */
export function calculateDiseaseScores(
  symptoms: string[],
  answers: string[]
): Map<string, number> {
  const diseaseScores = new Map<string, number>();
  const priorityConditions = applyConditionFiltering(symptoms);
  
  const diseaseList = diseasesData as DiseaseData[];
  
  diseaseList.forEach(disease => {
    let rawScore = 0;
    let matchedSymptomCount = 0;
    
    // Calculate raw score: sum(symptom_relevance * symptom_weight)
    symptoms.forEach(symptom => {
      const symptomScore = getSymptomScore(symptom);
      const relevance = getDiseaseRelevance(disease, symptom);
      
      if (relevance > 0) {
        rawScore += relevance * symptomScore;
        matchedSymptomCount++;
      }
    });
    
    // Only include if symptom-match ≥ 0.15 (15%) OR matches red-flag rule
    const symptomMatchRatio = matchedSymptomCount / Math.max(symptoms.length, 1);
    if (symptomMatchRatio < 0.15 && !priorityConditions.includes(disease.name)) {
      return; // Skip this disease
    }
    
    // Boost priority conditions
    if (priorityConditions.includes(disease.name)) {
      rawScore *= 1.3;
    }
    
    diseaseScores.set(disease.name, rawScore);
  });
  
  return diseaseScores;
}

/**
 * Normalize scores to 0-1 range
 */
function normalizeScores(scores: Map<string, number>): Map<string, number> {
  const maxScore = Math.max(...Array.from(scores.values()), 0.001);
  if (maxScore === 0) return scores;
  
  const normalized = new Map<string, number>();
  scores.forEach((score, disease) => {
    normalized.set(disease, score / maxScore);
  });
  
  return normalized;
}

/**
 * Clamp score for display
 * If condition_score == 0 → hide (return null)
 * If 0 < condition_score < 0.10 → display as "Low likelihood (<10%)" with clamped numeric
 * Minimum displayed numeric is 5% for any non-zero relevance
 */
function clampDisplayScore(score: number): { score: number; display: string } | null {
  if (score === 0) {
    return null; // Hide condition
  }
  
  // Clamp minimum to 0.05 if score > 0
  const clampedScore = score < 0.05 ? 0.05 : score;
  
  if (clampedScore < 0.10) {
    return {
      score: clampedScore,
      display: `Low likelihood (<10%)`,
    };
  }
  
  return {
    score: clampedScore,
    display: `${Math.round(clampedScore * 100)}%`,
  };
}

/**
 * Dynamic display rules (client-side)
 * if top_score < 0.40: show N = 3
 * else: show N = 5
 * Additionally: if top_score - second_score < 0.10 → show top 3 and label "Close call"
 */
export function getDisplayConditions(
  conditions: ConditionResult[]
): { conditions: ConditionResult[]; label?: string } {
  if (conditions.length === 0) {
    return { conditions: [] };
  }
  
  const topScore = conditions[0]?.likelihood || 0;
  const secondScore = conditions[1]?.likelihood || 0;
  const scoreDiff = topScore - secondScore;
  
  let n: number;
  let label: string | undefined;
  
  if (topScore < 0.40) {
    n = 3;
  } else {
    n = 5;
  }
  
  if (scoreDiff < 0.10 && conditions.length > 1) {
    n = 3;
    label = 'Close call — consider more information';
  }
  
  return {
    conditions: conditions.slice(0, n),
    label,
  };
}

/**
 * Main scoring function - pure client-side
 */
export function scoreSymptoms(
  symptoms: string[],
  answers: string[]
): {
  conditions: ConditionResult[];
  redFlags: { flags: string[]; urgent: boolean };
  label?: string;
} {
  // Check red flags
  const redFlags = checkRedFlags(symptoms);
  
  // Calculate scores
  const rawScores = calculateDiseaseScores(symptoms, answers);
  
  // Normalize to 0-1
  const normalizedScores = normalizeScores(rawScores);
  
  // Convert to results with proper display scores
  const conditions: ConditionResult[] = [];
  
  normalizedScores.forEach((score, diseaseName) => {
    const clamped = clampDisplayScore(score);
    if (!clamped) return; // Skip 0% conditions
    
    const disease = (diseasesData as DiseaseData[]).find(d => d.name === diseaseName);
    if (!disease) return;
    
    // Generate simple explanation
    const matchedSymptoms = symptoms.filter(s => getDiseaseRelevance(disease, s) > 0);
    const explanation = `This condition may be considered based on ${matchedSymptoms.slice(0, 2).join(' and ')}${matchedSymptoms.length > 2 ? ' and other symptoms' : ''}.`;
    
    conditions.push({
      condition: diseaseName,
      likelihood: clamped.score,
      displayLikelihood: clamped.display,
      description: disease.description,
      webmd_search_term: disease.webmd_search_term,
      cluster: disease.cluster,
      explanation,
    });
  });
  
  // Sort by likelihood descending
  conditions.sort((a, b) => b.likelihood - a.likelihood);
  
  // Apply dynamic display rules
  const { conditions: displayConditions, label } = getDisplayConditions(conditions);
  
  return {
    conditions: displayConditions,
    redFlags,
    label,
  };
}

