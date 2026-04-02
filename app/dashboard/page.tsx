'use client';

import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { PageWrapper } from "@/components/ui/PageLayout";
import { QuickWalletConnect } from "@/components/wallet/QuickWalletConnect";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";
import { getExplorerUrlForChainId } from '@/lib/chains';
import { safeParseFloat } from "@/lib/validation";
import { useProofScore, useVaultBalance, useVfidePrice } from "@/lib/vfide-hooks";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Calculator,
  CheckCircle2,
  Copy,
  ExternalLink,
  Shield,
  Sliders,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount, useChainId } from 'wagmi';

import {
  BadgesTab,
  type DashboardTabType,
  FeeSimulatorTab,
  OverviewTab,
  ScoreSimulatorTab,
  StatCard,
  containerVariants,
  itemVariants,
} from "./components";

type TabType = DashboardTabType;

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const explorerUrl = getExplorerUrlForChainId(chainId);
  const { copied: copiedAddress, copy } = useCopyToClipboard();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  const { balance: vaultBalanceRaw, isLoading: vaultLoading } = useVaultBalance();
  const { score: proofscore, tier, isLoading: scoreLoading } = useProofScore(address);
  const { priceUsd: liveVfidePrice, isLoading: priceLoading } = useVfidePrice();
  
  const walletAddress = address || "";
  const walletBalance = vaultLoading ? "Loading..." : vaultBalanceRaw;
  const balanceValue = safeParseFloat(vaultBalanceRaw, 0);
  const usdValue = vaultLoading || priceLoading ? "..." : (balanceValue * liveVfidePrice).toFixed(2);
  
  const copyAddress = () => {
    copy(walletAddress);
  };

  const currentFeeRate = useMemo(() => {
    if (proofscore <= 4000) return 5.00;
    if (proofscore >= 8000) return 0.25;
    return 5.00 - ((proofscore - 4000) * 4.75 / 4000);
  }, [proofscore]);

  if (!isConnected) {
    return (
      <>
        <SEOHead
          title="Dashboard"
          description="Manage your VFIDE vault, view your ProofScore, and track your transactions."
          keywords="dashboard, vault, ProofScore, crypto wallet"
          canonicalUrl="https://vfide.io/dashboard"
        />
        <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-150 h-150 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-100 h-100 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <motion.div 
            initial={{ opacity: 1, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center px-4 relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-xl"
            >
              <Wallet className="text-cyan-400" size={48} />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Connect Your Wallet</h1>
            <p className="text-white/60 mb-8 max-w-md text-lg">
              Connect your wallet to access your dashboard, view your ProofScore, and explore the ecosystem.
            </p>
            <QuickWalletConnect size="lg" />
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <div className="pt-20 pb-20">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-150 h-150 bg-cyan-400/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-0 w-125 h-125 bg-purple-500/5 rounded-full blur-[100px]" />
          </div>

        <section data-onboarding="dashboard" className="relative py-8 border-b border-white/5">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 flex items-center gap-3">
                  Dashboard
                  <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}>
                    <Sparkles className="text-amber-400" size={28} />
                  </motion.span>
                </h1>
                <p className="text-white/60 max-w-2xl text-sm sm:text-base mb-4">
                  Your VFIDE command center for vaults, ProofScore, and governance—built to move at the speed of trust.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 max-w-full">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-white font-mono text-xs sm:text-sm truncate">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                    <button onClick={copyAddress} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <AnimatePresence mode="wait">
                        {copiedAddress ? (
                          <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <CheckCircle2 className="text-emerald-400" size={14} />
                          </motion.div>
                        ) : (
                          <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Copy className="text-white/60" size={14} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                    <a href={`${explorerUrl}/address/${walletAddress}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <ExternalLink className="text-white/60" size={14} />
                    </a>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} data-onboarding="proof-score" className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 rounded-full">
                    <span className="text-cyan-400 font-bold text-sm flex items-center gap-2">
                      <Zap size={14} />
                      ProofScore {proofscore}
                    </span>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-full">
                    <span className="text-emerald-400 font-bold text-sm">{currentFeeRate.toFixed(2)}% fee</span>
                  </motion.div>
                </div>
              </div>
              <QuickWalletConnect />
            </motion.div>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div variants={itemVariants}>
                <StatCard icon={Wallet} label="Wallet Balance" value={walletBalance} subValue={`≈ \$${usdValue}`} color="cyan" loading={vaultLoading} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={Shield} label="Vault" value={vaultBalanceRaw} subValue="Manage →" color="green" href="/vault" loading={vaultLoading} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={TrendingUp} label="ProofScore" value={proofscore} subValue={`${tier || 'NEUTRAL'} tier`} color="gold" loading={scoreLoading} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <StatCard icon={Calculator} label="Fee Rate" value={`${currentFeeRate.toFixed(2)}%`} subValue="On transfers" color="purple" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="sticky top-20 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide" role="tablist">
              {[
                { id: 'overview' as const, label: 'Overview', icon: Activity },
                { id: 'fee-simulator' as const, label: 'Fee Simulator', icon: Calculator },
                { id: 'score-simulator' as const, label: 'Score Simulator', icon: Sliders },
                { id: 'badges' as const, label: 'Badges', icon: Trophy },
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                      : 'bg-transparent text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-3 sm:px-4 py-8 relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <OverviewTab proofscore={proofscore} feeRate={currentFeeRate} />
              </motion.div>
            )}
            {activeTab === 'fee-simulator' && (
              <motion.div key="fee-simulator" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <FeeSimulatorTab currentScore={proofscore} />
              </motion.div>
            )}
            {activeTab === 'score-simulator' && (
              <motion.div key="score-simulator" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <ScoreSimulatorTab currentScore={proofscore} />
              </motion.div>
            )}
            {activeTab === 'badges' && (
              <motion.div key="badges" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <BadgesTab address={address} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </PageWrapper>

      <Footer />
    </>
  );
}

