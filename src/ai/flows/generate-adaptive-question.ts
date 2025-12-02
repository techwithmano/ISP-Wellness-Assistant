'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a single adaptive question
 * based on user profile, symptoms, and previous answers.
 */

import {ai} from '@/ai/ai-instance';
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

export async function generateAdaptiveQuestion(
  input: GenerateAdaptiveQuestionInput
): Promise<GenerateAdaptiveQuestionOutput> {
  return generateAdaptiveQuestionFlow(input);
}

const generateAdaptiveQuestionPrompt = ai.definePrompt({
  name: 'generateAdaptiveQuestionPrompt',
  input: {
    schema: z.object({
      questionNumber: z.number(),
      name: z.string(),
      age: z.string(),
      gender: z.string(),
      symptoms: z.string(),
      medicalHistory: z.string().optional(),
      previousAnswers: z.array(z.string()),
      allPreviousQuestionTexts: z.array(z.string()).optional(),
      retryAttempt: z.boolean().optional(),
    }),
  },
  output: {
    schema: QuestionOutputSchema,
  },
  prompt: `Generate ONE unique medical question. Question {{{questionNumber}}} of 10.

NEVER repeat these questions: {{{allPreviousQuestionTexts}}}

User: {{{name}}}, {{{age}}}, {{{gender}}}
Symptoms: {{{symptoms}}}
History: {{{medicalHistory}}}
Previous Q&A: {{{previousAnswers}}}

Generate a NEW question (different from forbidden list above) that:
- Builds on previous answers
- Relates to symptoms: {{{symptoms}}}
- Considers age {{{age}}} and gender {{{gender}}}
- Helps diagnose conditions

Return JSON: {"text": "question", "type": "yesno|multiple|text|scale", "options": ["opt1","opt2"] if multiple}

Types: yesno, multiple (3-5 options), text, scale (1-5)
`,
});

const generateAdaptiveQuestionFlow = ai.defineFlow<
  typeof GenerateAdaptiveQuestionInputSchema,
  typeof QuestionOutputSchema
>({
  name: 'generateAdaptiveQuestionFlow',
  inputSchema: GenerateAdaptiveQuestionInputSchema,
  outputSchema: QuestionOutputSchema,
}, async input => {
  const {output} = await generateAdaptiveQuestionPrompt(input);
  return output!;
});

