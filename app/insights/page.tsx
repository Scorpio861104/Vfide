'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { BarChart3, TrendingUp, PiggyBank, FileText, BarChart2, Bell } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import nextDynamic from 'next/dynamic';

const FinancialDashboard = nextDynamic(() => import('@/components/FinancialDashboard'), { ssr: false });
const TaxesContent  = nextDynamic(() => import('./components/TaxesContent'),  { ssr: false });
const BudgetsContent = nextDynamic(() => import('./components/BudgetsContent'), { ssr: false });

// Performance sub-tabs

// Price-alerts sub-tabs
const AlertsActiveTab  = nextDynamic(() => import('@/app/price-alerts/components/ActiveTab').then(m => ({ default: m.ActiveTab })),    { ssr: false });
const AlertsCreateTab  = nextDynamic(() => import('@/app/price-alerts/components/CreateTab').then(m => ({ default: m.CreateTab })),    { ssr: false });
const PerformanceContent = nextDynamic(() => import('./components/PerformanceContent'), { ssr: false });

const AlertsHistoryTab = nextDynamic(() => import('@/app/price-alerts/components/HistoryTab').then(m => ({ default: m.HistoryTab })),  { ssr: false });

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  );
}

type TabId = 'overview' | 'budgets' | 'taxes' | 'performance' | 'price-alerts';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Overview',      icon: TrendingUp },
  { id: 'budgets',      label: 'Budgets',       icon: PiggyBank  },
  { id: 'taxes',        label: 'Tax Report',    icon: FileText   },
  { id: 'performance',  label: 'Performance',   icon: BarChart2  },
  { id: 'price-alerts', label: 'Price Alerts',  icon: Bell       },
];

function InsightsInner() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get('tab') as TabId | null) ?? 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.find(t => t.id === initial) ? initial : 'overview'
  );

  // Performance has its own sub-tabs
  // Price alerts has its own sub-tabs
  const [alertTab, setAlertTab] = useState<'active' | 'create' | 'history'>('active');

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative text-white">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 pt-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Financial Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-accent via-blue-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-3">
              <BarChart3 size={32} className="text-accent" />Insights
            </span>
          </h1>
          <p className="text-white/50 flex items-center gap-2 text-sm">
            <TrendingUp size={14} className="text-emerald-400" />
            Track treasury, revenue, and token momentum in real time.
          </p>
        </motion.div>

        {/* Primary tab bar */}
        <div
          className="flex gap-1 overflow-x-auto scrollbar-hide border-b border-white/5 mb-8 pb-px"
          role="tablist"
          aria-label="Insights sections"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'text-white border-b-2 border-accent -mb-px'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <LazyMotion features={domAnimation}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <Suspense fallback={<Spinner />}>
                {activeTab === 'overview' && <FinancialDashboard />}
                {activeTab === 'budgets'  && <BudgetsContent />}
                {activeTab === 'taxes'    && <TaxesContent />}

                {activeTab === 'performance' && <PerformanceContent />}

                {activeTab === 'price-alerts' && (
                  <div>
                    {/* Price-alerts sub-tabs */}
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6">
                      {([
                        { id: 'active', label: 'Active Alerts' },
                        { id: 'create', label: 'Create Alert' },
                        { id: 'history', label: 'History' },
                      ] as const).map(t => (
                        <button key={t.id} onClick={() => setAlertTab(t.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            alertTab === t.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >{t.label}</button>
                      ))}
                    </div>
                    {alertTab === 'active'  && <AlertsActiveTab />}
                    {alertTab === 'create'  && <AlertsCreateTab />}
                    {alertTab === 'history' && <AlertsHistoryTab />}
                  </div>
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </LazyMotion>
      </div>

      <Footer />
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    }>
      <InsightsInner />
    </Suspense>
  );
}
