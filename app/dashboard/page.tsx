'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BarChart3, Award, Calculator, Activity, Wallet2, TrendingUp, Zap } from 'lucide-react';
import { ProofScoreRing, ProofScoreTierProgress } from '@/components/proofscore';
import { FeeSavingsCard } from '@/components/fees';
import { OnboardingProgressBar } from '@/components/onboarding';
import { NonCustodialNotice } from '@/components/compliance';
import { useProofScore } from '@/hooks/useProofScore';
import { OverviewTab } from './components/OverviewTab';
import { BadgesTab } from './components/BadgesTab';
import { ScoreSimulatorTab } from './components/ScoreSimulatorTab';
import { FeeSimulatorTab } from './components/FeeSimulatorTab';
import { RecentActivity } from './components/RecentActivity';
import { PageSkeleton } from '@/components/layout/PageSkeleton';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'badges',   label: 'Badges',   icon: Award },
  { id: 'score',    label: 'Score Sim', icon: Calculator },
  { id: 'fees',     label: 'Fee Sim',   icon: BarChart3 },
  { id: 'activity', label: 'Activity',  icon: Activity },
] as const;
type TabId = typeof tabs[number]['id'];

function truncateAddress(address?: string) {
  if (!address) return null;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { address, isConnecting } = useAccount();
  const { score: proofScore, burnFee: feeRate, isDisconnected: _scoreDisconnected, isLoading: scoreLoading } = useProofScore();
  const [txCount, setTxCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(`/api/activities/${address}`)
      .then(r => r.ok ? r.json() : { activities: [] })
      .then((data: { activities?: { data?: { amount?: number } }[] }) => {
        if (cancelled) return;
        const acts = Array.isArray(data?.activities) ? data.activities : [];
        setTxCount(acts.length);
        const vol = acts.reduce((sum, a) => sum + (Number(a?.data?.amount) || 0), 0);
        setTotalVolume(vol);
      })
      .catch(() => { /* leave defaults */ });
    return () => { cancelled = true; };
  }, [address]);

  // Show skeleton while wagmi reconnects or score hook is loading initial data
  if (isConnecting || scoreLoading) {
    return <PageSkeleton showHero cards={3} />;
  }


  return (
    <>
      <OnboardingProgressBar />

      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        {/* ── Dashboard hero header ── */}
        <div className="relative dashboard-hero-bg border-b border-white/5">
          <div className="container mx-auto px-4 max-w-6xl py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="badge-live mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Dashboard
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Welcome back
                  </h1>
                  {address && (
                    <p className="mt-1.5 text-sm text-zinc-500 font-mono">
                      {truncateAddress(address)}
                    </p>
                  )}
                </motion.div>
              </div>

              {/* Quick stats badges */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="flex items-center gap-3 flex-wrap"
              >
                <div className="glass-card-premium px-4 py-2.5 flex items-center gap-2.5">
                  <TrendingUp size={15} className="text-cyan-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">ProofScore</p>
                    <p className="text-lg font-bold text-glow-cyan leading-none">{proofScore!.toLocaleString()}</p>
                  </div>
                </div>
                <div className="glass-card-premium px-4 py-2.5 flex items-center gap-2.5">
                  <Zap size={15} className="text-amber-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Fee Rate</p>
                    <p className="text-lg font-bold text-amber-400 leading-none">{(feeRate! / 100).toFixed(2)}%</p>
                  </div>
                </div>
                <div className="glass-card-premium px-4 py-2.5 flex items-center gap-2.5">
                  <Wallet2 size={15} className="text-emerald-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Transactions</p>
                    <p className="text-lg font-bold text-emerald-400 leading-none">{txCount}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="container mx-auto px-4 max-w-6xl py-8">

          {/* Score + Fee row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="analytics-card p-6 flex flex-col items-center"
            >
              <ProofScoreRing score={proofScore!} size={160} />
              <div className="w-full mt-5">
                <ProofScoreTierProgress score={proofScore!} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
            >
              <FeeSavingsCard
                totalVolume={totalVolume}
                transactionCount={txCount}
                buyerFeeBps={feeRate ?? 500}
              />
            </motion.div>
          </div>

          {/* Non-custodial notice */}
          <NonCustodialNotice className="mb-6" />

          {/* Tab navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="flex gap-2 mb-7 overflow-x-auto pb-1 scrollbar-hide"
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'tab-pill-active'
                    : 'tab-pill-inactive'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview'  && <OverviewTab proofscore={proofScore ?? 0} feeRate={feeRate ?? 0} address={address} />}
              {activeTab === 'badges'    && <BadgesTab address={address as `0x${string}` | undefined} />}
              {activeTab === 'score'     && <ScoreSimulatorTab currentScore={proofScore ?? 0} />}
              {activeTab === 'fees'      && <FeeSimulatorTab currentScore={proofScore ?? 0} />}
              {activeTab === 'activity'  && <RecentActivity />}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
      <Footer />
    </>
  );
}
