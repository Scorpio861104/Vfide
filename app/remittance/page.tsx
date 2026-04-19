'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Coins, Send, Shield, Wallet } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';
import { Beneficiary, BeneficiaryManager } from '@/components/remittance/BeneficiaryManager';

const comparisonRows = [
  { provider: 'VFIDE', fee: '0.25%–1.00%', payout: 'Minutes', highlight: true },
  { provider: 'Western Union', fee: '≈ 7.5%', payout: 'Hours–days' },
  { provider: 'Bank wire', fee: '$25 flat', payout: '1–3 business days' },
];

export default function RemittancePage() {
  const { isConnected } = useAccount();
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [amount, setAmount] = useState('100');
  const [shareReceipt, setShareReceipt] = useState(false);

  const parsedAmount = Number.parseFloat(amount || '0');
  const vfideFee = Number.isFinite(parsedAmount) ? parsedAmount * 0.0075 : 0;
  const netAmount = Math.max(parsedAmount - vfideFee, 0);
  const whatsappText = selectedBeneficiary
    ? encodeURIComponent(`VFIDE remittance ready for ${selectedBeneficiary.name}: send ${parsedAmount.toFixed(2)} and ${netAmount.toFixed(2)} lands after transparent fees.`)
    : '';

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                <Send size={14} /> Remittance flow
              </div>
              <h1 className="text-4xl font-bold md:text-5xl">Send money home with transparent fees</h1>
              <p className="mt-4 text-lg text-gray-400">
                Save beneficiaries, compare corridor pricing, and prepare a proof-of-send flow for mobile-money and bank recipients.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="pb-10">
          <div className="container mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <BeneficiaryManager
                selectedId={selectedBeneficiary?.id ?? null}
                onSelect={(beneficiary) => {
                  setSelectedBeneficiary(beneficiary);
                  setShareReceipt(false);
                }}
              />
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 flex items-center gap-2 text-cyan-300">
                  <Coins size={18} />
                  <h2 className="text-xl font-bold text-white">Corridor pricing</h2>
                </div>
                <div className="space-y-2">
                  {comparisonRows.map((row) => (
                    <div key={row.provider} className={`grid grid-cols-3 rounded-xl px-3 py-2 text-sm ${row.highlight ? 'bg-cyan-500/10 text-cyan-100' : 'bg-black/20 text-gray-300'}`}>
                      <span>{row.provider}</span>
                      <span>{row.fee}</span>
                      <span>{row.payout}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex items-center gap-2 text-cyan-300">
                  <Wallet size={18} />
                  <h2 className="text-xl font-bold text-white">Send preview</h2>
                </div>

                <label className="mb-3 block text-sm text-gray-300">
                  Transfer amount
                  <input
                    value={amount}
                    onChange={(event) =>  setAmount(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
                    inputMode="decimal"
                  />
                </label>

                <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                  <div className="flex items-center justify-between"><span>Selected beneficiary</span><span>{selectedBeneficiary?.name ?? 'Choose one'}</span></div>
                  <div className="flex items-center justify-between"><span>Estimated VFIDE fee</span><span>{vfideFee.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span>Estimated recipient amount</span><span>{netAmount.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between"><span>Rail</span><span>{selectedBeneficiary?.network ?? '—'}</span></div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShareReceipt(true)}
                    disabled={!isConnected || !selectedBeneficiary || !Number.isFinite(parsedAmount) || parsedAmount <= 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-white disabled:opacity-60"
                  >
                    <ArrowRight size={16} /> Generate receipt preview
                  </button>

                  {shareReceipt && selectedBeneficiary && (
                    <Link
                      href={`https://wa.me/?text=${whatsappText}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-200"
                    >
                      Share via WhatsApp
                    </Link>
                  )}
                </div>

                {!isConnected && (
                  <p className="mt-3 text-sm text-amber-300">Connect your wallet to finalize remittance sends.</p>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-50">
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
