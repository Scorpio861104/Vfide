'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { m } from 'framer-motion';
import { CreditCard, Loader2, Shield } from 'lucide-react';
import { useProofScore } from '@/hooks/useProofScore';
import { useAccount } from 'wagmi';
import { isAddress, verifyMessage } from 'viem';

import { useToast } from '@/components/ui/toast';
import { usePayMerchant } from '@/hooks/useMerchantHooks';
import { useVfidePrice } from '@/hooks/usePriceHooks';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import { useEscrow } from '@/lib/escrow/useEscrow';
import { buildQrSignatureMessage, parseExpiry } from '@/lib/payments/qrSignature';
import { computeEffectiveSettlement, validatePayLinkAmount, verifyPayLinkRecipient } from '@/lib/payments/payGating';
import { safeParseFloat } from '@/lib/validation';

// Payer-protection default: pay a payee whose ProofScore is below neutral (5000) and the flow
// defaults to escrow protection; trusted payees settle instantly. Always payer-overridable (opt-out).
const ESCROW_TRUST_THRESHOLD = 5000;

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
    banner: 'Protected checkout mode',
    badge: 'ESCROW',
    summary: 'Funds are held in escrow until you release them, or you dispute if something goes wrong. The DAO arbitrates disputes.',
    method: 'One-click escrow funding',
    noticeTitle: 'Protected settlement path',
    noticeText: 'Funds move from your vault to the escrow contract on a single signature; release happens when you confirm fulfillment.',
  };
};

