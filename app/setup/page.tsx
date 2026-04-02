'use client';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AccountTab } from './components/AccountTab';
import { VaultTab } from './components/VaultTab';
import { SecurityTab } from './components/SecurityTab';

type TabId = 'account' | 'vault' | 'security';

const TAB_LABELS: Record<TabId, string> = { 'account': 'Account', 'vault': 'Vault', 'security': 'Security' };
const TAB_IDS: TabId[] = ['account', 'vault', 'security'];

export default function SetupPage() {
  const [activeTab, setActiveTab] = useState<TabId>('account');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2">Setup</motion.h1>
          <p className="text-white/60 mb-8">Configure your VFIDE account</p>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {TAB_IDS.map(id => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'account' && <AccountTab />}
          {activeTab === 'vault' && <VaultTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
