'use server';

/**
 * @fileOverview Groq-powered adaptive question generation - FREE and FAST!
 */

import 'groq-sdk/shims/node'; // Required for Next.js server actions
import Groq from 'groq-sdk';
import {z} from 'genkit';

const GenerateAdaptiveQuestionInputSchema = z.object({
  questionNumber: z.number().describe('The current question number (1-10).'),
  name: z.string().describe('User name.'),
  age: z.string().describe('User age.'),
  gender: z.string().describe('User gender.'),
  symptoms: z.string().describe('User-reported symptoms.'),
  medicalHistory: z.string().optional().describe('User medical history.'),
  previousAnswers: z.array(z.string()).describe('Answers to previous questions.'),
  allPreviousQuestionTexts: z.array(z.string()).optional().describe('ALL previous question texts - DO NOT repeat any of these.'),
  previousQuestionTypes: z.array(z.string()).optional().describe('Question types already used (to track ratio).'),
  requiredQuestionType: z.string().optional().describe('The required question type for this question to maintain ratio.'),
  retryAttempt: z.boolean().optional().describe('Whether this is a retry after a repeated question.'),
});

export type GenerateAdaptiveQuestionInput = z.infer<typeof GenerateAdaptiveQuestionInputSchema>;

const QuestionOutputSchema = z.object({
  text: z.string().describe('The question text.'),
  type: z.enum(['yesno', 'multiple', 'text', 'scale']).describe('The question type.'),
  options: z.array(z.string()).optional().describe('Options for multiple choice questions.'),
});

export type GenerateAdaptiveQuestionOutput = z.infer<typeof QuestionOutputSchema>;

// Groq client will be initialized per-request to ensure fresh API key

export async function generateAdaptiveQuestionGroq(
  input: GenerateAdaptiveQuestionInput
): Promise<GenerateAdaptiveQuestionOutput> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GROQ_API_KEY is not set. Please add it to your .env.local file. Get a free key at https://console.groq.com/');
  }
  
  // Reinitialize client with the key to ensure it's fresh
  // Add timeout and better error handling for connection issues
  const groq = new Groq({
    apiKey: apiKey,
    timeout: 60000, // 60 second timeout
    maxRetries: 2, // Retry failed requests
  });

  const forbiddenQuestions = input.allPreviousQuestionTexts && input.allPreviousQuestionTexts.length > 0
    ? `\n\nFORBIDDEN QUESTIONS - DO NOT ASK THESE AGAIN:\n${input.allPreviousQuestionTexts.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  const previousQA = input.previousAnswers && input.previousAnswers.length > 0
    ? `\n\nPrevious Questions & Answers:\n${input.previousAnswers.join('\n\n')}`
    : '';

  const previousTypes = input.previousQuestionTypes && input.previousQuestionTypes.length > 0
    ? `\n\nPrevious question types used: ${input.previousQuestionTypes.join(', ')}`
    : '';

  // Build question type requirement based on ratio
  const requiredType = input.requiredQuestionType || 'auto';
  let typeInstruction = '';
  
  if (requiredType === 'text') {
    typeInstruction = '\n\n🎯 REQUIRED QUESTION TYPE: "text" (Free text - 5%)\nThis is the ONLY free text question. Use it to capture the user\'s main symptom description.\nExample: "Please describe your symptoms in more detail."';
  } else if (requiredType === 'yesno') {
    typeInstruction = '\n\n🎯 REQUIRED QUESTION TYPE: "yesno" (Yes/No - 40%)\nThis should detect red flags or clear binary symptoms.\nExamples: "Do you have difficulty breathing?", "Have you experienced any fainting?", "Do you have numbness?", "Do you have chest pain?", "Have you noticed any visual changes?"';
  } else if (requiredType === 'multiple') {
    typeInstruction = '\n\n🎯 REQUIRED QUESTION TYPE: "multiple" (Multiple choice - 30%)\nThis should clarify patterns, triggers, timing, or type of symptom.\nExamples: "When do your symptoms occur?" with options like ["In the morning", "Throughout the day", "At night", "After meals"], or "What triggers your episodes?" with options like ["Stress", "Physical activity", "Food", "Weather changes"]';
  } else if (requiredType === 'scale') {
    typeInstruction = '\n\n🎯 REQUIRED QUESTION TYPE: "scale" (Severity scale 1-5 - 20%)\nThis should quantify intensity for weighted scoring.\nExamples: "On a scale of 1-5, how severe is your fatigue?", "How intense is your pain on a scale of 1-5?"';
  } else if (requiredType === 'timeline') {
    typeInstruction = '\n\n🎯 REQUIRED QUESTION TYPE: "multiple" (Timeline/structured - 5%)\nThis should clarify duration and progression. MUST use multiple choice format.\nExample: "How long have you been experiencing these symptoms?" with options like ["Less than 24 hours", "1-7 days", "1-4 weeks", "1-3 months", "More than 3 months"]\nOther examples: "How quickly did these symptoms develop?" with options like ["Suddenly", "Within hours", "Over days", "Gradually over weeks"]';
  }

  const prompt = `Generate ONE unique medical question. Question ${input.questionNumber} of 10.${forbiddenQuestions}${previousTypes}

