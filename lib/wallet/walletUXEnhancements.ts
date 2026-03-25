/**
 * Wallet UX Enhancements
 * 
 * Improvements to wallet connection and network switching experience:
 * 1. Smart auto-switching to Base network
 * 2. Clear onboarding for new users
 * 3. Persistent network preferences
 * 4. Guided connection flow
 * 5. Error recovery with user-friendly messages
 */

import { base, baseSepolia } from 'wagmi/chains';
import { IS_TESTNET } from '@/lib/chains';
import { logger } from '@/lib/logger';

export const PREFERRED_CHAIN = IS_TESTNET ? baseSepolia : base;
export const PREFERRED_CHAIN_NAME = IS_TESTNET ? 'Base Sepolia' : 'Base';

// ========================================
// WALLET UX PREFERENCES
// ========================================

export interface WalletPreferences {
  hasSeenWalletGuide: boolean;
  hasSeenNetworkGuide: boolean;
  preferredChainId: number;
  autoSwitchToBase: boolean;
  lastConnectedWallet?: string;
  dismissedWrongNetworkWarning: boolean;
}

const PREFERENCES_KEY = 'vfide-wallet-ux-prefs';

export function getWalletPreferences(): WalletPreferences {
  if (typeof window === 'undefined') {
    return getDefaultPreferences();
  }

  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...getDefaultPreferences(), ...JSON.parse(stored) };
    }
  } catch (error) {
    logger.warn('Failed to load wallet preferences:', error);
  }

  return getDefaultPreferences();
}

export function saveWalletPreferences(prefs: Partial<WalletPreferences>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getWalletPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.warn('Failed to save wallet preferences:', error);
  }
}

function getDefaultPreferences(): WalletPreferences {
  return {
    hasSeenWalletGuide: false,
    hasSeenNetworkGuide: false,
    preferredChainId: PREFERRED_CHAIN.id,
    autoSwitchToBase: true,
    dismissedWrongNetworkWarning: false,
  };
}

// ========================================
// WALLET CONNECTION HELPERS
// ========================================

export interface WalletRecommendation {
  id: string;
  name: string;
  description: string;
  icon: string;
  priority: number;
  availableOnMobile: boolean;
  availableOnDesktop: boolean;
  setupComplexity: 'easy' | 'medium' | 'advanced';
}

export const WALLET_RECOMMENDATIONS: WalletRecommendation[] = [
  {
    id: 'metaMask',
    name: 'MetaMask',
    description: 'Most popular wallet - works on desktop and mobile',
    icon: '🦊',
    priority: 1,
    availableOnMobile: true,
    availableOnDesktop: true,
    setupComplexity: 'easy',
  },
  {
    id: 'coinbaseWalletSDK',
    name: 'Coinbase Wallet',
    description: 'Best for Coinbase users - Base network ready',
    icon: '🔵',
    priority: 2,
    availableOnMobile: true,
    availableOnDesktop: true,
    setupComplexity: 'easy',
  },
  {
    id: 'walletConnect',
    name: 'WalletConnect',
    description: 'Connect any mobile wallet by scanning QR code',
    icon: '📱',
    priority: 3,
    availableOnMobile: true,
    availableOnDesktop: false,
    setupComplexity: 'easy',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    description: 'Popular mobile wallet with built-in dApp browser',
    icon: '🛡️',
    priority: 4,
    availableOnMobile: true,
    availableOnDesktop: false,
    setupComplexity: 'easy',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    description: 'Beautiful wallet with great UX',
    icon: '🌈',
    priority: 5,
    availableOnMobile: true,
    availableOnDesktop: true,
    setupComplexity: 'easy',
  },
];

export function getRecommendedWallet(isMobile: boolean): WalletRecommendation {
  if (isMobile) {
    // On mobile, recommend WalletConnect for best in-browser experience
    const recommended = WALLET_RECOMMENDATIONS.find(w => w.id === 'walletConnect');
    return recommended || WALLET_RECOMMENDATIONS[0]!;
  }
  
  // On desktop, recommend MetaMask as most popular
  return WALLET_RECOMMENDATIONS[0]!;
}

// ========================================
// NETWORK SWITCHING HELPERS
// ========================================

export interface NetworkSwitchGuide {
  title: string;
  steps: string[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium';
}

export function getNetworkSwitchGuide(currentChainId: number | undefined): NetworkSwitchGuide {
  const isWrongNetwork = currentChainId && currentChainId !== PREFERRED_CHAIN.id;
  
  if (!isWrongNetwork) {
    return {
      title: "You're on the right network! 🎉",
      steps: [],
      estimatedTime: '0s',
      difficulty: 'easy',
    };
  }

  return {
    title: `Switch to ${PREFERRED_CHAIN_NAME}`,
    steps: [
      'Click the "Switch Network" button below',
      `Your wallet will ask you to approve switching to ${PREFERRED_CHAIN_NAME}`,
      "Click 'Switch Network' or 'Approve' in your wallet",
      "Wait a moment while the network switches",
      "You're done! VFIDE will work seamlessly on Base",
    ],
    estimatedTime: '10-15 seconds',
    difficulty: 'easy',
  };
}

// ========================================
// ERROR MESSAGES
// ========================================

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  learnMoreUrl?: string;
}

