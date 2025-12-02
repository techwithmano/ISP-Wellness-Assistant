'use client';

import React, { useEffect, useState } from 'react';
import { ProfileData } from './ProfileSetupScreen';
import { Question } from './DynamicQuestionScreen';
import { symptomAnalysis, SymptomAnalysisOutput } from '@/ai/flows/symptom-analysis-groq';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';

interface ResultsScreenProps {
  profile: ProfileData;
  symptoms: string;
  questions: Question[];
  answers: string[];
  onRestart: () => void;
}

export default function ResultsScreen({
  profile,
  symptoms,
  questions,
  answers,
  onRestart,
}: ResultsScreenProps) {
  const [conditions, setConditions] = useState<SymptomAnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const performAnalysis = async () => {
      try {
        setIsAnalyzing(true);
        setAnalysisError(null);

        // Format answers for analysis
        const formattedAnswers = questions
          .map((q, index) => `Q${index + 1}: ${q.text}\nAnswer: ${answers[index] || 'Not answered'}`)
          .join('\n\n');

        const result = await symptomAnalysis({
          symptoms,
          medicalHistory: profile.medicalConditions || undefined,
          questionnaireAnswers: formattedAnswers,
        });

        setConditions(result);
        setIsAnalyzing(false);
      } catch (error) {
        console.error('Error analyzing symptoms:', error);
        setAnalysisError('Unable to analyze symptoms. Please try again.');
        setIsAnalyzing(false);
      }
    };

    performAnalysis();
  }, [profile, symptoms, questions, answers]);

  const generatePDF = async () => {
    if (!conditions || conditions.length === 0) return;

    const doc = new jsPDF('portrait', 'pt', 'a4');
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 50;
    const contentWidth = width - margin * 2;
    let cursorY = margin;

    const colors = {
      primary: '#FFB366',
      secondary: '#2d3748',
      accent: '#3182ce',
      warning: '#c53030',
      background: '#f7fafc',
      border: '#e2e8f0',
    };

    const spacing = {
      section: 35,
      paragraph: 15,
      line: 16,
    };

    const fontSizes = {
      coverTitle: 37,
      coverSubtitle: 21,
      sectionTitle: 21,
      bodyText: 11,
      footer: 9,
    };

    const footer = (page: number, totalPages: number) => {
      doc.setDrawColor(colors.border);
      doc.setLineWidth(0.5);
      doc.line(margin, height - 35, width - margin, height - 35);
      doc.setFontSize(fontSizes.footer);
      doc.setTextColor(colors.secondary);
      const footerText = `Page ${page} of ${totalPages} | ISP Wellness Assistant Report | Generated: ${new Date().toLocaleString()}`;
      doc.text(footerText, width / 2, height - 20, { align: 'center' });
    };

    // Cover Page
    doc.setFillColor(colors.background);
    doc.rect(0, 0, width, height, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSizes.coverTitle);
    doc.setTextColor(colors.primary);
    doc.text('ISP Wellness Assistant', width / 2, height / 2 - 60, { align: 'center' });

    doc.setFontSize(fontSizes.coverSubtitle);
    doc.text('Comprehensive Wellness Analysis Report', width / 2, height / 2 - 20, { align: 'center' });

    doc.setFontSize(13);
    doc.text(`Patient: ${profile.name}`, width / 2, height / 2 + 20, { align: 'center' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, width / 2, height / 2 + 50, { align: 'center' });

    doc.setDrawColor(colors.primary);
    doc.setLineWidth(2);
    doc.line(margin, height / 2 + 80, width - margin, height / 2 + 80);

    doc.addPage();
    cursorY = margin;

    // Patient Information
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSizes.sectionTitle);
    doc.setTextColor(colors.primary);
    doc.text('1. Patient Information', margin, cursorY);
    cursorY += spacing.section;

    const info = [
      ['Name', profile.name],
      ['Age', profile.age],
      ['Gender', profile.gender],
      ['Report Date', new Date().toLocaleDateString()],
    ];

    if (profile.medicalConditions) {
      info.push(['Medical History', profile.medicalConditions]);
    }

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      body: info,
      styles: {
        cellPadding: 8,
        fontSize: fontSizes.bodyText,
        textColor: colors.secondary,
        lineColor: colors.border,
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 150, textColor: colors.primary },
        1: { cellWidth: width - margin * 2 - 150 },
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + spacing.section;

    // Symptoms
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSizes.sectionTitle);
    doc.setTextColor(colors.primary);
    doc.text('2. Reported Symptoms', margin, cursorY);
    cursorY += spacing.section;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      body: [['Symptoms', symptoms]],
      styles: {
        cellPadding: 8,
        fontSize: fontSizes.bodyText,
        textColor: colors.secondary,
        lineColor: colors.border,
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 150, textColor: colors.primary },
        1: { cellWidth: width - margin * 2 - 150 },
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + spacing.section;

    // Q&A Session
    doc.addPage();
    cursorY = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSizes.sectionTitle);
    doc.setTextColor(colors.primary);
    doc.text('3. Q&A Session', margin, cursorY);
    cursorY += spacing.section;

    if (questions.length > 0 && answers.length > 0) {
      questions.forEach((question, index) => {
        const answer = answers[index] || 'No answer provided';

        doc.setFillColor(colors.background);
        doc.roundedRect(margin, cursorY - 8, width - margin * 2, 35, 3, 3, 'F');

        doc.setTextColor(colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSizes.bodyText);
        const questionLines = doc.splitTextToSize(`Q${index + 1}: ${question.text}`, contentWidth - 20);
        doc.text(questionLines, margin + 10, cursorY + 5);
        cursorY += questionLines.length * spacing.line + spacing.paragraph;

        doc.setTextColor(colors.secondary);
        doc.setFont('helvetica', 'normal');
        const answerLines = doc.splitTextToSize(answer, contentWidth - 40);
        doc.text(answerLines, margin + 30, cursorY);
        cursorY += answerLines.length * spacing.line + spacing.paragraph;

        if (cursorY > height - margin) {
          doc.addPage();
          cursorY = margin;
        }
      });
    }

    // Analysis Results
    doc.addPage();
    cursorY = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSizes.sectionTitle);
    doc.setTextColor(colors.primary);
    doc.text('4. AI Analysis Results', margin, cursorY);
    cursorY += spacing.section;

    conditions.forEach((condition, index) => {
      const descriptionLines = doc.splitTextToSize(condition.description || '', contentWidth - 40);
      const boxHeight = Math.max(35, descriptionLines.length * spacing.line + 15);

      doc.setFillColor(colors.background);
      doc.roundedRect(margin, cursorY - 8, width - margin * 2, boxHeight, 3, 3, 'F');

      doc.setTextColor(colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSizes.bodyText);
      doc.text(`Condition ${index + 1}: ${condition.condition}`, margin + 10, cursorY + 5);
      cursorY += spacing.line;

      doc.setTextColor(colors.secondary);
      doc.setFont('helvetica', 'normal');
      doc.text(`Likelihood: ${(condition.likelihood * 100).toFixed(2)}%`, margin + 30, cursorY);
      cursorY += spacing.line;

      if (condition.description) {
        doc.text(descriptionLines, margin + 30, cursorY);
        cursorY += descriptionLines.length * spacing.line + spacing.paragraph;
      }

      if (cursorY > height - margin) {
        doc.addPage();
        cursorY = margin;
      }
    });

    // Disclaimer
    doc.addPage();
    cursorY = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSizes.sectionTitle);
    doc.setTextColor(colors.warning);
    doc.text('5. Important Disclaimer', margin, cursorY);
    cursorY += spacing.section;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSizes.bodyText);
    doc.setTextColor(colors.secondary);
    const disclaimer = [
      'This report is generated by ISP Wellness Assistant and is not a substitute for professional medical advice.',
      'Always consult a qualified healthcare provider for proper diagnosis and treatment.',
      'The information provided in this report is based on the symptoms and information provided by the patient.',
      'ISP Wellness Assistant is not responsible for any decisions made based on this report.',
    ];

    disclaimer.forEach((text) => {
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * spacing.line + spacing.paragraph;
    });

    // Add page numbers
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      footer(i, pages);
    }

    // Generate PDF
    const pdfOutput = doc.output('datauristring');
    const pdfData = pdfOutput.split(',')[1];

    try {
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfData,
          patientName: profile.name,
        }),
      });

      const result = await response.json();
      if (result.success) {
        doc.save(`ISP-Wellness-Assistant-Report-${profile.name}-${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        throw new Error(result.message || 'Failed to send report');
      }
    } catch (error) {
      console.error('Error sending report:', error);
      doc.save(`ISP-Wellness-Assistant-Report-${profile.name}-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fadeIn">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-card rounded-3xl shadow-xl p-6 sm:p-8 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 text-center">
            Your Wellness Summary
          </h2>

          {/* Profile Summary */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">Profile Information</h3>
            <div className="bg-accent rounded-xl p-4 space-y-2">
              <p className="text-foreground">
                <span className="font-medium">Name:</span> {profile.name}
              </p>
              <p className="text-foreground">
                <span className="font-medium">Age:</span> {profile.age}
              </p>
              <p className="text-foreground">
                <span className="font-medium">Gender:</span> {profile.gender}
              </p>
              {profile.medicalConditions && (
                <p className="text-foreground">
                  <span className="font-medium">Medical Conditions:</span>{' '}
                  {profile.medicalConditions}
                </p>
              )}
            </div>
          </div>

          {/* Symptoms Summary */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">Reported Symptoms</h3>
            <div className="bg-accent rounded-xl p-4">
              <p className="text-foreground whitespace-pre-wrap">{symptoms}</p>
            </div>
          </div>

          {/* Q&A Summary */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">Question Responses</h3>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={`question-${question.id}-${index}`} className="bg-accent rounded-xl p-4">
                  <p className="font-medium text-foreground mb-2">
                    Q{index + 1}: {question.text}
                  </p>
                  <p className="text-foreground text-sm opacity-80">
                    Answer: {answers[index] || 'Not answered'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Results */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">AI Analysis Results</h3>
            
            {isAnalyzing ? (
              <div className="bg-accent rounded-xl p-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-foreground font-medium">Analyzing your symptoms...</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Our AI is processing your information
                  </p>
                </div>
              </div>
            ) : analysisError ? (
              <div className="bg-accent rounded-xl p-4">
                <p className="text-destructive">{analysisError}</p>
              </div>
            ) : conditions && conditions.length > 0 ? (
              <div className="space-y-4">
                {conditions.map((condition, index) => (
                  <div
                    key={`condition-${condition.condition}-${index}`}
                    className="bg-accent rounded-xl p-4 border-l-4 border-primary"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-semibold text-foreground">
                        {condition.condition}
                      </h4>
                      <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {Math.round(condition.likelihood * 100)}%
                      </span>
                    </div>
                    {condition.description && (
                      <p className="text-foreground text-sm opacity-80 mt-2">
                        {condition.description}
                      </p>
                    )}
                  </div>
                ))}
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">⚠️ Important:</span> This is a preliminary AI
                    assessment based on the information provided. It is not a substitute for
                    professional medical advice. Please consult with a qualified healthcare
                    professional for an accurate diagnosis and appropriate treatment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-accent rounded-xl p-4">
                <p className="text-foreground">
                  No specific conditions identified. Please consult with a healthcare professional
                  for further evaluation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {conditions && conditions.length > 0 && (
            <button
              onClick={generatePDF}
              className="flex-1 py-4 px-6 bg-secondary text-secondary-foreground text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex-1 py-4 px-6 bg-primary text-primary-foreground text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
