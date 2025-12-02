/**
 * Red-Flag Detection Module
 * Detects red flags and applies multipliers to disease scores
 */

export interface RedFlag {
  name: string;
  detected: boolean;
  severity: number; // 0-1
}

export interface RedFlagMultipliers {
  malignancy_multiplier: number;
  chronic_infection_multiplier: number;
  MS_multiplier: number;
  dysautonomia_multiplier: number;
  adrenal_insufficiency_multiplier: number;
  autoimmune_multiplier: number;
}

/**
 * Detect red flags from symptoms and answers
 */
export function detectRedFlags(
  symptoms: string,
  answers: string[],
  profile?: { age?: string; gender?: string }
): { redFlags: RedFlag[]; multipliers: RedFlagMultipliers } {
  const text = (symptoms + ' ' + answers.join(' ')).toLowerCase();
  const redFlags: RedFlag[] = [];
  
  const multipliers: RedFlagMultipliers = {
    malignancy_multiplier: 1.0,
    chronic_infection_multiplier: 1.0,
    MS_multiplier: 1.0,
    dysautonomia_multiplier: 1.0,
    adrenal_insufficiency_multiplier: 1.0,
    autoimmune_multiplier: 1.0,
  };
  
  // Weight loss > 2kg in 2 months
  if (text.includes('weight loss') || text.includes('lost weight')) {
    const weightLossPatterns = [
      /(?:lost|losing)\s+(\d+)\s*(?:kg|kilograms?|pounds?|lbs)/i,
      /weight\s+loss\s+of\s+(\d+)\s*(?:kg|kilograms?|pounds?|lbs)/i,
      /(\d+)\s*(?:kg|kilograms?|pounds?|lbs)\s+(?:weight\s+)?loss/i,
    ];
    
    let weightLossAmount = 0;
    for (const pattern of weightLossPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        // Convert pounds to kg if needed
        if (text.includes('pound') || text.includes('lb')) {
          weightLossAmount = value * 0.453592; // Convert to kg
        } else {
          weightLossAmount = value;
        }
        break;
      }
    }
    
    // If no specific amount, check for "significant" or "a lot"
    if (weightLossAmount === 0 && 
        (text.includes('significant weight loss') || 
         text.includes('a lot of weight') ||
         text.includes('unintentional weight loss'))) {
      weightLossAmount = 3; // Assume significant if mentioned
    }
    
    if (weightLossAmount >= 2) {
      redFlags.push({
        name: 'Significant Weight Loss',
        detected: true,
        severity: Math.min(weightLossAmount / 5, 1.0), // Cap at 1.0
      });
      multipliers.malignancy_multiplier += 1.5;
    }
  }
  
  // Night sweats
  if (text.includes('night sweat') || text.includes('sweating at night') ||
      text.includes('drenching sweat') || text.includes('soaked at night')) {
    redFlags.push({
      name: 'Night Sweats',
      detected: true,
      severity: 0.8,
    });
    multipliers.malignancy_multiplier += 1.4;
    multipliers.chronic_infection_multiplier += 1.4;
  }
  
  // Neuro symptoms + visual changes
  const hasNeuroSymptoms = text.includes('numbness') || text.includes('tingling') ||
                          text.includes('weakness') || text.includes('balance problem');
  const hasVisualChanges = text.includes('vision') || text.includes('blurred') ||
                          text.includes('double vision') || text.includes('visual');
  
  if (hasNeuroSymptoms && hasVisualChanges) {
    redFlags.push({
      name: 'Neurological + Visual Symptoms',
      detected: true,
      severity: 0.9,
    });
    multipliers.MS_multiplier += 1.6;
  }
  
  // Orthostatic dizziness
  if (text.includes('orthostatic') || 
      (text.includes('dizziness') && text.includes('standing')) ||
      (text.includes('dizzy') && (text.includes('stand') || text.includes('up')))) {
    redFlags.push({
      name: 'Orthostatic Dizziness',
      detected: true,
      severity: 0.7,
    });
    multipliers.dysautonomia_multiplier += 1.4;
    multipliers.adrenal_insufficiency_multiplier += 1.3;
  }
  
  // Orthostatic dizziness + numbness
  if (redFlags.some(rf => rf.name === 'Orthostatic Dizziness') && hasNeuroSymptoms) {
    multipliers.dysautonomia_multiplier += 0.3; // Additional boost
    multipliers.adrenal_insufficiency_multiplier += 0.2;
  }
  
  return { redFlags, multipliers };
}

/**
 * Apply red flag multipliers to disease scores
 */
export function applyRedFlagMultipliers(
  diseaseName: string,
  multipliers: RedFlagMultipliers
): number {
  let multiplier = 1.0;
  
  // Malignancy diseases
  if (diseaseName.includes('Lymphoma') || diseaseName.includes('Cancer')) {
    multiplier *= multipliers.malignancy_multiplier;
  }
  
  // Chronic infection diseases
  if (diseaseName.includes('EBV') || diseaseName.includes('CMV') || 
      diseaseName.includes('Tuberculosis') || diseaseName.includes('TB') ||
      diseaseName.includes('Chronic Infection')) {
    multiplier *= multipliers.chronic_infection_multiplier;
  }
  
  // MS
  if (diseaseName.includes('Multiple Sclerosis') || diseaseName.includes('MS')) {
    multiplier *= multipliers.MS_multiplier;
  }
  
  // Autonomic dysfunction
  if (diseaseName.includes('POTS') || diseaseName.includes('Autonomic Dysfunction')) {
    multiplier *= multipliers.dysautonomia_multiplier;
  }
  
  // Adrenal insufficiency
  if (diseaseName.includes('Adrenal Insufficiency')) {
    multiplier *= multipliers.adrenal_insufficiency_multiplier;
  }
  
  // Autoimmune diseases
  if (diseaseName.includes('Lupus') || diseaseName.includes('Rheumatoid') ||
      diseaseName.includes('Still') || diseaseName.includes('Sjögren') ||
      diseaseName.includes('Vasculitis') || diseaseName.includes('Sarcoidosis')) {
    multiplier *= multipliers.autoimmune_multiplier;
  }
  
  return multiplier;
}

