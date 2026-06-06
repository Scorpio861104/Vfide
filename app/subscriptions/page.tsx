'use client';

export const dynamic = 'force-dynamic';

import { AnimatePresence, m as motion } from 'framer-motion';
import { History, PlusCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Footer } from '@/components/layout/Footer';
import { FutureReleaseBanner } from '@/components/feedback/FutureReleaseBanner';

import { ActiveTab } from './components/ActiveTab';
import { CreateTab } from './components/CreateTab';
import { HistoryTab } from './components/HistoryTab';
import { useLocale } from '@/lib/locale/LocaleProvider';

type TabId = 'active' | 'create' | 'history';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'active',  label: 'Active',  icon: RefreshCw },
  { id: 'create',  label: 'Create',  icon: PlusCircle },
  { id: 'history', label: 'History', icon: History },
];

export default function SubscriptionsPage() {
  const { locale } = useLocale();
  void locale;

  const [activeTab, setActiveTab] = useState<TabId>('active');

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Recurring Payments</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-violet-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Subscriptions
            </span>
          </h1>
          <p className="text-white/50 text-lg">Plan and track recurring payments. On-chain auto-debit is a future release.</p>
        </motion.div>

        <div className="mb-6">
          <FutureReleaseBanner
            inline
            title="Tracker only — on-chain auto-debit ships with SubscriptionManager"
            description={
              'You can record subscription schedules here and they persist in the database so you have a history of intended recurring payments. ' +
              'Automatic on-chain debits on the next-payment date require SubscriptionManager.sol (currently in contracts/future/) to be deployed. ' +
              'Until then, treat the "next payment" date as a reminder, not an automated transfer.'
            }
          />
        </div>

        {/* Sticky Tab Bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'active'  && <ActiveTab />}
            {activeTab === 'create'  && <CreateTab />}
            {activeTab === 'history' && <HistoryTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
