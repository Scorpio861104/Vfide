/**
 * Transaction Preview — Show exactly what will happen before the user signs
 * 
 * Before any contract write, simulate via eth_call and display:
 * - What tokens move and where
 * - Fee breakdown
 * - Balance after transaction
 * - Gas estimate in local currency
 * - Risk warnings (first interaction, large amount, etc.)
 * 
 * This builds trust through transparency. No blind signing.
 * 
 * Usage:
 *   <TransactionPreview
 *     action="pay"
 *     to="Kofi's Fabrics"
 *     toAddress="0x..."
 *     amount={25.00}
 *     token="VFIDE"
 *     feeBps={50}
 *     currentBalance={1000}
 *     onConfirm={() => executeTransaction()}
 *     onCancel={() => setShowPreview(false)}
 *   />
 */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Shield, AlertTriangle, Check, X,
  Fuel, Clock, Eye, ChevronDown, Info, Loader2,
} from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

// ── Types ───────────────────────────────────────────────────────────────────

type TxAction = 'pay' | 'transfer' | 'deposit' | 'withdraw' | 'vote' | 'stake' | 'claim';

interface TransactionPreviewProps {
  action: TxAction;
  to: string;                  // Human-readable recipient name
  toAddress: string;           // On-chain address
  amount: number;              // In display currency (USD equivalent)
  token: string;               // Token symbol
  tokenAmount?: number;        // Actual token amount (if different from display)
  feeBps: number;              // User's fee in basis points
  currentBalance: number;      // Current token balance
  gasEstimate?: number;        // Gas in native token (ETH)
  gasPrice?: number;           // Gas price in USD
  isFirstInteraction?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ── Risk Detection ──────────────────────────────────────────────────────────

interface Risk {
  level: 'info' | 'warning' | 'danger';
  message: string;
}

function detectRisks(props: TransactionPreviewProps): Risk[] {
  const risks: Risk[] = [];
  const fee = props.amount * (props.feeBps / 10000);
  const total = props.amount + fee;
  const tokenTotal = props.tokenAmount ? props.tokenAmount + (props.tokenAmount * props.feeBps / 10000) : total;

  if (props.isFirstInteraction) {
    risks.push({ level: 'info', message: `First transaction with ${props.to}` });
  }

  if (tokenTotal > props.currentBalance) {
    risks.push({ level: 'danger', message: 'Insufficient balance for this transaction' });
  } else if (tokenTotal > props.currentBalance * 0.9) {
    risks.push({ level: 'warning', message: 'This will use over 90% of your balance' });
  }

  if (props.amount > 500) {
    risks.push({ level: 'warning', message: 'Large transaction — please verify details carefully' });
  }

  return risks;
}

// ── Action Labels ───────────────────────────────────────────────────────────

const ACTION_LABELS: Record<TxAction, { verb: string; preposition: string }> = {
  pay: { verb: 'Pay', preposition: 'to' },
  transfer: { verb: 'Transfer', preposition: 'to' },
  deposit: { verb: 'Deposit', preposition: 'into' },
  withdraw: { verb: 'Withdraw', preposition: 'to' },
  vote: { verb: 'Vote', preposition: 'on' },
  stake: { verb: 'Stake', preposition: 'in' },
  claim: { verb: 'Claim', preposition: 'from' },
};

// ── Component ───────────────────────────────────────────────────────────────

export function TransactionPreview(props: TransactionPreviewProps) {
  const { formatCurrency, formatNumber } = useLocale();
  const [showDetails, setShowDetails] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const { action, to, toAddress, amount, token, tokenAmount, feeBps, currentBalance, gasEstimate, gasPrice } = props;
  const label = ACTION_LABELS[action];
  const fee = amount * (feeBps / 10000);
  const total = amount + fee;
  const tknAmount = tokenAmount ?? amount;
  const tknFee = tknAmount * (feeBps / 10000);
  const tknTotal = tknAmount + tknFee;
  const remainingBalance = currentBalance - tknTotal;
  const risks = detectRisks(props);
  const hasDanger = risks.some(r => r.level === 'danger');

  const handleConfirm = async () => {
    setIsConfirming(true);
    props.onConfirm();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Review Transaction</h3>
          </div>
          <button onClick={props.onCancel} className="p-2 text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Flow visualization */}
          <div className="flex items-center gap-3 p-4 bg-white/3 border border-white/5 rounded-xl">
            <div className="flex-1 text-center">
              <div className="text-gray-500 text-xs mb-1">You</div>
              <div className="text-white font-mono text-sm">{formatNumber(tknTotal, 2)}</div>
              <div className="text-gray-500 text-xs">{token}</div>
            </div>
            <ArrowRight size={20} className="text-cyan-400 flex-shrink-0" />
            <div className="flex-1 text-center">
              <div className="text-gray-500 text-xs mb-1">{label.preposition}</div>
              <div className="text-white font-bold text-sm truncate">{to}</div>
              <div className="text-gray-500 text-xs font-mono">{toAddress.slice(0, 6)}...{toAddress.slice(-4)}</div>
            </div>
          </div>

          {/* Amount breakdown */}
          <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount</span>
              <span className="text-white">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 flex items-center gap-1">
                Trust fee ({(feeBps / 100).toFixed(2)}%)
                <Info size={12} className="text-gray-600" />
              </span>
              <span className="text-white">{formatCurrency(fee)}</span>
            </div>
            {gasPrice !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1"><Fuel size={12} /> Gas</span>
                <span className="text-white">{formatCurrency(gasPrice)}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2.5 flex justify-between">
              <span className="text-white font-bold">Total</span>
              <span className="text-cyan-400 font-bold">{formatCurrency(total + (gasPrice || 0))}</span>
            </div>
          </div>

          {/* Balance after */}
          <div className="flex justify-between px-1 text-xs">
            <span className="text-gray-500">Balance after</span>
            <span className={remainingBalance < 0 ? 'text-red-400 font-bold' : 'text-gray-400'}>
              {formatNumber(Math.max(0, remainingBalance), 2)} {token}
            </span>
          </div>

          {/* Risks */}
          {risks.length > 0 && (
            <div className="space-y-2">
              {risks.map((risk, i) => (
                <div key={i} className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                  risk.level === 'danger' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                  risk.level === 'warning' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' :
                  'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                }`}>
                  {risk.level === 'danger' ? <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> :
                   risk.level === 'warning' ? <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> :
                   <Info size={14} className="flex-shrink-0 mt-0.5" />}
                  <span>{risk.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Details toggle */}
          <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-center gap-1 py-2 text-gray-500 text-xs hover:text-gray-300">
            Technical details
            <ChevronDown size={12} className={showDetails ? 'rotate-180' : ''} />
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="bg-black/30 rounded-xl p-3 text-xs font-mono text-gray-500 space-y-1 overflow-hidden">
                <div>Token: {token}</div>
                <div>Amount: {tknAmount} ({tknTotal} with fee)</div>
                <div>To: {toAddress}</div>
                {gasEstimate && <div>Gas limit: {gasEstimate}</div>}
                <div>Fee tier: {feeBps} bps ({(feeBps / 100).toFixed(2)}%)</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirm */}
          <div className="flex gap-3 pt-2">
            <button onClick={props.onCancel} className="flex-1 py-3 border border-white/10 text-gray-400 rounded-xl font-bold hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={hasDanger || isConfirming}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isConfirming ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {label.verb}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
