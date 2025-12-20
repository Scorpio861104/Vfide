"use client";

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface Step {
  id: string | number;
  title: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

/**
 * Visual progress indicator for multi-step processes
 */
export function ProgressSteps({ steps, currentStep, className = '' }: ProgressStepsProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        // isUpcoming can be used for future styling needs

        return (
          <div key={step.id} className="flex-1 flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor: isCompleted ? '#00F0FF' : isCurrent ? '#2A2A2F' : '#1A1A1D',
                }}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  border-2 transition-colors
                  ${isCompleted ? 'border-[#00F0FF]' : isCurrent ? 'border-[#00F0FF]' : 'border-[#3A3A3F]'}
                `}
              >
                {isCompleted ? (
                  <Check className="text-[#1A1A1D]" size={20} />
                ) : (
                  <span className={`font-bold ${isCurrent ? 'text-[#00F0FF]' : 'text-[#A0A0A5]'}`}>
                    {index + 1}
                  </span>
                )}
              </motion.div>
              
              {/* Step label */}
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${isCurrent ? 'text-[#F5F3E8]' : isCompleted ? 'text-[#00F0FF]' : 'text-[#A0A0A5]'}`}>
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-[#A0A0A5] mt-0.5 max-w-[100px]">
                    {step.description}
                  </div>
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 -mt-6">
                <div
                  className={`h-full transition-colors ${
                    isCompleted ? 'bg-[#00F0FF]' : 'bg-[#3A3A3F]'
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
