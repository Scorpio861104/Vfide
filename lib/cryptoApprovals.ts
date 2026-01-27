/**
 * ERC-20 Token Approval Flow
 * Handle token allowance and approvals for VFIDE transfers
 */

import { validateEthereumAddress, ValidationError } from './cryptoValidation';

/**
 * VFIDE Token Contract Address
 * Read from environment variable or fallback to placeholder
 */
export const VFIDE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x...';

/**
 * Maximum uint256 value for unlimited token approval
 * Allows spender to transfer any amount without re-approval
 */
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

// ERC-20 ABI (minimal interface for approval and allowance)
const _ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
];

export interface ApprovalStatus {
  hasApproval: boolean;
  currentAllowance: string;
  requiredAmount: string;
  needsApproval: boolean;
}

/**
 * Check if user has sufficient allowance for token transfer
 */
export async function checkTokenAllowance(
  ownerAddress: string,
  spenderAddress: string,
  requiredAmount: string
): Promise<ApprovalStatus> {
  try {
    // Validate addresses
    if (!validateEthereumAddress(ownerAddress)) {
      throw new ValidationError('Invalid owner address');
    }
    if (!validateEthereumAddress(spenderAddress)) {
      throw new ValidationError('Invalid spender address');
    }

    // Convert amount to Wei (18 decimals)
    const requiredAmountWei = BigInt(Math.floor(parseFloat(requiredAmount) * 1e18));

    // Encode allowance function call
    const data = encodeAllowanceCall(ownerAddress, spenderAddress);

    // Call contract
    const result = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: VFIDE_TOKEN_ADDRESS,
          data,
        },
        'latest',
      ],
    });

    // Decode result (uint256)
    const currentAllowance = BigInt(result);

    const needsApproval = currentAllowance < requiredAmountWei;

    return {
      hasApproval: !needsApproval,
      currentAllowance: (Number(currentAllowance) / 1e18).toString(),
      requiredAmount,
      needsApproval,
    };
  } catch (error) {
    console.error('Failed to check token allowance:', error);
    throw new Error('Failed to check token approval status');
  }
}

/**
 * Request token approval from user
 */
/**
 * Request token approval from user
 * 
 * Prompts user to approve token spending for a spender address.
 * Can request either exact amount or unlimited approval.
 * 
 * @param spenderAddress - Address that will be allowed to spend tokens
 * @param amount - Amount to approve (or MAX_UINT256 for unlimited)
 * @param unlimited - If true, requests unlimited approval
 * @returns Promise resolving to transaction hash
 * @throws ValidationError if address is invalid or approval fails
 */
export async function requestTokenApproval(
  spenderAddress: string,
  amount?: string,
  unlimited: boolean = false
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Validate spender address
    if (!validateEthereumAddress(spenderAddress)) {
      throw new ValidationError('Invalid spender address');
    }

    // Get user's address
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];

    // Determine approval amount
    let approvalAmount: string;
    if (unlimited) {
      approvalAmount = MAX_UINT256;
    } else if (amount) {
      // Convert to Wei
      approvalAmount = '0x' + BigInt(Math.floor(parseFloat(amount) * 1e18)).toString(16);
    } else {
      // Default to unlimited
      approvalAmount = MAX_UINT256;
    }

    // Encode approve function call
    const data = encodeApproveCall(spenderAddress, approvalAmount);

    // Send approval transaction
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: userAddress,
          to: VFIDE_TOKEN_ADDRESS,
          data,
        },
      ],
    });

    return {
      success: true,
      txHash,
    };
  } catch (error: unknown) {
    console.error('Token approval failed:', error);
    
    // Type guard for errors with code and message
    const isErrorWithCode = (err: unknown): err is { code: number; message?: string } => {
      return typeof err === 'object' && err !== null && 'code' in err;
    };
    
    const isErrorWithMessage = (err: unknown): err is { message: string } => {
      return typeof err === 'object' && err !== null && 'message' in err;
    };
    
    // User rejected
    if (isErrorWithCode(error) && error.code === 4001) {
      return {
        success: false,
        error: 'Approval rejected by user',
      };
    }

    return {
      success: false,
      error: isErrorWithMessage(error) ? error.message : 'Token approval failed',
    };
  }
}

/**
 * Ensure sufficient token allowance before transfer
 * Automatically requests approval if needed
 */
/**
 * Ensure sufficient token allowance exists
 * 
 * Checks current allowance and requests approval if insufficient.
 * Only prompts user if more allowance is needed.
 * 
 * @param ownerAddress - Address of the token owner
 * @param spenderAddress - Address of the spender
 * @param amount - Required token amount
 * @returns Promise resolving to approval status
 */
export async function ensureTokenAllowance(
  spenderAddress: string,
  requiredAmount: string,
  userAddress?: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    // Get user address if not provided
    let address = userAddress;
    if (!address) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      address = accounts[0];
      
      if (!address) {
        throw new Error('No wallet address found');
      }
    }

    // Check current allowance
    const status = await checkTokenAllowance(address, spenderAddress, requiredAmount);

    // If already has approval, return success
    if (status.hasApproval) {
      return { success: true };
    }

    // Request approval
    const approvalResult = await requestTokenApproval(
      spenderAddress,
      requiredAmount,
      false // Don't request unlimited for safety
    );

    return approvalResult;
  } catch (error: unknown) {
    console.error('Failed to ensure token allowance:', error);
    
    const isErrorWithMessage = (err: unknown): err is { message: string } => {
      return typeof err === 'object' && err !== null && 'message' in err;
    };
    
    return {
      success: false,
      error: isErrorWithMessage(error) ? error.message : 'Failed to ensure token allowance',
    };
  }
}

