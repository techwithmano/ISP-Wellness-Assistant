'use client';

import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fadeIn">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        {/* Logo */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 mb-8 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-white overflow-hidden">
          <img
            src="/logo.png"
            alt="ISP Wellness Assistant Logo"
            className="w-full h-full object-contain p-2"
          />
        </div>
        
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 text-center">
          ISP Wellness Assistant
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-muted-foreground mb-12 text-center">
          Your friendly wellness companion.
        </p>
        
        {/* Start Button */}
        <button
          onClick={onStart}
          className="w-full max-w-xs py-4 px-8 bg-primary text-primary-foreground text-lg sm:text-xl font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
        >
          Start
        </button>
      </div>
    </div>
  );
}
