'use client';

import { lazy, Suspense, useState } from 'react';
import { Footer } from "@/components/layout/Footer";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Heart, Key, FileText, Clock } from "lucide-react";

import type { TabType } from './components/types';

// ── Lazy-loaded tab components (code-split per tab) ─────────────────────────
const OverviewTab = lazy(() => import('./components/OverviewTab').then(m => ({ default: m.OverviewTab })));
const MyGuardiansTab = lazy(() => import('./components/MyGuardiansTab').then(m => ({ default: m.MyGuardiansTab })));
const NextOfKinTab = lazy(() => import('./components/NextOfKinTab').then(m => ({ default: m.NextOfKinTab })));
const RecoveryTab = lazy(() => import('./components/RecoveryTab').then(m => ({ default: m.RecoveryTab })));
const ResponsibilitiesTab = lazy(() => import('./components/ResponsibilitiesTab').then(m => ({ default: m.ResponsibilitiesTab })));
const PendingActionsTab = lazy(() => import('./components/PendingActionsTab').then(m => ({ default: m.PendingActionsTab })));

// ── Config ──────────────────────────────────────────────────────────────────
const TAB_CONFIG = [
  { id: 'overview' as const, label: 'Overview', icon: Shield },
  { id: 'my-guardians' as const, label: 'My Guardians', icon: Users },
  { id: 'next-of-kin' as const, label: 'Next of Kin', icon: Heart },
  { id: 'recovery' as const, label: 'Chain of Return', icon: Key },
  { id: 'responsibilities' as const, label: 'Responsibilities', icon: FileText },
  { id: 'pending' as const, label: 'Pending Actions', icon: Clock },
] as const;

const COLOR_MAP: Record<TabType, { gradient: string; shadow: string }> = {
  overview: { gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/25' },
  'my-guardians': { gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-500/25' },
  'next-of-kin': { gradient: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/25' },
  recovery: { gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/25' },
  responsibilities: { gradient: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/25' },
  pending: { gradient: 'from-red-500 to-orange-500', shadow: 'shadow-red-500/25' },
};

// ── Loading fallback ────────────────────────────────────────────────────────
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
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  return (
    <>
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-zinc-950 pt-20 relative overflow-hidden">
        {/* Premium Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-125 h-125 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-100 h-100 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-blue-500/5 rounded-full blur-[150px]" />
        </div>

        {/* Header */}
        <section className="py-12 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl shadow-lg shadow-cyan-500/25">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Guardian <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Dashboard</span>
                </h1>
                <p className="text-xl text-gray-400">
                  Manage recoveries only for vaults where the owner explicitly selected you as guardian
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 sticky top-20 z-40">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide" role="tablist" aria-label="Guardian management sections">
              {TAB_CONFIG.map(tab => {
                const isActive = activeTab === tab.id;
                const colors = COLOR_MAP[tab.id];
                return (
                  <motion.button
                    key={tab.id} role="tab" aria-selected={isActive} aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg ${colors.shadow}`
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <tab.icon size={18} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
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
                <div key="overview" role="tabpanel" id="tabpanel-overview"><OverviewTab /></div>
              )}
              {activeTab === 'my-guardians' && (
                <div key="my-guardians" role="tabpanel" id="tabpanel-my-guardians"><MyGuardiansTab isConnected={isConnected} /></div>
              )}
              {activeTab === 'next-of-kin' && (
                <div key="next-of-kin" role="tabpanel" id="tabpanel-next-of-kin"><NextOfKinTab isConnected={isConnected} /></div>
              )}
              {activeTab === 'recovery' && (
                <div key="recovery" role="tabpanel" id="tabpanel-recovery"><RecoveryTab isConnected={isConnected} /></div>
              )}
              {activeTab === 'responsibilities' && (
                <div key="responsibilities" role="tabpanel" id="tabpanel-responsibilities"><ResponsibilitiesTab isConnected={isConnected} /></div>
              )}
              {activeTab === 'pending' && (
                <div key="pending" role="tabpanel" id="tabpanel-pending"><PendingActionsTab isConnected={isConnected} /></div>
              )}
            </AnimatePresence>
          </Suspense>
        </div>
      </motion.main>

      <Footer />
    </>
  );
}
