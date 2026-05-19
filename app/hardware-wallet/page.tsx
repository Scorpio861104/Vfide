'use client';

import { useState } from 'react';
import { Footer } from '@/components/layout/Footer';
import { ConnectTab } from './components/ConnectTab';
import { GuideTab } from './components/GuideTab';
import { ManageTab } from './components/ManageTab';

type TabId = 'connect' | 'manage' | 'guide';

const TAB_LABELS: Record<TabId, string> = { connect: 'Connect', manage: 'Manage', guide: 'Setup Guide' };
const TAB_IDS: TabId[] = ['connect', 'manage', 'guide'];

export default function HardwareWalletPage() {
  const [activeTab, setActiveTab] = useState<TabId>('connect');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="badge-live mb-3">🔒 Hardware Security</div>
          <h1 className="mb-2 text-4xl font-black text-white tracking-tight">
            Hardware Wallet Setup
          </h1>
          <p className="mb-8 text-white/60">Maximum Security Setup for Ledger, Trezor, and cold-wallet signing workflows.</p>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
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

          {activeTab === 'connect' && <ConnectTab />}
          {activeTab === 'manage' && <ManageTab />}
          {activeTab === 'guide' && <GuideTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
