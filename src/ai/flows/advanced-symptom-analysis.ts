'use server';

/**
 * Advanced Symptom Analysis with all improvements:
 * Server Action for comprehensive medical symptom analysis
 * - Symptom weighting
 * - Cluster classification
 * - Time-course logic
 * - Red-flag detection
 * - Pattern detection
 * - Enhanced scoring
 */

import 'groq-sdk/shims/node';
import Groq from 'groq-sdk';
import {z} from 'genkit';
import { getSymptomScore, SYMPTOM_WEIGHTS } from '@/ai/medical-data/symptom-weights';
import { DISEASE_DATABASE, getDiseaseRelevanceFactor } from '@/ai/medical-data/disease-database';
import { classifySymptomClusters, getDominantClusters, ClusterType } from '@/ai/medical-data/cluster-classification';
import { applyTimeCourseLogic, extractTimeCourseData, TimeCourseData } from '@/ai/medical-data/time-course-logic';
import { detectRedFlags, applyRedFlagMultipliers, RedFlag } from '@/ai/medical-data/red-flag-detection';
import { detectPatterns, applyPatternMultipliers } from '@/ai/medical-data/pattern-detection';
import { analyzeSystemInvolvement, getConditionSystems, calculateMultiSystemOverlap, SystemInvolvement } from '@/ai/medical-data/multi-system-reasoning';

const AdvancedSymptomAnalysisInputSchema = z.object({
  symptoms: z.string().describe('User-reported symptoms.'),
  medicalHistory: z.string().optional().describe('User medical history.'),
  questionnaireAnswers: z.string().describe('Answers to the questionnaire.'),
  profile: z.object({
    name: z.string(),
    age: z.string(),
    gender: z.string(),
  }).optional(),
});

export type AdvancedSymptomAnalysisInput = z.infer<typeof AdvancedSymptomAnalysisInputSchema>;

export interface ConditionResult {
  condition: string;
  likelihood: number; // 0-1, will be normalized to 0-100%
  description: string;
  webmd_search_term: string;
  cluster: string[];
  explanation: string; // Enhanced explanation
  displayLikelihood?: string; // For display (handles "Low likelihood" case)
}

export interface AdvancedAnalysisOutput {
  conditions: ConditionResult[];
  dominant_clusters: ClusterType[];
  red_flags: RedFlag[];
  time_course: {
    duration_days?: number;
    pattern: 'acute' | 'relapsing' | 'progressive' | 'chronic' | 'unknown';
    interpretation: string;
  };
}

export type AdvancedSymptomAnalysisOutput = AdvancedAnalysisOutput;

/**
 * Extract symptoms list from text
 */