User: ${input.name}, Age: ${input.age}, Gender: ${input.gender}
Symptoms: ${input.symptoms}
Medical History: ${input.medicalHistory || 'None provided'}${previousQA}${typeInstruction}

📋 QUESTION TYPE DISTRIBUTION RATIO (Total 10 questions):
- Free text: 1 question (5%) - For main symptom description
- Yes/No: 4 questions (40%) - For red flags & binary symptoms
- Multiple choice: 3 questions (30%) - For patterns, triggers, timing
- Severity scale: 2 questions (20%) - For intensity quantification
- Timeline/structured: 0-1 question (5%) - For duration/progression

Generate a NEW question (different from forbidden list above) that:
- Uses the REQUIRED question type specified above (${requiredType === 'auto' ? 'choose appropriately' : requiredType})
- Builds on previous answers
- Relates to symptoms: ${input.symptoms}
- Considers age ${input.age} and gender ${input.gender}
- Helps diagnose conditions
- Is unique and has NOT been asked before
- Follows the purpose of the question type (see above)

Return ONLY valid JSON in this exact format:
{"text": "your question here", "type": "yesno|multiple|text|scale", "options": ["option1","option2","option3"]}

Question type guidelines:
- "yesno": Yes/No questions - NO options needed. For red flags: difficulty breathing, fainting, numbness, chest pain, visual changes, etc.
- "multiple": Multiple choice - MUST include 3-5 options. For patterns, triggers, timing, location, type of symptom.
- "text": Open-ended text - NO options needed. Use ONLY ONCE for main symptom description.
- "scale": Severity scale 1-5 - NO options needed. For quantifying intensity of pain, fatigue, etc.

Examples:
{"text": "Do you experience difficulty breathing?", "type": "yesno"}
{"text": "When do your symptoms occur?", "type": "multiple", "options": ["In the morning", "Throughout the day", "At night", "After meals"]}
{"text": "On a scale of 1-5, how severe is your fatigue?", "type": "scale"}
{"text": "Please describe your symptoms in more detail.", "type": "text"}
{"text": "How long have you been experiencing these symptoms?", "type": "multiple", "options": ["Less than 24 hours", "1-7 days", "1-4 weeks", "More than 3 months"]}

CRITICAL: 
1. Use the REQUIRED question type: ${requiredType === 'timeline' ? 'multiple (for timeline question - note: timeline questions use type "multiple" but focus on duration/progression)' : requiredType}
2. Return ONLY the JSON object, nothing else
3. No markdown, no explanation, just the JSON
4. For timeline questions, the "type" field in JSON must be "multiple" with duration/progression options`;

  try {
    console.log('Calling Groq API with model: llama-3.1-8b-instant');
    console.log('API Key present:', !!apiKey, 'Length:', apiKey?.length);
    
    // Add retry logic for connection errors
    let lastError: any;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a medical AI assistant. Generate unique medical questions. Always return valid JSON only, no markdown formatting.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: 'llama-3.1-8b-instant', // Fast and free model
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        let parsedResponse;

        try {
          // Try to parse JSON directly
          parsedResponse = JSON.parse(responseText);
        } catch (parseError) {
          // If wrapped in markdown, extract JSON
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Failed to parse AI response as JSON');
          }
        }

        // Validate and return
        const result = QuestionOutputSchema.parse({
          text: parsedResponse.text || '',
          type: parsedResponse.type || 'text',
          options: parsedResponse.options || undefined,
        });

        return result;
      } catch (apiError: any) {
        lastError = apiError;
        const isConnectionError = apiError?.message?.toLowerCase().includes('connection') ||
                                  apiError?.message?.toLowerCase().includes('network') ||
                                  apiError?.message?.toLowerCase().includes('timeout') ||
                                  apiError?.message?.toLowerCase().includes('econnrefused') ||
                                  apiError?.code === 'ECONNREFUSED' ||
                                  apiError?.code === 'ETIMEDOUT';
        
        if (isConnectionError && attempt < maxRetries) {
          const delay = 1000 * attempt; // Exponential backoff: 1s, 2s, 3s
          console.warn(`Connection error on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw apiError;
      }
    }
    throw lastError;
  } catch (error: any) {
    console.error('Groq API error:', error);
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

