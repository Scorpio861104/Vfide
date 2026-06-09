'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Home, BarChart3, Award, Calculator, Activity, Wallet2, TrendingUp, Zap } from 'lucide-react';
import { ProofScoreRing, ProofScoreTierProgress } from '@/components/proofscore';
import { FeeSavingsCard } from '@/components/fees';
import { OnboardingProgressBar } from '@/components/onboarding';
import { NonCustodialNotice } from '@/components/compliance';
import { GetTestVfideBanner } from '@/components/testnet/GetTestVfideBanner';
import { useProofScore } from '@/hooks/useProofScore';
import { useCivilizationStatus } from '@/hooks/useCivilizationStatus';
import { CitizenStatusGrid } from '@/components/civilization/CitizenStatusGrid';
import { RecommendedActions } from '@/components/civilization/RecommendedActions';
import { CivilizationRelationships } from '@/components/civilization/CivilizationRelationships';
import { OverviewTab } from './components/OverviewTab';
import { BadgesTab } from './components/BadgesTab';
import { ScoreSimulatorTab } from './components/ScoreSimulatorTab';
import { FeeSimulatorTab } from './components/FeeSimulatorTab';
import { RecentActivity } from './components/RecentActivity';
import { useLocale } from '@/lib/locale/LocaleProvider';

const DASHBOARD_COPY = {
  'en-US': {
    badge: 'Dashboard',
    welcome: 'Welcome back',
    proofScoreLabel: 'ProofScore',
    feeRateLabel: 'Fee Rate',
    txLabel: 'Transactions',
    tabs: {
      overview: 'Overview',
      badges: 'Badges',
      score: 'Score Sim',
      fees: 'Fee Sim',
      activity: 'Activity',
    },
  },
  'es-ES': {
    badge: 'Panel',
    welcome: 'Bienvenido de nuevo',
    proofScoreLabel: 'ProofScore',
    feeRateLabel: 'Comisión',
    txLabel: 'Transacciones',
    tabs: {
      overview: 'Resumen',
      badges: 'Insignias',
      score: 'Sim score',
      fees: 'Sim comisión',
      activity: 'Actividad',
    },
  },
};

const tabIcons = {
  overview: Home,
  badges: Award,
  score: Calculator,
  fees: BarChart3,
  activity: Activity,
} as const;

type TabId = keyof typeof tabIcons;

function truncateAddress(address?: string) {
  if (!address) return null;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { address } = useAccount();
  const { locale } = useLocale();
  const copy = (DASHBOARD_COPY as Record<string, typeof DASHBOARD_COPY['en-US']>)[locale] ?? DASHBOARD_COPY['en-US'];
  const { score: proofScore, burnFee: feeRate } = useProofScore();
  const civ = useCivilizationStatus();
  const proofScoreValue = proofScore ?? 0;
  const feeRateValue = feeRate ?? 0;
  const [txCount, setTxCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const tabs = [
    { id: 'overview' as const, label: copy.tabs.overview, icon: tabIcons.overview },
    { id: 'badges' as const, label: copy.tabs.badges, icon: tabIcons.badges },
    { id: 'score' as const, label: copy.tabs.score, icon: tabIcons.score },
    { id: 'fees' as const, label: copy.tabs.fees, icon: tabIcons.fees },
    { id: 'activity' as const, label: copy.tabs.activity, icon: tabIcons.activity },
  ];

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

  return (
    <>
      <OnboardingProgressBar />

      <div className="ui-page-shell min-h-screen md:pt-[3.5rem] relative">
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
          <div className="ui-container-breathing py-10 sm:py-12">
            <div className="glass-card-premium ui-card-sheen p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="badge-live mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> {copy.badge}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {copy.welcome}
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
                className="grid w-full grid-cols-1 gap-3 sm:w-auto sm:grid-cols-3"
              >
                <div className="glass-surface px-4 py-3 flex items-center gap-2.5">
                  <TrendingUp size={15} className="text-cyan-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{copy.proofScoreLabel}</p>
                    <p className="text-lg font-bold text-glow-cyan leading-none">{proofScoreValue.toLocaleString()}</p>
                  </div>
                </div>
                <div className="glass-surface px-4 py-3 flex items-center gap-2.5">
                  <Zap size={15} className="text-amber-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{copy.feeRateLabel}</p>
                    <p className="text-lg font-bold text-amber-400 leading-none">{(feeRateValue / 100).toFixed(2)}%</p>
                  </div>
                </div>
                <div className="glass-surface px-4 py-3 flex items-center gap-2.5">
                  <Wallet2 size={15} className="text-emerald-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{copy.txLabel}</p>
                    <p className="text-lg font-bold text-emerald-400 leading-none">{txCount}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="ui-container-breathing py-8">

          <GetTestVfideBanner className="mb-6" />

          <div className="mb-8 space-y-6">
            <RecommendedActions recommendations={civ.recommendations} />
            <CitizenStatusGrid institutions={civ.institutions} />
            <CivilizationRelationships />
          </div>

          {/* Score + Fee row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="analytics-card p-6 flex flex-col items-center"
            >
              <ProofScoreRing score={proofScoreValue} size={160} />
              <div className="w-full mt-5">
                <ProofScoreTierProgress score={proofScoreValue} />
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
                buyerFeeBps={50}
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
            className="glass-surface mb-7 flex gap-2 overflow-x-auto p-1.5 scrollbar-hide"
            role="tablist"
            aria-label="Dashboard sections"
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`dashboard-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`dashboard-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
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
              id={`dashboard-panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`dashboard-tab-${activeTab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview'  && <OverviewTab proofscore={proofScoreValue} feeRate={feeRateValue} address={address} />}
              {activeTab === 'badges'    && <BadgesTab address={address as `0x${string}` | undefined} />}
              {activeTab === 'score'     && <ScoreSimulatorTab currentScore={proofScoreValue} />}
              {activeTab === 'fees'      && <FeeSimulatorTab currentScore={proofScoreValue} />}
              {activeTab === 'activity'  && <RecentActivity />}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
      <Footer />
    </>
  );
}