function extractSymptomsList(symptomsText: string): string[] {
  // Split by common delimiters
  const symptoms = symptomsText
    .split(/[,;]|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return symptoms;
}

/**
 * Multi-layer scoring model with weighted criteria
 * - Symptom cluster match (40%)
 * - System involvement overlap (20%)
 * - Temporal pattern match (15%)
 * - Trigger/pattern match (10%)
 * - Demographic compatibility (10%)
 * - Rare-but-high-impact rules (5%)
 */
function calculateDiseaseScores(
  symptoms: string[],
  timeCourse: TimeCourseData,
  redFlagMultipliers: any,
  patterns: any[],
  profile?: { age?: string; gender?: string },
  systemInvolvement?: SystemInvolvement[]
): Map<string, number> {
  const diseaseScores = new Map<string, number>();
  
  if (!systemInvolvement) {
    systemInvolvement = analyzeSystemInvolvement(symptoms);
  }
  
  // Scoring weights
  const WEIGHTS = {
    symptomCluster: 0.40,
    systemOverlap: 0.20,
    temporalPattern: 0.15,
    triggerPattern: 0.10,
    demographic: 0.10,
    rareHighImpact: 0.05,
  };
  
  // Analyze systems
  const involvedSystemNames = systemInvolvement.map(s => s.system);
  const multiSystemCount = involvedSystemNames.length;
  
  DISEASE_DATABASE.forEach(disease => {
    let totalScore = 0;
    
    // 1. Symptom Cluster Match (40%)
    let symptomClusterScore = 0;
    const matchedSymptoms = symptoms.filter(s => 
      getDiseaseRelevanceFactor(disease.name, s) > 0
    );
    
    if (matchedSymptoms.length > 0) {
      // Calculate weighted symptom match
      matchedSymptoms.forEach(symptom => {
        const symptomScore = getSymptomScore(symptom);
        const relevanceFactor = getDiseaseRelevanceFactor(disease.name, symptom);
        symptomClusterScore += symptomScore * relevanceFactor;
      });
      
      // Normalize by total symptoms and expected symptoms for this condition
      const expectedSymptomCount = Object.keys(disease.symptom_relevance_map).length;
      symptomClusterScore = (symptomClusterScore / Math.max(symptoms.length, expectedSymptomCount)) * 
                           (matchedSymptoms.length / Math.max(symptoms.length, 1));
    }
    
    // Only consider if at least 30% symptom match
    if (matchedSymptoms.length / Math.max(symptoms.length, 1) < 0.3) {
      return; // Skip this disease
    }
    
    totalScore += symptomClusterScore * WEIGHTS.symptomCluster;
    
    // 2. System Involvement Overlap (20%)
    const conditionSystems = getConditionSystems(disease.name);
    const systemOverlapScore = calculateMultiSystemOverlap(conditionSystems, systemInvolvement);
    
    // Boost if ≥3 systems involved and condition is multi-system
    if (multiSystemCount >= 3 && conditionSystems.length >= 2) {
      totalScore += systemOverlapScore * WEIGHTS.systemOverlap * 1.5;
    } else {
      totalScore += systemOverlapScore * WEIGHTS.systemOverlap;
    }
    
    // 3. Temporal Pattern Match (15%)
    const timeCourseAdjustments = applyTimeCourseLogic(timeCourse, [disease.name]);
    let temporalScore = 1.0;
    if (timeCourseAdjustments.length > 0) {
      temporalScore = Math.min(timeCourseAdjustments[0].multiplier, 2.0) / 2.0; // Normalize to 0-1
    }
    totalScore += temporalScore * WEIGHTS.temporalPattern;
    
    // 4. Trigger/Pattern Match (10%)
    const patternMultiplier = applyPatternMultipliers(disease.name, patterns);
    const patternScore = Math.min(patternMultiplier, 2.0) / 2.0; // Normalize to 0-1
    totalScore += patternScore * WEIGHTS.triggerPattern;
    
    // 5. Demographic Compatibility (10%)
    let demographicScore = 1.0; // Default neutral
    if (profile?.age) {
      const age = parseInt(profile.age);
      // Some conditions are age-specific
      if (disease.name.includes('Still') && age < 16) {
        demographicScore = 0.3; // Adult-onset
      } else if (disease.name.includes('MS') && age < 20) {
        demographicScore = 0.5; // Less common in very young
      }
    }
    totalScore += demographicScore * WEIGHTS.demographic;
    
    // 6. Rare-but-High-Impact Rules (5%)
    const redFlagMultiplier = applyRedFlagMultipliers(disease.name, redFlagMultipliers);
    const rareImpactScore = Math.min(redFlagMultiplier, 2.0) / 2.0;
    totalScore += rareImpactScore * WEIGHTS.rareHighImpact;
    
    diseaseScores.set(disease.name, totalScore);
  });
  
  return diseaseScores;
}

/**
 * Apply condition filtering rules based on symptom patterns
 */
function applyConditionFiltering(
  symptoms: string[],
  answers: string[]
): string[] {
  const text = (symptoms.join(' ') + ' ' + answers.join(' ')).toLowerCase();
  const symptomsLower = symptoms.join(' ').toLowerCase();
  
  const priorityConditions: string[] = [];
  const excludedConditions: string[] = [];
  
  // Rule: weight loss + heat intolerance + palpitations → endocrine/cardiac/autonomic
  if (symptomsLower.includes('weight loss') && 
      (symptomsLower.includes('heat') || symptomsLower.includes('sweating')) &&
      (symptomsLower.includes('palpitation') || symptomsLower.includes('heart'))) {
    priorityConditions.push('Hyperthyroidism', 'Graves\' Disease', 'Pheochromocytoma');
    excludedConditions.push('Vitamin B12 Deficiency', 'Iron Deficiency Anemia');
  }
  
  // Rule: polyuria/polydipsia + weight loss → diabetes, hyperthyroidism
  if ((symptomsLower.includes('frequent urination') || symptomsLower.includes('excessive thirst')) &&
      symptomsLower.includes('weight loss')) {
    priorityConditions.push('Diabetes Mellitus Type 2', 'Hyperthyroidism');
  }
  
  // Rule: palpitations + stress/exertion trigger + tremor → endocrine + autonomic
  if (symptomsLower.includes('palpitation') && 
      (text.includes('stress') || text.includes('exertion') || text.includes('trigger')) &&
      (symptomsLower.includes('tremor') || symptomsLower.includes('shaking'))) {
    priorityConditions.push('Pheochromocytoma', 'Hyperthyroidism', 'POTS', 'Autonomic Dysfunction');
    excludedConditions.push('Vitamin B12 Deficiency');
  }
  
  // Rule: neurological + autonomic → MS, autonomic neuropathy, GBS, dysautonomia
  if ((symptomsLower.includes('numbness') || symptomsLower.includes('tingling') || 
       symptomsLower.includes('weakness')) &&
      (symptomsLower.includes('dizziness') || symptomsLower.includes('orthostatic'))) {
    priorityConditions.push('Multiple Sclerosis (MS)', 'POTS', 'Autonomic Dysfunction', 'Guillain-Barré Syndrome (GBS)');
  }
  
  return priorityConditions;
}

/**
 * Normalize scores to 0-100%
 * Ensures no condition shows 0% unless explicitly ruled out
 */
function normalizeScores(scores: Map<string, number>): Map<string, number> {
  const maxScore = Math.max(...Array.from(scores.values()));
  if (maxScore === 0) return scores;
  
  const normalized = new Map<string, number>();
  scores.forEach((score, disease) => {
    const normalizedScore = (score / maxScore) * 100;
    // Ensure minimum 5% if condition has any score (unless it's truly 0)
    if (score > 0 && normalizedScore < 5) {
      normalized.set(disease, 5); // Minimum display threshold
    } else {
      normalized.set(disease, normalizedScore);
    }
  });
  
  return normalized;
}

/**
 * Generate comprehensive explanation for condition using AI
 */
async function generateConditionExplanation(
  condition: string,
  symptoms: string[],
  matchedSymptoms: string[],
  likelihood: number,
  groq: Groq
): Promise<{ explanation: string; missingInfo?: string }> {
  try {
    const disease = DISEASE_DATABASE.find(d => d.name === condition);
    const keySymptoms = matchedSymptoms.slice(0, 3).join(', ');
    
    const prompt = `Explain why "${condition}" might be considered given these matching symptoms: ${keySymptoms}.
    
Likelihood: ${likelihood.toFixed(0)}%
All symptoms: ${symptoms.join(', ')}

Provide:
1. Why this condition fits (1 sentence)
2. What symptoms are most predictive (1 sentence)
3. What information would increase or decrease likelihood (1 sentence)

Keep it simple and accessible for non-medical users (like a 9-year-old or 80-year-old). Return ONLY the explanation, no markdown or numbered lists.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a medical assistant. Provide clear, simple explanations for non-medical users of all ages.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 200,
    });

    const explanation = completion.choices[0]?.message?.content?.trim() || 
           `This condition may be considered based on your reported symptoms.`;
    
    return { explanation };
  } catch (error) {
    return { 
      explanation: `This condition may be considered based on your reported symptoms.`,
    };
  }
}

export async function advancedSymptomAnalysis(
  input: AdvancedSymptomAnalysisInput
): Promise<AdvancedSymptomAnalysisOutput> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GROQ_API_KEY is not set. Please add it to your .env.local file.');
  }

  const groq = new Groq({ apiKey });

  // Extract symptoms
  const symptoms = extractSymptomsList(input.symptoms);
  if (symptoms.length === 0) {
    throw new Error('No symptoms detected');
  }

  // Extract time-course data (with inference)
  const timeCourse = extractTimeCourseData(
    input.symptoms,
    [input.questionnaireAnswers]
  );

  // Detect red flags
  const { redFlags, multipliers: redFlagMultipliers } = detectRedFlags(
    input.symptoms,
    [input.questionnaireAnswers],
    input.profile
  );

  // Detect patterns
  const patterns = detectPatterns(input.symptoms, [input.questionnaireAnswers]);

  // Analyze system involvement
  const systemInvolvement = analyzeSystemInvolvement(symptoms);

  // Apply condition filtering rules
  const priorityConditions = applyConditionFiltering(symptoms, [input.questionnaireAnswers]);

  // Classify clusters
  const symptomWeights = new Map<string, number>();
  symptoms.forEach(s => {
    symptomWeights.set(s.toLowerCase().trim(), getSymptomScore(s));
  });
  const clusterScores = classifySymptomClusters(symptoms, symptomWeights);
  const dominantClusters = getDominantClusters(clusterScores);

  // Calculate disease scores with new multi-layer model
  const diseaseScores = calculateDiseaseScores(
    symptoms,
    timeCourse,
    redFlagMultipliers,
    patterns,
    input.profile,
    systemInvolvement
  );

  // Boost priority conditions
  priorityConditions.forEach(conditionName => {
    const currentScore = diseaseScores.get(conditionName) || 0;
    diseaseScores.set(conditionName, currentScore * 1.3); // 30% boost
  });

  // Normalize scores
  const normalizedScores = normalizeScores(diseaseScores);

  // Filter: only show conditions >= 25% OR top conditions regardless of score
  const sortedAll = Array.from(normalizedScores.entries())
    .sort((a, b) => b[1] - a[1]);
  
  // Get conditions >= 25% OR top 3 if all are below 25%
  const topScore = sortedAll[0]?.[1] || 0;
  const threshold = topScore < 25 ? 0 : 25; // Show all if top is below 25%
  
  const sortedDiseases = sortedAll
    .filter(([_, score]) => score >= threshold || sortedAll.indexOf([_, score] as any) < 3)
    .slice(0, 10); // Up to top 10, but filtered by 25% threshold

  // Generate results with explanations
  const conditions: ConditionResult[] = [];
  
  for (const [diseaseName, score] of sortedDiseases) {
    const disease = DISEASE_DATABASE.find(d => d.name === diseaseName);
    if (!disease) continue;

    // Get matched symptoms
    const matchedSymptoms = symptoms.filter(s => 
      getDiseaseRelevanceFactor(diseaseName, s) > 0
    );

    // Generate explanation
    const explanationData = await generateConditionExplanation(
      diseaseName, 
      symptoms, 
      matchedSymptoms,
      score,
      groq
    );

    // Ensure score is at least displayed correctly (no 0% unless truly zero)
    const displayScore = score < 5 && score > 0 ? 5 : score;
    const displayLikelihood = displayScore < 10 && displayScore > 0 ? 'Low likelihood (<10%)' : `${Math.round(displayScore)}%`;

    conditions.push({
      condition: diseaseName,
      likelihood: displayScore / 100, // Convert back to 0-1 for compatibility
      description: disease.description,
      webmd_search_term: disease.webmd_search_term,
      cluster: disease.cluster,
      explanation: explanationData.explanation,
      displayLikelihood,
    });
  }

  // Improved time-course interpretation
  let timeCourseInterpretation = '';
  const derived = (timeCourse as any).derived;
  
  if (timeCourse.duration_days) {
    if (timeCourse.duration_days > 90) {
      timeCourseInterpretation = `Symptoms have been present for over 3 months, suggesting a chronic condition.`;
    } else if (timeCourse.duration_days > 21) {
      timeCourseInterpretation = `Symptoms lasting over 3 weeks suggest a chronic rather than acute condition.`;
    } else if (timeCourse.duration_days > 14) {
      timeCourseInterpretation = `Symptoms lasting over 2 weeks suggest a chronic condition rather than an acute illness.`;
    } else {
      timeCourseInterpretation = `Recent onset (within 2 weeks) may indicate an acute condition.`;
    }
    if (derived) {
      timeCourseInterpretation += ' (inferred from symptom pattern)';
    }
  } else if (timeCourse.pattern !== 'unknown') {
    // We have pattern but not duration
    if (timeCourse.pattern === 'relapsing') {
      timeCourseInterpretation = 'Relapsing pattern suggests an autoimmune or episodic condition.';
    } else if (timeCourse.pattern === 'progressive') {
      timeCourseInterpretation = 'Progressive pattern suggests a neurologic or degenerative condition.';
    } else if (timeCourse.pattern === 'chronic') {
      timeCourseInterpretation = 'Chronic pattern suggests a long-standing condition.';
    } else if (timeCourse.pattern === 'acute') {
      timeCourseInterpretation = 'Acute pattern suggests a recent-onset condition.';
    }
  } else {
    // Infer from symptoms
    if (symptoms.some(s => s.toLowerCase().includes('weight loss'))) {
      timeCourseInterpretation = 'Weight loss patterns typically develop over weeks to months, suggesting a chronic process.';
    } else if (symptoms.some(s => s.toLowerCase().includes('palpitation') || s.toLowerCase().includes('heart'))) {
      timeCourseInterpretation = 'Cardiac symptoms with progression suggest a chronic pattern.';
    } else {
      timeCourseInterpretation = 'Symptom pattern suggests a chronic condition. More specific timing information would improve accuracy.';
    }
  }

  return {
    conditions,
    dominant_clusters: dominantClusters,
    red_flags: redFlags,
    time_course: {
      duration_days: timeCourse.duration_days,
      pattern: timeCourse.pattern || 'unknown',
      interpretation: timeCourseInterpretation,
    },
  };
}

