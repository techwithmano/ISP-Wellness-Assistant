'use client';

import React, { useState } from 'react';

export interface ProfileData {
  name: string;
  age: string;
  gender: string;
  medicalConditions: string;
}

interface ProfileSetupScreenProps {
  onNext: (data: ProfileData) => void;
  onBack: () => void;
}

export default function ProfileSetupScreen({ onNext, onBack }: ProfileSetupScreenProps) {
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    age: '',
    gender: '',
    medicalConditions: '',
  });

  const [errors, setErrors] = useState<Partial<ProfileData>>({});

  const handleChange = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<ProfileData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else if (isNaN(Number(formData.age)) || Number(formData.age) < 1 || Number(formData.age) > 120) {
      newErrors.age = 'Please enter a valid age';
    }
    
    if (!formData.gender) {
      newErrors.gender = 'Please select a gender';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext(formData);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fadeIn">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-card rounded-3xl shadow-xl p-6 sm:p-8 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 text-center">
            Profile Setup
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your name"
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-foreground mb-2">
                Age *
              </label>
              <input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your age"
                min="1"
                max="120"
              />
              {errors.age && <p className="mt-1 text-sm text-destructive">{errors.age}</p>}
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-foreground mb-2">
                Gender *
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className="mt-1 text-sm text-destructive">{errors.gender}</p>}
            </div>

            {/* Medical Conditions */}
            <div>
              <label htmlFor="medicalConditions" className="block text-sm font-medium text-foreground mb-2">
                Existing Medical Conditions (Optional)
              </label>
              <textarea
                id="medicalConditions"
                value={formData.medicalConditions}
                onChange={(e) => handleChange('medicalConditions', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="List any existing medical conditions"
              />
            </div>
          </form>
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
            className="flex-1 py-4 px-6 bg-primary text-primary-foreground text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
