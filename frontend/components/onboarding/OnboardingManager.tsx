"use client";

import { useState, useEffect } from "react";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

/**
 * OnboardingManager - Controls when the tour is shown
 * 
 * DISABLED AUTO-START: The tour no longer auto-shows on first visit.
 * Users can start the tour manually via:
 * - The Help Center (? icon)
 * - window.startVFIDETour() in console
 * 
 * This provides a less intrusive experience while keeping the tour accessible.
 */
export function OnboardingManager() {
  const [showTour, setShowTour] = useState(false);

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
