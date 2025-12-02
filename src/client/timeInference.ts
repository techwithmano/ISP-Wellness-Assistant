/**
 * Client-side time-course and pattern inference
 * Pure deterministic heuristics - no backend required
 */

export interface TimeCourseData {
  duration_days?: number;
  pattern: 'acute' | 'relapsing' | 'progressive' | 'chronic' | 'unknown';
  derived?: boolean;
}

export interface TimeCourseResult {
  duration_days?: number;
  pattern: 'acute' | 'relapsing' | 'progressive' | 'chronic' | 'unknown';
  interpretation: string;
  derived: boolean;
}

/**
 * Extract time-course from text (client-side)
 */
function extractDurationFromText(text: string): number | undefined {
  const durationPatterns = [
    { pattern: /(\d+)\s*(?:days?|d)/i, multiplier: 1 },
    { pattern: /(\d+)\s*(?:weeks?|w)/i, multiplier: 7 },
    { pattern: /(\d+)\s*(?:months?|mo)/i, multiplier: 30 },
    { pattern: /(\d+)\s*(?:years?|y)/i, multiplier: 365 },
    { pattern: /(?:for|since|over|last)\s+(\d+)\s*(?:days?|d)/i, multiplier: 1 },
    { pattern: /(?:for|since|over|last)\s+(\d+)\s*(?:weeks?|w)/i, multiplier: 7 },
    { pattern: /(?:for|since|over|last)\s+(\d+)\s*(?:months?|mo)/i, multiplier: 30 },
  ];

  for (const { pattern: regex, multiplier } of durationPatterns) {
    const match = text.match(regex);
    if (match) {
      return parseInt(match[1]) * multiplier;
    }
  }

  return undefined;
}

/**
 * Infer time-course from symptoms (deterministic heuristics)
 */
export function inferTimeCourse(
  symptoms: string[],
  answers: string[]
): TimeCourseResult {
  const text = (symptoms.join(' ') + ' ' + answers.join(' ')).toLowerCase();
  const symptomsLower = symptoms.join(' ').toLowerCase();
  
  let duration_days = extractDurationFromText(text);
  let pattern: 'acute' | 'relapsing' | 'progressive' | 'chronic' | 'unknown' = 'unknown';
  let derived = false;
  let interpretation = '';

  // Extract explicit pattern from text
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

  // Deterministic inference rules (client-side only)
  if (pattern === 'unknown' || !duration_days) {
    derived = true;

    // Rule 1: weight_loss → derived_duration = "chronic"
    if (symptomsLower.includes('weight loss')) {
      duration_days = duration_days || 21; // ~3 weeks
      pattern = 'chronic';
      interpretation = 'Weight loss patterns typically develop over weeks to months, suggesting a chronic process.';
    }
    // Rule 2: palpitations progressive → derived_duration = "chronic progressive"
    else if ((symptomsLower.includes('palpitation') || symptomsLower.includes('heart')) &&
             (text.includes('worse') || text.includes('increase') || text.includes('frequent'))) {
      pattern = 'progressive';
      duration_days = duration_days || 30;
      interpretation = 'Cardiac symptoms with progression suggest a chronic progressive pattern.';
    }
    // Rule 3: tremor+anxiety → derived_pattern = "endocrine/metabolic likely"
    else if ((symptomsLower.includes('tremor') || symptomsLower.includes('shaking')) &&
             (symptomsLower.includes('anxiety') || symptomsLower.includes('nervous'))) {
      pattern = 'chronic';
      duration_days = duration_days || 60;
      interpretation = 'Tremor with anxiety-like symptoms suggests a chronic endocrine or metabolic condition.';
    }
    // Rule 4: neuro symptoms → derived_pattern = "neurologic/chronic"
    else if (symptomsLower.includes('numbness') || symptomsLower.includes('tingling') ||
             symptomsLower.includes('weakness') || symptomsLower.includes('vision problem')) {
      if (text.includes('worse') || text.includes('progress')) {
        pattern = 'progressive';
      } else {
        pattern = 'chronic';
      }
      duration_days = duration_days || 45;
      interpretation = 'Neurological symptoms suggest a chronic or progressive pattern.';
    }
    // Default inference
    else if (!duration_days) {
      pattern = 'chronic';
      duration_days = 30;
      interpretation = 'Symptom pattern suggests a chronic condition. More specific timing information would improve accuracy.';
    }
  }

  // Build interpretation if not set
  if (!interpretation) {
    if (duration_days) {
      if (duration_days > 90) {
        interpretation = `Symptoms have been present for over 3 months, suggesting a chronic condition.`;
      } else if (duration_days > 21) {
        interpretation = `Symptoms lasting over 3 weeks suggest a chronic rather than acute condition.`;
      } else if (duration_days > 14) {
        interpretation = `Symptoms lasting over 2 weeks suggest a chronic condition rather than an acute illness.`;
      } else {
        interpretation = `Recent onset (within 2 weeks) may indicate an acute condition.`;
      }
    }

    if (pattern === 'relapsing') {
      interpretation += ' Relapsing pattern suggests an autoimmune or episodic condition.';
    } else if (pattern === 'progressive') {
      interpretation += ' Progressive pattern suggests a neurologic or degenerative condition.';
    } else if (pattern === 'chronic') {
      interpretation += ' Chronic pattern suggests a long-standing condition.';
    }
  }

  // Always ensure we have an interpretation
  if (!interpretation) {
    interpretation = 'Symptom pattern suggests a chronic condition. More specific timing information would improve accuracy.';
  }

  return {
    duration_days,
    pattern,
    interpretation,
    derived,
  };
}

