"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAccount } from "wagmi";

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
    } catch (error) {
      showToast('Payment failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1A1A1D] pt-20">
      {/* Header */}
      <section className="py-12 bg-[#2A2A2F] border-b border-[#3A3A3F]">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
            Complete Payment
          </h1>
          <p className="text-xl text-[#A0A0A5] font-[family-name:var(--font-body)]">
            Secure checkout powered by VFIDE
          </p>
        </div>
      </section>

      {/* Payment Form */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8">
            {/* Merchant Info */}
            <div className="mb-8 pb-8 border-b border-[#3A3A3F]">
              <div className="text-[#A0A0A5] text-sm font-[family-name:var(--font-body)] mb-2">Paying to</div>
              <div className="text-2xl font-bold text-[#F5F3E8] font-mono">{merchant}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="px-3 py-1 bg-[#00F0FF]/20 border border-[#00F0FF] rounded text-[#00F0FF] text-sm font-bold">
                  TRUSTED • ProofScore 845
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="mb-8">
              <div className="text-[#A0A0A5] text-sm font-[family-name:var(--font-body)] mb-2">Amount</div>
              <div className="text-5xl font-bold text-[#F5F3E8] mb-2">${amount}</div>
              <div className="text-[#A0A0A5]">≈ {(parseFloat(amount) * 2).toFixed(0)} VFIDE</div>
            </div>

            {/* Payment Method */}
            <div className="mb-8">
              <div className="text-[#A0A0A5] text-sm font-[family-name:var(--font-body)] mb-4">Payment Method</div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setSelectedMethod('vfide')}
                  className={`w-full p-4 bg-[#1A1A1D] border-2 rounded-lg text-left hover:bg-[#1A1A1D]/80 transition-colors ${selectedMethod === 'vfide' ? 'border-[#00F0FF]' : 'border-[#3A3A3F]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[#F5F3E8] font-bold">VFIDE Token</div>
                      <div className="text-[#A0A0A5] text-sm">0.25-5% burn fee (ProofScore-based) • Instant settlement</div>
                    </div>
                    {selectedMethod === 'vfide' && <div className="text-[#00F0FF] font-bold">SELECTED</div>}
                  </div>
                </button>
                
                <button 
                  onClick={() => setSelectedMethod('usdc')}
                  className={`w-full p-4 bg-[#1A1A1D] border-2 rounded-lg text-left hover:border-[#00F0FF] transition-colors ${selectedMethod === 'usdc' ? 'border-[#00F0FF]' : 'border-[#3A3A3F]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[#F5F3E8] font-bold">USDC</div>
                      <div className="text-[#A0A0A5] text-sm">Stablecoin • Auto-converted to VFIDE</div>
                    </div>
                    {selectedMethod === 'usdc' && <div className="text-[#00F0FF] font-bold">SELECTED</div>}
                  </div>
                </button>
                
                <button 
                  onClick={() => setSelectedMethod('usdt')}
                  className={`w-full p-4 bg-[#1A1A1D] border-2 rounded-lg text-left hover:border-[#00F0FF] transition-colors ${selectedMethod === 'usdt' ? 'border-[#00F0FF]' : 'border-[#3A3A3F]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[#F5F3E8] font-bold">USDT</div>
                      <div className="text-[#A0A0A5] text-sm">Stablecoin • Auto-converted to VFIDE</div>
                    </div>
                    {selectedMethod === 'usdt' && <div className="text-[#00F0FF] font-bold">SELECTED</div>}
                  </div>
                </button>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="mb-8 p-4 bg-[#1A1A1D] rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#A0A0A5]">Subtotal</span>
                <span className="text-[#F5F3E8]">${amount}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#A0A0A5]">Burn Fee (3% avg)</span>
                <span className="text-[#F5F3E8]">${(parseFloat(amount) * 0.03).toFixed(2)}</span>
              </div>
              <div className="border-t border-[#3A3A3F] my-3" />
              <div className="flex justify-between items-center">
                <span className="text-[#F5F3E8] font-bold">Total</span>
                <span className="text-[#00F0FF] font-bold text-xl">${(parseFloat(amount) * 1.03).toFixed(2)}</span>
              </div>
            </div>

            {/* Pay Button */}
            <button 
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full px-8 py-4 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : `Pay $${(parseFloat(amount) * 1.03).toFixed(2)}`}
            </button>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-[#1A1A1D] border border-[#50C878] rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-[#50C878] text-xl">🛡️</div>
                <div>
                  <div className="text-[#50C878] font-bold mb-1">Secure Payment</div>
                  <div className="text-[#A0A0A5] text-sm">
                    All transactions are secured by smart contracts. Funds held in escrow until delivery confirmed.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function PayPage() {
  return (
    <>
      <GlobalNav />
      <Suspense fallback={
        <div className="min-h-screen bg-[#1A1A1D] pt-20 flex items-center justify-center">
          <div className="text-[#00F0FF] text-2xl">Loading...</div>
        </div>
      }>
        <PayContent />
      </Suspense>
      <Footer />
    </>
  );
}
