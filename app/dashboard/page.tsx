'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Home, BarChart3, Award, Calculator, Activity } from 'lucide-react';
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

const tabs = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'badges', label: 'Badges', icon: Award },
  { id: 'score', label: 'Score Sim', icon: Calculator },
  { id: 'fees', label: 'Fee Sim', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
] as const;
type TabId = typeof tabs[number]['id'];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { address } = useAccount();
  const { score: proofScore, burnFee: feeRate } = useProofScore();
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

  return (
    <>
      <OnboardingProgressBar />
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold text-white mb-8">Dashboard</motion.h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/3 border border-white/10 rounded-2xl p-6 flex flex-col items-center"><ProofScoreRing score={proofScore} size={160} /><div className="w-full mt-4"><ProofScoreTierProgress score={proofScore} /></div></div>
            <FeeSavingsCard totalVolume={totalVolume} transactionCount={txCount} buyerFeeBps={50} />
          </div>
          <NonCustodialNotice className="mb-6" />
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}><tab.icon size={16} />{tab.label}</button>))}
          </div>
          {activeTab === 'overview' && <OverviewTab proofscore={proofScore} feeRate={feeRate} address={address} />}
          {activeTab === 'badges' && <BadgesTab address={address as `0x${string}` | undefined} />}
          {activeTab === 'score' && <ScoreSimulatorTab currentScore={proofScore} />}
          {activeTab === 'fees' && <FeeSimulatorTab currentScore={proofScore} />}
          {activeTab === 'activity' && <RecentActivity />}
        </div>
      </div>
      <Footer />
    </>
  );
}
