'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Coins, Send, Shield, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';
import { Beneficiary, BeneficiaryManager } from '@/components/remittance/BeneficiaryManager';
import { FutureReleaseBanner } from '@/components/feedback/FutureReleaseBanner';
import { useLocale } from '@/lib/locale/LocaleProvider';

const comparisonRows = [
  { provider: 'VFIDE (wallet-to-wallet)', fee: '0.25%–5% (by trust score)', payout: 'Minutes', highlight: true },
  { provider: 'Western Union', fee: '≈ 7.5%', payout: 'Hours–days' },
  { provider: 'Bank wire', fee: '$25 flat', payout: '1–3 business days' },
];

export default function RemittancePage() {
  const { locale } = useLocale();
  void locale;

  const { isConnected } = useAccount();
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [amount, setAmount] = useState('100');
  const [shareReceipt, setShareReceipt] = useState(false);

  const parsedAmount = Number.parseFloat(amount || '0');
  // Fee is ProofScore-based on-chain (ProofScoreBurnRouter.computeFees): 0.25% at
  // high trust up to 5% at low trust; ~3.81% at a neutral score. This preview uses
  // the neutral rate as a default. TODO: wire to useProofScore(address) so a
  // connected user sees their actual effective fee instead of the neutral estimate.
  const NEUTRAL_FEE_RATE = 0.0381;
  const vfideFee = Number.isFinite(parsedAmount) ? parsedAmount * NEUTRAL_FEE_RATE : 0;
  const netAmount = Math.max(parsedAmount - vfideFee, 0);
  const whatsappText = selectedBeneficiary
    ? encodeURIComponent(`VFIDE remittance ready for ${selectedBeneficiary.name}: send ${parsedAmount.toFixed(2)} and ${netAmount.toFixed(2)} lands after transparent fees.`)
    : '';

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

        <section className="relative py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
              <div className="badge-live mb-4">
                <Send size={12} /> Global Transfers
              </div>
              <h1 className="text-4xl font-black md:text-5xl tracking-tight">
                <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
                  Send money home with transparent fees
                </span>
              </h1>
              <p className="mt-4 text-lg text-zinc-400">
                Save beneficiaries, compare corridor pricing, and prepare a proof-of-send flow for mobile-money and bank recipients.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="relative pb-6">
          <div className="container mx-auto max-w-6xl px-4">
            <FutureReleaseBanner
              inline
              title="Today: VFIDE-to-wallet only. Direct M-Pesa / MoMo / GCash / Bank cash-out is a future release."
              description={
                'You can send VFIDE tokens to anyone with a wallet address today (settlement in minutes on Base). ' +
                'Direct delivery into M-Pesa, MTN MoMo, GCash, or a bank account requires a regulated cash-out partner ' +
                'per corridor — those integrations are not live yet. The Rail tag on each beneficiary is currently a label, ' +
                'not a delivery route. Use "Generate receipt preview" + WhatsApp share until partners are wired in.'
              }
            />
          </div>
        </section>

        <section className="relative pb-10">
          <div className="container mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="glass-card-premium p-5">
              <BeneficiaryManager
                selectedId={selectedBeneficiary?.id ?? null}
                onSelect={(beneficiary) => {
                  setSelectedBeneficiary(beneficiary);
                  setShareReceipt(false);
                }}
              />
            </div>

            <div className="space-y-6">
              <div className="glass-card-premium p-5">
                <div className="mb-3 flex items-center gap-2 text-cyan-300">
                  <Coins size={18} />
                  <h2 className="text-xl font-bold text-white">Corridor pricing</h2>
                </div>
                <div className="space-y-2">
                  {comparisonRows.map((row) => (
                    <div key={row.provider} className={`grid grid-cols-3 rounded-xl px-3 py-2 text-sm ${row.highlight ? 'bg-cyan-500/10 text-cyan-100' : 'analytics-card text-zinc-300'}`}>
                      <span>{row.provider}</span>
                      <span>{row.fee}</span>
                      <span>{row.payout}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card-premium p-5">
                <div className="mb-4 flex items-center gap-2 text-cyan-300">
                  <Wallet size={18} />
                  <h2 className="text-xl font-bold text-white">Send preview</h2>
                </div>

                <label className="mb-3 block text-sm text-zinc-300">
                  Transfer amount
                  <input
                    value={amount}
                    onChange={(event) =>  setAmount(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                    inputMode="decimal"
                  />
                </label>

                <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  <div className="flex items-center justify-between"><span>Selected beneficiary</span><span>{selectedBeneficiary?.name ?? 'Choose one'}</span></div>
                  <div className="flex items-center justify-between"><span>Est. fee (neutral trust score)</span><span>{vfideFee.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span>Estimated recipient amount</span><span>{netAmount.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span>Rail</span><span>{selectedBeneficiary?.network ?? '—'}</span></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShareReceipt(true)}
                    disabled={!isConnected || !selectedBeneficiary || !Number.isFinite(parsedAmount) || parsedAmount <= 0}
                    className="btn-premium-primary flex items-center gap-2 disabled:opacity-60"
                  >
                    <ArrowRight size={16} /> Generate receipt preview
                  </button>

                  {shareReceipt && selectedBeneficiary && (
                    <Link
                      href={`https://wa.me/?text=${whatsappText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-premium-ghost flex items-center gap-2"
                    >
                      Share via WhatsApp
                    </Link>
                  )}
                </div>

                {!isConnected && (
                  <>
                    <p className="mt-3 text-sm text-amber-300">Connect your wallet to finalize remittance sends.</p>
                    <div className="mt-6 flex justify-center">
                      <VfideConnectButton size="md" />
                    </div>
                  </>
                )}
              </div>

              <div className="glass-card-premium border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-50">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Shield size={16} /> Why this matters
                </div>
                Save repeat beneficiaries, show real corridor comparisons, and keep remittance receipts easy to share with family.
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
