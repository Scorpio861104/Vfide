'use client';

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { BeginnerWizard } from "@/components/onboarding/BeginnerWizard";
import { SetupWizard } from "@/components/onboarding/SetupWizard";
import { OnboardingTooltip } from "@/components/onboarding/OnboardingTooltip";
import { OnboardingProvider, OnboardingTrigger } from "@/components/onboarding/OnboardingFlow";
import { safeLocalStorage } from "@/lib/utils";

export const TOUR_COMPLETED_KEY = "vfide_tour_completed";
export const BEGINNER_COMPLETED_KEY = "vfide_beginner_completed";
export const WIZARD_ENABLED_KEY = "vfide_wizard_enabled";

/**
 * OnboardingManager - Controls the full onboarding sequence:
 *   1. OnboardingTour  – 8-step conceptual tour (auto-starts for new users)
 *   2. BeginnerWizard  – wallet setup guide (shown after tour if wallet not yet connected)
 *   3. OnboardingTrigger/Checklist – actionable getting-started checklist with rewards
 *
 * WIZARD ON/OFF:
 *   - HelpCenter has an Enable/Disable toggle
 *   - Programmatic: window.enableVFIDEWizard() / window.disableVFIDEWizard()
 *   - Stored in localStorage as "vfide_wizard_enabled" = "false" when disabled
 *
 * MANUAL RESTART:
 *   - window.startVFIDETour() restarts the tour (when wizard is enabled)
 */
export function OnboardingManager() {
  const [showTour, setShowTour] = useState(false);
  const [showBeginner, setShowBeginner] = useState(false);
  const [wizardEnabled, setWizardEnabled] = useState(true);
  const { isConnected } = useAccount();

  // On mount: read enabled state, then decide whether to auto-start the tour
  useEffect(() => {
    const disabled = safeLocalStorage.getItem(WIZARD_ENABLED_KEY) === "false";
    if (disabled) {
      setWizardEnabled(false);
      return;
    }
    const seen = safeLocalStorage.getItem(TOUR_COMPLETED_KEY);
    if (!seen) {
      setShowTour(true);
    }
  }, []);

  const handleTourComplete = () => {
    setShowTour(false);
    // Show the beginner wallet-setup wizard for users who haven't connected yet
    const beginnerSeen = safeLocalStorage.getItem(BEGINNER_COMPLETED_KEY);
    if (!beginnerSeen && !isConnected) {
      setShowBeginner(true);
    }
  };

  const handleBeginnerComplete = () => {
    setShowBeginner(false);
    safeLocalStorage.setItem(BEGINNER_COMPLETED_KEY, "true");
  };

  // Global helper functions exposed on window
  useEffect(() => {
    interface WindowWithWizard extends Window {
      startVFIDETour?: () => void;
      enableVFIDEWizard?: () => void;
      disableVFIDEWizard?: () => void;
    }
    const win = window as WindowWithWizard;

    win.startVFIDETour = () => {
      if (safeLocalStorage.getItem(WIZARD_ENABLED_KEY) !== "false") {
        setShowTour(true);
      }
    };

    win.enableVFIDEWizard = () => {
      safeLocalStorage.removeItem(WIZARD_ENABLED_KEY);
      safeLocalStorage.removeItem(TOUR_COMPLETED_KEY);
      safeLocalStorage.removeItem(BEGINNER_COMPLETED_KEY);
      setWizardEnabled(true);
      setShowTour(true);
    };

    win.disableVFIDEWizard = () => {
      safeLocalStorage.setItem(WIZARD_ENABLED_KEY, "false");
      setWizardEnabled(false);
      setShowTour(false);
      setShowBeginner(false);
    };

    return () => {
      delete win.startVFIDETour;
      delete win.enableVFIDEWizard;
      delete win.disableVFIDEWizard;
    };
  }, []);

  return (
    <OnboardingProvider>
      {wizardEnabled && showTour && (
        <OnboardingTour onComplete={handleTourComplete} />
      )}
      {wizardEnabled && showBeginner && (
        <BeginnerWizard onComplete={handleBeginnerComplete} />
      )}
      {wizardEnabled && <SetupWizard />}
      {wizardEnabled && <OnboardingTooltip />}
      {wizardEnabled && <OnboardingTrigger />}
    </OnboardingProvider>
  );
}
