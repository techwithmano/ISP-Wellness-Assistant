/**
 * Pure LLM-based Wellness Analysis
 * No backend, no calculations - just AI reasoning
 */

export interface ConditionResult {
  condition: string;
  percentage: string; // "75%" or "Low likelihood (<10%)"
  explanation: string;
  keySymptoms: string[];
  wouldIncrease: string;
  wouldDecrease: string;
  webmd_search_term?: string; // For WebMD links
}

export interface WellnessSummary {
  profileInformation: {
    name: string;
    age: string;
    gender: string;
    medicalHistory?: string;
  };
  reportedSymptoms: string[];
  answerKey: Array<{ question: string; answer: string }>;
  systemClassification: string[];
  timeCourseInterpretation: string;
  topConditions: ConditionResult[];
  safetyNotice: string;
}

/**
 * Generate complete wellness summary using pure LLM reasoning
 */
export async function generateWellnessSummary(
  profile: { name: string; age: string; gender: string; medicalConditions?: string },
  symptoms: string,
  questions: Array<{ text: string }>,
  answers: string[]
): Promise<WellnessSummary> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  // Build answer key
  const answerKey = questions.map((q, i) => ({
    question: q.text,
    answer: answers[i] || 'Not answered',
  }));

  const prompt = `You are a medical-style reasoning assistant that produces a structured "Wellness Summary" based ONLY on the user's answers.

You do NOT have access to a backend, calculations, databases, or any external tools.

You MUST generate all reasoning, scoring, interpretation, and percentages using internal LLM reasoning only.

Profile Information:
- Name: ${profile.name}
- Age: ${profile.age}
- Gender: ${profile.gender}
${profile.medicalConditions ? `- Medical History: ${profile.medicalConditions}` : ''}

Reported Symptoms: ${symptoms}

Question & Answer Key:
${answerKey.map((qa, i) => `Q${i + 1}: ${qa.question}\nAnswer: ${qa.answer}`).join('\n\n')}

RULES FOR YOUR REASONING:

1. Percentage Generation Rules:
- Never output 0% for relevant conditions
- If a condition is possible but low → show "Low likelihood (<10%)"
- If top condition is under 25% → show top 3 conditions anyway
- Maximum 10 conditions may be shown
- You MUST make up the percentages based on reasoning — you are the engine

2. Symptom Weighting (internal reasoning model):
Use these weights inside your reasoning only:
- Symptom cluster match → 40%
- System involvement (endocrine, neuro, cardiac, etc.) → 20%
- Time-course pattern → 15%
- Triggers/patterns → 10%
- Demographic match → 10%
- Rare-but-high-impact → 5%
You do NOT perform numeric calculations — just approximate the score mentally and produce realistic percentages

3. Time-Course Interpretation:
- Always produce a conclusion. Never say "time course unavailable."
- Use inference:
  * Weight loss → chronic
  * Stress-triggered palpitations → endocrine/autonomic
  * Thirst + fatigue → metabolic
  * Numbness/tingling → neurological
  * Progression → chronic progressive

4. Condition Filtering:
Prioritize conditions that match clusters of answers:
- Weight loss + thirst → Diabetes, Hyperthyroidism
- Palpitations + stress → Hyperthyroidism, Anxiety-autonomic
- Numbness + fatigue → B12 Deficiency, Diabetes
- Chest pressure + palpitations → Cardiac + endocrine
- Symptoms across 3+ systems → Autonomic Dysfunction, systemic illness

5. Enhanced Condition Pool (consider these when relevant):
- Hyperthyroidism / Graves' Disease
- Diabetes Mellitus Type 2
- Pheochromocytoma
- Iron Deficiency Anemia
- Vitamin B12 Deficiency
- Hyperparathyroidism
- Autonomic Dysfunction / POTS
- Generalized Anxiety Disorder (only when matching pattern)
- You may add more if symptoms fit

OUTPUT REQUIREMENTS:

You MUST return valid JSON in this exact structure:

{
  "systemClassification": ["endocrine", "neurologic", ...],
  "timeCourseInterpretation": "Clear interpretation based on symptoms...",
      "topConditions": [
        {
          "condition": "Hyperthyroidism",
          "percentage": "65%",
          "explanation": "Clear explanation of why this condition fits...",
          "keySymptoms": ["weight loss", "palpitations", "anxiety"],
          "wouldIncrease": "What would increase likelihood...",
          "wouldDecrease": "What would decrease likelihood...",
          "webmd_search_term": "hyperthyroidism"
        }
      ]
}

Style Requirements:
- Write explanations in simple, readable language
- Explain why each condition matches the symptom pattern
- Use friendly, clear tone — like a helpful medical assistant
- Keep explanations concise (2-3 sentences max)

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations outside the JSON structure.`;

  try {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('NEXT_PUBLIC_GROQ_API_KEY not set');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a medical reasoning assistant. You generate wellness summaries using pure reasoning. Always return valid JSON only, no markdown.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    const parsed = JSON.parse(content);

    // Extract symptoms list
    const symptomsList = symptoms.split(/[,;]|\n/).map(s => s.trim()).filter(s => s.length > 0);

    return {
      profileInformation: {
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        medicalHistory: profile.medicalConditions,
      },
      reportedSymptoms: symptomsList,
      answerKey: answerKey,
      systemClassification: parsed.systemClassification || [],
      timeCourseInterpretation: parsed.timeCourseInterpretation || 'Based on the symptom pattern, this appears to be a chronic condition that developed over time.',
      topConditions: parsed.topConditions || [],
      safetyNotice: '⚠️ Important: This is a preliminary AI-generated wellness summary. It is not a medical diagnosis. Please consult a licensed healthcare professional for proper evaluation.',
    };
  } catch (error) {
    console.error('LLM analysis error:', error);
    // Fallback response
    return {
      profileInformation: {
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        medicalHistory: profile.medicalConditions,
      },
      reportedSymptoms: symptoms.split(/[,;]|\n/).map(s => s.trim()).filter(s => s.length > 0),
      answerKey: answerKey,
      systemClassification: ['metabolic/nutritional'],
      timeCourseInterpretation: 'Based on the symptom pattern, this appears to be a chronic condition that developed over time. More specific timing information would help improve accuracy.',
      topConditions: [],
      safetyNotice: '⚠️ Important: This is a preliminary AI-generated wellness summary. It is not a medical diagnosis. Please consult a licensed healthcare professional for proper evaluation.',
    };
  }
}

