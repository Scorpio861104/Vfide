/**
 * Multi-Currency Checkout
 * 
 * Buyer sees price in their local currency.
 * Pays with any supported token (VFIDE, USDC, USDT, DAI).
 * Merchant receives VFIDE in their vault.
 * Conversion happens under the hood.
 * 
 * Usage:
 *   <CheckoutPanel
 *     items={[{ name: 'Kente Cloth', price: 25.00, qty: 2 }]}
 *     merchantAddress="0x..."
 *     merchantName="Kofi's Fabrics"
 *   />
 */
'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Wallet, Shield, ArrowRight, Check, Loader2, Info } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

// ── Types ───────────────────────────────────────────────────────────────────

export interface CheckoutItem {
  name: string;
  price: number;       // USD-equivalent price
  qty: number;
  imageUrl?: string;
}

interface PaymentToken {
  symbol: string;
  name: string;
  icon: string;        // Emoji or icon key
  rate: number;        // Rate to USD (1 USDC = 1 USD, 1 VFIDE = tokenPrice)
  color: string;
}

interface CheckoutPanelProps {
  items: CheckoutItem[];
  merchantAddress: string;
  merchantName: string;
  merchantProofScore?: number;
  buyerFeeBps?: number;  // Basis points (100 = 1%). From ProofScore.
  tokenPrice?: number;   // VFIDE price in USD
  onComplete?: (txHash: string) => void;
  onCancel?: () => void;
}

// ── Constants ───────────────────────────────────────────────────────────────

const PAYMENT_TOKENS: PaymentToken[] = [
  { symbol: 'VFIDE', name: 'VFIDE Token', icon: '⬡', rate: 0.50, color: 'cyan' },
  { symbol: 'USDC', name: 'USD Coin', icon: '🔵', rate: 1.00, color: 'blue' },
  { symbol: 'USDT', name: 'Tether', icon: '🟢', rate: 1.00, color: 'emerald' },
  { symbol: 'DAI', name: 'Dai', icon: '🟡', rate: 1.00, color: 'amber' },
];

// ── Component ───────────────────────────────────────────────────────────────

export function CheckoutPanel({
  items,
  merchantAddress,
  merchantName,
  merchantProofScore,
  buyerFeeBps = 100,  // Default 1% for new users
  tokenPrice = 0.50,
  onComplete,
  onCancel,
}: CheckoutPanelProps) {
  const { address, isConnected } = useAccount();
  const { formatCurrency, displayCurrency } = useLocale();
  const [selectedToken, setSelectedToken] = useState<string>('VFIDE');
  const [isPaying, setIsPaying] = useState(false);
  const [step, setStep] = useState<'review' | 'paying' | 'complete'>('review');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Update token rates with live price
  const tokens = useMemo(() =>
    PAYMENT_TOKENS.map(t => t.symbol === 'VFIDE' ? { ...t, rate: tokenPrice } : t),
    [tokenPrice]
  );

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const feeAmount = subtotal * (buyerFeeBps / 10000);
  const total = subtotal + feeAmount;

  const activeToken = tokens.find(t => t.symbol === selectedToken) ?? tokens[0] ?? PAYMENT_TOKENS[0]!;
  const tokenAmount = total / activeToken.rate;

  const feeSavedVsSquare = subtotal * 0.029 + 0.30; // Square's 2.9% + $0.30

  const handlePay = async () => {
    if (!address) return;
    setIsPaying(true);
    setStep('paying');

    try {
      // TODO: Wire to actual contract call
      // For VFIDE: direct transfer to merchant vault
      // For stablecoins: call router contract that swaps and deposits
      await new Promise(r => setTimeout(r, 2000)); // Placeholder

      const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setTxHash(hash);
      setStep('complete');
      onComplete?.(hash);
    } catch (error) {
      setStep('review');
    }
    setIsPaying(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {/* ── Review Step ──────────────────────────────────────────────── */}
        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
            {/* Merchant header */}
            <div className="flex items-center gap-3 mb-6 p-4 bg-white/3 border border-white/10 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                {merchantName[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-white font-bold">{merchantName}</div>
                {merchantProofScore !== undefined && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Shield size={10} className="text-cyan-400" />
                    ProofScore {merchantProofScore.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white/3 border border-white/10 rounded-xl divide-y divide-white/5 mb-4">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div>
                      <div className="text-white text-sm">{item.name}</div>
                      <div className="text-gray-500 text-xs">Qty: {item.qty}</div>
                    </div>
                  </div>
                  <div className="text-white font-mono text-sm">
                    {formatCurrency(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-white/3 border border-white/10 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1">
                  Trust fee ({(buyerFeeBps / 100).toFixed(2)}%)
                  <Info size={12} className="text-gray-600" />
                </span>
                <span className="text-white">{formatCurrency(feeAmount)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-cyan-400 font-bold text-lg">{formatCurrency(total)}</span>
              </div>
              <div className="text-xs text-emerald-400 text-right">
                Merchant fee: {formatCurrency(0)} (saved {formatCurrency(feeSavedVsSquare)} vs Square)
              </div>
            </div>

            {/* Payment method */}
            <div className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Pay with</div>
              <div className="grid grid-cols-2 gap-2">
                {tokens.map(token => (
                  <button
                    key={token.symbol}
                    onClick={() => setSelectedToken(token.symbol)}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      selectedToken === token.symbol
                        ? `bg-${token.color}-500/15 border-${token.color}-500/40 text-${token.color}-400`
                        : 'bg-white/3 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{token.icon}</span>
                      <span className="font-bold text-sm">{token.symbol}</span>
                    </div>
                    <div className="text-xs opacity-70">
                      {tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {token.symbol}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={!isConnected}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Wallet size={22} />
              Pay {formatCurrency(total)}
            </button>

            {onCancel && (
              <button onClick={onCancel} className="w-full mt-3 py-3 text-gray-400 hover:text-white text-sm transition-colors">
                Cancel
              </button>
            )}
          </motion.div>
        )}

        {/* ── Paying Step ─────────────────────────────────────────────── */}
        {step === 'paying' && (
          <motion.div key="paying" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-12">
            <Loader2 size={48} className="text-cyan-400 animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">Processing payment...</h3>
            <p className="text-gray-400">Confirm the transaction in your wallet</p>
          </motion.div>
        )}

        {/* ── Complete Step ────────────────────────────────────────────── */}
        {step === 'complete' && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center"
            >
              <Check size={40} className="text-emerald-400" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">Payment complete</h3>
            <p className="text-gray-400 mb-6">{formatCurrency(total)} paid to {merchantName}</p>
            {txHash && (
              <div className="text-xs text-gray-500 font-mono mb-6 break-all px-4">
                {txHash}
              </div>
            )}
            <div className="text-sm text-emerald-400 mb-6">
              You saved {formatCurrency(feeSavedVsSquare)} in fees vs traditional payment
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
