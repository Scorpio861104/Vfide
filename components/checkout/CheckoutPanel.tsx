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

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Shield, Check, Loader2, Info, Printer, Smartphone } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';
import CouponInput from '@/components/checkout/CouponInput';
import TipSelector from '@/components/checkout/TipSelector';
import { writePaymentNFC, isNFCSupported } from '@/lib/nfc';
import { printReceipt, isPrinterSupported } from '@/lib/printer';

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

interface LoyaltyProgramSnapshot {
  name: string;
  stampsRequired: number;
  rewardDescription: string;
  active: boolean;
}

interface LoyaltyProgressSnapshot {
  stamps: number;
  rewardsEarned: number;
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
  const { formatCurrency } = useLocale();
  const [selectedToken, setSelectedToken] = useState<string>('VFIDE');
  const [isPaying, setIsPaying] = useState(false);
  const [step, setStep] = useState<'review' | 'paying' | 'complete'>('review');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponStatus, setCouponStatus] = useState<string | null>(null);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgramSnapshot | null>(null);
  const [loyaltyProgress, setLoyaltyProgress] = useState<LoyaltyProgressSnapshot | null>(null);
  const [receiptPhone, setReceiptPhone] = useState('');
  const [receiptStatus, setReceiptStatus] = useState<string | null>(null);
  const [isSendingReceipt, setIsSendingReceipt] = useState(false);

  // Update token rates with live price
  const tokens = useMemo(() =>
    PAYMENT_TOKENS.map(t => t.symbol === 'VFIDE' ? { ...t, rate: tokenPrice } : t),
    [tokenPrice]
  );

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const feeAmount = subtotal * (buyerFeeBps / 10000);
  const totalBeforeDiscount = subtotal + feeAmount + tipAmount;
  const total = Math.max(0, totalBeforeDiscount - couponDiscount);

  const activeToken = tokens.find(t => t.symbol === selectedToken) ?? tokens[0] ?? PAYMENT_TOKENS[0]!;
  const tokenAmount = total / activeToken.rate;
  const merchantSlug = useMemo(
    () => merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'merchant',
    [merchantName]
  );
  const currentLoyaltyStamps = loyaltyProgress?.stamps ?? 0;
  const stampsRemaining = loyaltyProgram
    ? (() => {
        const required = Math.max(1, loyaltyProgram.stampsRequired);
        const remainder = currentLoyaltyStamps % required;
        return remainder === 0 && currentLoyaltyStamps > 0 ? 0 : required - remainder;
      })()
    : null;

  const feeSavedVsSquare = subtotal * 0.029 + 0.30; // Square's 2.9% + $0.30

  useEffect(() => {
    if (typeof fetch !== 'function') return;

    const params = new URLSearchParams({ merchant: merchantAddress });
    if (address) params.set('customer', address);

    fetch(`/api/merchant/loyalty?${params.toString()}`)
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.program) {
          setLoyaltyProgram(null);
          setLoyaltyProgress(null);
          return;
        }

        setLoyaltyProgram({
          name: String(data.program.name || 'Rewards'),
          stampsRequired: Number(data.program.stampsRequired ?? 10),
          rewardDescription: String(data.program.rewardDescription || 'Reward unlocked'),
          active: Boolean(data.program.active),
        });
        setLoyaltyProgress(data.progress ? {
          stamps: Number(data.progress.stamps ?? 0),
          rewardsEarned: Number(data.progress.rewardsEarned ?? 0),
        } : null);
      })
      .catch(() => {
        setLoyaltyProgram(null);
        setLoyaltyProgress(null);
      });
  }, [address, merchantAddress]);

  const applyCoupon = async (code: string) => {
    if (!code.trim() || typeof fetch !== 'function') {
      setCouponStatus('Enter a promo code to apply it.');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const normalizedCode = code.trim().toUpperCase();
      const params = new URLSearchParams({
        code: normalizedCode,
        merchant: merchantAddress,
        amount: subtotal.toString(),
      });
      if (address) params.set('customer', address);

      const response = await fetch(`/api/merchant/coupons/validate?${params.toString()}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.valid) {
        setCouponDiscount(0);
        setAppliedCouponCode(null);
        setCouponStatus(data?.reason || 'Promo code is not valid for this checkout.');
        return;
      }

      setCouponDiscount(Number(data.discount ?? 0));
      setAppliedCouponCode(normalizedCode);
      setCouponStatus(`Promo applied — you saved ${formatCurrency(Number(data.discount ?? 0))}.`);
    } catch {
      setCouponStatus('Unable to validate promo code right now.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!isPrinterSupported()) {
      setReceiptStatus('Bluetooth receipt printing is not available on this device.');
      return;
    }

    const result = await printReceipt({
      merchantName,
      items: items.map(({ name, qty, price }) => ({ name, qty, price })),
      subtotal,
      tip: tipAmount > 0 ? tipAmount : undefined,
      total,
      txHash: txHash ?? undefined,
      paymentMethod: activeToken.symbol,
    });

    setReceiptStatus(
      result.success
        ? 'Receipt sent to your paired printer.'
        : `Could not print the receipt. ${result.error ?? ''}`.trim()
    );
  };

  const handleWriteNfc = async () => {
    if (!isNFCSupported()) {
      setReceiptStatus('NFC tap-to-pay is not supported on this device.');
      return;
    }

    const result = await writePaymentNFC(merchantSlug, Number(total.toFixed(2)), activeToken.symbol);
    setReceiptStatus(
      result.success
        ? 'Tap-to-pay checkout details were written to the NFC tag.'
        : `Could not write the NFC tag. ${result.error ?? ''}`.trim()
    );
  };

  const handleSendSmsReceipt = async () => {
    if (!receiptPhone.trim()) {
      setReceiptStatus('Enter a phone number to text the receipt.');
      return;
    }

    if (typeof fetch !== 'function') {
      setReceiptStatus('SMS receipt is not available in this environment.');
      return;
    }

    setIsSendingReceipt(true);
    try {
      const response = await fetch('/api/merchant/receipts/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: receiptPhone.trim(),
          merchantName,
          amount: total.toFixed(2),
          currency: activeToken.symbol,
          txHash: txHash ?? undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setReceiptStatus(data?.error || 'Unable to send the SMS receipt right now.');
        return;
      }

      setReceiptStatus(`Receipt text sent via ${data.provider}.`);
    } catch {
      setReceiptStatus('Unable to send the SMS receipt right now.');
    } finally {
      setIsSendingReceipt(false);
    }
  };

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
      setReceiptStatus('Payment confirmed. Print, tap, or text a receipt below.');
      onComplete?.(hash);
    } catch {
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

            {loyaltyProgram?.active && (
              <div className="mb-4 rounded-xl border border-pink-500/20 bg-pink-500/5 p-4">
                <div className="text-sm font-semibold text-pink-300">{loyaltyProgram.name}</div>
                <div className="mt-1 text-white">
                  {currentLoyaltyStamps}/{loyaltyProgram.stampsRequired} stamps collected
                </div>
                <div className="text-xs text-gray-400">
                  {stampsRemaining ?? loyaltyProgram.stampsRequired} more for {loyaltyProgram.rewardDescription}
                  {Number(loyaltyProgress?.rewardsEarned ?? 0) > 0 ? ` · ${loyaltyProgress?.rewardsEarned} reward${loyaltyProgress?.rewardsEarned === 1 ? '' : 's'} earned` : ''}
                </div>
              </div>
            )}

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
              {tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tip</span>
                  <span className="text-white">{formatCurrency(tipAmount)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Promo discount{appliedCouponCode ? ` (${appliedCouponCode})` : ''}</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
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

            <div className="mb-4 space-y-4">
              <TipSelector subtotal={subtotal} currency={activeToken.symbol} onChange={setTipAmount} />
              <CouponInput
                onApply={applyCoupon}
                isApplying={isApplyingCoupon}
                error={couponDiscount > 0 ? null : couponStatus}
                appliedCode={appliedCouponCode}
              />
              {couponStatus && couponDiscount > 0 ? (
                <div className="text-xs text-emerald-400">{couponStatus}</div>
              ) : null}
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={!isConnected || isPaying}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPaying ? <Loader2 size={22} className="animate-spin" /> : <Wallet size={22} />}
              {isPaying ? 'Processing…' : `Pay ${formatCurrency(total)}`}
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

            <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/5 p-4 text-left">
              <div className="mb-3 text-sm font-semibold text-white">Share or keep your receipt</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white transition hover:border-cyan-400/40 hover:text-cyan-200"
                >
                  <Printer size={16} />
                  Print receipt
                </button>
                <button
                  type="button"
                  onClick={handleWriteNfc}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white transition hover:border-cyan-400/40 hover:text-cyan-200"
                >
                  <Smartphone size={16} />
                  Write tap-to-pay
                </button>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={receiptPhone}
                  onChange={(event) => setReceiptPhone(event.target.value)}
                  placeholder="+233 50 123 4567"
                  className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/50"
                />
                <button
                  type="button"
                  onClick={handleSendSmsReceipt}
                  disabled={isSendingReceipt}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  {isSendingReceipt ? 'Sending…' : 'Text receipt'}
                </button>
              </div>

              {receiptStatus ? (
                <div className="mt-3 text-xs text-cyan-200">{receiptStatus}</div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
