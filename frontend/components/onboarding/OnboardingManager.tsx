"use client";

import { useState, useEffect } from "react";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

export function OnboardingManager() {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Guard for SSR - localStorage only available in browser
    if (typeof window === 'undefined') return;
    
    // Check if user has completed the tour
    const tourCompleted = localStorage.getItem("vfide_tour_completed");
    const isFirstVisit = !tourCompleted;

    // Show tour on first visit after a short delay
    if (isFirstVisit) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 2000); // Wait 2 seconds after page load
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTourComplete = () => {
    setShowTour(false);
  };

  // Allow manual trigger via global function
  useEffect(() => {
    interface WindowWithTour extends Window {
      startVFIDETour?: () => void;
    }
    (window as WindowWithTour).startVFIDETour = () => {
      setShowTour(true);
    };
    return () => {
      delete (window as WindowWithTour).startVFIDETour;
    };
  }, []);

  if (!showTour) return null;

  return <OnboardingTour onComplete={handleTourComplete} />;
}
