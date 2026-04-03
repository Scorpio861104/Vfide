'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, Shield } from 'lucide-react';
import { useAccount } from 'wagmi';
import { isAddress, verifyMessage } from 'viem';

import { useToast } from '@/components/ui/toast';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { useEscrow, usePayMerchant, useVfidePrice } from '@/lib/vfide-hooks';
import { buildQrSignatureMessage, parseExpiry } from '@/lib/payments/qrSignature';
import { safeParseFloat } from '@/lib/validation';

const settlementMessaging = (settlement: 'instant' | 'escrow') => {
  if (settlement === 'instant') {
    return {
      banner: 'Instant settlement enabled',
      badge: 'INSTANT',
      summary: 'Funds settle directly with the merchant after signature validation.',
      method: 'Instant settlement',
      noticeTitle: 'Direct payment path',
      noticeText: 'Use this for low-risk purchases where immediate merchant settlement is preferred.',
    };
  }

  return {
    banner: 'Escrow protection enabled',
    badge: 'ESCROW',
    summary: 'Funds remain escrow-protected until the order is fulfilled or released.',
    method: 'Escrow protected',
    noticeTitle: 'Protected settlement path',
    noticeText: 'Recommended for higher-trust purchases or deliveries that require a release step.',
  };
};

export function PayContent() {
  const searchParams = useSearchParams();
  const legacyMerchant = searchParams.get("to");
  const merchant = searchParams.get("merchant") || legacyMerchant || "";
  const requestedAmount = (searchParams.get("amount") || "").trim();
  const [orderId] = useState(() => {
    const fromQuery = searchParams.get("orderId") || searchParams.get("reference");
    return fromQuery?.trim() ? fromQuery.trim() : `QR-${Math.floor(Date.now() / 1000)}`;
  });
  const paymentSource = searchParams.get("source") || "checkout";
  const signature = (searchParams.get('sig') || '').trim();
  const expiryFromQuery = parseExpiry(searchParams.get('exp'));
  const settlementParam = searchParams.get("settlement");
  const settlement =
    settlementParam === "instant" || settlementParam === "escrow"
      ? settlementParam
      : (paymentSource === "qr" ? "instant" : "escrow");
  const [selectedMethod, setSelectedMethod] = useState<'vfide' | 'usdc' | 'usdt'>('vfide');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signatureState, setSignatureState] = useState<'valid' | 'missing' | 'invalid' | 'expired' | 'verifying'>(
    paymentSource === 'qr' ? 'missing' : 'valid'
  );
  const telemetrySentRef = useRef<Set<string>>(new Set());
  const { showToast } = useToast();
  const { isConnected, address } = useAccount();
  const { priceUsd, isLoading: priceLoading } = useVfidePrice();
  const { payMerchant, isPaying, isSuccess: instantSuccess, error: instantError } = usePayMerchant();
  const { createEscrow, loading: isEscrowLoading, isSuccess: escrowSuccess, error: escrowError } = useEscrow();

  const amountVfide = safeParseFloat(requestedAmount, 0);
  const hasValidAmount = amountVfide > 0;
  // Midpoint fee estimate for display only; actual burn depends on ProofScore and contract logic.
  const estimatedBurnFeeVfide = amountVfide * 0.03;
  const usdEstimate = amountVfide * priceUsd;
  const effectiveProcessing = isProcessing || isPaying || isEscrowLoading;
  const combinedError = instantError || escrowError;
  const paymentSuccess = instantSuccess || escrowSuccess;
  const nowEpoch = Math.floor(Date.now() / 1000);
  const qrExpiryInvalid = !expiryFromQuery || expiryFromQuery <= nowEpoch;
  const qrMessage = useMemo(() => {
    if (!merchant || !expiryFromQuery) return null;
    return buildQrSignatureMessage({
      merchant,
      amount: requestedAmount,
      orderId,
      source: paymentSource,
      settlement,
      expiresAt: expiryFromQuery,
    });
  }, [merchant, requestedAmount, orderId, paymentSource, settlement, expiryFromQuery]);

  useEffect(() => {
    let cancelled = false;

    const verifyQrSignature = async () => {
      if (paymentSource !== 'qr') {
        setSignatureState('valid');
        return;
      }
      if (!signature || !expiryFromQuery || !qrMessage) {
        setSignatureState('missing');
        return;
      }
      if (qrExpiryInvalid) {
        setSignatureState('expired');
        return;
      }
      if (!isAddress(merchant)) {
        setSignatureState('invalid');
        return;
      }

      setSignatureState('verifying');
      try {
        const valid = await verifyMessage({
          address: merchant as `0x${string}`,
          message: qrMessage,
          signature: signature as `0x${string}`,
        });
        if (!cancelled) {
          setSignatureState(valid ? 'valid' : 'invalid');
        }
      } catch {
        if (!cancelled) {
          setSignatureState('invalid');
        }
      }
    };

    void verifyQrSignature();

    return () => {
      cancelled = true;
    };
  }, [paymentSource, signature, expiryFromQuery, qrExpiryInvalid, qrMessage, merchant]);

  useEffect(() => {
    if (paymentSource !== 'qr') return;
    if (!['missing', 'invalid', 'expired'].includes(signatureState)) return;

    const eventKey = [signatureState, merchant, requestedAmount, orderId, settlement, String(expiryFromQuery || 0)].join('|');
    if (telemetrySentRef.current.has(eventKey)) return;
    telemetrySentRef.current.add(eventKey);

    const payload = {
      eventType: signatureState,
      merchant,
      amount: requestedAmount,
      orderId,
      source: paymentSource,
      settlement,
      exp: expiryFromQuery,
      sigPrefix: signature ? signature.slice(0, 18) : 'none',
      reason: signatureState === 'missing'
        ? 'qr_signature_missing'
        : signatureState === 'expired'
          ? 'qr_signature_expired'
          : 'qr_signature_invalid',
    };

    if (typeof fetch !== 'function') {
      return;
    }

    void fetch('/api/security/qr-signature-events', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Best-effort telemetry: do not interrupt checkout UX.
    });
  }, [
    signatureState,
    paymentSource,
    merchant,
    requestedAmount,
    orderId,
    settlement,
    expiryFromQuery,
    signature,
  ]);

  const qrReadyForPayment = paymentSource !== 'qr' || signatureState === 'valid';
  const settlementTone = settlementMessaging(settlement);

  const handlePayment = async () => {
    if (!isConnected || !address) {
      showToast('Please connect your wallet first', 'error');
      return;
    }
    
    // Validate merchant address
    const merchantAddress = merchant.includes('...') ? null : merchant;
    if (!merchantAddress || !isAddress(merchantAddress)) {
      showToast('Invalid merchant address', 'error');
      return;
    }

    if (!hasValidAmount) {
      showToast('Invalid VFIDE amount in payment link', 'error');
      return;
    }

    if (selectedMethod !== 'vfide') {
      showToast('Stablecoin checkout is not enabled on this route yet. Please select VFIDE.', 'error');
      return;
    }

    if (!qrReadyForPayment) {
      showToast('QR signature validation failed. Request a newly signed QR code.', 'error');
      return;
    }
    
    setIsProcessing(true);
    try {
      if (settlement === 'escrow') {
        showToast('Escrow-protected payment initiated - confirm in your wallet', 'info');
        await createEscrow(
          merchantAddress as `0x${string}`,
          requestedAmount,
          orderId
        );
        showToast(`Escrow created successfully (${orderId})`, 'success');
      } else {
        showToast('Instant settlement payment initiated - confirm in your wallet', 'info');
        await payMerchant(
          merchantAddress as `0x${string}`,
          CONTRACT_ADDRESSES.VFIDEToken,
          requestedAmount,
          orderId
        );
        showToast(`Instant payment successful (${orderId})`, 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('rejected') || message.includes('denied')) {
        showToast('Transaction cancelled by user', 'info');
      } else {
        showToast('Payment failed: ' + message.slice(0, 50), 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-zinc-950 pt-20 relative overflow-hidden"
    >
      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-125 h-125 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-100 h-100 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <section className="py-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full mb-4"
          >
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">Secure Checkout</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
            Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Payment</span>
          </h1>
          <p className="text-xl text-gray-400">
            Secure checkout powered by VFIDE
          </p>
        </div>
      </section>

      {/* Payment Form */}
      <section className="py-12 relative z-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8"
          >
            <div className={`mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${
              settlement === "instant"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}>
              <Shield className="w-4 h-4" />
              {settlementTone.banner}
            </div>
            {/* Merchant Info */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="text-gray-400 text-sm mb-2">Paying to</div>
              <div className="text-2xl font-bold text-white font-mono" role={!merchant ? "alert" : undefined}>
                {merchant || "Missing merchant address"}
              </div>
              <div className="mt-2 text-xs text-gray-400">Order: <span className="font-mono text-gray-300">{orderId}</span></div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-bold">
                  TRUSTED • ProofScore 845
                </div>
                <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  settlement === "instant"
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/20 border border-amber-500/30 text-amber-300"
                }`}>
                  {settlementTone.badge}
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                {settlementTone.summary}
              </div>
              {!merchant && (
                <div className="mt-3 text-xs text-amber-300" role="alert" aria-live="polite">
                  Missing merchant address. Scan a valid QR code or reopen the payment link.
                </div>
              )}
              {!hasValidAmount && (
                <div className="mt-2 text-xs text-amber-300" role="alert" aria-live="polite">
                  Missing or invalid VFIDE amount in payment link.
                </div>
              )}
              {legacyMerchant && !searchParams.get("merchant") && (
                <div className="mt-2 text-[11px] text-amber-200/80">
                  Using legacy <span className="font-semibold">to</span> parameter. Update links to use <span className="font-semibold">merchant</span>.
                </div>
              )}
              {paymentSource === 'qr' && signatureState !== 'valid' && (
                <div className="mt-2 text-xs text-red-300" role="alert" aria-live="polite">
                  {signatureState === 'missing' && 'Unsigned QR payload. Merchant must sign and lock this QR.'}
                  {signatureState === 'expired' && 'QR signature expired. Request a newly generated QR.'}
                  {signatureState === 'invalid' && 'QR signature invalid. Potential tampering detected.'}
                  {signatureState === 'verifying' && 'Verifying signed QR payload...'}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="mb-8">
              <div className="text-gray-400 text-sm mb-2">Amount (VFIDE)</div>
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">{amountVfide.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
              <div className="text-gray-400">
                {priceLoading ? (
                  <span className="animate-pulse">Calculating...</span>
                ) : (
                  `≈ $${usdEstimate.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-8">
              <div className="text-gray-400 text-sm mb-4">Payment Method</div>
              
              <div className="space-y-3">
                {[
                  { id: 'vfide' as const, label: 'VFIDE Token', desc: `0.25-5% burn fee (ProofScore-based) • ${settlementTone.method}` },
                  { id: 'usdc' as const, label: 'USDC', desc: 'Stablecoin • Supported on this checkout route' },
                  { id: 'usdt' as const, label: 'USDT', desc: 'Stablecoin • Supported on this checkout route' },
                ].map((method) => (
                  <motion.button 
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full p-4 bg-white/5 border-2 rounded-xl text-left transition-all ${
                      selectedMethod === method.id 
                        ? 'border-cyan-400 bg-cyan-500/10' 
                        : 'border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">{method.label}</div>
                        <div className="text-gray-400 text-sm">{method.desc}</div>
                      </div>
                      {selectedMethod === method.id && (
                        <span className="text-cyan-400 font-bold text-sm">SELECTED</span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Requested amount</span>
                <span className="text-white">{amountVfide.toLocaleString(undefined, { maximumFractionDigits: 6 })} VFIDE</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Estimated burn fee (3% avg)</span>
                <span className="text-white">{estimatedBurnFeeVfide.toLocaleString(undefined, { maximumFractionDigits: 6 })} VFIDE</span>
              </div>
              <div className="border-t border-white/10 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Settlement path</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-bold text-xl">{settlementTone.method}</span>
              </div>
            </div>

            {/* Pay Button */}
            <motion.button 
              onClick={handlePayment}
              disabled={effectiveProcessing || !merchant || !hasValidAmount || !qrReadyForPayment}
              whileHover={{ scale: effectiveProcessing ? 1 : 1.02 }}
              whileTap={{ scale: effectiveProcessing ? 1 : 0.98 }}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {effectiveProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                merchant
                  ? hasValidAmount
                    ? qrReadyForPayment
                      ? settlement === 'escrow'
                        ? `Create Escrow (${amountVfide.toLocaleString(undefined, { maximumFractionDigits: 6 })} VFIDE)`
                        : `Pay Instantly (${amountVfide.toLocaleString(undefined, { maximumFractionDigits: 6 })} VFIDE)`
                      : 'QR signature required'
                    : "Amount required"
                  : "Merchant required"
              )}
            </motion.button>

            {/* Security Notice */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`mt-6 p-4 rounded-xl border ${
                settlement === "instant"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  settlement === "instant" ? "bg-emerald-500/20" : "bg-amber-500/20"
                }`}>
                  <Shield className={`w-5 h-5 ${
                    settlement === "instant" ? "text-emerald-400" : "text-amber-400"
                  }`} />
                </div>
                <div>
                  <div className={`font-bold mb-1 ${
                    settlement === "instant" ? "text-emerald-400" : "text-amber-300"
                  }`}>
                    {settlementTone.noticeTitle}
                  </div>
                  <div className="text-gray-400 text-sm">{settlementTone.noticeText}</div>
                </div>
              </div>
            </motion.div>

            {combinedError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm"
              >
                {combinedError}
              </motion.div>
            )}

            {paymentSuccess && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-sm"
              >
                Payment recorded successfully for order {orderId}.
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
