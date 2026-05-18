'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  ChevronDown,
  ChevronUp,
  Shield,
  Fuel,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { formatEther, formatUnits, type Address, type Hex } from 'viem';
import { useAccount, useBalance, useEstimateFeesPerGas } from 'wagmi';
import { useChainId } from 'wagmi';
import { useOptionalPreferences } from '@/lib/preferences/userPreferences';
import { formatConvertedUsd } from '@/lib/price-utils';
import { getExplorerLink } from '@/components/ui/EtherscanLink';

// ==================== TYPES ====================

export interface TransactionDetails {
  to: Address;
  from?: Address;
  value?: bigint;
  data?: Hex;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  returnData?: Hex;
  error?: string;
  logs?: Array<{
    address: Address;
    topics: Hex[];
    data: Hex;
  }>;
  stateChanges?: Array<{
    address: Address;
    key: string;
    before: string;
    after: string;
  }>;
}

export interface RiskWarning {
  level: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
}

export interface TransactionPreviewProps {
  transaction: TransactionDetails;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  recipientLabel?: string;
  actionLabel?: string;
  showAdvanced?: boolean;
  allowlistedRecipients?: string[];
}

// ==================== UTILITIES ====================

const formatGwei = (wei: bigint): string => {
  return formatUnits(wei, 9);
};

const formatUSD = (eth: number, ethPrice: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eth * ethPrice);
};

const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const decodeTransactionIntent = (tx: TransactionDetails): string => {
  if (!tx.data || tx.data === '0x') return 'Native asset transfer';
  const selector = tx.data.slice(0, 10).toLowerCase();
  if (selector === '0xa9059cbb') return 'ERC-20 transfer';
  if (selector === '0x095ea7b3') return 'ERC-20 token approval';
  if (selector === '0x23b872dd') return 'ERC-20 transferFrom';
  return `Contract call (${selector})`;
};

const getRiskLevelColor = (level: RiskWarning['level']): string => {
  switch (level) {
    case 'low': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'high': return 'text-orange-400';
    case 'critical': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

const getRiskLevelBg = (level: RiskWarning['level']): string => {
  switch (level) {
    case 'low': return 'bg-green-500/10 border-green-500/20';
    case 'medium': return 'bg-yellow-500/10 border-yellow-500/20';
    case 'high': return 'bg-orange-500/10 border-orange-500/20';
    case 'critical': return 'bg-red-500/10 border-red-500/20';
    default: return 'bg-gray-500/10 border-gray-500/20';
  }
};

// ==================== HOOKS ====================

function useTransactionSimulation(tx: TransactionDetails) {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSimulating(false);
    setSimulation(null);
    setError('Transaction simulation backend is not configured');
  }, [tx]);

  return { simulation, isSimulating, error };
}

function useRiskAnalysis(tx: TransactionDetails, allowlistedRecipients: string[] = []): RiskWarning[] {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });

  return useMemo(() => {
    const warnings: RiskWarning[] = [];

    // Check if sending to new address
    if (tx.to) {
      const allowlisted = allowlistedRecipients.map((a) => a.toLowerCase()).includes(tx.to.toLowerCase());
      if (!allowlisted) {
        warnings.push({
          level: 'high',
          title: 'Recipient not in allowlist',
          description: 'The recipient is not in your trusted allowlist.',
          recommendation: 'Confirm destination address out-of-band before signing.',
        });
      }

      // In production, check address history
      warnings.push({
        level: 'low',
        title: 'First interaction',
        description: 'This is your first transaction to this address.',
        recommendation: 'Double-check the address is correct.',
      });
    }

    // Check value
    if (tx.value && tx.value > BigInt(0)) {
      const valueInEth = parseFloat(formatEther(tx.value));
      
      if (valueInEth > 1) {
        warnings.push({
          level: 'medium',
          title: 'Large transaction',
          description: `You are sending ${valueInEth.toFixed(4)} ETH.`,
          recommendation: 'Verify the amount is correct before confirming.',
        });
      }

      if (valueInEth > 10) {
        warnings.push({
          level: 'high',
          title: 'Very large transaction',
          description: `You are sending ${valueInEth.toFixed(4)} ETH.`,
          recommendation: 'Consider sending a small test transaction first.',
        });
      }
    }

    // Check contract interaction
    if (tx.data && tx.data !== '0x') {
      const selector = tx.data.slice(0, 10).toLowerCase();
      if (selector === '0x095ea7b3') {
        warnings.push({
          level: 'critical',
          title: 'Token approval detected',
          description: 'This can grant spending permission to another contract.',
          recommendation: 'Use limited allowance and verify spender contract.',
        });
      }

      warnings.push({
        level: 'low',
        title: 'Contract interaction',
        description: 'This transaction interacts with a smart contract.',
        recommendation: 'Make sure you trust this contract.',
      });
    }

    // Check balance sufficiency
    if (balance && tx.value) {
      const totalCost = tx.value + (tx.gasLimit || BigInt(21000)) * (tx.maxFeePerGas || BigInt(0));
      if (totalCost > balance.value) {
        warnings.push({
          level: 'critical',
          title: 'Insufficient balance',
          description: 'You do not have enough funds to complete this transaction.',
        });
      }
    }

    return warnings;
  }, [tx, balance, allowlistedRecipients]);
}

