'use client';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Home, BarChart3, Award, Calculator, Activity } from 'lucide-react';
import { ProofScoreTierProgress } from '@/components/proofscore';
import { ProofScoreRing } from '@/components/ui/ProofScoreRing';
import { FeeSavingsCard } from '@/components/fees';
import { OnboardingProgressBar, OnboardingProvider } from '@/components/onboarding';
import { QuickWalletConnect } from '@/components/wallet/QuickWalletConnect';
import { NonCustodialNotice } from '@/components/compliance';
import { useProofScore } from '@/lib/vfide-hooks';
import { LocaleProvider } from '@/lib/locale/LocaleProvider';

import { OverviewTab } from './components/OverviewTab';
import { BadgesTab } from './components/BadgesTab';
import { ScoreSimulatorTab } from './components/ScoreSimulatorTab';
import { FeeSimulatorTab } from './components/FeeSimulatorTab';
import { RecentActivitySection } from './components/RecentActivity';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'badges', label: 'Badges', icon: Award },
  { id: 'score', label: 'Score Simulator', icon: Calculator },
  { id: 'fees', label: 'Fee Simulator', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
] as const;
type TabId = typeof tabs[number]['id'];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { address, isConnected } = useAccount();
  const { score = 4500 } = useProofScore();
  const proofScore = score;
  const totalVolume = 3200;
  const txCount = 87;
  const feeRate = proofScore <= 4000 ? 5.0 : proofScore >= 8000 ? 0.25 : 5.0 - ((proofScore - 4000) * 4.75) / 4000;

  return (
    <>
      <LocaleProvider>
        <OnboardingProvider>
          <OnboardingProgressBar />
          <div className="min-h-screen bg-zinc-950 pt-20">
          <div className="container mx-auto px-4 max-w-6xl py-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>
            </motion.div>

            {!isConnected ? (
              <div className="rounded-2xl border border-white/10 bg-white/3 p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
                <p className="text-gray-400">Connect your wallet to access your dashboard, activity, and personalized score insights.</p>
                <div className="flex justify-center">
                  <QuickWalletConnect />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/3 border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                    <ProofScoreRing score={proofScore} />
                    <div className="text-white font-semibold mt-3">ProofScore {proofScore}</div>
                    <div className="w-full mt-4"><ProofScoreTierProgress score={proofScore} /></div>
                  </div>
                  <FeeSavingsCard totalVolume={totalVolume} transactionCount={txCount} buyerFeeBps={50} />
                </div>

                <NonCustodialNotice className="mb-6" />

                <div role="tablist" aria-label="Dashboard sections" className="flex gap-2 mb-8 overflow-x-auto pb-2">
                  {tabs.map(tab => (
                    <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                        activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                      }`}><tab.icon size={16} />{tab.label}</button>
                  ))}
                </div>

                {activeTab === 'overview' && <OverviewTab proofscore={proofScore} feeRate={feeRate} />}
                {activeTab === 'badges' && <BadgesTab address={address} />}
                {activeTab === 'score' && <ScoreSimulatorTab currentScore={proofScore} />}
                {activeTab === 'fees' && <FeeSimulatorTab currentScore={proofScore} />}
                {activeTab === 'activity' && <RecentActivitySection />}
              </>
            )}
          </div>
          </div>
        </OnboardingProvider>
      </LocaleProvider>
      <Footer />
    </>
  );
}
