'use client';

import React, { useState } from 'react';

interface SymptomInputScreenProps {
  onNext: (symptoms: string) => void;
  onBack: () => void;
}

const suggestionChips = [
  'Headache',
  'Cough',
  'Fever',
  'Nausea',
  'Fatigue',
  'Pain',
  'Dizziness',
  'Sore throat',
  'Chest pain',
  'Difficulty breathing',
];

export default function SymptomInputScreen({ onNext, onBack }: SymptomInputScreenProps) {
  const [symptoms, setSymptoms] = useState('');
  const [error, setError] = useState('');

  const handleChipClick = (chip: string) => {
    setSymptoms((prev) => {
      if (prev.includes(chip)) {
        return prev.replace(new RegExp(`\\b${chip}\\b,?\\s*`, 'g'), '').trim();
      } else {
        return prev ? `${prev}, ${chip}` : chip;
      }
    });
    setError('');
  };

  const handleNext = () => {
    if (!symptoms.trim()) {
      setError('Please describe your symptoms');
      return;
    }
    onNext(symptoms.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fadeIn">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-card rounded-3xl shadow-xl p-6 sm:p-8 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 text-center">
            Describe Your Symptoms
          </h2>
          
          <p className="text-muted-foreground mb-6 text-center">
            Tell us what you're experiencing
          </p>

          {/* Symptom Input */}
          <div className="mb-6">
            <textarea
              value={symptoms}
              onChange={(e) => {
                setSymptoms(e.target.value);
                setError('');
              }}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Describe your symptoms in detail..."
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>

          {/* Suggestion Chips */}
          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Common symptoms (tap to add):
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestionChips.map((chip) => {
                const isSelected = symptoms.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
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
            onClick={handleNext}
            className="flex-1 py-4 px-6 bg-primary text-primary-foreground text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
