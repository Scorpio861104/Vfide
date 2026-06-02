'use client';
import _dynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

import { AnimatePresence, m , LazyMotion, domAnimation } from 'framer-motion';
import { Building2, CreditCard, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { useAccount } from 'wagmi';

import { Footer } from '@/components/layout/Footer';

import { FiatTab } from './components/FiatTab';
const FinanceTab = _dynamic(() => import('./components/FinanceTab').then(m => ({ default: m.FinanceTab })), { ssr: false });
import { GatewayTab } from './components/GatewayTab';
import { OverviewTab } from './components/OverviewTab';
import { useLocale } from '@/lib/locale/LocaleProvider';

const TABS = [
  { id: 'overview', label: 'Overview',           icon: Building2  },
  { id: 'gateway',  label: 'Enterprise Gateway', icon: Zap        },
  { id: 'fiat',     label: 'Fiat On/Off Ramp',   icon: CreditCard },
  { id: 'finance',  label: 'Finance',            icon: TrendingUp },
] as const;

type TabId = typeof TABS[number]['id'];

export default function EnterprisePage() {
  const { locale } = useLocale();
  void locale;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected } = useAccount();

  return (
    <LazyMotion features={domAnimation}>
      <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>
      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Business Infrastructure</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-accent via-indigo-400 to-violet-400 bg-clip-text text-transparent">Enterprise Gateway</span>
          </h1>
          <p className="text-white/50 text-lg">High-volume payment infrastructure for businesses — API access, fiat ramps, and finance tools.</p>
        </m.div>
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
          <m.div key={activeTab}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'gateway'  && <GatewayTab isConnected={isConnected} />}
            {activeTab === 'fiat'     && <FiatTab isConnected={isConnected} />}
            {activeTab === 'finance'  && <FinanceTab />}
          </m.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
    </LazyMotion>
  );
}
