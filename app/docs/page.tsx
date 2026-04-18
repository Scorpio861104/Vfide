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
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-2 text-4xl font-bold text-white">
            Documentation & Help
          </h1>
          <p className="mb-8 text-white/60">Learn how trust scoring, wallets, payments, and recovery all work together in VFIDE.</p>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`rounded-xl border px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
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
