'use client';

export const dynamic = 'force-dynamic';

import { lazy, Suspense, useState } from 'react';
import { Footer } from "@/components/layout/Footer";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Key, FileText, Clock, Heart } from "lucide-react";

import type { TabType } from './components/types';
import { useLocale } from '@/lib/locale/LocaleProvider';

// ── Lazy-loaded tab components (code-split per tab) ─────────────────────────
const OverviewTab = lazy(() => import('./components/OverviewTab').then(m => ({ default: m.OverviewTab })));
const MyGuardiansTab = lazy(() => import('./components/MyGuardiansTab').then(m => ({ default: m.MyGuardiansTab })));
const RecoveryTab = lazy(() => import('./components/RecoveryTab').then(m => ({ default: m.RecoveryTab })));
const ResponsibilitiesTab = lazy(() => import('./components/ResponsibilitiesTab').then(m => ({ default: m.ResponsibilitiesTab })));
const PendingActionsTab = lazy(() => import('./components/PendingActionsTab').then(m => ({ default: m.PendingActionsTab })));
const InheritanceActionsTab = lazy(() => import('./components/InheritanceActionsTab').then(m => ({ default: m.InheritanceActionsTab })));

// ── Config ──────────────────────────────────────────────────────────────────
// "Next of Kin" was a legacy inheritance flow for the non-CardBound vault
// implementation. CardBound is the only mode in this build (see
// isCardBoundVaultMode in lib/contracts.ts), so the Next-of-Kin tab —
// along with its 255-line panel and 7 always-throw stub functions in
// useVaultRecovery — was dead UI and has been removed.
const TAB_CONFIG = [
  { id: 'overview' as const, label: 'Overview', icon: Shield },
  { id: 'my-guardians' as const, label: 'My Guardians', icon: Users },
  { id: 'recovery' as const, label: 'Wallet Rotation', icon: Key },
  { id: 'responsibilities' as const, label: 'Responsibilities', icon: FileText },
  { id: 'pending' as const, label: 'Pending Actions', icon: Clock },
  { id: 'inheritance' as const, label: 'Inheritance', icon: Heart },
] as const;

// ── Loading fallback ─────────────────────────────────────────────────────────
function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
      <div className="h-8 bg-white/5 rounded-lg w-1/3" />
      <div className="h-48 bg-white/5 rounded-2xl" />
      <div className="h-48 bg-white/5 rounded-2xl" />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function GuardiansPage() {
  const { locale } = useLocale();
  void locale;

  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const visibleTabs = TAB_CONFIG;

  return (
    <>
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.07), transparent 65%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 -right-24 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(167,139,250,0.06), transparent 65%)', filter: 'blur(70px)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

        {/* Header */}
        <section className="py-10 relative z-10">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
              <div className="badge-live mb-3 w-fit"><Shield size={11} /> Security System</div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                Guardian Dashboard
              </h1>
              <p className="text-zinc-400 max-w-2xl">
                Manage recoveries only for vaults where the owner explicitly selected you as guardian.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="border-b border-white/8 sticky top-7 md:top-[5.25rem] z-40"
          style={{ background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(24px)' }}>
          <div className="container mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide" role="tablist" aria-label="Guardian management sections">
              {visibleTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id} role="tab" aria-selected={isActive} aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                      isActive ? 'tab-pill-active' : 'tab-pill-inactive'
                    }`}
                  >
                    <tab.icon size={15} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tab Content — each lazy-loaded and code-split */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          <Suspense fallback={<TabSkeleton />}>
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} role="tabpanel" id="tabpanel-overview">
                  <OverviewTab />
                </motion.div>
              )}
              {activeTab === 'my-guardians' && (
                <motion.div key="my-guardians" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} role="tabpanel" id="tabpanel-my-guardians">
                  <MyGuardiansTab isConnected={isConnected} />
                </motion.div>
              )}
              {activeTab === 'recovery' && (
                <motion.div key="recovery" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} role="tabpanel" id="tabpanel-recovery">
                  <RecoveryTab isConnected={isConnected} />
                </motion.div>
              )}
              {activeTab === 'responsibilities' && (
                <motion.div key="responsibilities" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} role="tabpanel" id="tabpanel-responsibilities">
                  <ResponsibilitiesTab isConnected={isConnected} />
                </motion.div>
              )}
              {activeTab === 'pending' && (
                <motion.div key="pending" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} role="tabpanel" id="tabpanel-pending">
                  <PendingActionsTab isConnected={isConnected} />
                </motion.div>
              )}
              {activeTab === 'inheritance' && (
                <motion.div key="inheritance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} role="tabpanel" id="tabpanel-inheritance">
                  <InheritanceActionsTab isConnected={isConnected} />
                </motion.div>
              )}
            </AnimatePresence>
          </Suspense>
        </div>
      </motion.main>

      <Footer />
    </>
  );
}
