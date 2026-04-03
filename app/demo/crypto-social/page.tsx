'use client';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FeedTab } from './components/FeedTab';
import { PremiumTab } from './components/PremiumTab';
import { SubscriptionsTab } from './components/SubscriptionsTab';
import { DashboardTab } from './components/DashboardTab';

type TabId = 'feed' | 'premium' | 'subscriptions' | 'dashboard';

const TAB_LABELS: Record<TabId, string> = {
  'feed': 'Social Feed with Tipping',
  'premium': 'Premium Content',
  'subscriptions': 'Subscriptions',
  'dashboard': 'Creator Dashboard'
};
const TAB_IDS: TabId[] = ['feed', 'premium', 'subscriptions', 'dashboard'];

export default function CryptoSocialDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('feed');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-white mb-2">Crypto-Social Integration Demo</h1>
          </motion.div>
          <p className="text-white/60 mb-8">Try the social commerce features</p>

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

          {activeTab === 'feed' && <FeedTab />}
          {activeTab === 'premium' && <PremiumTab />}
          {activeTab === 'subscriptions' && <SubscriptionsTab />}
          {activeTab === 'dashboard' && <DashboardTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
