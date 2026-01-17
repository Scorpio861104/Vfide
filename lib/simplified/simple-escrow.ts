/**
 * Simplified Escrow System
 * 
 * Reduces complexity from 7-step process to 2-step process:
 * 1. Create escrow with smart defaults
 * 2. Confirm delivery OR report issue
 * 
 * Auto-release after protection period if no action taken
 */

export interface SimplifiedEscrowConfig {
  // Automatic release after merchant marks as delivered (default: 7 days)
  autoReleaseDays: number;
  
  // Protection period for buyer to report issues (default: 14 days from creation)
  protectionDays: number;
  
  // Enable auto-release without user action
  enableAutoRelease: boolean;
}

export interface SimplifiedEscrow {
  id: string;
  orderId: string;
  merchant: string;
  buyer: string;
  amount: string;
  token: string;
  createdAt: Date;
  
  // Simplified state: 'pending' | 'completed' | 'needs_attention'
  state: 'pending' | 'completed' | 'needs_attention';
  
  // Simple status labels
  status: string; // "Waiting for delivery", "Delivered - Confirm?", "Completed", etc.
  
  // Days remaining in protection period
  daysRemaining: number;
  
  // Suggested action for user
  suggestedAction?: 'confirm_delivery' | 'report_issue' | 'wait' | null;
  
  // Auto-release scheduled date
  autoReleaseDate?: Date;
}

export const DEFAULT_ESCROW_CONFIG: SimplifiedEscrowConfig = {
  autoReleaseDays: 7,
  protectionDays: 14,
  enableAutoRelease: true,
};

/**
 * Create escrow with smart defaults
 */
export async function createSimpleEscrow(
  merchantAddress: string,
  amount: string,
  orderId: string,
  config: SimplifiedEscrowConfig = DEFAULT_ESCROW_CONFIG
): Promise<SimplifiedEscrow> {
  // TODO: Replace with actual contract interaction
  const now = new Date();
  const autoReleaseDate = new Date(now.getTime() + config.autoReleaseDays * 24 * 60 * 60 * 1000);
  
  return {
    id: `escrow_${Date.now()}`,
    orderId,
    merchant: merchantAddress,
    buyer: '0x...', // From connected wallet
    amount,
    token: 'VFIDE',
    createdAt: now,
    state: 'pending',
    status: 'Waiting for merchant to ship',
    daysRemaining: config.protectionDays,
    suggestedAction: 'wait',
    autoReleaseDate,
  };
}

/**
 * Buyer confirms delivery - immediate release to merchant
 */
export async function confirmDelivery(escrowId: string): Promise<void> {
  // TODO: Call contract release function
  console.log(`Confirming delivery for escrow ${escrowId}`);
  
  // Success - funds released to merchant immediately
}

/**
 * Buyer reports issue - opens mediation (not full dispute)
 */
export async function reportIssue(
  escrowId: string,
  issue: 'not_received' | 'wrong_item' | 'damaged' | 'other',
  description: string
): Promise<void> {
  // TODO: Create mediation request instead of immediate dispute
  console.log(`Reporting issue for escrow ${escrowId}: ${issue}`);
  
  // Opens chat with merchant and platform mediator
  // Freezes auto-release until resolved
}

/**
 * Merchant marks order as delivered
 */
export async function markAsDelivered(
  escrowId: string,
  trackingNumber?: string
): Promise<void> {
  // TODO: Update escrow state in contract
  console.log(`Marking escrow ${escrowId} as delivered`);
  
  // Starts countdown for buyer confirmation or auto-release
}

/**
 * Get suggested action for user based on escrow state and role
 */
export function getSuggestedAction(
  escrow: SimplifiedEscrow,
  userAddress: string
): {
  action: 'confirm_delivery' | 'mark_delivered' | 'wait' | 'view_mediation' | null;
  label: string;
  description: string;
} {
  const isBuyer = escrow.buyer.toLowerCase() === userAddress.toLowerCase();
  const isMerchant = escrow.merchant.toLowerCase() === userAddress.toLowerCase();
  
  // State machine for suggested actions
  if (escrow.state === 'completed') {
    return {
      action: null,
      label: 'Completed',
      description: 'This transaction is complete',
    };
  }
  
  if (escrow.state === 'needs_attention') {
    return {
      action: 'view_mediation',
      label: 'View Mediation',
      description: 'Issue reported - mediation in progress',
    };
  }
  
  // Pending state
  if (isBuyer) {
    if (escrow.status.includes('Delivered')) {
      return {
        action: 'confirm_delivery',
        label: 'Confirm Delivery',
        description: `Confirm you received the item. Auto-releases in ${escrow.daysRemaining} days.`,
      };
    }
    return {
      action: 'wait',
      label: 'Waiting for Delivery',
      description: 'Merchant is preparing your order',
    };
  }
  
  if (isMerchant) {
    if (!escrow.status.includes('Delivered')) {
      return {
        action: 'mark_delivered',
        label: 'Mark as Delivered',
        description: 'Mark when you\'ve shipped the item',
      };
    }
    return {
      action: 'wait',
      label: 'Awaiting Confirmation',
      description: `Buyer has ${escrow.daysRemaining} days to confirm or report issues`,
    };
  }
  
  return {
    action: null,
    label: 'View Details',
    description: 'View escrow details',
  };
}

/**
 * Calculate time remaining for protection period
 */
export function getProtectionTimeRemaining(
  createdAt: Date,
  protectionDays: number
): {
  days: number;
  hours: number;
  expired: boolean;
} {
  const now = new Date();
  const expiryDate = new Date(createdAt.getTime() + protectionDays * 24 * 60 * 60 * 1000);
  const msRemaining = expiryDate.getTime() - now.getTime();
  
  if (msRemaining <= 0) {
    return { days: 0, hours: 0, expired: true };
  }
  
  const days = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  return { days, hours, expired: false };
}

/**
 * Get simplified state from complex contract state
 */
export function simplifyEscrowState(contractState: number): 'pending' | 'completed' | 'needs_attention' {
  // Contract states: 0=CREATED, 1=RELEASED, 2=REFUNDED, 3=DISPUTED
  switch (contractState) {
    case 0:
      return 'pending';
    case 1:
    case 2:
      return 'completed';
    case 3:
      return 'needs_attention';
    default:
      return 'pending';
  }
}

/**
 * Get human-friendly status message
 */
export function getStatusMessage(
  state: 'pending' | 'completed' | 'needs_attention',
  isBuyer: boolean,
  merchantDelivered: boolean
): string {
  if (state === 'completed') {
    return 'Transaction completed successfully';
  }
  
  if (state === 'needs_attention') {
    return 'Issue reported - Mediation in progress';
  }
  
  // Pending state
  if (isBuyer) {
    return merchantDelivered 
      ? 'Delivered - Please confirm receipt'
      : 'Waiting for merchant to ship';
  } else {
    return merchantDelivered
      ? 'Delivered - Awaiting buyer confirmation'
      : 'Please ship the item and mark as delivered';
  }
}
