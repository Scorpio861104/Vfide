"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { SectionHeading, SurfaceCard, AccentBadge } from "@/components/ui/primitives";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Shield, Sparkles, Loader2 } from "lucide-react";

function PayContent() {
  const searchParams = useSearchParams();
  const merchant = searchParams.get("merchant") || "0x742d...bEb";
  const amount = searchParams.get("amount") || "100";
  const [selectedMethod, setSelectedMethod] = useState<'vfide' | 'usdc' | 'usdt'>('vfide');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();
  const { isConnected } = useAccount();

  const handlePayment = async () => {
    if (!isConnected) {
      showToast('Please connect your wallet first', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      // Payment will be processed via smart contract
      showToast('Payment initiated - please confirm in your wallet', 'info');
      // Actual payment logic will use VFIDECommerce contract
    } catch {
      showToast('Payment failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.main 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0D0D0F] pt-20 relative overflow-hidden"
    >
      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <section className="py-12 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <SectionHeading
            badge="Secure Checkout"
            title="Complete Payment"
            subtitle="Secure checkout powered by VFIDE"
            badgeColor="cyan"
          />
        </div>
      </section>

      {/* Payment Form */}
      <section className="py-12 relative z-10">
        <div className="container mx-auto px-4 max-w-2xl">
          <SurfaceCard variant="default" interactive={false} className="relative overflow-hidden">
            {/* Merchant Info */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="text-gray-400 text-sm mb-2">Paying to</div>
              <div className="text-2xl font-bold text-white font-mono">{merchant}</div>
              <div className="flex items-center gap-2 mt-2">
                <AccentBadge label="TRUSTED • ProofScore 845" />
              </div>
            </div>

            {/* Amount */}
            <div className="mb-8">
              <div className="text-gray-400 text-sm mb-2">Amount</div>
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">${amount}</div>
              <div className="text-gray-400">≈ {(parseFloat(amount) * 2).toFixed(0)} VFIDE</div>
            </div>

            {/* Payment Method */}
            <div className="mb-8">
              <div className="text-gray-400 text-sm mb-4">Payment Method</div>
              
              <div className="space-y-3">
                {[
                  { id: 'vfide' as const, label: 'VFIDE Token', desc: '0.25-5% burn fee (ProofScore-based) • Instant settlement' },
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
                <span className="text-white">${(parseFloat(amount) * 0.03).toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Total</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-bold text-xl">${(parseFloat(amount) * 1.03).toFixed(2)}</span>
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
                `Pay $${(parseFloat(amount) * 1.03).toFixed(2)}`
              )}
            </motion.button>

            {/* Security Notice */}
            <SurfaceCard variant="muted" interactive={false} className="mt-6 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-emerald-400 font-bold mb-1">Secure Payment</div>
                  <div className="text-gray-400 text-sm">
                    All transactions are secured by smart contracts. Funds held in escrow until delivery confirmed.
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </SurfaceCard>
        </div>
      </section>
    </motion.main>
  );
}

export default function PayPage() {
  return (
    <>
      <GlobalNav />
      <Suspense fallback={
        <div className="min-h-screen bg-[#0D0D0F] pt-20 flex items-center justify-center relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
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
