// VFIDE Testnet - Interactive Onboarding System
// Welcome new users and guide them through the platform

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
  nextStep?: string;
  completed: boolean;
}

interface OnboardingState {
  isActive: boolean;
  currentStep: string | null;
  completedSteps: string[];
  steps: Record<string, OnboardingStep>;
  
  startOnboarding: () => void;
  completeStep: (stepId: string) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  goToStep: (stepId: string) => void;
}

// Onboarding flow steps
const ONBOARDING_STEPS: Record<string, OnboardingStep> = {
  welcome: {
    id: 'welcome',
    title: '👋 Welcome to VFIDE!',
    description: 'VFIDE is a complete decentralized ecosystem combining governance, commerce, social features, and elected councils. Let me show you around!',
    nextStep: 'connect-wallet',
    completed: false,
  },
  
  'connect-wallet': {
    id: 'connect-wallet',
    title: '🔗 Connect Your Wallet',
    description: 'First, connect your wallet to get started. We support MetaMask, Coinbase Wallet, and WalletConnect. Don\'t worry, this is a testnet—completely safe!',
    targetElement: '[data-onboarding="wallet-button"]',
    position: 'bottom',
    action: 'connect-wallet',
    nextStep: 'get-testnet-eth',
    completed: false,
  },
  
  'get-testnet-eth': {
    id: 'get-testnet-eth',
    title: '💧 Get Free Testnet ETH',
    description: 'You\'ll need some testnet ETH to interact with the platform. Click the faucet button to get free testnet ETH. It takes about 30 seconds.',
    targetElement: '[data-onboarding="faucet-button"]',
    position: 'bottom',
    action: 'use-faucet',
    nextStep: 'view-dashboard',
    completed: false,
  },
  
  'view-dashboard': {
    id: 'view-dashboard',
    title: '📊 Your Dashboard',
    description: 'This is your dashboard! Here you can see your Proof Score (reputation), badges, activity feed, and quick access to all features.',
    targetElement: '[data-onboarding="dashboard"]',
    position: 'bottom',
    nextStep: 'explore-governance',
    completed: false,
  },
  
  'explore-governance': {
    id: 'explore-governance',
    title: '🏛️ Governance',
    description: 'VFIDE has real on-chain governance. View active proposals, vote on decisions, and delegate your voting power. Let\'s check out the governance page.',
    targetElement: '[data-onboarding="nav-governance"]',
    position: 'bottom',
    action: 'navigate-governance',
    nextStep: 'vote-on-proposal',
    completed: false,
  },
  
  'vote-on-proposal': {
    id: 'vote-on-proposal',
    title: '🗳️ Cast Your First Vote',
    description: 'There\'s an active proposal right now! Click on it to see details, then cast your vote. This is real on-chain governance—your vote matters.',
    targetElement: '[data-onboarding="active-proposal"]',
    position: 'right',
    action: 'vote',
    nextStep: 'explore-social',
    completed: false,
  },
  
  'explore-social': {
    id: 'explore-social',
    title: '💬 Social Features',
    description: 'VFIDE isn\'t just governance—it has built-in social features! Send messages, connect with other users, and give endorsements.',
    targetElement: '[data-onboarding="nav-social"]',
    position: 'bottom',
    action: 'navigate-social',
    nextStep: 'send-message',
    completed: false,
  },
  
  'send-message': {
    id: 'send-message',
    title: '✉️ Send Your First Message',
    description: 'Real-time messaging powered by WebSocket. Try sending a message to the VFIDE Founder or another community member!',
    targetElement: '[data-onboarding="message-button"]',
    position: 'right',
    action: 'send-message',
    nextStep: 'explore-commerce',
    completed: false,
  },
  
  'explore-commerce': {
    id: 'explore-commerce',
    title: '🏪 Commerce & Merchant Portal',
    description: 'VFIDE has built-in commerce features! Create a merchant profile, use escrow for safe transactions, and accept crypto payments.',
    targetElement: '[data-onboarding="nav-merchant"]',
    position: 'bottom',
    action: 'navigate-merchant',
    nextStep: 'explore-council',
    completed: false,
  },
  
  'explore-council': {
    id: 'explore-council',
    title: '👥 Council System',
    description: 'VFIDE has elected council members with real power and accountability. View current council, participate in elections, and even run for council yourself!',
    targetElement: '[data-onboarding="nav-council"]',
    position: 'bottom',
    action: 'navigate-council',
    nextStep: 'proof-score',
    completed: false,
  },
  
  'proof-score': {
    id: 'proof-score',
    title: '⭐ Earn Proof Score',
    description: 'Proof Score is your reputation in the VFIDE ecosystem. Earn it by voting, sending messages, endorsing others, completing transactions, and earning badges!',
    targetElement: '[data-onboarding="proof-score"]',
    position: 'bottom',
    nextStep: 'complete',
    completed: false,
  },
  
  complete: {
    id: 'complete',
    title: '🎉 You\'re All Set!',
    description: 'You\'ve completed the tour! Explore the platform, participate in governance, connect with the community, and earn badges. Welcome to VFIDE! 🚀',
    nextStep: undefined,
    completed: false,
  },
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: null,
      completedSteps: [],
      steps: ONBOARDING_STEPS,
      
      startOnboarding: () => {
        set({
          isActive: true,
          currentStep: 'welcome',
          completedSteps: [],
          steps: ONBOARDING_STEPS,
        });
      },
      
      completeStep: (stepId: string) => {
        const state = get();
        const step = state.steps[stepId];
        
        if (!step) return;
        
        const updatedSteps = {
          ...state.steps,
          [stepId]: { ...step, completed: true },
        };
        
        const completedSteps = [...state.completedSteps, stepId];
        const nextStep = step.nextStep;
        
        set({
          steps: updatedSteps,
          completedSteps,
          currentStep: nextStep || null,
          isActive: nextStep !== undefined,
        });
      },
      
      skipOnboarding: () => {
        set({
          isActive: false,
          currentStep: null,
        });
      },
      
      resetOnboarding: () => {
        set({
          isActive: false,
          currentStep: null,
          completedSteps: [],
          steps: ONBOARDING_STEPS,
        });
      },
      
      goToStep: (stepId: string) => {
        set({
          currentStep: stepId,
          isActive: true,
        });
      },
    }),
    {
      name: 'vfide-onboarding',
      version: 1,
    }
  )
);

// Utility functions for components
export const checkOnboardingAction = (action: string) => {
  const { currentStep, completeStep, steps } = useOnboarding.getState();
  
  if (!currentStep) return;
  
  const step = steps[currentStep];
  if (step?.action === action) {
    completeStep(currentStep);
  }
};

// Auto-start onboarding for new users
export const initOnboarding = (isNewUser: boolean) => {
  const { completedSteps, startOnboarding } = useOnboarding.getState();
  
  if (isNewUser && completedSteps.length === 0) {
    // Small delay to let the page load
    setTimeout(() => {
      startOnboarding();
    }, 1000);
  }
};