/**
 * Get token balance
 */
/**
 * Get VFIDE token balance for an address
 * 
 * @param address - Wallet address to check balance for
 * @returns Token balance as string (in wei)
 * @throws ValidationError if address is invalid
 */
export async function getTokenBalance(address: string): Promise<string> {
  try {
    if (!validateEthereumAddress(address)) {
      throw new ValidationError('Invalid address');
    }

    const data = encodeBalanceOfCall(address);

    const result = await window.ethereum.request({
      method: 'eth_call',
      params: [
        {
          to: VFIDE_TOKEN_ADDRESS,
          data,
        },
        'latest',
      ],
    });

    const balance = BigInt(result);
    return (Number(balance) / 1e18).toString();
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return '0';
  }
}

/**
 * Revoke token approval (set allowance to 0)
 */
/**
 * Revoke token approval for a spender
 * 
 * Sets allowance to zero, preventing spender from transferring tokens.
 * Useful for security when approval is no longer needed.
 * 
 * @param spenderAddress - Address to revoke approval from
 * @returns Promise resolving to transaction hash
 * @throws ValidationError if address is invalid or revocation fails
 */
export async function revokeTokenApproval(
  spenderAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!validateEthereumAddress(spenderAddress)) {
      throw new ValidationError('Invalid spender address');
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const userAddress = accounts[0];

    // Encode approve(spender, 0)
    const data = encodeApproveCall(spenderAddress, '0x0');

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: userAddress,
          to: VFIDE_TOKEN_ADDRESS,
          data,
        },
      ],
    });

    return { success: true, txHash };
  } catch (error: unknown) {
    console.error('Failed to revoke approval:', error);
    
    const isErrorWithMessage = (err: unknown): err is { message: string } => {
      return typeof err === 'object' && err !== null && 'message' in err;
    };
    
    return {
      success: false,
      error: isErrorWithMessage(error) ? error.message : 'Failed to revoke approval',
    };
  }
}

// ============================================================================
// ABI Encoding Helpers
// ============================================================================

/**
 * Encode allowance(owner, spender) call
 */
function encodeAllowanceCall(owner: string, spender: string): string {
  // Function selector: keccak256("allowance(address,address)").slice(0, 4)
  const selector = '0xdd62ed3e';
  
  // Pad addresses to 32 bytes
  const ownerPadded = owner.slice(2).padStart(64, '0');
  const spenderPadded = spender.slice(2).padStart(64, '0');
  
  return selector + ownerPadded + spenderPadded;
}

/**
 * Encode approve(spender, amount) call
 */
function encodeApproveCall(spender: string, amount: string): string {
  // Function selector: keccak256("approve(address,uint256)").slice(0, 4)
  const selector = '0x095ea7b3';
  
  // Pad spender address to 32 bytes
  const spenderPadded = spender.slice(2).padStart(64, '0');
  
  // Pad amount to 32 bytes
  const amountHex = amount.startsWith('0x') ? amount.slice(2) : amount;
  const amountPadded = amountHex.padStart(64, '0');
  
  return selector + spenderPadded + amountPadded;
}

/**
 * Encode balanceOf(account) call
 */
function encodeBalanceOfCall(account: string): string {
  // Function selector: keccak256("balanceOf(address)").slice(0, 4)
  const selector = '0x70a08231';
  
  // Pad account address to 32 bytes
  const accountPadded = account.slice(2).padStart(64, '0');
  
  return selector + accountPadded;
}

/**
 * React hook for managing token approval
 */
/**
 * React hook for managing token approvals
 * 
 * Provides approval status and functions to request/revoke approvals.
 * Automatically checks allowance and refreshes on dependencies change.
 * 
 * @param spenderAddress - Address of the spender
 * @param amount - Required token amount
 * @returns Object with approval status and control functions
 */
export function useTokenApproval(spenderAddress: string, amount: string) {
  const [status, setStatus] = React.useState<ApprovalStatus | null>(null);
  const [isApproving, setIsApproving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check allowance
  const checkAllowance = React.useCallback(async (userAddress: string) => {
    try {
      const result = await checkTokenAllowance(userAddress, spenderAddress, amount);
      setStatus(result);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    }
  }, [spenderAddress, amount]);

  // Request approval
  const approve = React.useCallback(async (unlimited: boolean = false) => {
    setIsApproving(true);
    setError(null);

    try {
      const result = await requestTokenApproval(spenderAddress, amount, unlimited);
      
      if (!result.success) {
        setError(result.error || 'Approval failed');
        return false;
      }

      // Wait a moment then re-check allowance
      setTimeout(async () => {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts[0]) {
          await checkAllowance(accounts[0]);
        }
      }, 2000);

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsApproving(false);
    }
  }, [spenderAddress, amount, checkAllowance]);

  return {
    status,
    isApproving,
    error,
    checkAllowance,
    approve,
  };
}

// For React hook
import * as React from 'react';
