'use client';

import { Footer } from "@/components/layout/Footer";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAccount, useWriteContract } from "wagmi";
import { useVfidePrice } from "@/lib/vfide-hooks";
import { parseUnits } from "viem";
import { motion } from "framer-motion";
import { CONTRACT_ADDRESSES, VFIDETokenABI } from "@/lib/contracts";
import { Shield, Sparkles, CreditCard, Loader2 } from "lucide-react";
import { safeParseFloat } from "@/lib/validation";

const settlementMessaging = (settlement: string) =>
  settlement === "instant"
    ? {
        badge: "Instant settlement",
        banner: "QR scan: instant settlement (no escrow)",
        summary: "QR scan checkouts settle immediately. Escrow stays available for higher-risk orders.",
        method: "Instant settlement",
        noticeTitle: "Instant Settlement",
        noticeText: "QR scan payments settle immediately with trusted merchants and payers.",
      }
    : {
        badge: "Escrow protected",
        banner: "Escrow-protected checkout for buyer protection",
        summary: "Escrow holds funds until delivery confirmation. Trusted merchants can switch to instant settlement.",
        method: "Escrow protected",
        noticeTitle: "Escrow Protection",
        noticeText: "Funds are held in escrow until delivery confirmed for extra buyer protection.",
      };

function PayContent() {
  const searchParams = useSearchParams();
  const legacyMerchant = searchParams.get("to");
  const merchant = searchParams.get("merchant") || legacyMerchant || "";
  const amount = searchParams.get("amount") || "100";
  const paymentSource = searchParams.get("source") || "checkout";
  const settlement = searchParams.get("settlement") || (paymentSource === "qr" ? "instant" : "escrow");
  const [selectedMethod, setSelectedMethod] = useState<'vfide' | 'usdc' | 'usdt'>('vfide');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();
  const { isConnected, address } = useAccount();
  const { priceUsd, isLoading: priceLoading } = useVfidePrice();
  const { writeContractAsync } = useWriteContract();

  const PAYMENT_FEE_MULTIPLIER = 1.03;
  const amountNum = safeParseFloat(amount, 0);
  const vfideAmount = priceUsd > 0 ? (amountNum / priceUsd).toFixed(2) : '0.00';
  const totalDue = (amountNum * PAYMENT_FEE_MULTIPLIER).toFixed(2);
  const settlementTone = settlementMessaging(settlement);

  const handlePayment = async () => {
    if (!isConnected || !address) {
      showToast('Please connect your wallet first', 'error');
      return;
    }
    
    // Validate merchant address
    const merchantAddress = merchant.includes('...') ? null : merchant;
    if (!merchantAddress || !merchantAddress.startsWith('0x') || merchantAddress.length !== 42) {
      showToast('Invalid merchant address', 'error');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Calculate VFIDE amount in wei (18 decimals)
      const vfideAmountWei = parseUnits(vfideAmount, 18);
      
    showToast(
      settlement === 'instant'
        ? 'Instant settlement payment initiated - confirm in your wallet'
        : 'Escrow-protected payment initiated - confirm in your wallet',
      'info'
    );
      
      // Transfer VFIDE tokens to merchant
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.VFIDEToken,
        abi: VFIDETokenABI,
        functionName: 'transfer',
        args: [merchantAddress as `0x${string}`, vfideAmountWei],
      });
      
      showToast('Payment successful! Transaction: ' + hash.slice(0, 10) + '...', 'success');
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
    <motion.main 
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
              <div className="text-2xl font-bold text-white font-mono">
                {merchant || "Missing merchant address"}
              </div>
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
              {legacyMerchant && !searchParams.get("merchant") && (
                <div className="mt-2 text-[11px] text-amber-200/80">
                  Using legacy <span className="font-semibold">to</span> parameter. Update links to use <span className="font-semibold">merchant</span>.
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="mb-8">
              <div className="text-gray-400 text-sm mb-2">Amount</div>
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">${amount}</div>
              <div className="text-gray-400">
                {priceLoading ? (
                  <span className="animate-pulse">Calculating...</span>
                ) : (
                  `≈ ${vfideAmount} VFIDE`
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-8">
              <div className="text-gray-400 text-sm mb-4">Payment Method</div>
              
              <div className="space-y-3">
                {[
                  { id: 'vfide' as const, label: 'VFIDE Token', desc: `0.25-5% burn fee (ProofScore-based) • ${settlementTone.method}` },
                  { id: 'usdc' as const, label: 'USDC', desc: 'Stablecoin • Auto-converted to VFIDE' },
                  { id: 'usdt' as const, label: 'USDT', desc: 'Stablecoin • Auto-converted to VFIDE' },
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
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">${amount}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Burn Fee (3% avg)</span>
                <span className="text-white">${(safeParseFloat(amount, 0) * 0.03).toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Total</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-bold text-xl">${totalDue}</span>
              </div>
            </div>

            {/* Pay Button */}
            <motion.button 
              onClick={handlePayment}
              disabled={isProcessing}
              whileHover={{ scale: isProcessing ? 1 : 1.02 }}
              whileTap={{ scale: isProcessing ? 1 : 0.98 }}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                merchant ? `Pay $${totalDue}` : "Merchant required"
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
                  <div className="text-gray-400 text-sm">
                    {settlementTone.noticeText}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </motion.main>
  );
}

export default function PayPage() {
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 -left-32 w-125 h-125 bg-cyan-500/10 rounded-full blur-[120px]" />
          </div>
          <div className="flex items-center gap-3 text-cyan-400 text-2xl">
            <Sparkles className="w-6 h-6 animate-pulse" />
            Loading...
          </div>
        </div>
      }>
        <PayContent />
      </Suspense>
      <Footer />
    </>
  );
}
