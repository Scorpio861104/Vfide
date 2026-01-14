'use client';

// VFIDE Onboarding Tooltip Component
// Shows interactive tooltips guiding users through the platform

import { useOnboarding } from '@/lib/onboarding';
import { useEffect, useState, useRef } from 'react';
import { X, ArrowRight, SkipForward } from 'lucide-react';

export function OnboardingTooltip() {
  const { isActive, currentStep, steps, completeStep, skipOnboarding } = useOnboarding();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const step = currentStep ? steps[currentStep] : null;
  
  useEffect(() => {
    if (!isActive || !step || !step.targetElement) {
      setPosition(null);
      return;
    }
    
    const updatePosition = () => {
      const target = document.querySelector(step.targetElement!);
      if (!target || !tooltipRef.current) return;
      
      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;
      
      switch (step.position) {
        case 'bottom':
          top = targetRect.bottom + 16;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'top':
          top = targetRect.top - tooltipRect.height - 16;
          left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'right':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.right + 16;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
          left = targetRect.left - tooltipRect.width - 16;
          break;
        default:
          top = targetRect.bottom + 16;
          left = targetRect.left;
      }
      
      // Keep tooltip in viewport
      const maxLeft = window.innerWidth - tooltipRect.width - 16;
      const maxTop = window.innerHeight - tooltipRect.height - 16;
      
      left = Math.max(16, Math.min(left, maxLeft));
      top = Math.max(16, Math.min(top, maxTop));
      
      setPosition({ top, left });
    };
    
    // Initial position
    setTimeout(updatePosition, 100);
    
    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isActive, step]);
  
  if (!isActive || !step) return null;
  
  const handleNext = () => {
    if (currentStep) {
      completeStep(currentStep);
    }
  };
  
  const handleSkip = () => {
    skipOnboarding();
  };
  
  // Welcome modal (no target element)
  if (!step.targetElement) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div 
          ref={tooltipRef}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 border-2 border-blue-500"
        >
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="text-center">
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg leading-relaxed">
              {step.description}
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Skip Tour
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 font-medium flex items-center gap-2"
              >
                Let&apos;s Go! <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Positioned tooltip
  return (
    <>
      {/* Backdrop highlight */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm pointer-events-none" />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm border-2 border-blue-500 animate-fade-in"
        style={position ? { top: `${position.top}px`, left: `${position.left}px` } : {}}
      >
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="h-4 w-4" />
        </button>
        
        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white pr-6">
          {step.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
          {step.description}
        </p>
        
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-1 font-medium"
          >
            {step.nextStep ? 'Next' : 'Finish'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-4 flex gap-1">
          {Object.keys(steps).map((stepId) => (
            <div
              key={stepId}
              className={`h-1 flex-1 rounded-full transition-colors ${
                steps[stepId]?.completed
                  ? 'bg-green-500'
                  : stepId === currentStep
                  ? 'bg-blue-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
