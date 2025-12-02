import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Get API key from environment
const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GOOGLE_GENAI_API_KEY is not set in environment variables');
}

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: apiKey || '',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
