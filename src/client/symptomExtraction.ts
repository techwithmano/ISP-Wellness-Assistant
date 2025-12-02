/**
 * Client-side symptom extraction using Groq
 * ONLY extracts structured data - NO scoring or diagnostic logic
 */

export interface ExtractedSymptomData {
  symptoms: string[];
  duration_days?: number;
  triggers: string[];
  qualifiers: string[];
}

/**
 * Extract structured symptom data from user input using Groq
 * This is the ONLY use of Groq - pure extraction, no scoring
 */
export async function extractSymptomData(
  symptomsText: string,
  answersText: string
): Promise<ExtractedSymptomData> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    // Fallback: simple client-side parsing if no API key
    return extractSymptomDataFallback(symptomsText, answersText);
  }

  try {
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
            content: 'You are a data extraction assistant. Extract structured symptom information and return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: `Extract and return JSON of symptoms, durations, triggers, and qualifiers only.

User symptoms: ${symptomsText}
User answers: ${answersText}

Return JSON in this exact format:
{
  "symptoms": ["symptom1", "symptom2"],
  "duration_days": 30,
  "triggers": ["trigger1"],
  "qualifiers": ["qualifier1"]
}

Return ONLY the JSON object, no markdown, no explanation.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    
    try {
      const extracted = JSON.parse(content);
      return {
        symptoms: extracted.symptoms || [],
        duration_days: extracted.duration_days,
        triggers: extracted.triggers || [],
        qualifiers: extracted.qualifiers || [],
      };
    } catch (parseError) {
      // Fallback on parse error
      return extractSymptomDataFallback(symptomsText, answersText);
    }
  } catch (error) {
    console.warn('Groq extraction failed, using fallback:', error);
    return extractSymptomDataFallback(symptomsText, answersText);
  }
}

/**
 * Fallback extraction (no API required)
 */
function extractSymptomDataFallback(
  symptomsText: string,
  answersText: string
): ExtractedSymptomData {
  // Simple client-side parsing
  const symptoms = symptomsText
    .split(/[,;]|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Extract duration
  const text = (symptomsText + ' ' + answersText).toLowerCase();
  let duration_days: number | undefined;
  
  const durationPatterns = [
    { pattern: /(\d+)\s*(?:days?|d)/i, multiplier: 1 },
    { pattern: /(\d+)\s*(?:weeks?|w)/i, multiplier: 7 },
    { pattern: /(\d+)\s*(?:months?|mo)/i, multiplier: 30 },
  ];
  
  for (const { pattern: regex, multiplier } of durationPatterns) {
    const match = text.match(regex);
    if (match) {
      duration_days = parseInt(match[1]) * multiplier;
      break;
    }
  }

  return {
    symptoms,
    duration_days,
    triggers: [],
    qualifiers: [],
  };
}

