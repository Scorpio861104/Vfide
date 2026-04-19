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
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-2 text-4xl font-bold text-white">
            Hardware Wallet Setup
          </h1>
          <p className="mb-8 text-white/60">Maximum Security Setup for Ledger, Trezor, and cold-wallet signing workflows.</p>

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

          {activeTab === 'connect' && <ConnectTab />}
          {activeTab === 'manage' && <ManageTab />}
          {activeTab === 'guide' && <GuideTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
