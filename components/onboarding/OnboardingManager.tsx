'use client';

import { useState, useEffect } from "react";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { safeLocalStorage } from "@/lib/utils";

const TOUR_COMPLETED_KEY = "vfide_tour_completed";

/**
 * OnboardingManager - Controls when the tour is shown
 *
 * AUTO-START: The tour automatically shows for first-time visitors
 * (when "vfide_tour_completed" is not present in localStorage).
 *
 * Users can also start the tour manually via:
 * - The Help Center (? icon)
 * - window.startVFIDETour() in console
 */
export function OnboardingManager() {
  const [showTour, setShowTour] = useState(false);

  // Auto-start the tour for new users who have not yet seen it
  useEffect(() => {
    const seen = safeLocalStorage.getItem(TOUR_COMPLETED_KEY);
    if (!seen) {
      setShowTour(true);
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