export function PayContent() {
  const searchParams = useSearchParams();
  const legacyMerchant = searchParams.get("to");
  const merchant = searchParams.get("merchant") || legacyMerchant || "";
  const requestedAmount = (searchParams.get("amount") || "").trim();
  // For QR payments: orderId MUST match what the merchant signed exactly.
  // MerchantPOS requires orderId before signing; PaymentQR now auto-generates one.
  // If orderId is missing from a QR URL, the merchant signed with '' — use ''.
  // For non-QR (direct checkout), generate a stable fallback.
  const [orderId] = useState(() => {
    const fromQuery = searchParams.get("orderId") || searchParams.get("reference");
    if (fromQuery?.trim()) return fromQuery.trim();
    const src = searchParams.get("source") || "";
    // QR payments: empty orderId → match the signature (signed with '')
    if (src === "qr") return "";
    return `CHK-${Math.floor(Date.now() / 1000)}`;
  });
  const paymentSource = searchParams.get("source") || "checkout";
  // Stored payment links (source=paylink) carry the canonical link id; the recipient
  // and amount are re-verified against the server record (see effect below).
  const linkId = (searchParams.get("linkId") || "").trim();
  const signature = (searchParams.get('sig') || '').trim();
  const expiryFromQuery = parseExpiry(searchParams.get('exp'));
  const settlementParam = searchParams.get("settlement");
  // Trust-tiered payer protection: an explicit ?settlement= always wins; otherwise the default keys
  // on the PAYEE's trust once it resolves (see effect below). Until then, fall back to the prior
  // source heuristic so the first paint is sensible.
  const explicitSettlement: 'instant' | 'escrow' | null =
    settlementParam === "instant" || settlementParam === "escrow" ? settlementParam : null;
  const [settlement, setSettlement] = useState<'instant' | 'escrow'>(
    explicitSettlement ?? (paymentSource === "qr" ? "instant" : "escrow")
  );
  // True once the payer manually picks a path, so the trust-based default never overrides their choice.
  const [userChoseSettlement, setUserChoseSettlement] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'vfide' | 'usdc' | 'usdt'>('vfide');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signatureState, setSignatureState] = useState<'valid' | 'missing' | 'invalid' | 'expired' | 'verifying'>(
    // Everything except a stored payment link requires a verified signature before it
    // may settle instantly; start them 'missing'. A stored paylink uses its own
    // server cross-check (paylinkVerified) rather than a payer-supplied signature.
    paymentSource === 'paylink' ? 'valid' : 'missing'
  );
  // Stored payment link (source=paylink): verified true only once the URL recipient
  // matches the canonical merchant on the server record and the amount fits the link's
  // constraints. Until then the payment is blocked.
  const [paylinkVerified, setPaylinkVerified] = useState(false);
  const [paylinkError, setPaylinkError] = useState<string | null>(null);
  const telemetrySentRef = useRef<Set<string>>(new Set());
  const { showToast } = useToast();
  const { isConnected, address } = useAccount();
  const isVfideTokenAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken);
  const { priceUsd, isLoading: priceLoading } = useVfidePrice();
  const { score: buyerScore, tier: buyerTier, burnFee: buyerBurnFee } = useProofScore(address);
  // PAYEE (merchant) trust drives the protective default. useProofScore tolerates undefined (as it
  // does for `address` above), returning a null score until/unless a valid payee is present.
  const payeeAddress = isAddress(merchant) ? (merchant as `0x${string}`) : undefined;
  const { score: payeeScore } = useProofScore(payeeAddress);
  const { payMerchant, isPaying, isSuccess: instantSuccess, error: instantError } = usePayMerchant();
  const { createEscrow, loading: isEscrowLoading, isSuccess: escrowSuccess, error: escrowError } = useEscrow();

  // Trust-tiered default: once the payee's ProofScore resolves, protect the payer by defaulting to
  // escrow for a low-trust payee (instant for a trusted one) — unless the URL fixed the path or the
  // payer manually chose one. Fully overridable via the toggle below; never a forced hold.
  useEffect(() => {
    if (explicitSettlement !== null || userChoseSettlement) return;
    if (payeeScore === null || payeeScore === undefined) return;
    setSettlement(payeeScore < ESCROW_TRUST_THRESHOLD ? 'escrow' : 'instant');
  }, [payeeScore, explicitSettlement, userChoseSettlement]);

  // Stored payment link integrity: re-fetch the canonical link by its id and verify
  // that the URL recipient matches the server's merchant_address and the amount fits
  // the link's fixed/min/max constraints. A crafted or tampered /pay?source=paylink
  // link (recipient/amount swapped) fails this and is blocked. Reuses the existing
  // public, active-only GET /api/pay/link/[id]; no payer-supplied signature involved.
  useEffect(() => {
    if (paymentSource !== 'paylink') return;
    let cancelled = false;
    setPaylinkVerified(false);
    setPaylinkError(null);
    if (!linkId) {
      setPaylinkError('This payment link is missing its reference and cannot be verified.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/pay/link/${encodeURIComponent(linkId)}`);
        if (!res.ok) {
          if (!cancelled) setPaylinkError('This payment link was not found or is no longer active.');
          return;
        }
        const link = await res.json();
        const recipientOk = verifyPayLinkRecipient(merchant, link?.merchant_address ?? '');
        const amountOk = validatePayLinkAmount(requestedAmount, {
          amount: link?.amount,
          min_amount: link?.min_amount,
          max_amount: link?.max_amount,
        });
        if (cancelled) return;
        setPaylinkVerified(recipientOk && amountOk);
        setPaylinkError(
          !recipientOk
            ? "This link's recipient could not be verified against our records."
            : !amountOk
              ? "The amount is outside this link's allowed range."
              : null,
        );
      } catch {
        if (!cancelled) setPaylinkError('Could not verify this payment link. Please try again.');
      }
    })();
    return () => { cancelled = true; };
  }, [paymentSource, linkId, merchant, requestedAmount]);

  const amountVfide = safeParseFloat(requestedAmount, 0);
  const hasValidAmount = amountVfide > 0;
  // Display fee: use live ProofScore rate if available, else neutral (3.8125% = 382 bps at score 5000).
  // Neutral formula: maxBps(500) − ((5000−4000)×475)/4000 = 381.25 bps → 3.8125%
  const NEUTRAL_BURN_RATE = 0.038125; // 381.25 bps — ProofScoreBurnRouter at score 5000
  const activeBurnRate = (buyerBurnFee !== null && buyerBurnFee !== undefined)
    ? buyerBurnFee / 100
    : NEUTRAL_BURN_RATE;
  const estimatedBurnFeeVfide = amountVfide * activeBurnRate;
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
    let _cancelled = false;

    const verifyQrSignature = async () => {
      if (paymentSource !== 'qr' && paymentSource !== 'link') {
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
        if (!_cancelled) {
          setSignatureState(valid ? 'valid' : 'invalid');
        }
      } catch {
        if (!_cancelled) {
          setSignatureState('invalid');
        }
      }
    };

    void verifyQrSignature();

    return () => {
      _cancelled = true;
    };
  }, [paymentSource, signature, expiryFromQuery, qrExpiryInvalid, qrMessage, merchant]);

  useEffect(() => {
    let _cancelled = false;
    if (paymentSource !== 'qr' && paymentSource !== 'link') return;
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
    return () => { _cancelled = true; };
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

  const canSettleInstantly =
    signatureState === 'valid' || (paymentSource === 'paylink' && paylinkVerified);
  // Instant settlement is irreversible, so it is only honored for a verified payment;
  // any unverified payment is forced to escrow (which preserves dispute recourse).
  const effectiveSettlement = computeEffectiveSettlement(settlement, canSettleInstantly);

  // qr/link require a valid merchant signature; a stored paylink requires the server
  // cross-check to pass; a direct checkout is allowed but (being unverified) can only
  // settle via escrow per effectiveSettlement above.
  const qrReadyForPayment =
    paymentSource === 'qr' || paymentSource === 'link'
      ? signatureState === 'valid'
      : paymentSource === 'paylink'
        ? paylinkVerified
        : true;
  const settlementTone = settlementMessaging(effectiveSettlement);

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

    if (!isVfideTokenAvailable) {
      showToast('VFIDE token contract is not configured in this environment', 'error');
      return;
    }

    if (!qrReadyForPayment) {
      showToast('QR signature validation failed. Request a newly signed QR code.', 'error');
      return;
    }

    // Defense-in-depth (payment-link integrity): only source=qr links are validated
    // against the merchant's signature. For every other source the merchant/amount
    // arrive from the URL unverified and tamper-able, so require the payer to
    // explicitly confirm the exact recipient address and amount before signing —
    // removing the blind-sign vector on crafted/altered /pay links.
    if (signatureState !== 'valid') {
      const trustNote =
        payeeScore === null || payeeScore === undefined
          ? 'This recipient has no ProofScore yet (new or unknown).'
          : payeeScore < ESCROW_TRUST_THRESHOLD
            ? `Warning: this recipient has a LOW ProofScore (${payeeScore.toLocaleString()}).`
            : `Recipient ProofScore: ${payeeScore.toLocaleString()}.`;
      const confirmed = confirm(
        `Confirm payment\n\n` +
          `Pay ${amountVfide} VFIDE to:\n${merchantAddress}\n\n` +
          `${trustNote}\n\n` +
          `This payment link is unverified — make sure the address above is who you intend to pay.` +
          (effectiveSettlement === 'escrow'
            ? ` For your protection it will be held in escrow until you confirm receipt.`
            : ` This payment cannot be reversed.`)
      );
      if (!confirmed) {
        showToast('Payment cancelled', 'info');
        return;
      }
    }

    setIsProcessing(true);
    try {
      if (effectiveSettlement === 'escrow') {
        showToast('Sign to open and fund the escrow — confirm in your wallet', 'info');
        await createEscrow(
          merchantAddress as `0x${string}`,
          requestedAmount,
          orderId
        );
        showToast(`Protected payment submitted successfully (${orderId})`, 'success');
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
    <m.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden"
    >
      {/* Premium Background Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.08), transparent 65%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/4 -right-24 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.07), transparent 65%)', filter: 'blur(80px)' }} />
      </div>
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

      {/* Header */}
      <section className="py-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <m.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="badge-live mb-4 mx-auto w-fit"
          >
            <CreditCard className="w-3 h-3" />
            <span>Secure Checkout</span>
          </m.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
            Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400">Payment</span>
          </h1>
          <p className="text-xl text-gray-400">
            Secure checkout powered by VFIDE
          </p>
        </div>
      </section>

      {/* Payment Form */}
      <section className="py-12 relative z-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <m.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8"
          >
            <div className={`mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${
              effectiveSettlement === "instant"
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
                {isConnected && buyerScore !== null && buyerTier ? (
                  <div className={`px-3 py-1 rounded-lg text-sm font-bold border ${
                    buyerScore >= 8000 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
                    buyerScore >= 7000 ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' :
                    buyerScore >= 5600 ? 'bg-green-500/20 border-green-500/30 text-green-300' :
                    buyerScore >= 5000 ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' :
                    buyerScore >= 4000 ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' :
                    'bg-red-500/20 border-red-500/30 text-red-300'
                  }`}>
                    {buyerTier.label} • ProofScore {buyerScore.toLocaleString()}
                  </div>
                ) : isConnected ? (
                  <div className="px-3 py-1 bg-zinc-700/40 border border-zinc-600/30 rounded-lg text-zinc-400 text-sm animate-pulse">
                    Loading score…
                  </div>
                ) : null}
                <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                  effectiveSettlement === "instant"
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/20 border border-amber-500/30 text-amber-300"
                }`}>
                  {settlementTone.badge}
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                {settlementTone.summary}
              </div>
              {/* Trust-tiered settlement choice — the payer can always opt out (no forced hold). */}
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  {(['escrow', 'instant'] as const).map((opt) => {
                    const optDisabled = opt === 'instant' && !canSettleInstantly;
                    return (
                    <button
                      key={opt}
                      type="button"
                      disabled={optDisabled}
                      onClick={() => { if (optDisabled) return; setUserChoseSettlement(true); setSettlement(opt); }}
                      aria-pressed={effectiveSettlement === opt}
                      title={optDisabled ? 'Instant settlement requires a signed link or QR' : undefined}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        optDisabled
                          ? 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed opacity-50'
                          : effectiveSettlement === opt
                          ? opt === 'escrow'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {opt === 'escrow' ? 'Protected (escrow)' : 'Instant'}
                    </button>
                    );
                  })}
                </div>
                {!canSettleInstantly && (
                  <div className="mt-2 text-[11px] text-amber-200/80" aria-live="polite">
                    Instant settlement requires a signed link or QR. This payment is protected by escrow — funds are held until you confirm receipt.
                  </div>
                )}
                {!userChoseSettlement && explicitSettlement === null && settlement === 'escrow'
                  && canSettleInstantly
                  && payeeScore !== null && payeeScore !== undefined && payeeScore < ESCROW_TRUST_THRESHOLD && (
                  <div className="mt-2 text-[11px] text-amber-200/80" aria-live="polite">
                    This payee’s ProofScore ({payeeScore.toLocaleString()}) is below neutral — your payment is protected by escrow by default. Switch to Instant above to settle directly.
                  </div>
                )}
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
              {(paymentSource === 'qr' || paymentSource === 'link') && signatureState !== 'valid' && (
                <div className="mt-2 text-xs text-red-300" role="alert" aria-live="polite">
                  {signatureState === 'missing' && `Unsigned ${paymentSource === 'link' ? 'payment link' : 'QR payload'}. The merchant must sign it before it can be paid.`}
                  {signatureState === 'expired' && `This signed ${paymentSource === 'link' ? 'link' : 'QR'} has expired. Request a newly generated one.`}
                  {signatureState === 'invalid' && 'Signature invalid — potential tampering detected.'}
                  {signatureState === 'verifying' && 'Verifying signature…'}
                </div>
              )}
              {paymentSource === 'paylink' && !paylinkVerified && paylinkError && (
                <div className="mt-2 text-xs text-red-300" role="alert" aria-live="polite">
                  {paylinkError}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="mb-8">
              <div className="text-gray-400 text-sm mb-2">Amount (VFIDE)</div>
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400 mb-2">{amountVfide.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
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
                  { id: 'usdc' as const, label: 'USDC', desc: 'Stablecoin • Phase 2 (select VFIDE for now)' },
                  { id: 'usdt' as const, label: 'USDT', desc: 'Stablecoin • Phase 2 (select VFIDE for now)' },
                ].map((method) => (
                  <m.button 
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full p-4 bg-white/5 border-2 rounded-xl text-left transition-all ${
                      selectedMethod === method.id 
                        ? 'border-accent bg-accent/10' 
                        : 'border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-bold">{method.label}</div>
                        <div className="text-gray-400 text-sm">{method.desc}</div>
                      </div>
                      {selectedMethod === method.id && (
                        <span className="text-accent font-bold text-sm">SELECTED</span>
                      )}
                    </div>
                  </m.button>
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
                <span className="text-gray-400">
                  Estimated burn fee ({buyerBurnFee !== null && buyerBurnFee !== undefined
                    ? `${(buyerBurnFee).toFixed(2)}% at your score`
                    : '~3.81% at neutral score'})
                </span>
                <span className="text-white">{estimatedBurnFeeVfide.toLocaleString(undefined, { maximumFractionDigits: 6 })} VFIDE</span>
              </div>
              <div className="border-t border-white/10 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Settlement path</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400 font-bold text-xl">{settlementTone.method}</span>
              </div>
            </div>

            {/* Pay Button */}
            <m.button 
              data-trail-source="payment"
              onClick={handlePayment}
              disabled={effectiveProcessing || !merchant || !hasValidAmount || !qrReadyForPayment}
              whileHover={{ scale: effectiveProcessing ? 1 : 1.02 }}
              whileTap={{ scale: effectiveProcessing ? 1 : 0.98 }}
              className="w-full px-8 py-4 bg-gradient-to-r from-accent to-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </m.button>

            {/* Security Notice */}
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`mt-6 p-4 rounded-xl border ${
                effectiveSettlement === "instant"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  effectiveSettlement === "instant" ? "bg-emerald-500/20" : "bg-amber-500/20"
                }`}>
                  <Shield className={`w-5 h-5 ${
                    effectiveSettlement === "instant" ? "text-emerald-400" : "text-amber-400"
                  }`} />
                </div>
                <div>
                  <div className={`font-bold mb-1 ${
                    effectiveSettlement === "instant" ? "text-emerald-400" : "text-amber-300"
                  }`}>
                    {settlementTone.noticeTitle}
                  </div>
                  <div className="text-gray-400 text-sm">{settlementTone.noticeText}</div>
                </div>
              </div>
            </m.div>

            {combinedError && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm"
              >
                {combinedError}
              </m.div>
            )}

            {paymentSuccess && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-300 text-sm"
              >
                Payment recorded successfully for order {orderId}.
              </m.div>
            )}
          </m.div>
        </div>
      </section>
    </m.div>
  );
}
