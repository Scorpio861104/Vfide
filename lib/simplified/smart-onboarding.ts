/**
 * Smart Onboarding System
 * 
 * Progressive onboarding that reveals features gradually
 * Contextual help appears when needed, not all at once
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionUrl: string;
  actionText: string;
  estimatedTime: string;
}

export interface ContextualTooltip {
  id: string;
  targetElement: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  showOnce: boolean;
  priority: number;
}

/**
 * Check if user is a first-time user
 */
export function isFirstTimeUser(userAddress: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const key = `onboarding_completed_${userAddress}`;
  return !localStorage.getItem(key);
}

/**
 * Mark onboarding as completed
 */
export function markOnboardingComplete(userAddress: string): void {
  if (typeof window === 'undefined') return;
  
  const key = `onboarding_completed_${userAddress}`;
  localStorage.setItem(key, 'true');
  localStorage.setItem(`onboarding_completed_at_${userAddress}`, new Date().toISOString());
}

/**
 * Get onboarding progress for user
 */
export function getOnboardingSteps(userAddress: string): OnboardingStep[] {
  const completedSteps = getCompletedSteps(userAddress);
  
  return [
    {
      id: 'connect_wallet',
      title: 'Connect Your Wallet',
      description: 'Link your Web3 wallet to access all features',
      completed: completedSteps.includes('connect_wallet'),
      actionUrl: '/vault',
      actionText: 'Connect Wallet',
      estimatedTime: '1 min',
    },
    {
      id: 'complete_profile',
      title: 'Complete Your Profile',
      description: 'Add your info to build trust with the community',
      completed: completedSteps.includes('complete_profile'),
      actionUrl: '/profile/edit',
      actionText: 'Complete Profile',
      estimatedTime: '3 min',
    },
    {
      id: 'first_transaction',
      title: 'Make Your First Transaction',
      description: 'Send a payment to experience the platform',
      completed: completedSteps.includes('first_transaction'),
      actionUrl: '/vault',
      actionText: 'Send Payment',
      estimatedTime: '2 min',
    },
    {
      id: 'explore_governance',
      title: 'Explore Governance',
      description: 'See how you can vote on platform proposals',
      completed: completedSteps.includes('explore_governance'),
      actionUrl: '/governance',
      actionText: 'View Proposals',
      estimatedTime: '2 min',
    },
    {
      id: 'check_badges',
      title: 'Check Your Badges',
      description: 'Discover achievements you can earn',
      completed: completedSteps.includes('check_badges'),
      actionUrl: '/badge-progress',
      actionText: 'View Badges',
      estimatedTime: '1 min',
    },
  ];
}

/**
 * Mark a specific step as completed
 */
export function markStepComplete(userAddress: string, stepId: string): void {
  if (typeof window === 'undefined') return;
  
  const completedSteps = getCompletedSteps(userAddress);
  if (!completedSteps.includes(stepId)) {
    completedSteps.push(stepId);
    const key = `onboarding_steps_${userAddress}`;
    localStorage.setItem(key, JSON.stringify(completedSteps));
  }
}

/**
 * Get completed onboarding steps
 */
