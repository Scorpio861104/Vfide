'use client';

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
                  ${isCompleted ? 'border-cyan-400' : isCurrent ? 'border-cyan-400' : 'border-zinc-700'}
                `}
              >
                {isCompleted ? (
                  <Check className="text-zinc-900" size={20} />
                ) : (
                  <span className={`font-bold ${isCurrent ? 'text-cyan-400' : 'text-zinc-400'}`}>
                    {index + 1}
                  </span>
                )}
              </motion.div>
              
              {/* Step label */}
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${isCurrent ? 'text-zinc-100' : isCompleted ? 'text-cyan-400' : 'text-zinc-400'}`}>
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-zinc-400 mt-0.5 max-w-[100px]">
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
                    isCompleted ? 'bg-cyan-400' : 'bg-zinc-700'
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
