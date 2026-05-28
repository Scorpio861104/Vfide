'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { ArrowRight, Globe, DollarSign, Users, Clock, Shield, Plus } from 'lucide-react'; 
import { Footer } from '@/components/layout/Footer';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import Link from 'next/link';
import { useLocale } from '@/hooks/useLocale';
import { REMITTANCE_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

const CORRIDORS = [
  { from: '🇺🇸 USD', to: '🇬🇭 GHS', rate: '1 USD ≈ 13.2 GHS*', fee: '0.0%', time: '< 3 sec', saving: 'vs. ~7% Western Union fee' },
  { from: '🇦🇪 AED', to: '🇵🇭 PHP', rate: '1 AED ≈ 16.4 PHP*', fee: '0.0%', time: '< 3 sec', saving: 'vs. ~4% bank transfer fee' },
  { from: '🇬🇧 GBP', to: '🇳🇬 NGN', rate: '1 GBP ≈ 2,010 NGN*', fee: '0.0%', time: '< 3 sec', saving: 'vs. ~6% MoneyGram fee' },
  { from: '🇺🇸 USD', to: '🇮🇳 INR', rate: '1 USD ≈ 83.6 INR*', fee: '0.0%', time: '< 3 sec', saving: 'vs. ~3.5% PayPal fee' },
];
// * Indicative testnet rates only — not live FX data.

const STEPS = [
  { step: '1', title: 'Connect wallet', desc: 'MetaMask, WalletConnect, or Coinbase Wallet.' },
  { step: '2', title: 'Add a beneficiary', desc: 'Save their wallet address once. Reuse forever.' },
  { step: '3', title: 'Enter amount & send', desc: 'Pay in USDC or USDT. They receive in any stablecoin.' },
  { step: '4', title: 'Arrives in seconds', desc: 'On Base L2. Gas is cents, not dollars.' },
];

export default function RemittancePage() {
  const [locale] = useLocale();
  const _copy = pickLocaleCopy(REMITTANCE_TRANSLATIONS, locale); // remittance page i18n
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState('100');
  const [selectedCorridor, setSelectedCorridor] = useState(0);
  const _corridor = CORRIDORS[selectedCorridor];

  const _feeUSD = 0;
  const buyerFee = Math.max(0.25, parseFloat(amount || '0') * 0.025);
  const netAmount = parseFloat(amount || '0') - buyerFee;

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative text-white">
        {/* Ambient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        <div className="container mx-auto px-4 max-w-5xl py-12 relative">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs uppercase tracking-widest text-cyan-300 mb-6">
              <Globe size={12} /> International transfers on Base
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Send money home.<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #22d3ee, #10b981)' }}>
                Zero merchant fees.
              </span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto">
              Cross-border stablecoin transfers on Base L2. Arrives in seconds. No wire fees, no FX markup, no bank approval needed.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Calculator */}
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="glass-card-premium p-6">
                <h2 className="font-bold text-white mb-5">Fee calculator</h2>

                {/* Corridor selector */}
                <div className="mb-4">
                  <label className="text-xs text-zinc-500 mb-2 block">Corridor</label>
                  <div className="space-y-2">
                    {CORRIDORS.map((c, i) => (
                      <button key={i} onClick={() => setSelectedCorridor(i)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                          selectedCorridor === i
                            ? 'bg-cyan-500/10 border border-cyan-500/30'
                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{c.from} → {c.to}</div>
                          <div className="text-xs text-zinc-500">{c.rate}</div>
                        </div>
                        <div className="text-xs text-green-400 font-medium">{c.saving}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-600 leading-tight">
                  * Indicative testnet rates only. Savings shown are fee-percentage comparisons vs. industry averages — not live FX quotes.
                </p>

                {/* Amount input */}
                <div className="mb-4">
                  <label className="text-xs text-zinc-500 mb-2 block">You send (USDC)</label>
                  <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-4 py-3">
                    <DollarSign size={16} className="text-zinc-500" />
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 bg-transparent text-white text-xl font-bold outline-none"
                      placeholder="100"
                      min="1"
                    />
                    <span className="text-xs text-zinc-500">USDC</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="bg-zinc-900 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Merchant fee</span>
                    <span className="text-green-400 font-medium">$0.00 (0%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Buyer trust fee</span>
                    <span className="text-white">${buyerFee.toFixed(2)} (~2.5% at neutral score)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Network gas</span>
                    <span className="text-white">~$0.02 (Base L2)</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-2 flex justify-between font-semibold">
                    <span className="text-white">Recipient gets</span>
                    <span className="text-cyan-400">${Math.max(0, netAmount).toFixed(2)} USDC</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 mt-3">
                  Buyer fee drops to 0.25% at ProofScore ≥ 8,000. Build reputation, pay less.
                </p>
              </div>
            </motion.div>

            {/* Right col — steps + CTA */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className="flex flex-col gap-6"
            >
              <div className="glass-card-premium p-6">
                <h2 className="font-bold text-white mb-5">How it works</h2>
                <div className="space-y-4">
                  {STEPS.map((s) => (
                    <div key={s.step} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-sm font-bold shrink-0">
                        {s.step}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{s.title}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Shield, label: 'Non-custodial', color: '#22d3ee' },
                  { icon: Clock, label: '< 3 seconds', color: '#10b981' },
                  { icon: Users, label: 'No KYC required', color: '#a78bfa' },
                ].map((b) => {
                  const Icon = b.icon;
                  return (
                    <div key={b.label} className="glass-card-premium p-4 text-center">
                      <Icon size={20} className="mx-auto mb-2" style={{ color: b.color }} />
                      <div className="text-xs text-zinc-300">{b.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="glass-card-premium p-6">
                {isConnected ? (
                  <div className="space-y-3">
                    <Link href="/api/remittance/beneficiaries"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors"
                    >
                      <Plus size={16} /> Add beneficiary & send
                    </Link>
                    <Link href="/pay"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl transition-colors text-sm"
                    >
                      <ArrowRight size={14} /> Or use Pay tab directly
                    </Link>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-zinc-400 mb-4">Connect your wallet to start sending</p>
                    <VfideConnectButton size="md" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
