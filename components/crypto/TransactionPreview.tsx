'use client';

import { useState } from 'react';
import { formatUnits, type Address } from 'viem';
import { useEstimateGas } from 'wagmi';

/**
 * Transaction Preview Component
 * Shows users exactly what they're about to sign before executing a transaction
 */

export interface TransactionPreviewData {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
  functionName?: string;
  args?: readonly unknown[];
  tokenAmount?: bigint;
  tokenSymbol?: string;
  tokenDecimals?: number;
  description?: string;
}

interface TransactionPreviewProps {
  transaction: TransactionPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TransactionPreview({
  transaction,
  onConfirm,
  onCancel,
  isLoading = false,
}: TransactionPreviewProps) {
  const [confirmed, setConfirmed] = useState(false);

  // Estimate gas for the transaction
  const { data: gasEstimate, isLoading: isEstimatingGas } = useEstimateGas({
    to: transaction.to,
    value: transaction.value,
    data: transaction.data,
  });

  const handleConfirm = () => {
    if (!confirmed) {
      setConfirmed(true);
    } else {
      onConfirm();
    }
  };

  // Format ETH value
  const ethValue = transaction.value
    ? formatUnits(transaction.value, 18)
    : '0';

  // Format token amount if present
  const tokenAmount = transaction.tokenAmount && transaction.tokenDecimals
    ? formatUnits(transaction.tokenAmount, transaction.tokenDecimals)
    : null;

  // Estimate gas cost in ETH (assuming 20 gwei gas price)
  const estimatedGasCost = gasEstimate
    ? formatUnits(gasEstimate * BigInt(20000000000), 18)
    : '...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Transaction Preview
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Review the transaction details before signing
          </p>
        </div>

        {/* Transaction Description */}
        {transaction.description && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {transaction.description}
            </p>
          </div>
        )}

        {/* Transaction Details */}
        <div className="space-y-3 mb-6">
          {/* Recipient Address */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              To Address
            </span>
            <span className="text-sm font-mono text-gray-900 dark:text-white break-all">
              {transaction.to}
            </span>
          </div>

          {/* ETH Value */}
          {transaction.value && transaction.value > 0n && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                ETH Amount
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {ethValue} ETH
              </span>
            </div>
          )}

          {/* Token Amount */}
          {tokenAmount && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Token Amount
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {tokenAmount} {transaction.tokenSymbol || 'tokens'}
              </span>
            </div>
          )}

          {/* Function Name */}
          {transaction.functionName && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Function
              </span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {transaction.functionName}
              </span>
            </div>
          )}

          {/* Estimated Gas */}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Estimated Gas Cost
            </span>
            <span className="text-sm text-gray-900 dark:text-white">
              {isEstimatingGas ? (
                <span className="animate-pulse">Calculating...</span>
              ) : (
                `~${estimatedGasCost} ETH`
              )}
            </span>
          </div>
        </div>

        {/* Warning Box */}
        <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5"
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
              <p className="font-semibold mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Verify the recipient address is correct</li>
                <li>Transactions cannot be reversed</li>
                <li>Only proceed if you initiated this action</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 mr-3 h-4 w-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            I have reviewed the transaction details and confirm they are correct
          </span>
        </label>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || isLoading || isEstimatingGas}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
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
                Processing...
              </span>
            ) : confirmed ? (
              'Confirm & Sign'
            ) : (
              'Review Required'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to use transaction preview in your components
 */
export function useTransactionPreview() {
  const [previewData, setPreviewData] = useState<TransactionPreviewData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<((confirmed: boolean) => void) | null>(null);

  const showPreview = (data: TransactionPreviewData): Promise<boolean> => {
    return new Promise((resolve) => {
      setPreviewData(data);
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsExecuting(true);
    resolvePromise?.(true);
    setIsOpen(false);
    setIsExecuting(false);
  };

  const handleCancel = () => {
    resolvePromise?.(false);
    setIsOpen(false);
  };

  const Preview = isOpen && previewData ? (
    <TransactionPreview
      transaction={previewData}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      isLoading={isExecuting}
    />
  ) : null;

  return {
    showPreview,
    Preview,
    isOpen,
  };
}
