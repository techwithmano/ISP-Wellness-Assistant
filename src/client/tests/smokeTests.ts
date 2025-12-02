/**
 * Client-side smoke tests
 * Run these in browser console or during build
 * No backend required
 */

import { scoreSymptoms } from '../scoring';
import { inferTimeCourse } from '../timeInference';
import { extractSymptomData } from '../symptomExtraction';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

/**
 * Run all smoke tests
 */
export async function runSmokeTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Scoring produces no 0% outputs for relevant cases
  try {
    const testSymptoms = ['weight loss', 'heart palpitations', 'anxiety'];
    const testAnswers: string[] = [];
    const scored = scoreSymptoms(testSymptoms, testAnswers);
    
    const hasZero = scored.conditions.some(c => c.likelihood === 0);
    const hasValidScores = scored.conditions.length > 0;
    
    results.push({
      name: 'Scoring produces no 0% outputs for relevant cases',
      passed: !hasZero && hasValidScores,
      error: hasZero ? 'Found 0% condition' : hasValidScores ? undefined : 'No conditions returned',
    });
  } catch (error) {
    results.push({
      name: 'Scoring produces no 0% outputs for relevant cases',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 2: Display rules produce top 3/5 per dynamic rules
  try {
    const testSymptoms = ['fatigue', 'weight loss', 'night sweats'];
    const testAnswers: string[] = [];
    const scored = scoreSymptoms(testSymptoms, testAnswers);
    
    const topScore = scored.conditions[0]?.likelihood || 0;
    const expectedCount = topScore < 0.40 ? 3 : 5;
    const actualCount = scored.conditions.length;
    
    results.push({
      name: 'Display rules produce top 3/5 per dynamic rules',
      passed: actualCount <= expectedCount && actualCount >= 1,
      error: actualCount > expectedCount ? `Expected max ${expectedCount}, got ${actualCount}` : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Display rules produce top 3/5 per dynamic rules',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 3: Time-course inference never returns "not available"
  try {
    const testSymptoms = ['weight loss'];
    const testAnswers: string[] = ['I have been losing weight for 3 weeks'];
    const timeCourse = inferTimeCourse(testSymptoms, testAnswers);
    
    const hasInterpretation = !!(timeCourse.interpretation && 
                                  timeCourse.interpretation.length > 0 &&
                                  !timeCourse.interpretation.toLowerCase().includes('not available'));
    
    results.push({
      name: 'Time-course inference never returns "not available"',
      passed: hasInterpretation,
      error: hasInterpretation ? undefined : 'Time-course interpretation missing or contains "not available"',
    });
  } catch (error) {
    results.push({
      name: 'Time-course inference never returns "not available"',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 4: Display scores are properly clamped
  try {
    const testSymptoms = ['fatigue'];
    const testAnswers: string[] = [];
    const scored = scoreSymptoms(testSymptoms, testAnswers);
    
    const allValid = scored.conditions.every(c => {
      const score = c.likelihood;
      const display = c.displayLikelihood;
      
      // No 0% should be displayed
      if (score === 0) return false;
      
      // Scores < 10% should show "Low likelihood"
      if (score < 0.10) {
        return display.includes('Low likelihood');
      }
      
      // Other scores should show percentage
      return display.includes('%');
    });
    
    results.push({
      name: 'Display scores are properly clamped',
      passed: allValid,
      error: allValid ? undefined : 'Invalid display scores found',
    });
  } catch (error) {
    results.push({
      name: 'Display scores are properly clamped',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 5: Red flags are detected
  try {
    const testSymptoms = ['chest pain', 'fainting', 'difficulty breathing'];
    const testAnswers: string[] = [];
    const scored = scoreSymptoms(testSymptoms, testAnswers);
    
    results.push({
      name: 'Red flags are detected',
      passed: scored.redFlags.flags.length > 0 && scored.redFlags.urgent,
      error: scored.redFlags.flags.length === 0 ? 'No red flags detected' : !scored.redFlags.urgent ? 'Red flags not marked urgent' : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Red flags are detected',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 6: Symptom extraction (fallback mode)
  try {
    const extracted = await extractSymptomData('fatigue, weight loss', '');
    
    results.push({
      name: 'Symptom extraction returns structured data',
      passed: extracted.symptoms.length > 0,
      error: extracted.symptoms.length === 0 ? 'No symptoms extracted' : undefined,
    });
  } catch (error) {
    results.push({
      name: 'Symptom extraction returns structured data',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return results;
}

/**
 * Log test results to console
 */
export function logTestResults(results: TestResult[]): void {
  console.log('\n=== Client-Side Smoke Tests ===\n');
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\n${passed}/${total} tests passed\n`);
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  (window as any).runSmokeTests = async () => {
    const results = await runSmokeTests();
    logTestResults(results);
    return results;
  };
  
  console.log('Smoke tests available. Run: await runSmokeTests()');
}

