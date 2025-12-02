/**
 * Pattern Detection Rules
 * Detects specific symptom patterns and adjusts disease scores
 */

export interface PatternMatch {
  pattern: string;
  detected: boolean;
  diseases: string[];
  multiplier: number;
}

/**
 * Detect symptom patterns and return adjustments
 */
export function detectPatterns(
  symptoms: string,
  answers: string[]
): PatternMatch[] {
  const text = (symptoms + ' ' + answers.join(' ')).toLowerCase();
  const patterns: PatternMatch[] = [];
  
  // Pattern 1: Migratory joint pain + transient rash
  const hasMigratoryJointPain = text.includes('migratory joint') || 
                                text.includes('joint pain') && 
                                (text.includes('moving') || text.includes('different joints'));
  const hasTransientRash = text.includes('transient rash') || 
                           text.includes('rash') && 
                           (text.includes('comes and goes') || text.includes('appears and disappears'));
  
  if (hasMigratoryJointPain && hasTransientRash) {
    patterns.push({
      pattern: 'Migratory Joint Pain + Transient Rash',
      detected: true,
      diseases: [
        'Systemic Lupus Erythematosus (SLE)',
        'Systemic Vasculitis',
        'Adult-Onset Still\'s Disease (AOSD)',
      ],
      multiplier: 1.5,
    });
  }
  
  // Pattern 2: Neuro symptoms + visual symptoms
  const hasNeuroSymptoms = text.includes('numbness') || text.includes('tingling') ||
                          text.includes('weakness') || text.includes('balance problem');
  const hasVisualSymptoms = text.includes('vision problem') || text.includes('blurred vision') ||
                           text.includes('double vision') || text.includes('visual change');
  
  if (hasNeuroSymptoms && hasVisualSymptoms) {
    patterns.push({
      pattern: 'Neurological + Visual Symptoms',
      detected: true,
      diseases: [
        'Multiple Sclerosis (MS)',
        'Sjögren\'s Syndrome',
      ],
      multiplier: 1.4,
    });
  }
  
  // Pattern 3: Weight loss + night sweats
  const hasWeightLoss = text.includes('weight loss') || text.includes('lost weight');
  const hasNightSweats = text.includes('night sweat') || text.includes('sweating at night');
  
  if (hasWeightLoss && hasNightSweats) {
    patterns.push({
      pattern: 'Weight Loss + Night Sweats',
      detected: true,
      diseases: [
        'Lymphoma',
        'Chronic EBV Infection',
        'Chronic CMV Infection',
        'Tuberculosis (TB)',
      ],
      multiplier: 1.6,
    });
  }
  
  // Pattern 4: Orthostatic dizziness + numbness
  const hasOrthostaticDizziness = text.includes('orthostatic') ||
                                 (text.includes('dizziness') && text.includes('standing'));
  const hasNumbness = text.includes('numbness') || text.includes('tingling');
  
  if (hasOrthostaticDizziness && hasNumbness) {
    patterns.push({
      pattern: 'Orthostatic Dizziness + Numbness',
      detected: true,
      diseases: [
        'POTS (Postural Orthostatic Tachycardia Syndrome)',
        'Autonomic Dysfunction',
        'Adrenal Insufficiency',
      ],
      multiplier: 1.5,
    });
  }
  
  return patterns;
}

/**
 * Apply pattern multipliers to disease scores
 */
export function applyPatternMultipliers(
  diseaseName: string,
  patterns: PatternMatch[]
): number {
  let multiplier = 1.0;
  
  for (const pattern of patterns) {
    if (pattern.detected && pattern.diseases.some(d => diseaseName.includes(d))) {
      multiplier *= pattern.multiplier;
    }
  }
  
  return multiplier;
}

