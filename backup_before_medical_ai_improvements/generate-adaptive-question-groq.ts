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
  const groq = new Groq({
    apiKey: apiKey,
  });

  const forbiddenQuestions = input.allPreviousQuestionTexts && input.allPreviousQuestionTexts.length > 0
    ? `\n\nFORBIDDEN QUESTIONS - DO NOT ASK THESE AGAIN:\n${input.allPreviousQuestionTexts.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  const previousQA = input.previousAnswers && input.previousAnswers.length > 0
    ? `\n\nPrevious Questions & Answers:\n${input.previousAnswers.join('\n\n')}`
    : '';

  const prompt = `Generate ONE unique medical question. Question ${input.questionNumber} of 10.${forbiddenQuestions}

User: ${input.name}, Age: ${input.age}, Gender: ${input.gender}
Symptoms: ${input.symptoms}
Medical History: ${input.medicalHistory || 'None provided'}${previousQA}

Generate a NEW question (different from forbidden list above) that:
- Builds on previous answers
- Relates to symptoms: ${input.symptoms}
- Considers age ${input.age} and gender ${input.gender}
- Helps diagnose conditions
- Is unique and has NOT been asked before

Return ONLY valid JSON in this exact format:
{"text": "your question here", "type": "yesno|multiple|text|scale", "options": ["option1","option2","option3"]}

Question types:
- "yesno" for Yes/No questions (no options needed)
- "multiple" for multiple choice (must include 3-5 options)
- "text" for open-ended text questions (no options needed)
- "scale" for severity/rating scales 1-5 (no options needed)

Examples:
{"text": "When did your symptoms first appear?", "type": "multiple", "options": ["Within the last 24 hours", "2-7 days ago", "1-4 weeks ago", "More than a month ago"]}
{"text": "Do your symptoms worsen at any particular time of day?", "type": "yesno"}
{"text": "On a scale of 1-5, how would you rate the intensity of your pain?", "type": "scale"}
{"text": "Have you noticed any patterns or triggers that seem to cause or worsen your symptoms?", "type": "text"}

CRITICAL: Return ONLY the JSON object, nothing else. No markdown, no explanation, just the JSON.`;

  try {
    console.log('Calling Groq API with model: llama-3.1-8b-instant');
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
  } catch (error: any) {
    console.error('Groq API error:', error);
    throw new Error(`Groq API error: ${error.message || 'Unknown error'}`);
  }
}

