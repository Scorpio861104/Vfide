'use client';

import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart2, Play, RefreshCw, Star } from 'lucide-react';
import { useState } from 'react';

const Footer = dynamic(() => import('@/components/layout/Footer').then((m) => m.Footer), { ssr: false });
const FeedTab = dynamic(() => import('./components/FeedTab').then((m) => m.FeedTab), { ssr: false });
const PremiumTab = dynamic(() => import('./components/PremiumTab').then((m) => m.PremiumTab), { ssr: false });
const SubscriptionsTab = dynamic(() => import('./components/SubscriptionsTab').then((m) => m.SubscriptionsTab), { ssr: false });
const DashboardTab = dynamic(() => import('./components/DashboardTab').then((m) => m.DashboardTab), { ssr: false });

type TabId = 'feed' | 'premium' | 'subscriptions' | 'dashboard';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'feed',          label: 'Feed',          icon: Play       },
  { id: 'premium',       label: 'Premium',       icon: Star       },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw  },
  { id: 'dashboard',     label: 'Dashboard',     icon: BarChart2  },
];

export default function CryptoSocialDemo() {
  const [activeTab, setActiveTab] = useState<TabId>('feed');

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>
      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Interactive Demo</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Social Commerce Demo</span>
          </h1>
          <p className="text-white/50 text-lg">Try the social commerce features — feed, premium content, subscriptions.</p>
        </motion.div>
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
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'feed'          && <FeedTab />}
            {activeTab === 'premium'       && <PremiumTab />}
            {activeTab === 'subscriptions' && <SubscriptionsTab />}
            {activeTab === 'dashboard'     && <DashboardTab />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
