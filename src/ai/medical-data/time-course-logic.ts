/**
 * Time-Course Logic
 * Adjusts disease scores based on symptom duration and pattern
 */

export interface TimeCourseData {
  duration_days?: number;
  pattern?: 'acute' | 'relapsing' | 'progressive' | 'chronic' | 'unknown';
}

export interface DiseaseScoreAdjustment {
  diseaseName: string;
  multiplier: number;
  reason: string;
}

/**
 * Apply time-course logic to disease scores
 */
export function applyTimeCourseLogic(
  timeCourse: TimeCourseData,
  diseaseNames: string[]
): DiseaseScoreAdjustment[] {
  const adjustments: DiseaseScoreAdjustment[] = [];
  
  const duration = timeCourse.duration_days || 0;
  const pattern = timeCourse.pattern || 'unknown';
  
  // Acute diseases (should be downranked if duration > 14 days)
  const acuteDiseases = [
    'Guillain-Barré Syndrome (GBS)',
    'Acute Infection',
  ];
  
  // Chronic/Autoimmune diseases (should be upranked if duration > 14 days)
  const chronicDiseases = [
    'Systemic Lupus Erythematosus (SLE)',
    'Rheumatoid Arthritis',
    'Adult-Onset Still\'s Disease (AOSD)',
    'Sjögren\'s Syndrome',
    'Systemic Vasculitis',
    'Sarcoidosis',
    'Multiple Sclerosis (MS)',
    'Chronic EBV Infection',
    'Chronic CMV Infection',
    'Tuberculosis (TB)',
    'Lymphoma',
  ];
  
  // Autoimmune diseases (should be upranked if relapsing pattern)
  const autoimmuneDiseases = [
    'Systemic Lupus Erythematosus (SLE)',
    'Rheumatoid Arthritis',
    'Adult-Onset Still\'s Disease (AOSD)',
    'Sjögren\'s Syndrome',
    'Systemic Vasculitis',
    'Sarcoidosis',
    'Multiple Sclerosis (MS)',
  ];
  
  // Neurologic/Neurodegenerative (should be upranked if progressive pattern)
  const neurologicDiseases = [
    'Multiple Sclerosis (MS)',
    'Guillain-Barré Syndrome (GBS)',
  ];
  
  diseaseNames.forEach(diseaseName => {
    let multiplier = 1.0;
    const reasons: string[] = [];
    
    // Duration-based adjustments
    if (duration > 14) {
      // Downrank acute diseases
      if (acuteDiseases.some(d => diseaseName.includes(d))) {
        multiplier *= 0.5;
        reasons.push('symptoms too long for acute condition');
      }
      
      // Uprank chronic/autoimmune/malignancy
      if (chronicDiseases.some(d => diseaseName.includes(d))) {
        multiplier *= 1.3;
        reasons.push('symptoms duration suggests chronic condition');
      }
    } else if (duration > 0 && duration <= 14) {
      // Short duration - uprank acute diseases
      if (acuteDiseases.some(d => diseaseName.includes(d))) {
        multiplier *= 1.2;
        reasons.push('symptoms duration suggests acute condition');
      }
    }
    
    // Pattern-based adjustments
    if (pattern === 'relapsing' || pattern === 'waxing' || pattern === 'waning') {
      if (autoimmuneDiseases.some(d => diseaseName.includes(d))) {
        multiplier *= 1.4;
        reasons.push('relapsing pattern suggests autoimmune condition');
      }
    }
    
    if (pattern === 'progressive') {
      if (neurologicDiseases.some(d => diseaseName.includes(d))) {
        multiplier *= 1.3;
        reasons.push('progressive pattern suggests neurologic condition');
      }
    }
    
    if (multiplier !== 1.0) {
      adjustments.push({
        diseaseName,
        multiplier,
        reason: reasons.join('; '),
      });
    }
  });
  
  return adjustments;
}

/**
 * Extract time-course information from symptoms and answers
 * Also infers time-course from symptom types when not explicitly stated
 */
