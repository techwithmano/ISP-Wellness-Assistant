'use client';

import React, { useState } from 'react';

export interface Question {
  id: number;
  text: string;
  type: 'yesno' | 'multiple' | 'text' | 'scale';
  options?: string[];
}

interface DynamicQuestionScreenProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
  onBack: () => void;
}

export default function DynamicQuestionScreen({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onBack,
}: DynamicQuestionScreenProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState<string>('');

  const handleSubmit = () => {
    const answer = question.type === 'text' ? textAnswer : selectedAnswer;
    if (answer.trim()) {
      onAnswer(answer);
      setSelectedAnswer('');
      setTextAnswer('');
    }
  };

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'yesno':
        return (
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedAnswer('Yes')}
              className={`flex-1 py-4 px-6 rounded-2xl text-lg font-semibold shadow-lg transition-all duration-200 ${
                selectedAnswer === 'Yes'
                  ? 'bg-primary text-primary-foreground scale-105'
                  : 'bg-secondary text-secondary-foreground hover:scale-105'
              } active:scale-95`}
            >
              Yes
            </button>
            <button
              onClick={() => setSelectedAnswer('No')}
              className={`flex-1 py-4 px-6 rounded-2xl text-lg font-semibold shadow-lg transition-all duration-200 ${
                selectedAnswer === 'No'
                  ? 'bg-primary text-primary-foreground scale-105'
                  : 'bg-secondary text-secondary-foreground hover:scale-105'
              } active:scale-95`}
            >
              No
            </button>
          </div>
        );

      case 'multiple':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full py-4 px-6 rounded-2xl text-lg font-semibold shadow-lg transition-all duration-200 text-left ${
                  selectedAnswer === option
                    ? 'bg-primary text-primary-foreground scale-105'
                    : 'bg-secondary text-secondary-foreground hover:scale-105'
                } active:scale-95`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Mild</span>
              <span className="text-muted-foreground">Moderate</span>
              <span className="text-muted-foreground">Severe</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setSelectedAnswer(value.toString())}
                  className={`flex-1 py-4 rounded-xl text-lg font-semibold shadow-lg transition-all duration-200 ${
                    selectedAnswer === value.toString()
                      ? 'bg-primary text-primary-foreground scale-110'
                      : 'bg-secondary text-secondary-foreground hover:scale-105'
                  } active:scale-95`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        );

      case 'text':
        return (
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Type your answer here..."
          />
        );

      default:
        return null;
    }
  };

  const canSubmit = question.type === 'text' ? textAnswer.trim() : selectedAnswer !== '';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fadeIn">
      <div className="w-full max-w-md mx-auto">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Question {questionNumber} of {totalQuestions}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round((questionNumber / totalQuestions) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-card rounded-3xl shadow-xl p-6 sm:p-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-8 text-center min-h-[3rem] flex items-center justify-center">
            {question.text}
          </h2>

          <div className="mb-8">{renderQuestionInput()}</div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 py-4 px-6 bg-secondary text-secondary-foreground text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-4 px-6 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-200 ${
              canSubmit
                ? 'bg-primary text-primary-foreground hover:shadow-xl transform hover:scale-105 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          >
            {questionNumber === totalQuestions ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
