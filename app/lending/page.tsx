'use client';

export const dynamic = 'force-dynamic';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, HandshakeIcon, Landmark, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { Footer } from '@/components/layout/Footer';
import { BrowseTab } from './components/BrowseTab';
import { MyLoansTab } from './components/MyLoansTab';
import { OfferTab } from './components/OfferTab';

type TabId = 'browse' | 'my-loans' | 'offer';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'browse',   label: 'Browse Offers', icon: BookOpen        },
  { id: 'my-loans', label: 'My Loans',       icon: ListChecks      },
  { id: 'offer',    label: 'Lend',           icon: Landmark        },
];

export default function LendingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('browse');

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Trust-Based Lending</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                  P2P Lending
                </span>
              </h1>
              <p className="text-white/50 text-lg">
                Your ProofScore is your collateral — no tokens locked, no credit check.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-cyan-400">$0</div>
                <div className="text-xs text-white/40">Token Collateral</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-purple-400">12%</div>
                <div className="text-xs text-white/40">Max Interest</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-amber-400">1–30</div>
                <div className="text-xs text-white/40">Days Duration</div>
              </div>
            </div>
          </div>

          {/* Trust model info banner */}
          <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex items-start gap-3">
              <HandshakeIcon size={18} className="text-cyan-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="text-sm text-zinc-300 leading-relaxed">
                <span className="text-white font-semibold">How it works: </span>
                Your ProofScore sets your borrow ceiling. After you accept an offer, one of your guardians
                must co-sign to activate the loan. Default penalties are graduated — a completed payment plan
                costs far less than a full default. Interest is capped at 12%, duration at 30 days,
                with a 3-day grace period built in.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sticky Tab Bar */}
        <div
          className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}
        >
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}
              >
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'browse'   && <BrowseTab />}
            {activeTab === 'my-loans' && <MyLoansTab />}
            {activeTab === 'offer'    && <OfferTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
