/**
 * Simplified Escrow Configuration with Smart Defaults
 * Reduces complexity from 7 steps to 2 steps with automatic protection
 */

export interface SimplifiedEscrowConfig {
  // Automatic release after merchant confirms delivery (default: 7 days)
  autoRelease: boolean;
  autoReleaseDays: number;
  
  // Protection period for buyer disputes (default: 14 days)
  protectionPeriod: number;
  
  // Simplified actions
  enableOneClickActions: boolean;
}

export const DEFAULT_ESCROW_CONFIG: SimplifiedEscrowConfig = {
  autoRelease: true,
  autoReleaseDays: 7,
  protectionPeriod: 14,
  enableOneClickActions: true,
};

/**
 * Get escrow configuration from localStorage or use defaults
 */
export function getEscrowConfig(): SimplifiedEscrowConfig {
  if (typeof window === 'undefined') return DEFAULT_ESCROW_CONFIG;
  
  try {
    const saved = localStorage.getItem('vfide_escrow_config');
    if (saved) {
      return { ...DEFAULT_ESCROW_CONFIG, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load escrow config:', error);
  }
  
  return DEFAULT_ESCROW_CONFIG;
}

/**
 * Save escrow configuration to localStorage
 */
export function saveEscrowConfig(config: Partial<SimplifiedEscrowConfig>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getEscrowConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('vfide_escrow_config', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save escrow config:', error);
  }
}

/**
 * Simplified escrow states (reduced from 7 to 3)
 */
export enum SimplifiedEscrowState {
  PENDING = 'Pending',           // Waiting for action
  COMPLETED = 'Completed',       // Successfully completed
  NEEDS_ATTENTION = 'Needs Attention', // Issue reported or timeout approaching
}

/**
 * Map complex escrow state to simplified state
 */
export function getSimplifiedState(
  status: 'CREATED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED' | 'TIMEOUT',
  daysRemaining: number
): SimplifiedEscrowState {
  switch (status) {
    case 'RELEASED':
      return SimplifiedEscrowState.COMPLETED;
    
    case 'REFUNDED':
      return SimplifiedEscrowState.COMPLETED;
    
    case 'DISPUTED':
      return SimplifiedEscrowState.NEEDS_ATTENTION;
    
    case 'TIMEOUT':
      return SimplifiedEscrowState.NEEDS_ATTENTION;
    
    case 'CREATED':
    default:
      // Show "Needs Attention" if close to timeout
      return daysRemaining <= 2 
        ? SimplifiedEscrowState.NEEDS_ATTENTION 
        : SimplifiedEscrowState.PENDING;
  }
}

/**
 * Get user-friendly action suggestions based on role and state
 */
export function getSuggestedActions(
  role: 'buyer' | 'merchant',
  state: SimplifiedEscrowState,
  autoReleaseEnabled: boolean
): Array<{
  label: string;
  description: string;
  action: 'confirm' | 'report' | 'wait' | 'contact';
  variant: 'primary' | 'secondary' | 'warning';
}> {
  if (role === 'buyer') {
    switch (state) {
      case SimplifiedEscrowState.PENDING:
        return [
          {
            label: 'Confirm Delivery',
            description: 'Release payment to merchant immediately',
            action: 'confirm',
            variant: 'primary',
          },
          {
            label: 'Report Issue',
            description: 'Start mediation process',
            action: 'report',
            variant: 'warning',
          },
        ];
      
      case SimplifiedEscrowState.NEEDS_ATTENTION:
        return [
          {
            label: 'Contact Support',
            description: 'Get help resolving this transaction',
            action: 'contact',
            variant: 'primary',
          },
        ];
      
      default:
        return [];
    }
  } else {
    // Merchant actions
    switch (state) {
      case SimplifiedEscrowState.PENDING:
        return autoReleaseEnabled
          ? [
              {
                label: 'Wait for Auto-Release',
                description: 'Funds will release automatically in 7 days',
                action: 'wait',
                variant: 'secondary',
              },
            ]
          : [
              {
                label: 'Request Release',
                description: 'Ask buyer to confirm delivery',
                action: 'contact',
                variant: 'primary',
              },
            ];
      
      default:
        return [];
    }
  }
}

/**
 * Calculate days remaining until auto-release
 */
export function calculateDaysRemaining(
  createdAt: Date,
  autoReleaseDays: number = 7
): number {
  const now = new Date();
  const releaseDate = new Date(createdAt);
  releaseDate.setDate(releaseDate.getDate() + autoReleaseDays);
  
  const diffTime = releaseDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Format escrow status message for users
 */
export function getStatusMessage(
  role: 'buyer' | 'merchant',
  state: SimplifiedEscrowState,
  daysRemaining: number,
  autoReleaseEnabled: boolean
): string {
  if (state === SimplifiedEscrowState.COMPLETED) {
    return role === 'buyer' 
      ? 'Transaction completed successfully'
      : 'Payment received successfully';
  }
  
  if (state === SimplifiedEscrowState.NEEDS_ATTENTION) {
    return 'This transaction needs your attention';
  }
  
  // Pending state
  if (role === 'buyer') {
    return autoReleaseEnabled
      ? `Payment will auto-release in ${daysRemaining} days unless you report an issue`
      : 'Confirm delivery when you receive your order';
  } else {
    return autoReleaseEnabled
      ? `Waiting for buyer confirmation (auto-release in ${daysRemaining} days)`
      : 'Waiting for buyer to confirm delivery';
  }
}
