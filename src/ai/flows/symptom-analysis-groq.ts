'use server';

/**
 * @fileOverview Groq-powered symptom analysis - FREE and FAST!
 */

import 'groq-sdk/shims/node';
import Groq from 'groq-sdk';
import {z} from 'genkit';

const SymptomAnalysisInputSchema = z.object({
  symptoms: z.string().describe('A comma-separated list of symptoms the user is experiencing.'),
  medicalHistory: z.string().optional().describe('Relevant medical history of the user.'),
  questionnaireAnswers: z.string().optional().describe('Answers to the generated questionnaire.'),
});

export type SymptomAnalysisInput = z.infer<typeof SymptomAnalysisInputSchema>;

const PotentialConditionSchema = z.object({
  condition: z.string().describe('The name of the potential medical condition.'),
  likelihood: z.number().describe('A score (0-1) representing the likelihood of the condition given the symptoms.'),
  description: z.string().optional().describe('A brief description of the condition.'),
});

const SymptomAnalysisOutputSchema = z.array(PotentialConditionSchema)
  .describe('A ranked list of potential conditions, ordered by likelihood (highest to lowest).');

export type SymptomAnalysisOutput = z.infer<typeof SymptomAnalysisOutputSchema>;

export async function symptomAnalysis(input: SymptomAnalysisInput): Promise<SymptomAnalysisOutput> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GROQ_API_KEY is not set. Please add it to your .env.local file. Get a free key at https://console.groq.com/');
  }

  const groq = new Groq({
    apiKey: apiKey,
    timeout: 60000, // 60 second timeout
    maxRetries: 2, // Retry failed requests
  });

  const prompt = `You are an AI-powered medical expert system. Given the following symptoms, medical history, and questionnaire answers, provide a ranked list of potential conditions, ordered by likelihood (highest to lowest). Include a likelihood score between 0 and 1.

Symptoms: ${input.symptoms}
Medical History: ${input.medicalHistory || 'None provided'}
Questionnaire Answers: ${input.questionnaireAnswers || 'None provided'}

Return a JSON object with a "conditions" array property. Each condition object must have:
- "condition": The name of the potential medical condition (string)
- "likelihood": A score between 0 and 1 (number)
- "description": Optional brief description (string)

Example format:
{"conditions": [
  {"condition": "Common Cold", "likelihood": 0.75, "description": "Viral infection causing nasal congestion and mild fever"},
  {"condition": "Allergic Rhinitis", "likelihood": 0.45, "description": "Allergic reaction causing similar symptoms"}
]}

Or return directly as an array:
[
  {"condition": "Common Cold", "likelihood": 0.75, "description": "Viral infection causing nasal congestion and mild fever"},
  {"condition": "Allergic Rhinitis", "likelihood": 0.45, "description": "Allergic reaction causing similar symptoms"}
]

Return ONLY valid JSON, nothing else. No markdown, no explanation.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a medical AI assistant. Analyze symptoms and provide potential conditions with likelihood scores. Always return valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.1-8b-instant', // Fast and free model
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content || '[]';
    let parsedResponse;

    try {
      // Try to parse as JSON
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      // If wrapped in markdown or text, extract JSON array
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        parsedResponse = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Handle both array and object with array property
    let conditionsArray: any[];
    if (Array.isArray(parsedResponse)) {
      conditionsArray = parsedResponse;
    } else if (parsedResponse.conditions && Array.isArray(parsedResponse.conditions)) {
      conditionsArray = parsedResponse.conditions;
    } else if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
      conditionsArray = parsedResponse.results;
    } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
      conditionsArray = parsedResponse.data;
    } else {
      throw new Error('Invalid response format from AI');
    }

    // Validate and return
    const result = SymptomAnalysisOutputSchema.parse(conditionsArray);
    return result;
  } catch (error: any) {
    console.error('Groq symptom analysis error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      type: error?.constructor?.name,
    });
    
    // Provide more helpful error messages
    let errorMessage = 'Unknown error';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.code) {
      errorMessage = `Connection error: ${error.code}`;
    }
    
    // Check for specific error types
    if (error?.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Check your internet connection and Groq API status.';
    } else if (error?.code === 'ETIMEDOUT') {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error?.message?.toLowerCase().includes('connection')) {
      errorMessage = 'Connection error. Please check your internet connection and try again.';
    } else if (error?.status === 401) {
      errorMessage = 'Invalid API key. Please check your GROQ_API_KEY in .env.local';
    } else if (error?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    }
    
    throw new Error(`Groq API error: ${errorMessage}`);
  }
}

