'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Flag, ShieldAlert } from 'lucide-react';
import { LookupTab } from './components/LookupTab';
import { ReportTab } from './components/ReportTab';
import { MyEscrowsTab } from './components/MyEscrowsTab';

type TabId = 'lookup' | 'report' | 'escrows';

const TABS: { id: TabId; label: string; Icon: typeof Search }[] = [
  { id: 'lookup', label: 'Lookup', Icon: Search },
  { id: 'report', label: 'File a Complaint', Icon: Flag },
  { id: 'escrows', label: 'My Escrows', Icon: ShieldAlert },
];

export default function FraudPage() {
  const [activeTab, setActiveTab] = useState<TabId>('lookup');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-[4.5rem]">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2"
          >
            Trust &amp; Fraud Reporting
          </motion.h1>
          <p className="text-white/60 mb-2">Community-driven fraud reporting. Non-custodial — escrows delay transfers, never seize them.</p>
          <p className="text-white/40 text-sm mb-8">
            DAO-arbitrated: 3 complaints trigger review, the DAO decides the outcome, escrows release after 30 days.
          </p>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'lookup' && <LookupTab />}
          {activeTab === 'report' && <ReportTab />}
          {activeTab === 'escrows' && <MyEscrowsTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