function getCompletedSteps(userAddress: string): string[] {
  if (typeof window === 'undefined') return [];
  
  const key = `onboarding_steps_${userAddress}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

/**
 * Calculate onboarding completion percentage
 */
export function getOnboardingProgress(userAddress: string): number {
  const steps = getOnboardingSteps(userAddress);
  const completed = steps.filter((s) => s.completed).length;
  return Math.round((completed / steps.length) * 100);
}

/**
 * Get contextual tooltips for current page
 */
export function getContextualTooltips(page: string): ContextualTooltip[] {
  const tooltips: Record<string, ContextualTooltip[]> = {
    vault: [
      {
        id: 'vault_balance',
        targetElement: '#vault-balance',
        title: 'Your Vault Balance',
        content: 'This is your secure vault. All your VFIDE tokens are stored here.',
        placement: 'bottom',
        showOnce: true,
        priority: 1,
      },
      {
        id: 'send_payment',
        targetElement: '#send-payment-button',
        title: 'Send a Payment',
        content: 'Click here to send VFIDE to anyone. You can scan QR codes for easy payments!',
        placement: 'left',
        showOnce: true,
        priority: 2,
      },
    ],
    governance: [
      {
        id: 'voting_power',
        targetElement: '#voting-power',
        title: 'Your Voting Power',
        content: 'Your ProofScore determines how much influence you have in votes.',
        placement: 'bottom',
        showOnce: true,
        priority: 1,
      },
    ],
    merchant: [
      {
        id: 'register_merchant',
        targetElement: '#register-button',
        title: 'Become a Merchant',
        content: 'Register as a merchant to start selling products and services on VFIDE.',
        placement: 'bottom',
        showOnce: true,
        priority: 1,
      },
    ],
  };
  
  return tooltips[page] || [];
}

/**
 * Check if tooltip should be shown
 */
export function shouldShowTooltip(tooltipId: string, userAddress: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const key = `tooltip_shown_${userAddress}_${tooltipId}`;
  return !localStorage.getItem(key);
}

/**
 * Mark tooltip as shown
 */
export function markTooltipShown(tooltipId: string, userAddress: string): void {
  if (typeof window === 'undefined') return;
  
  const key = `tooltip_shown_${userAddress}_${tooltipId}`;
  localStorage.setItem(key, 'true');
}

/**
 * Get smart suggestions based on user actions
 */
export function getSmartSuggestions(
  userAddress: string,
  currentPage: string
): string[] {
  const progress = getOnboardingProgress(userAddress);
  const suggestions: string[] = [];
  
  // Low engagement user
  if (progress < 40) {
    suggestions.push('Complete your profile to increase your ProofScore');
    suggestions.push('Make your first transaction to earn badges');
  }
  
  // Medium engagement user
  if (progress >= 40 && progress < 80) {
    suggestions.push('Check out the governance page to vote on proposals');
    suggestions.push('Earn badges to unlock more features');
  }
  
  // Page-specific suggestions
  if (currentPage === 'vault' && progress < 60) {
    suggestions.push('Try sending a test payment to yourself');
  }
  
  if (currentPage === 'badges' && progress >= 60) {
    suggestions.push('You\'re close to earning the "Active User" badge!');
  }
  
  return suggestions;
}

/**
 * Get "Need Help?" content for current page
 */
export function getHelpContent(page: string): { title: string; content: string; links: Array<{ text: string; url: string }> } {
  const helpPages: Record<string, any> = {
    vault: {
      title: 'Vault Help',
      content: 'Your vault is your secure wallet on VFIDE. Here you can send and receive payments, check your balance, and manage your tokens.',
      links: [
        { text: 'How to send a payment', url: '/help/send-payment' },
        { text: 'Understanding gas fees', url: '/help/gas-fees' },
        { text: 'Security best practices', url: '/help/security' },
      ],
    },
    governance: {
      title: 'Governance Help',
      content: 'Participate in platform decisions by voting on proposals. Your voting power is based on your ProofScore.',
      links: [
        { text: 'How voting works', url: '/help/voting' },
        { text: 'Creating proposals', url: '/help/proposals' },
        { text: 'ProofScore requirements', url: '/help/proofscore' },
      ],
    },
    merchant: {
      title: 'Merchant Help',
      content: 'Sell products and services on VFIDE with low fees and instant settlements.',
      links: [
        { text: 'Merchant registration', url: '/help/merchant-setup' },
        { text: 'Setting up your store', url: '/help/storefront' },
        { text: 'Payment processing', url: '/help/payments' },
      ],
    },
  };
  
  return helpPages[page] || {
    title: 'General Help',
    content: 'Need assistance? Check out our documentation or contact support.',
    links: [
      { text: 'Getting Started Guide', url: '/help/getting-started' },
      { text: 'FAQs', url: '/help/faq' },
      { text: 'Contact Support', url: '/support' },
    ],
  };
}

/**
 * Reset onboarding (for testing or user request)
 */
export function resetOnboarding(userAddress: string): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(`onboarding_completed_${userAddress}`);
  localStorage.removeItem(`onboarding_completed_at_${userAddress}`);
  localStorage.removeItem(`onboarding_steps_${userAddress}`);
  
  // Reset all tooltips
  const allKeys = Object.keys(localStorage);
  allKeys.forEach((key) => {
    if (key.startsWith(`tooltip_shown_${userAddress}_`)) {
      localStorage.removeItem(key);
    }
  });
}
