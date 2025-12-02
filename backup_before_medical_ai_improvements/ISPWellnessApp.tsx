'use client';

import React, { useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import ProfileSetupScreen, { ProfileData } from './ProfileSetupScreen';
import SymptomInputScreen from './SymptomInputScreen';
import DynamicQuestionScreen, { Question } from './DynamicQuestionScreen';
import ResultsScreen from './ResultsScreen';
import { generateAdaptiveQuestionGroq } from '@/ai/flows/generate-adaptive-question-groq';
import Loading from './Loading';

type Screen = 'welcome' | 'profile' | 'symptoms' | 'questions' | 'results' | 'loading';

export default function ISPWellnessApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [symptoms, setSymptoms] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>('Generating your personalized question...');

  const TOTAL_QUESTIONS = 10;

  const handleStart = () => {
    setCurrentScreen('profile');
  };

  const handleProfileNext = (profileData: ProfileData) => {
    setProfile(profileData);
    setCurrentScreen('symptoms');
  };

  const handleProfileBack = () => {
    setCurrentScreen('welcome');
  };

  const handleSymptomsNext = async (symptomsData: string) => {
    setSymptoms(symptomsData);
    setAnswers([]);
    setCurrentQuestionIndex(1);
    setCurrentScreen('loading');

       // Small delay (Groq is fast!)
       setLoadingMessage('Preparing your assessment...');
       await new Promise(resolve => setTimeout(resolve, 300));

      try {
        // Generate first question using AI
        setLoadingMessage('Generating your personalized question...');
        console.log('Generating first question with AI...');
        
         // Use Groq only
         const generateFirstWithRetry = async (attempt: number = 1): Promise<any> => {
           const maxRetries = 3;
           const baseDelay = 1000;
           
           try {
             return await generateAdaptiveQuestionGroq({
               questionNumber: 1,
               name: profile!.name,
               age: profile!.age,
               gender: profile!.gender,
               symptoms: symptomsData,
               medicalHistory: profile!.medicalConditions || undefined,
               previousAnswers: [],
               allPreviousQuestionTexts: [],
             });
           } catch (error: any) {
            const isRateLimit = error?.message?.includes('429') || 
                               error?.message?.includes('Too Many Requests') ||
                               error?.message?.includes('rate limit') ||
                               error?.message?.includes('quota');
            
            if (isRateLimit && attempt < maxRetries) {
              const delay = baseDelay * Math.pow(2, attempt - 1);
              console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
              setLoadingMessage(`Rate limit reached. Waiting ${delay / 1000}s before retry (${attempt + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              setLoadingMessage('Generating your personalized question...');
              return generateFirstWithRetry(attempt + 1);
            }
            throw error;
          }
        };
        
        const firstQuestionResponse = await generateFirstWithRetry();
        console.log('AI generated first question:', firstQuestionResponse);

      const firstQuestion: Question = {
        id: 1,
        text: firstQuestionResponse.text,
        type: firstQuestionResponse.type,
        options: firstQuestionResponse.options,
      };

      setQuestions([firstQuestion]);
      setCurrentScreen('questions');
    } catch (error: any) {
      console.error('❌ ERROR generating first question with AI:', error);
      
      // Better error message extraction
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      console.error('Error details:', errorMessage);
      
      const isRateLimit = errorMessage.includes('429') || 
                         errorMessage.includes('Too Many Requests') ||
                         errorMessage.includes('rate limit') ||
                         errorMessage.includes('quota');
      
      if (isRateLimit) {
        const errorMsg = `API rate limit reached!\n\nPlease wait a moment and try again.\n\n💡 Groq has very high rate limits, so this is rare. If it persists, check: https://console.groq.com/`;
        alert(errorMsg);
      } else if (errorMessage.includes('GROQ_API_KEY')) {
        alert(`❌ Groq API Key Missing!\n\n${errorMessage}\n\nGet your FREE key: https://console.groq.com/`);
      } else {
        alert(`Failed to generate question.\n\n${errorMessage}\n\nPlease check your GROQ_API_KEY in .env.local`);
      }
      
      setCurrentScreen('symptoms');
      return;
    }
  };

  const handleSymptomsBack = () => {
    setCurrentScreen('profile');
  };

  const handleQuestionAnswer = async (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentQuestionIndex < TOTAL_QUESTIONS) {
      // Generate next question using AI
      setCurrentScreen('loading');

       // Small delay (Groq is fast!)
       setLoadingMessage('Analyzing your response...');
       await new Promise(resolve => setTimeout(resolve, 300));

      try {
        setLoadingMessage('Generating your next question...');
        // Format previous Q&A with ALL previous question texts explicitly listed
        const allPreviousQuestions = questions.map(q => q.text);
        const qaContextArray = questions
          .slice(0, answers.length)
          .map((q, idx) => `Q${idx + 1}: ${q.text}\nAnswer: ${answers[idx] || 'Not answered'}`);

        console.log(`Generating question ${currentQuestionIndex + 1} with AI...`);
        console.log('ALL PREVIOUS QUESTION TEXTS (DO NOT REPEAT):', allPreviousQuestions);
        console.log('Previous Q&A context:', qaContextArray);
        
         // Use Groq only
         const generateWithRetry = async (attempt: number = 1): Promise<any> => {
           const maxRetries = 3;
           const baseDelay = 1000;
           
           try {
             return await generateAdaptiveQuestionGroq({
               questionNumber: currentQuestionIndex + 1,
               name: profile!.name,
               age: profile!.age,
               gender: profile!.gender,
               symptoms: symptoms,
               medicalHistory: profile!.medicalConditions || undefined,
               previousAnswers: qaContextArray.length > 0 ? qaContextArray : [],
               allPreviousQuestionTexts: allPreviousQuestions.length > 0 ? allPreviousQuestions : [],
             });
           } catch (error: any) {
            // Check if it's a rate limit error
            const isRateLimit = error?.message?.includes('429') || 
                               error?.message?.includes('Too Many Requests') ||
                               error?.message?.includes('rate limit') ||
                               error?.message?.includes('quota');
            
            if (isRateLimit && attempt < maxRetries) {
              const delay = baseDelay * Math.pow(2, attempt - 1);
              console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
              setLoadingMessage(`Rate limit reached. Waiting ${delay / 1000}s before retry (${attempt + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              setLoadingMessage('Generating your personalized question...');
              return generateWithRetry(attempt + 1);
            }
            throw error;
          }
        };
        
        const nextQuestionResponse = await generateWithRetry();
        console.log(`AI generated question ${currentQuestionIndex + 1}:`, nextQuestionResponse);
        
        // Validate that the new question is not a repeat
        const newQuestionText = nextQuestionResponse.text.toLowerCase().trim();
        const isRepeat = allPreviousQuestions.some(
          prevQ => prevQ.toLowerCase().trim() === newQuestionText || 
          prevQ.toLowerCase().includes(newQuestionText) ||
          newQuestionText.includes(prevQ.toLowerCase())
        );
        
        if (isRepeat) {
          console.warn('⚠️ AI generated a REPEATED question! Retrying...');
          // Retry once with explicit warning
          const retryResponse = await generateAdaptiveQuestionGroq({
            questionNumber: currentQuestionIndex + 1,
            name: profile!.name,
            age: profile!.age,
            gender: profile!.gender,
            symptoms: symptoms,
            medicalHistory: profile!.medicalConditions || undefined,
            previousAnswers: qaContextArray,
            allPreviousQuestionTexts: allPreviousQuestions,
            retryAttempt: true,
          });
          
          const retryText = retryResponse.text.toLowerCase().trim();
          const retryIsRepeat = allPreviousQuestions.some(
            prevQ => prevQ.toLowerCase().trim() === retryText
          );
          
          if (retryIsRepeat) {
            throw new Error('AI keeps generating repeated questions. Please try again.');
          }
          
          nextQuestionResponse.text = retryResponse.text;
          nextQuestionResponse.type = retryResponse.type;
          nextQuestionResponse.options = retryResponse.options;
        }

        const nextQuestion: Question = {
          id: currentQuestionIndex + 1,
          text: nextQuestionResponse.text,
          type: nextQuestionResponse.type,
          options: nextQuestionResponse.options,
        };

        // Final validation - check if it's a repeat
        const finalCheck = questions.some(q => 
          q.text.toLowerCase().trim() === nextQuestion.text.toLowerCase().trim()
        );
        
        if (finalCheck) {
          throw new Error(`Generated question is a duplicate: "${nextQuestion.text}"`);
        }

        setQuestions((prev) => [...prev, nextQuestion]);
        setCurrentQuestionIndex((prev) => prev + 1);
        setCurrentScreen('questions');
      } catch (error: any) {
        console.error(`❌ ERROR generating question ${currentQuestionIndex + 1} with AI:`, error);
        
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        
        console.error('Error details:', errorMessage);
        
        const isRateLimit = errorMessage.includes('429') || 
                           errorMessage.includes('Too Many Requests') ||
                           errorMessage.includes('rate limit') ||
                           errorMessage.includes('quota');
        
        if (isRateLimit) {
          const errorMsg = `API rate limit reached!\n\nPlease wait a moment and try again.\n\n💡 Groq has very high rate limits, so this is rare. If it persists, check: https://console.groq.com/`;
          alert(errorMsg);
        } else if (errorMessage.includes('GROQ_API_KEY')) {
          alert(`❌ Groq API Key Missing!\n\n${errorMessage}\n\nGet your FREE key: https://console.groq.com/`);
        } else {
          alert(`Failed to generate question.\n\n${errorMessage}\n\nPlease check your GROQ_API_KEY in .env.local`);
        }
        
        // Go back to previous question
        setCurrentQuestionIndex((prev) => prev - 1);
        setAnswers((prev) => prev.slice(0, -1));
        setCurrentScreen('questions');
        return;
      }
    } else {
      // All questions answered, go to results
      setCurrentScreen('results');
    }
  };

  const handleQuestionBack = () => {
    if (currentQuestionIndex > 1) {
      // Go back to previous question - remove last answer and go to previous question
      setAnswers((prev) => prev.slice(0, -1));
      setCurrentQuestionIndex((prev) => prev - 1);
    } else {
      // Go back to symptoms screen
      setCurrentScreen('symptoms');
      setCurrentQuestionIndex(0);
      setQuestions([]);
      setAnswers([]);
    }
  };

  const handleRestart = () => {
    setCurrentScreen('welcome');
    setProfile(null);
    setSymptoms('');
    setCurrentQuestionIndex(0);
    setQuestions([]);
    setAnswers([]);
  };

  const currentQuestion = questions[currentQuestionIndex - 1];

  return (
    <div className="min-h-screen w-full bg-background">
      {currentScreen === 'welcome' && <WelcomeScreen onStart={handleStart} />}
      
      {currentScreen === 'profile' && (
        <ProfileSetupScreen
          onNext={handleProfileNext}
          onBack={handleProfileBack}
        />
      )}
      
      {currentScreen === 'symptoms' && (
        <SymptomInputScreen
          onNext={handleSymptomsNext}
          onBack={handleSymptomsBack}
        />
      )}

      {currentScreen === 'loading' && (
        <Loading
          title="Processing..."
          description={loadingMessage}
        />
      )}
      
      {currentScreen === 'questions' && currentQuestion && (
        <DynamicQuestionScreen
          question={currentQuestion}
          questionNumber={currentQuestionIndex}
          totalQuestions={TOTAL_QUESTIONS}
          onAnswer={handleQuestionAnswer}
          onBack={handleQuestionBack}
        />
      )}
      
      {currentScreen === 'results' && profile && (
        <ResultsScreen
          profile={profile}
          symptoms={symptoms}
          questions={questions}
          answers={answers}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