export function getUserFriendlyError(error: Error | unknown): UserFriendlyError {
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // User rejected
  if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
    return {
      title: 'Connection Cancelled',
      message: 'You cancelled the wallet connection. Click "Connect Wallet" to try again.',
    };
  }

  // Wrong network
  if (errorMessage.includes('chain') || errorMessage.includes('network')) {
    return {
      title: 'Wrong Network',
      message: `Please switch to ${PREFERRED_CHAIN_NAME} in your wallet and try again.`,
    };
  }

  // Wallet not found
  if (errorMessage.includes('not found') || errorMessage.includes('not installed')) {
    return {
      title: 'Wallet Not Found',
      message: 'Please install a wallet extension like MetaMask or use WalletConnect.',
      learnMoreUrl: 'https://metamask.io/download/',
    };
  }

  // Timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      title: 'Connection Timeout',
      message: 'The wallet took too long to respond. Please try again.',
    };
  }

  // Default error
  return {
    title: 'Connection Failed',
    message: 'Something went wrong while connecting your wallet. Please try again.',
  };
}

// ========================================
// ONBOARDING FLOW
// ========================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
}

export function getWalletOnboardingSteps(
  isConnected: boolean,
  isCorrectNetwork: boolean
): OnboardingStep[] {
  return [
    {
      id: 'connect',
      title: 'Connect Your Wallet',
      description: 'Choose a wallet to connect to VFIDE',
      icon: '🔗',
      completed: isConnected,
    },
    {
      id: 'network',
      title: `Switch to ${PREFERRED_CHAIN_NAME}`,
      description: 'VFIDE works best on Base network',
      icon: '🌐',
      completed: isConnected && isCorrectNetwork,
    },
    {
      id: 'ready',
      title: 'Start Using VFIDE',
      description: 'Explore payments, vault, and governance',
      icon: '🚀',
      completed: isConnected && isCorrectNetwork,
    },
  ];
}

// ========================================
// AUTO-SWITCH LOGIC
// ========================================

export async function autoSwitchToBaseIfNeeded(
  isConnected: boolean,
  currentChainId: number | undefined,
  switchChain: (params: { chainId: number }) => Promise<void>,
  onError?: (error: Error) => void
): Promise<boolean> {
  const prefs = getWalletPreferences();
  
  // Don't auto-switch if user disabled it or already on correct network
  if (!prefs.autoSwitchToBase || !isConnected || currentChainId === PREFERRED_CHAIN.id) {
    return false;
  }

  // Don't auto-switch if user dismissed warning
  if (prefs.dismissedWrongNetworkWarning) {
    return false;
  }

  try {
    await switchChain({ chainId: PREFERRED_CHAIN.id });
    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error during chain switch');
    logger.warn('Auto-switch to Base failed:', err);
    
    // Call error callback if provided
    if (onError) {
      onError(err);
    }
    
    return false;
  }
}

// ========================================
// WALLET STATUS
// ========================================

export interface WalletStatus {
  isConnected: boolean;
  isCorrectNetwork: boolean;
  needsAttention: boolean;
  statusMessage: string;
  actionLabel?: string;
  actionPriority: 'high' | 'medium' | 'low';
}

export function getWalletStatus(
  isConnected: boolean,
  currentChainId: number | undefined
): WalletStatus {
  if (!isConnected) {
    return {
      isConnected: false,
      isCorrectNetwork: false,
      needsAttention: true,
      statusMessage: 'Connect your wallet to start using VFIDE',
      actionLabel: 'Connect Wallet',
      actionPriority: 'high',
    };
  }

  const isCorrectNetwork = currentChainId === PREFERRED_CHAIN.id;

  if (!isCorrectNetwork) {
    return {
      isConnected: true,
      isCorrectNetwork: false,
      needsAttention: true,
      statusMessage: `Switch to ${PREFERRED_CHAIN_NAME} to use VFIDE`,
      actionLabel: 'Switch Network',
      actionPriority: 'high',
    };
  }

  return {
    isConnected: true,
    isCorrectNetwork: true,
    needsAttention: false,
    statusMessage: `Connected to ${PREFERRED_CHAIN_NAME}`,
    actionPriority: 'low',
  };
}
