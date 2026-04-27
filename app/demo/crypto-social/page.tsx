'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { motion } from 'framer-motion';

const Footer = dynamic(() => import('@/components/layout/Footer').then((mod) => mod.Footer), { ssr: false });
const FeedTab = dynamic(() => import('./components/FeedTab').then((mod) => mod.FeedTab), { ssr: false });
const PremiumTab = dynamic(() => import('./components/PremiumTab').then((mod) => mod.PremiumTab), { ssr: false });
const SubscriptionsTab = dynamic(() => import('./components/SubscriptionsTab').then((mod) => mod.SubscriptionsTab), { ssr: false });
const DashboardTab = dynamic(() => import('./components/DashboardTab').then((mod) => mod.DashboardTab), { ssr: false });

type TabId = 'feed' | 'premium' | 'subscriptions' | 'dashboard';

const TAB_LABELS: Record<TabId, string> = { 'feed': 'Feed', 'premium': 'Premium', 'subscriptions': 'Subscriptions', 'dashboard': 'Dashboard' };
const TAB_IDS: TabId[] = ['feed', 'premium', 'subscriptions', 'dashboard'];

export default function CryptoSocialDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('feed');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2">Social Demo</motion.h1>
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
