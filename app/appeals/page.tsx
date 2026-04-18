'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { ActiveTab } from './components/ActiveTab';
import { ResolvedTab } from './components/ResolvedTab';
import { SubmitTab } from './components/SubmitTab';

type TabId = 'active' | 'submit' | 'resolved';

const TAB_LABELS: Record<TabId, string> = { active: 'Active', submit: 'Submit', resolved: 'Resolved' };
const TAB_IDS: TabId[] = ['active', 'submit', 'resolved'];

export default function AppealsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('submit');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-2 text-4xl font-bold text-white">
            Appeals
          </h1>
          <p className="mb-8 text-white/60">Dispute review and trusted appeal handling for flagged actions.</p>

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

          {activeTab === 'active' && <ActiveTab />}
          {activeTab === 'submit' && <SubmitTab />}
          {activeTab === 'resolved' && <ResolvedTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
