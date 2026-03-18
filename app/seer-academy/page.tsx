'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, CandlestickChart, CheckCircle2, Compass, ExternalLink, Shield, Wallet } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

type ChecklistKey =
  | 'walletSafe'
  | 'networkChecked'
  | 'amountTested'
  | 'feesReviewed'
  | 'riskPlanned'
  | 'appealReady';

const learningPath = [
  {
    title: 'Crypto Basics',
    detail: 'Wallets, networks, gas fees, and transaction finality in simple terms.',
    action: { label: 'Open Docs', href: '/docs' },
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    title: 'Trading Basics',
    detail: 'Market vs limit mindset, slippage awareness, and risk-first sizing.',
    action: { label: 'Open Buy Flow', href: '/buy' },
    icon: <CandlestickChart className="w-5 h-5" />,
  },
  {
    title: 'Seer Safety Signals',
    detail: 'Understand reason codes, score impact, and why actions may be delayed.',
    action: { label: 'Open Appeals', href: '/appeals' },
    icon: <Shield className="w-5 h-5" />,
  },
  {
    title: 'Practice With Small Size',
    detail: 'Use small test transactions before real activity to reduce mistakes.',
    action: { label: 'Open Payments', href: '/pay' },
    icon: <Wallet className="w-5 h-5" />,
  },
];

const glossary = [
  ['Wallet', 'Your key holder for signing transactions.'],
  ['Vault', 'Your on-chain secure account container in VFIDE.'],
  ['Gas fee', 'Network cost to process a blockchain transaction.'],
  ['Slippage', 'Difference between expected and executed trade price.'],
  ['Reason code', 'Machine-readable explanation from Seer about a trust decision.'],
  ['Appeal bundle', 'Structured evidence package for dispute review.'],
] as const;

const checklistItems: Array<{ key: ChecklistKey; label: string }> = [
  { key: 'walletSafe', label: 'I secured my wallet and recovery phrase.' },
  { key: 'networkChecked', label: 'I confirmed the correct network and token.' },
  { key: 'amountTested', label: 'I tested with a small amount first.' },
  { key: 'feesReviewed', label: 'I reviewed gas and fee impact before confirming.' },
  { key: 'riskPlanned', label: 'I set a personal risk limit before trading.' },
  { key: 'appealReady', label: 'I know how to use Seer appeal bundle if blocked.' },
];

export default function SeerAcademyPage() {
  const [checks, setChecks] = useState<Record<ChecklistKey, boolean>>({
    walletSafe: false,
    networkChecked: false,
    amountTested: false,
    feesReviewed: false,
    riskPlanned: false,
    appealReady: false,
  });

  const completed = Object.values(checks).filter(Boolean).length;

  return (
    <>
      <main className="min-h-screen bg-zinc-950 text-zinc-100 pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
          <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-emerald-500/10 p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 text-xs mb-4">
              <Compass className="w-4 h-4" /> Seer Academy
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">New to Crypto and Trading?</h1>
            <p className="text-zinc-300 max-w-3xl">
              This guided lane helps you build confidence before higher-risk actions. Seer works as a safety service:
              it explains risky patterns, protects protocol actions, and gives you a recovery path when needed.
            </p>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            {learningPath.map((step) => (
              <div key={step.title} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                  {step.icon}
                  <span>{step.title}</span>
                </div>
                <p className="text-sm text-zinc-400">{step.detail}</p>
                <Link
                  href={step.action.href}
                  className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
                >
                  {step.action.label}
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
              <h2 className="text-xl font-bold mb-4">Beginner Trading Rules With Seer</h2>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li>1. Start small and verify each step on the correct network.</li>
                <li>2. Avoid rapid repeated actions that may look abuse-like.</li>
                <li>3. Keep records: tx hash, timestamp, and reason code if shown.</li>
                <li>4. Use Seer reason-code lookup and appeal bundle when blocked.</li>
                <li>5. Build trust through consistent, legitimate activity over time.</li>
              </ul>
              <div className="mt-5 flex gap-3">
                <Link href="/appeals" className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-sm">
                  Open Seer Appeals
                </Link>
                <Link href="/seer-service" className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-400/40 text-purple-200 text-sm">
                  Open Seer Service Center
                </Link>
                <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm">
                  View ProofScore
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
              <h2 className="text-xl font-bold mb-4">Crypto Glossary</h2>
              <div className="space-y-3 text-sm">
                {glossary.map(([term, desc]) => (
                  <div key={term} className="border border-zinc-800 rounded-lg p-3 bg-black/20">
                    <div className="text-cyan-300 font-medium">{term}</div>
                    <div className="text-zinc-400">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-xl font-bold mb-2">First Trade Readiness Checklist</h2>
            <p className="text-sm text-zinc-400 mb-4">Complete these before meaningful trade size. Progress: {completed}/{checklistItems.length}</p>
            <div className="grid md:grid-cols-2 gap-3">
              {checklistItems.map((item) => (
                <label key={item.key} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-black/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checks[item.key]}
                    onChange={(e) => setChecks((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="mt-1"
                  />
                  <span className="text-sm text-zinc-300">{item.label}</span>
                </label>
              ))}
            </div>
            {completed === checklistItems.length && (
              <div className="mt-4 inline-flex items-center gap-2 text-emerald-300 text-sm">
                <CheckCircle2 className="w-4 h-4" /> You are ready for responsible first trades.
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
