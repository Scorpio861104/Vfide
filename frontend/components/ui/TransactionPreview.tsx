"use client";

import { useEstimateGas, useGasPrice } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { Fuel } from 'lucide-react';

interface TransactionPreviewProps {
  /** Label for the transaction type */
  action: string;
  /** Amount being transacted (in VFIDE or token units) */
  amount?: string;
  /** ProofScore-based fee percentage (0.25% - 5%) */
  burnFeePercent?: number;
  /** Estimated gas units (if known) */
  gasEstimate?: bigint;
  /** Show component */
  show?: boolean;
}

/**
 * Shows transaction fee breakdown before confirmation
 * Displays: Network gas fee + Burn fee (if applicable) = Total
 */
export function TransactionPreview({
  action,
  amount,
  burnFeePercent = 0,
  gasEstimate,
  show = true,
}: TransactionPreviewProps) {
  const { data: gasPrice } = useGasPrice();

  if (!show) return null;

  // Estimate gas cost in ETH
  const estimatedGas = gasEstimate || BigInt(100000); // Default estimate
  const gasCostWei = gasPrice ? estimatedGas * gasPrice : BigInt(0);
  const gasCostEth = parseFloat(formatEther(gasCostWei));
  
  // Approximate USD (Base gas is very cheap, ~$0.001-0.01)
  const ethPrice = 2500; // Rough ETH price - could be fetched from oracle
  const gasCostUsd = gasCostEth * ethPrice;

  // Calculate burn fee if amount provided
  const amountNum = amount ? parseFloat(amount) : 0;
  const burnFee = amountNum * (burnFeePercent / 100);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <Fuel size={14} />
        <span>Transaction Preview</span>
      </div>

      <div className="space-y-2 text-sm">
        {/* Network Fee */}
        <div className="flex justify-between">
          <span className="text-zinc-500">Network Fee (gas)</span>
          <span className="text-zinc-300">
            ~${gasCostUsd < 0.01 ? '<0.01' : gasCostUsd.toFixed(2)}
          </span>
        </div>

        {/* Burn Fee (if applicable) */}
        {burnFeePercent > 0 && amountNum > 0 && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Burn Fee ({burnFeePercent}%)</span>
            <span className="text-zinc-300">
              {burnFee.toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-zinc-800 pt-2">
          <div className="flex justify-between font-medium">
            <span className="text-zinc-400">Total Cost</span>
            <div className="text-right">
              <div className="text-zinc-200">
                ~${gasCostUsd < 0.01 ? '<0.01' : gasCostUsd.toFixed(2)} gas
                {burnFeePercent > 0 && amountNum > 0 && (
                  <span> + {burnFee.toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Speed indicator */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span>~2 sec confirmation on Base</span>
      </div>
    </div>
  );
}

/**
 * Compact inline gas estimate for buttons
 */
export function GasEstimate({ gasEstimate }: { gasEstimate?: bigint }) {
  const { data: gasPrice } = useGasPrice();

  const estimatedGas = gasEstimate || BigInt(100000);
  const gasCostWei = gasPrice ? estimatedGas * gasPrice : BigInt(0);
  const gasCostEth = parseFloat(formatEther(gasCostWei));
  const gasCostUsd = gasCostEth * 2500;

  return (
    <span className="text-xs text-zinc-500">
      (~${gasCostUsd < 0.01 ? '<0.01' : gasCostUsd.toFixed(2)} gas)
    </span>
  );
}