// ==================== COMPONENTS ====================

interface WarningCardProps {
  warning: RiskWarning;
}

const WarningCard: React.FC<WarningCardProps> = ({ warning }) => {
  const [expanded, setExpanded] = useState(false);
  
  const Icon = warning.level === 'critical' ? XCircle : 
               warning.level === 'high' ? AlertTriangle :
               warning.level === 'medium' ? AlertCircle : Info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-3 ${getRiskLevelBg(warning.level)}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 ${getRiskLevelColor(warning.level)}`} />
          <div>
            <p className={`font-medium ${getRiskLevelColor(warning.level)}`}>
              {warning.title}
            </p>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="text-sm text-gray-400 mt-1">{warning.description}</p>
                {warning.recommendation && (
                  <p className="text-sm text-gray-300 mt-2">
                    💡 {warning.recommendation}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 mt-1" />
        )}
      </button>
    </motion.div>
  );
};

interface GasEstimateProps {
  gasLimit: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  ethPrice?: number;
}

const GasEstimate: React.FC<GasEstimateProps> = ({ 
  gasLimit, 
  maxFeePerGas, 
  maxPriorityFeePerGas,
  ethPrice = 3000 
}) => {
  const estimatedGas = gasLimit * (maxFeePerGas || BigInt(0));
  const estimatedGasEth = parseFloat(formatEther(estimatedGas));
  const estimatedGasUsd = formatUSD(estimatedGasEth, ethPrice);

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Fuel className="w-5 h-5 text-blue-400" />
        <span className="font-medium text-gray-200">Gas Estimate</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Gas Limit</span>
          <span className="text-gray-200 font-mono">{gasLimit.toString()}</span>
        </div>
        
        {maxFeePerGas && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Max Fee</span>
            <span className="text-gray-200 font-mono">
              {formatGwei(maxFeePerGas)} Gwei
            </span>
          </div>
        )}
        
        {maxPriorityFeePerGas && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Priority Fee</span>
            <span className="text-gray-200 font-mono">
              {formatGwei(maxPriorityFeePerGas)} Gwei
            </span>
          </div>
        )}

        <div className="pt-2 border-t border-gray-700 mt-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Estimated Cost</span>
            <div className="text-right">
              <p className="text-gray-200 font-medium">
                {estimatedGasEth.toFixed(6)} ETH
              </p>
              <p className="text-xs text-gray-500">
                {estimatedGasUsd}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export const TransactionPreview: React.FC<TransactionPreviewProps> = ({
  transaction,
  onConfirm,
  onCancel,
  isLoading = false,
  recipientLabel,
  actionLabel = 'Send Transaction',
  showAdvanced = false,
  allowlistedRecipients = [],
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(showAdvanced);
  const [intentConfirmed, setIntentConfirmed] = useState(false);
  const { address } = useAccount();
  const chainId = useChainId();
  const { preferences } = useOptionalPreferences();
  const { data: balance } = useBalance({ address });
  const { data: feeData } = useEstimateFeesPerGas();
  
  const { simulation, isSimulating, error: simulationError } = useTransactionSimulation(transaction);
  const warnings = useRiskAnalysis(transaction, allowlistedRecipients);
  const intentSummary = decodeTransactionIntent(transaction);

  const maxFeePerGas = transaction.maxFeePerGas || feeData?.maxFeePerGas || BigInt(0);
  const maxPriorityFeePerGas = transaction.maxPriorityFeePerGas || feeData?.maxPriorityFeePerGas || BigInt(0);
  const gasLimit = simulation?.gasUsed || transaction.gasLimit || BigInt(21000);

  const totalCost = (transaction.value || BigInt(0)) + gasLimit * maxFeePerGas;
  const totalCostEth = parseFloat(formatEther(totalCost));
  const preferredCurrency = (preferences.preferredCurrency || 'USD').toUpperCase();

  const hasBlockingWarnings = warnings.some(w => w.level === 'critical');
  const requiresManualIntentConfirmation = warnings.some((w) => w.level === 'high' || w.level === 'critical');


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-gray-900 rounded-xl shadow-2xl border border-gray-800 max-w-md w-full overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Wallet className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              Transaction Preview
            </h2>
            <p className="text-sm text-gray-400">Review before confirming</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* From/To */}
        <div className="space-y-3">
          {/* From */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 mb-1">From</p>
              <p className="font-mono text-gray-200">
                {address ? truncateAddress(address) : 'Unknown'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Balance</p>
              <p className="text-gray-300">
                {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0'} ETH
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </div>

          {/* To */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">To</p>
                {recipientLabel && (
                  <p className="text-gray-200 font-medium">{recipientLabel}</p>
                )}
                <p className="font-mono text-sm text-gray-400">
                  {truncateAddress(transaction.to)}
                </p>
              </div>
              <a
                href={getExplorerLink(chainId, transaction.to, 'address')}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            </div>
          </div>
        </div>

        {/* Value */}
        {transaction.value && transaction.value > BigInt(0) && (
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
            <p className="text-xs text-gray-400 mb-1">Amount</p>
            <p className="text-2xl font-bold text-gray-100">
              {parseFloat(formatEther(transaction.value)).toFixed(6)} ETH
            </p>
            <p className="text-sm text-gray-500">
              ≈ {formatUSD(parseFloat(formatEther(transaction.value)), 3000)}
              {preferredCurrency !== 'USD' ? ` / ${formatConvertedUsd(parseFloat(formatEther(transaction.value)) * 3000, preferredCurrency)}` : ''}
            </p>
          </div>
        )}

        <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-500 mb-1">Intent</p>
          <p className="text-sm text-gray-200 font-medium">{intentSummary}</p>
          {warnings.some((w) => w.level === 'high' || w.level === 'critical') && (
            <p className="text-xs text-amber-400 mt-1">High-risk transaction: hardware wallet and passkey re-auth are strongly recommended.</p>
          )}
        </div>

        {/* Simulation Status */}
        <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
          {isSimulating ? (
            <>
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-gray-400">Simulating transaction...</span>
            </>
          ) : simulationError ? (
            <>
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span className="text-gray-300">{simulationError}</span>
            </>
          ) : simulation?.success ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-gray-300">Transaction simulation successful</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-gray-300">Simulation failed: {simulation?.error || 'Unknown error'}</span>
            </>
          )}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-400">
                Security Checks ({warnings.length})
              </span>
            </div>
            <AnimatePresence>
              {warnings.map((warning, index) => (
                <WarningCard key={`${warning.level}-${warning.title}-${index}`} warning={warning} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Gas Estimate */}
        <GasEstimate
          gasLimit={gasLimit}
          maxFeePerGas={maxFeePerGas}
          maxPriorityFeePerGas={maxPriorityFeePerGas}
        />

        {/* Advanced Details */}
        <div>
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            {isAdvancedOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Advanced Details
          </button>
          
          <AnimatePresence>
            {isAdvancedOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2 text-sm"
              >
                {transaction.data && transaction.data !== '0x' && (
                  <div>
                    <p className="text-gray-500 mb-1">Data</p>
                    <p className="font-mono text-xs text-gray-400 bg-gray-800 p-2 rounded break-all">
                      {transaction.data.slice(0, 66)}...
                    </p>
                  </div>
                )}
                
                {transaction.nonce !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nonce</span>
                    <span className="text-gray-300 font-mono">{transaction.nonce}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Chain ID</span>
                  <span className="text-gray-300 font-mono">{chainId}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Total Cost */}
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-gray-400">Total Cost</span>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-100">
                {totalCostEth.toFixed(6)} ETH
              </p>
              <p className="text-sm text-gray-500">
                {formatUSD(totalCostEth, 3000)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading || isSimulating || hasBlockingWarnings || (requiresManualIntentConfirmation && !intentConfirmed)}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {actionLabel}
              </>
            )}
          </button>
        </div>

        {requiresManualIntentConfirmation && (
          <label className="flex items-start gap-2 text-xs text-gray-300 pt-1">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={intentConfirmed}
              onChange={(e) => setIntentConfirmed(e.target.checked)}
            />
            <span>I verified recipient, amount, and transaction intent. I understand this action may require cooldown and extra authentication.</span>
          </label>
        )}
      </div>
    </motion.div>
  );
};

export default TransactionPreview;
