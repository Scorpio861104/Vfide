'use client';

import { useState, useEffect } from 'react';
import { parseUnits, formatUnits, type Address } from 'viem';
import { useContractWrite, useWaitForTransactionReceipt } from 'wagmi';
import { ERC20ABI } from '@/lib/abis';

/**
 * Token Approval Component with Limited Approval Enforcement
 * Prevents unlimited (MAX_UINT256) token approvals for better security
 */

interface TokenApprovalProps {
  tokenAddress: Address;
  spenderAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  requiredAmount: bigint;
  currentAllowance: bigint;
  onApprovalComplete?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function TokenApproval({
  tokenAddress,
  spenderAddress,
  tokenSymbol,
  tokenDecimals,
  requiredAmount,
  currentAllowance,
  onApprovalComplete,
  onError,
}: TokenApprovalProps) {
  const [approvalAmount, setApprovalAmount] = useState<bigint>(requiredAmount);
  const [customAmount, setCustomAmount] = useState('');

  const needsApproval = currentAllowance < requiredAmount;

  // Contract write for approval
  const { writeContract, data: hash, isPending } = useContractWrite();

  // Wait for transaction
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle receipt separately
  useEffect(() => {
    if (hash && isConfirming === false) {
      // Transaction completed
      onApprovalComplete?.(hash);
    }
  }, [hash, isConfirming, onApprovalComplete]);

  const handleApprove = async () => {
    try {
      // Validate amount is not MAX_UINT256
      const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      if (approvalAmount >= MAX_UINT256) {
        throw new Error(
          'Unlimited approvals (MAX_UINT256) are not allowed for security reasons. ' +
          'Please approve a specific amount.'
        );
      }

      // Ensure approval amount is sufficient
      if (approvalAmount < requiredAmount) {
        throw new Error(
          `Approval amount must be at least ${formatUnits(requiredAmount, tokenDecimals)} ${tokenSymbol}`
        );
      }

      await writeContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [spenderAddress, approvalAmount],
      });
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const handleSetExact = () => {
    setApprovalAmount(requiredAmount);
    setCustomAmount('');
  };

  const handleSetDouble = () => {
    setApprovalAmount(requiredAmount * BigInt(2));
    setCustomAmount('');
  };

  const handleSetCustom = () => {
    try {
      if (!customAmount) return;
      const amount = parseUnits(customAmount, tokenDecimals);
      if (amount < requiredAmount) {
        throw new Error('Custom amount must be at least the required amount');
      }
      setApprovalAmount(amount);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  if (!needsApproval) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm text-green-800 dark:text-green-200">
            Token approval already granted
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Token Approval Required
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Allow the contract to spend your {tokenSymbol} tokens
        </p>
      </div>

      {/* Required Amount Info */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          Required Amount
        </div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatUnits(requiredAmount, tokenDecimals)} {tokenSymbol}
        </div>
      </div>

      {/* Approval Amount Options */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Approval Amount
        </label>
        
        <div className="space-y-2">
          {/* Exact Amount */}
          <button
            onClick={handleSetExact}
            className={`w-full p-3 text-left rounded-lg border transition-colors ${
              approvalAmount === requiredAmount
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Exact Amount (Recommended)
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatUnits(requiredAmount, tokenDecimals)} {tokenSymbol}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Most secure - approve only what&apos;s needed
            </p>
          </button>

          {/* Double Amount */}
          <button
            onClick={handleSetDouble}
            className={`w-full p-3 text-left rounded-lg border transition-colors ${
              approvalAmount === requiredAmount * BigInt(2)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                2x Amount
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatUnits(requiredAmount * BigInt(2), tokenDecimals)} {tokenSymbol}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Convenient for multiple transactions
            </p>
          </button>

          {/* Custom Amount */}
          <div className={`p-3 rounded-lg border ${
            customAmount
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}>
            <label className="text-sm font-medium text-gray-900 dark:text-white block mb-2">
              Custom Amount
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={`Min: ${formatUnits(requiredAmount, tokenDecimals)}`}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={handleSetCustom}
                disabled={!customAmount}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Warning */}
      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start">
          <svg
            className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-xs text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold mb-1">Security Notice:</p>
            <p>
              For your protection, unlimited approvals are not permitted. 
              You can always approve more tokens later if needed.
            </p>
          </div>
        </div>
      </div>

      {/* Current Selection */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          You are approving
        </div>
        <div className="text-lg font-bold text-gray-900 dark:text-white">
          {formatUnits(approvalAmount, tokenDecimals)} {tokenSymbol}
        </div>
      </div>

      {/* Approve Button */}
      <button
        onClick={handleApprove}
        disabled={isPending || isConfirming}
        className="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending || isConfirming ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {isConfirming ? 'Confirming...' : 'Approving...'}
          </span>
        ) : (
          'Approve Tokens'
        )}
      </button>
    </div>
  );
}
