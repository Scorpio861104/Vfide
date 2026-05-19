'use client';

import { useState } from 'react';
import { Footer } from '@/components/layout/Footer';
import { FaqTab } from './components/FaqTab';
import { LearnTab } from './components/LearnTab';
import { OverviewTab } from './components/OverviewTab';
import { SecurityTab } from './components/SecurityTab';

type TabId = 'overview' | 'learn' | 'faq' | 'security';

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  learn: 'Learn',
  faq: 'FAQ',
  security: 'Security',
};

const TAB_IDS: TabId[] = ['overview', 'learn', 'faq', 'security'];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-[4.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative container mx-auto max-w-6xl px-4 py-8">
          <div className="badge-live mb-3">
            Documentation & Guides
          </div>
          <h1 className="mb-2 text-4xl font-black text-white tracking-tight">
            <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
              Documentation & Help
            </span>
          </h1>
          <p className="mb-8 text-white/60">Learn how trust scoring, wallets, payments, and recovery all work together in VFIDE.</p>

          <div className="sticky top-[4.5rem] z-30 backdrop-blur-xl bg-zinc-950/80 mb-8 flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}
              >
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'learn' && <LearnTab />}
          {activeTab === 'faq' && <FaqTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
