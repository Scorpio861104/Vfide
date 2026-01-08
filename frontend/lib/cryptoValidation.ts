/**
 * Validation utilities for crypto operations
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate Ethereum address format
 */
export function validateEthereumAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate payment amount
 */
export function validateAmount(amount: string | number, currency: 'ETH' | 'VFIDE' = 'ETH'): {
  valid: boolean;
  error?: string;
  parsed?: number;
} {
  // Convert to number
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Check if valid number
  if (isNaN(num)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  // Check if positive
  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  // Check maximum limits
  const MAX_ETH = 1000; // 1000 ETH max per transaction
  const MAX_VFIDE = 1000000; // 1M VFIDE max per transaction

  if (currency === 'ETH' && num > MAX_ETH) {
    return { valid: false, error: `Amount exceeds maximum of ${MAX_ETH} ETH` };
  }

  if (currency === 'VFIDE' && num > MAX_VFIDE) {
    return { valid: false, error: `Amount exceeds maximum of ${MAX_VFIDE} VFIDE` };
  }

  // Check decimal places
  const decimals = amount.toString().split('.')[1]?.length || 0;
  if (decimals > 18) {
    return { valid: false, error: 'Too many decimal places (max 18)' };
  }

  return { valid: true, parsed: num };
}

/**
 * Validate currency
 */
export function validateCurrency(currency: string): currency is 'ETH' | 'VFIDE' {
  return currency === 'ETH' || currency === 'VFIDE';
}

/**
 * Validate transaction memo
 */
export function validateMemo(memo: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!memo) return { valid: true, sanitized: '' };

  // Check length
  if (memo.length > 500) {
    return { valid: false, error: 'Memo too long (max 500 characters)' };
  }

  // Sanitize: Remove potentially dangerous characters
  const sanitized = memo
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  return { valid: true, sanitized };
}

/**
 * Validate payment request
 */
export function validatePaymentRequest(data: {
  to: string;
  amount: string;
  currency: string;
  reason?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate address
  if (!validateEthereumAddress(data.to)) {
    errors.push('Invalid recipient address');
  }

  // Validate currency
  if (!validateCurrency(data.currency)) {
    errors.push('Invalid currency (must be ETH or VFIDE)');
  }

  // Validate amount
  const amountValidation = validateAmount(data.amount, data.currency as 'ETH' | 'VFIDE');
  if (!amountValidation.valid) {
    errors.push(amountValidation.error!);
  }

  // Validate reason
  if (data.reason) {
    const memoValidation = validateMemo(data.reason);
    if (!memoValidation.valid) {
      errors.push(memoValidation.error!);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if user has sufficient balance
 */
export async function checkSufficientBalance(
  address: string,
  amount: string,
  currency: 'ETH' | 'VFIDE',
  includeGas: boolean = true
): Promise<{ sufficient: boolean; balance: string; required: string; error?: string }> {
  try {
    const amountValidation = validateAmount(amount, currency);
    if (!amountValidation.valid) {
      return {
        sufficient: false,
        balance: '0',
        required: amount,
        error: amountValidation.error,
      };
    }

    // Get balance
    let balance: string;
    if (currency === 'ETH') {
      const balanceWei = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      balance = (parseInt(balanceWei, 16) / 1e18).toString();
    } else {
      // VFIDE token balance from API
      const response = await fetch(`/api/crypto/balance/${address}`);
      const data = await response.json();
      balance = data.tokenBalance || '0';
    }

    // Estimate gas if needed
    let required = amount;
    if (currency === 'ETH' && includeGas) {
      const gasEstimate = await estimateGas(address, address, amount);
      const totalRequired = parseFloat(amount) + gasEstimate;
      required = totalRequired.toString();
    }

    const sufficient = parseFloat(balance) >= parseFloat(required);

    return {
      sufficient,
      balance,
      required,
      error: sufficient ? undefined : `Insufficient ${currency} balance`,
    };
  } catch (error) {
    return {
      sufficient: false,
      balance: '0',
      required: amount,
      error: 'Failed to check balance',
    };
  }
}

/**
 * Estimate gas cost in ETH
 */
export async function estimateGas(
  from: string,
  to: string,
  value: string
): Promise<number> {
  try {
    const valueWei = '0x' + (parseFloat(value) * 1e18).toString(16);

    // Estimate gas limit
    const gasLimit = await window.ethereum.request({
      method: 'eth_estimateGas',
      params: [{
        from,
        to,
        value: valueWei,
      }],
    });

    // Get gas price
    const gasPrice = await window.ethereum.request({
      method: 'eth_gasPrice',
      params: [],
    });

    // Calculate total gas cost in ETH
    const gasCost = (parseInt(gasLimit, 16) * parseInt(gasPrice, 16)) / 1e18;

    return gasCost;
  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Return default estimate
    return 0.002; // ~$4 at 2000 USD/ETH
  }
}

/**
 * Format gas cost for display
 */
export function formatGasCost(gasCostEth: number, ethPrice: number = 2000): string {
  const usd = gasCostEth * ethPrice;
  return `${gasCostEth.toFixed(6)} ETH (~$${usd.toFixed(2)})`;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Validate and parse transaction data
 */
export function parseTransactionData(data: any): {
  valid: boolean;
  parsed?: any;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data) {
    errors.push('Transaction data is required');
    return { valid: false, errors };
  }

  const parsed: any = {};

  // Validate and parse each field
  if (data.from) {
    if (validateEthereumAddress(data.from)) {
      parsed.from = data.from.toLowerCase();
    } else {
      errors.push('Invalid sender address');
    }
  } else {
    errors.push('Sender address is required');
  }

  if (data.to) {
    if (validateEthereumAddress(data.to)) {
      parsed.to = data.to.toLowerCase();
    } else {
      errors.push('Invalid recipient address');
    }
  } else {
    errors.push('Recipient address is required');
  }

  if (data.amount) {
    const amountValidation = validateAmount(data.amount, data.currency);
    if (amountValidation.valid) {
      parsed.amount = amountValidation.parsed!.toString();
    } else {
      errors.push(amountValidation.error!);
    }
  } else {
    errors.push('Amount is required');
  }

  if (data.currency) {
    if (validateCurrency(data.currency)) {
      parsed.currency = data.currency;
    } else {
      errors.push('Invalid currency');
    }
  } else {
    errors.push('Currency is required');
  }

  if (data.memo) {
    const memoValidation = validateMemo(data.memo);
    if (memoValidation.valid) {
      parsed.memo = memoValidation.sanitized;
    } else {
      errors.push(memoValidation.error!);
    }
  }

  return {
    valid: errors.length === 0,
    parsed: errors.length === 0 ? parsed : undefined,
    errors,
  };
}
