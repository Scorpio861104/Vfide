/**
 * Simple Payment System
 * 
 * Simplifies the payment flow from 7 steps down to 2:
 * 1. Scan QR (auto-fills everything)
 * 2. Tap "Send"
 * 
 * Features:
 * - Smart defaults for gas and token selection
 * - Quick payment history (last 5 recipients)
 * - Payment templates for frequent transactions
 * - One-tap confirmation
 */

export interface PaymentTemplate {
  id: string;
  name: string;
  recipient: string;
  amount: string;
  token: string;
  frequency: 'frequent' | 'recent';
}

export interface QuickPayment {
  recipient: string;
  amount: string;
  token: string;
  gasPreset: 'economy' | 'standard' | 'faster';
  memo?: string;
}

export interface GasPreset {
  name: 'economy' | 'standard' | 'faster';
  label: string;
  estimatedTime: string;
  gasPriceMultiplier: number;
}

export const GAS_PRESETS: GasPreset[] = [
  {
    name: 'economy',
    label: 'Economy',
    estimatedTime: '~5 min',
    gasPriceMultiplier: 0.8,
  },
  {
    name: 'standard',
    label: 'Standard',
    estimatedTime: '~2 min',
    gasPriceMultiplier: 1.0,
  },
  {
    name: 'faster',
    label: 'Faster',
    estimatedTime: '~30 sec',
    gasPriceMultiplier: 1.5,
  },
];

/**
 * Parse QR code and auto-fill payment details
 */
export function parsePaymentQR(qrData: string): Partial<QuickPayment> {
  try {
    // Expected format: vfide://pay?to=0x123...&amount=10&token=VFIDE
    const url = new URL(qrData);
    
    if (url.protocol !== 'vfide:' || url.pathname !== '//pay') {
      throw new Error('Invalid VFIDE payment QR');
    }
    
    const recipient = url.searchParams.get('to') || '';
    const amount = url.searchParams.get('amount') || '';
    const token = url.searchParams.get('token') || 'VFIDE';
    const memo = url.searchParams.get('memo') || undefined;
    
    return {
      recipient,
      amount,
      token,
      memo,
      gasPreset: 'standard', // Smart default
    };
  } catch (error) {
    console.error('Failed to parse payment QR:', error);
    return {};
  }
}

/**
 * Get recent payment recipients (last 5)
 */
export function getRecentRecipients(userAddress: string): PaymentTemplate[] {
  // TODO: Fetch from backend/localStorage
  // Mock data for now
  return [
    {
      id: '1',
      name: 'Coffee Shop',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '5.00',
      token: 'VFIDE',
      frequency: 'frequent',
    },
    {
      id: '2',
      name: 'Friend',
      recipient: '0x123d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '10.00',
      token: 'VFIDE',
      frequency: 'recent',
    },
  ];
}

/**
 * Estimate gas cost for payment
 */
export async function estimatePaymentGas(
  payment: QuickPayment,
  gasPreset: GasPreset
): Promise<{ estimatedGas: string; estimatedCost: string }> {
  // TODO: Actual gas estimation from blockchain
  // Mock implementation
  const baseGas = 21000;
  const gasPrice = 50 * gasPreset.gasPriceMultiplier; // gwei
  const estimatedCost = ((baseGas * gasPrice) / 1e9).toFixed(6);
  
  return {
    estimatedGas: baseGas.toString(),
    estimatedCost: `${estimatedCost} ETH`,
  };
}

/**
 * Check if user has sufficient balance
 */
export async function checkBalance(
  userAddress: string,
  amount: string,
  token: string
): Promise<{ sufficient: boolean; balance: string; needed: string }> {
  // TODO: Fetch actual balance from blockchain
  // Mock implementation
  const balance = '100.00';
  const needed = amount;
  const sufficient = parseFloat(balance) >= parseFloat(amount);
  
  return {
    sufficient,
    balance: `${balance} ${token}`,
    needed: `${needed} ${token}`,
  };
}

/**
 * Execute simplified payment
 */
export async function executeSimplePayment(
  payment: QuickPayment
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // 1. Check balance
    const balanceCheck = await checkBalance(
      '0xUserAddress', // TODO: Get from wallet
      payment.amount,
      payment.token
    );
    
    if (!balanceCheck.sufficient) {
      return {
        success: false,
        error: `Insufficient balance. You have ${balanceCheck.balance}, need ${balanceCheck.needed}`,
      };
    }
    
    // 2. Estimate gas
    const gasPreset = GAS_PRESETS.find((p) => p.name === payment.gasPreset)!;
    const gasEstimate = await estimatePaymentGas(payment, gasPreset);
    
    // 3. Execute transaction
    // TODO: Call smart contract
    const txHash = '0x' + Math.random().toString(16).substr(2, 64);
    
    // 4. Track payment for quick access
    saveToRecentPayments(payment);
    
    return {
      success: true,
      txHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Save to recent payments for quick access
 */
function saveToRecentPayments(payment: QuickPayment): void {
  // TODO: Save to localStorage or backend
  console.log('Saved to recent payments:', payment);
}

/**
 * Create payment template from recent payment
 */
export function createPaymentTemplate(
  payment: QuickPayment,
  name: string
): PaymentTemplate {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name,
    recipient: payment.recipient,
    amount: payment.amount,
    token: payment.token,
    frequency: 'frequent',
  };
}

/**
 * Get smart defaults for new payment
 */
export function getSmartDefaults(): Pick<QuickPayment, 'token' | 'gasPreset'> {
  return {
    token: 'VFIDE',
    gasPreset: 'standard',
  };
}
