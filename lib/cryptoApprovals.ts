/**
 * ERC-20 Token Approval Flow
 * Handle token allowance and approvals for VFIDE transfers
 */

import { validateEthereumAddress, ValidationError } from './cryptoValidation';
import { formatUnits, parseUnits } from 'viem';
import * as React from 'react';
import { CONTRACT_ADDRESSES, ZERO_ADDRESS, isConfiguredContractAddress } from '@/lib/contracts';
import { logger } from '@/lib/logger';
import { CURRENT_CHAIN_ID } from '@/lib/testnet';

// Type guards for error handling
const isErrorWithMessage = (err: unknown): err is { message: string } => {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string';
};

const asHexString = (value: unknown, name: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${name} from provider`);
  }
  return value;
};

const asAddressArray = (value: unknown, name: string): string[] => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`Invalid ${name} from provider`);
  }
  return value;
};

/**
 * VFIDE Token Contract Address
 * Required: configure VFIDEToken in the shared contract map.
 * Throws a ValidationError at import time if absent or invalid.
 */
const _configuredTokenAddress = CONTRACT_ADDRESSES.VFIDEToken;
if (!isConfiguredContractAddress(_configuredTokenAddress) || !validateEthereumAddress(_configuredTokenAddress)) {
  throw new ValidationError(
    'VFIDEToken is not configured or is invalid. ' +
    'Set a valid VFIDE token contract address in the shared environment configuration.'
  );
}
export const VFIDE_TOKEN_ADDRESS: string = _configuredTokenAddress;

/**
 * Maximum uint256 value for unlimited token approval
 * Allows spender to transfer any amount without re-approval
 */
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const ERC20_DECIMALS = 18;
const DECIMAL_AMOUNT_REGEX = /^\d+(?:\.\d{1,18})?$/;
const RECEIPT_POLL_INTERVAL_MS = 1000;
const MAX_RECEIPT_POLLS = 120;

function parseTokenAmountToWei(amount: string): bigint {
  const normalized = amount.trim();
  if (!DECIMAL_AMOUNT_REGEX.test(normalized)) {
    throw new ValidationError('Amount must be a positive decimal with up to 18 decimals');
  }

  const parsed = parseUnits(normalized, ERC20_DECIMALS);
  if (parsed <= BigInt(0)) {
    throw new ValidationError('Amount must be greater than zero');
  }

  return parsed;
}

export function getEthereumProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum wallet provider is not available');
  }
  return window.ethereum;
}

function assertConfiguredTokenAddress() {
  if (!validateEthereumAddress(VFIDE_TOKEN_ADDRESS) || VFIDE_TOKEN_ADDRESS.toLowerCase() === ZERO_ADDRESS) {
    throw new ValidationError('VFIDE token contract is not configured');
  }
}

export function assertNonZeroAddress(address: string, label: string) {
  if (!validateEthereumAddress(address) || address.toLowerCase() === ZERO_ADDRESS) {
    throw new ValidationError(`${label} must be a valid non-zero address`);
  }
}

export async function assertCorrectChain() {
  const provider = getEthereumProvider();
  const rawChainId = await provider.request({ method: 'eth_chainId' }) as unknown;
  const chainIdHex = asHexString(rawChainId, 'chain id');
  const chainId = Number.parseInt(chainIdHex, 16);
  if (chainId !== CURRENT_CHAIN_ID) {
    throw new ValidationError(`Wrong network connected. Switch to chain ${CURRENT_CHAIN_ID}.`);
  }
}

export async function waitForTransactionReceiptSuccess(txHash: string) {
  const provider = getEthereumProvider();

  for (let attempt = 0; attempt < MAX_RECEIPT_POLLS; attempt++) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }) as { status?: string } | null;

    if (receipt) {
      if (receipt.status === '0x1') {
        return receipt;
      }
      throw new Error('Transaction failed on-chain');
    }

    await new Promise((resolve) => setTimeout(resolve, RECEIPT_POLL_INTERVAL_MS));
  }

  throw new Error('Timed out waiting for transaction confirmation');
}

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
    assertConfiguredTokenAddress();
    await assertCorrectChain();

    // Validate addresses
    assertNonZeroAddress(ownerAddress, 'Owner address');
    assertNonZeroAddress(spenderAddress, 'Spender address');

    // Convert amount to wei with exact integer math.
    const requiredAmountWei = parseTokenAmountToWei(requiredAmount);

    // Encode allowance function call
    const data = encodeAllowanceCall(ownerAddress, spenderAddress);

    const provider = getEthereumProvider();

    // Call contract
    const result = await provider.request({
      method: 'eth_call',
      params: [
        {
          to: VFIDE_TOKEN_ADDRESS,
          data,
        },
        'latest',
      ],
    }) as unknown;

    // Decode result (uint256)
    const currentAllowance = BigInt(asHexString(result, 'allowance'));

    const needsApproval = currentAllowance < requiredAmountWei;

    return {
      hasApproval: !needsApproval,
      currentAllowance: formatUnits(currentAllowance, ERC20_DECIMALS),
      requiredAmount,
      needsApproval,
    };
  } catch (error) {
    logger.error('Failed to check token allowance:', error);
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
    assertConfiguredTokenAddress();
    await assertCorrectChain();

    // Validate spender address
    assertNonZeroAddress(spenderAddress, 'Spender address');

    // Get user's address
    const provider = getEthereumProvider();
    const accounts = asAddressArray(
      await provider.request({ method: 'eth_requestAccounts' }),
      'accounts'
    );
    const userAddress = accounts[0];
    if (!userAddress) {
      throw new Error('No wallet address returned from provider');
    }
    assertNonZeroAddress(userAddress, 'Wallet address');

    // Determine approval amount. Unlimited approvals remain opt-in only.
    let approvalAmount: string;
    if (unlimited) {
      approvalAmount = MAX_UINT256;
    } else {
      if (!amount) {
        throw new ValidationError('Approval amount is required when unlimited is false');
      }

      const amountWei = parseTokenAmountToWei(amount);
      approvalAmount = '0x' + amountWei.toString(16);
    }

    // Encode approve function call
    const data = encodeApproveCall(spenderAddress, approvalAmount);

    // Send approval transaction
    const txHash = asHexString(await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: userAddress,
          to: VFIDE_TOKEN_ADDRESS,
          data,
        },
      ],
    }), 'transaction hash');

    await waitForTransactionReceiptSuccess(txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error: unknown) {
    logger.error('Token approval failed:', error);
    
    // Type guard for errors with code
    const isErrorWithCode = (err: unknown): err is { code: number; message?: string } => {
      return typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code: unknown }).code === 'number';
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
      const provider = getEthereumProvider();
      const accounts = asAddressArray(
        await provider.request({ method: 'eth_requestAccounts' }),
        'accounts'
      );
      address = accounts[0];
      
      if (!address) {
        throw new Error('No wallet address found');
      }
    }

    assertNonZeroAddress(address, 'Wallet address');
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
    logger.error('Failed to ensure token allowance:', error);
    
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
    assertConfiguredTokenAddress();
    await assertCorrectChain();
    assertNonZeroAddress(address, 'Address');

    const data = encodeBalanceOfCall(address);
    const provider = getEthereumProvider();

    const result = await provider.request({
      method: 'eth_call',
      params: [
        {
          to: VFIDE_TOKEN_ADDRESS,
          data,
        },
        'latest',
      ],
    }) as unknown;

    const balance = BigInt(asHexString(result, 'token balance'));
    return formatUnits(balance, ERC20_DECIMALS);
  } catch (error) {
    logger.error('Failed to get token balance:', error);
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
    assertConfiguredTokenAddress();
    await assertCorrectChain();
    assertNonZeroAddress(spenderAddress, 'Spender address');

    const provider = getEthereumProvider();
    const accounts = asAddressArray(
      await provider.request({ method: 'eth_requestAccounts' }),
      'accounts'
    );
    const userAddress = accounts[0];
    if (!userAddress) {
      throw new Error('No wallet address returned from provider');
    }
    assertNonZeroAddress(userAddress, 'Wallet address');

    // Encode approve(spender, 0)
    const data = encodeApproveCall(spenderAddress, '0x0');

    const txHash = asHexString(await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: userAddress,
          to: VFIDE_TOKEN_ADDRESS,
          data,
        },
      ],
    }), 'transaction hash');

    await waitForTransactionReceiptSuccess(txHash);

    return { success: true, txHash };
  } catch (error: unknown) {
    logger.error('Failed to revoke approval:', error);
    
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

      const provider = getEthereumProvider();
      const accounts = asAddressArray(
        await provider.request({ method: 'eth_accounts' }),
        'accounts'
      );
      if (accounts[0]) {
        await checkAllowance(accounts[0]);
      }

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