export function extractTimeCourseData(
  symptoms: string,
  answers: string[]
): TimeCourseData & { derived?: boolean } {
  const text = (symptoms + ' ' + answers.join(' ')).toLowerCase();
  const symptomsLower = symptoms.toLowerCase();
  
  let duration_days: number | undefined;
  let pattern: 'acute' | 'relapsing' | 'progressive' | 'chronic' | 'unknown' = 'unknown';
  let derived = false;
  
  // Extract duration
  const durationPatterns = [
    { pattern: /(\d+)\s*(?:days?|d)/i, multiplier: 1 },
    { pattern: /(\d+)\s*(?:weeks?|w)/i, multiplier: 7 },
    { pattern: /(\d+)\s*(?:months?|mo)/i, multiplier: 30 },
    { pattern: /(\d+)\s*(?:years?|y)/i, multiplier: 365 },
    { pattern: /(?:for|since|over|last)\s+(\d+)\s*(?:days?|d)/i, multiplier: 1 },
    { pattern: /(?:for|since|over|last)\s+(\d+)\s*(?:weeks?|w)/i, multiplier: 7 },
    { pattern: /(?:for|since|over|last)\s+(\d+)\s*(?:months?|mo)/i, multiplier: 30 },
    { pattern: /(?:for|since|over|last)\s+(\d+)\s*(?:years?|y)/i, multiplier: 365 },
  ];
  
  for (const { pattern: regex, multiplier } of durationPatterns) {
    const match = text.match(regex);
    if (match) {
      duration_days = parseInt(match[1]) * multiplier;
      break;
    }
  }
  
  // Extract pattern
  if (text.includes('relapsing') || text.includes('comes and goes') || 
      text.includes('waxing') || text.includes('waning') || 
      text.includes('on and off') || text.includes('episodic')) {
    pattern = 'relapsing';
  } else if (text.includes('progressive') || text.includes('getting worse') ||
             text.includes('worsening') || text.includes('gradually worse')) {
    pattern = 'progressive';
  } else if (text.includes('chronic') || text.includes('long-term') ||
             text.includes('persistent') || (duration_days && duration_days > 90)) {
    pattern = 'chronic';
  } else if (text.includes('sudden') || text.includes('acute') ||
             (duration_days && duration_days <= 14)) {
    pattern = 'acute';
  }
  
  // If pattern is unknown, infer from symptom types
  if (pattern === 'unknown') {
    // Chronic weight loss → >3 weeks, chronic
    if (symptomsLower.includes('weight loss') && !duration_days) {
      duration_days = 21; // ~3 weeks
      pattern = 'chronic';
      derived = true;
    }
    
    // Cardiac palpitations with progression → chronic progressive
    if ((symptomsLower.includes('palpitation') || symptomsLower.includes('heart')) &&
        (text.includes('worse') || text.includes('increase') || text.includes('frequent'))) {
      pattern = 'progressive';
      if (!duration_days) duration_days = 30;
      derived = true;
    }
    
    // Tremor + anxiety-like episodes → chronic metabolic/endocrine or autonomic
    if ((symptomsLower.includes('tremor') || symptomsLower.includes('shaking')) &&
        (symptomsLower.includes('anxiety') || symptomsLower.includes('nervous') || 
         symptomsLower.includes('panic'))) {
      pattern = 'chronic';
      if (!duration_days) duration_days = 60;
      derived = true;
    }
    
    // Neurological symptoms → often progressive or chronic
    if (symptomsLower.includes('numbness') || symptomsLower.includes('tingling') ||
        symptomsLower.includes('weakness') || symptomsLower.includes('vision problem')) {
      if (text.includes('worse') || text.includes('progress')) {
        pattern = 'progressive';
      } else {
        pattern = 'chronic';
      }
      if (!duration_days) duration_days = 45;
      derived = true;
    }
    
    // If still unknown but we have duration, infer pattern
    if (pattern === 'unknown' && duration_days) {
      if (duration_days > 90) {
        pattern = 'chronic';
      } else if (duration_days > 21) {
        pattern = 'chronic';
      } else if (duration_days > 14) {
        pattern = 'chronic';
      } else {
        pattern = 'acute';
      }
      derived = true;
    }
  }
  
  return { duration_days, pattern, derived };
}

