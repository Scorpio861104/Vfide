"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { SimpleWalletConnect } from "@/components/wallet/SimpleWalletConnect";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProofScoreRing } from "@/components/ui/ProofScoreRing";
import { PageWrapper } from "@/components/ui/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { safeParseFloat, safeParseInt } from "@/lib/validation";
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Shield, ExternalLink, Copy, 
  CheckCircle2, TrendingUp, Activity, Trophy, Star, Award,
  Lock, Gift, Banknote, Vote, Calculator, ChevronRight,
  Sliders, Sparkles, Zap
} from "lucide-react";
import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { BadgeGallery } from "@/components/badge/BadgeGallery";
import { BadgeProgress } from "@/components/badge/BadgeProgress";
import { useUserBadges, useVaultBalance, useProofScore } from "@/lib/vfide-hooks";
import { EXPLORER_URL } from "@/lib/testnet";
import Link from "next/link";
import { useCopyToClipboard } from "@/lib/hooks/useCopyToClipboard";

type TabType = 'overview' | 'fee-simulator' | 'score-simulator' | 'badges';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

function GlassCard({ children, className = "", hover = true }: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      transition={{ type: "spring", stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-linear-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  color = "cyan",
  href,
  loading = false
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: "cyan" | "green" | "gold" | "purple";
  href?: string;
  loading?: boolean;
}) {
  const colorMap = {
    cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400", glow: "shadow-cyan-500/20" },
    green: { bg: "bg-emerald-500/20", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
    gold: { bg: "bg-amber-500/20", text: "text-amber-400", glow: "shadow-amber-500/20" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400", glow: "shadow-purple-500/20" },
  };
  
  const styles = colorMap[color];
  
  const content = (
    <GlassCard className={`p-5 ${href ? 'cursor-pointer hover:border-white/20' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/60 text-sm font-medium">{label}</span>
        <div className={`p-2 rounded-xl ${styles.bg} shadow-lg ${styles.glow}`}>
          <Icon className={styles.text} size={18} />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton height={32} className="w-24 mb-1 bg-white/10" />
          <Skeleton height={14} className="w-16 bg-white/5" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold text-white mb-1">{value}</div>
          {subValue && (
            <div className={`text-sm ${styles.text} flex items-center gap-1`}>
              {href && <ChevronRight size={14} />}
              {subValue}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickAction({ 
  icon: Icon, 
  label, 
  href, 
  variant = "default" 
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  variant?: "primary" | "default";
}) {
  const isPrimary = variant === "primary";
  
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`p-4 rounded-2xl font-semibold transition-all flex flex-col items-center gap-3 text-center ${isPrimary 
          ? 'bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
          : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20'}`}
      >
        <div className={`p-3 rounded-xl ${isPrimary ? 'bg-white/20' : 'bg-linear-to-br from-white/10 to-white/5'}`}>
          <Icon size={24} />
        </div>
        <span className="text-sm">{label}</span>
      </motion.div>
    </Link>
  );
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { copied: copiedAddress, copy } = useCopyToClipboard();
  
  const { balance: vaultBalanceRaw, isLoading: vaultLoading } = useVaultBalance();
  const { score: proofscore, tier, isLoading: scoreLoading } = useProofScore(address);
  
  const walletAddress = address || "";
  const walletBalance = vaultLoading ? "Loading..." : vaultBalanceRaw;
  const PRESALE_REFERENCE_PRICE = 0.01;
  const balanceValue = safeParseFloat(vaultBalanceRaw, 0);
  const usdValue = vaultLoading ? "..." : (balanceValue * PRESALE_REFERENCE_PRICE).toFixed(2);
  
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
        <GlobalNav />
        <main className="min-h-screen bg-[#08080A] pt-20 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center px-4 relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-linear-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-xl"
            >
              <Wallet className="text-cyan-400" size={48} />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Connect Your Wallet</h1>
            <p className="text-white/60 mb-8 max-w-md text-lg">
              Connect your wallet to access your dashboard, view your ProofScore, and explore the ecosystem.
            </p>
            <SimpleWalletConnect />
          </motion.div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <GlobalNav />
      
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00F0FF]/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
          </div>

        <section className="relative py-8 border-b border-white/5">
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
                <div className="flex items-center gap-3 flex-wrap">
                  <motion.div whileHover={{ scale: 1.02 }} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-white font-mono text-sm">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
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
                    <a href={`${EXPLORER_URL}/address/${walletAddress}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <ExternalLink className="text-white/60" size={14} />
                    </a>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} className="px-4 py-2 bg-linear-to-r from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 rounded-full">
                    <span className="text-cyan-400 font-bold text-sm flex items-center gap-2">
                      <Zap size={14} />
                      ProofScore {proofscore}
                    </span>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} className="px-4 py-2 bg-linear-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 rounded-full">
                    <span className="text-emerald-400 font-bold text-sm">{currentFeeRate.toFixed(2)}% fee</span>
                  </motion.div>
                </div>
              </div>
              <SimpleWalletConnect />
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

        <section className="sticky top-20 z-40 bg-[#08080A]/80 backdrop-blur-xl border-b border-white/5">
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
                      ? 'bg-linear-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
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
      </main>
      </PageWrapper>

      <Footer />
    </>
  );
}

function OverviewTab({ proofscore, feeRate }: { proofscore: number; feeRate: number }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6" hover={false}>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="text-amber-400" size={24} />
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <QuickAction icon={ArrowUpRight} label="Send" href="/pay" variant="primary" />
            <QuickAction icon={Shield} label="Vault" href="/vault" />
            <QuickAction icon={Lock} label="Escrow" href="/escrow" />
            <QuickAction icon={Banknote} label="Payroll" href="/payroll" />
            <QuickAction icon={Vote} label="Governance" href="/governance" />
            <QuickAction icon={Gift} label="Rewards" href="/rewards" />
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="text-cyan-400" size={24} />
              Your ProofScore
            </h2>
            <div className="flex flex-col items-center py-6">
              <ProofScoreRing score={proofscore} size="lg" />
              <div className="mt-6 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" as const, delay: 0.5 }} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                  <span className="text-emerald-400 font-bold">{feeRate.toFixed(2)}% transfer fee</span>
                </motion.div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Star className="text-amber-400" size={24} />
              Score Breakdown
            </h2>
            <div className="space-y-4">
              {[
                { label: "Transaction Volume", value: 2500, max: 3000, color: "cyan" },
                { label: "Account Age", value: 1200, max: 2000, color: "emerald" },
                { label: "Badge Bonuses", value: 800, max: 1500, color: "amber" },
                { label: "Governance Participation", value: 500, max: 1000, color: "purple" },
                { label: "Community Endorsements", value: 300, max: 500, color: "pink" },
              ].map((item, index) => (
                <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">{item.label}</span>
                    <span className="text-white font-medium">{item.value.toLocaleString()} / {item.max.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(item.value / item.max) * 100}%` }} transition={{ duration: 1, delay: index * 0.1 }} className={`h-full rounded-full bg-linear-to-r ${
                      item.color === 'cyan' ? 'from-cyan-500 to-cyan-400' :
                      item.color === 'emerald' ? 'from-emerald-500 to-emerald-400' :
                      item.color === 'amber' ? 'from-amber-500 to-amber-400' :
                      item.color === 'purple' ? 'from-purple-500 to-purple-400' :
                      'from-pink-500 to-pink-400'
                    }`} />
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Total ProofScore</span>
                <span className="text-2xl font-bold text-cyan-400">{proofscore}</span>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <GlassCard className="p-6" hover={false}>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-cyan-400" size={24} />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {[
              { desc: "Sent 500 VFIDE to 0x742d...5678", time: "2 hours ago", icon: ArrowUpRight, color: "cyan" },
              { desc: "Received 1,200 VFIDE from presale", time: "1 day ago", icon: ArrowDownLeft, color: "emerald" },
              { desc: "Earned PIONEER badge", time: "2 days ago", icon: Award, color: "amber" },
              { desc: "Voted on Proposal #42", time: "3 days ago", icon: Vote, color: "purple" },
            ].map((activity, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors">
                <div className={`p-2 rounded-xl ${
                  activity.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' :
                  activity.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                  activity.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  <activity.icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{activity.desc}</p>
                  <p className="text-white/40 text-xs">{activity.time}</p>
                </div>
                <ChevronRight className="text-white/20" size={16} />
              </motion.div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/history" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium inline-flex items-center gap-1">
              View All Activity <ChevronRight size={14} />
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function FeeSimulatorTab({ currentScore }: { currentScore: number }) {
  const [amount, setAmount] = useState(1000);
  const [simulatedScore, setSimulatedScore] = useState(currentScore);
  
  const calculateFee = (score: number) => {
    if (score <= 4000) return 5.00;
    if (score >= 8000) return 0.25;
    return 5.00 - ((score - 4000) * 4.75 / 4000);
  };
  
  const feePercent = calculateFee(simulatedScore);
  const feeAmount = (amount * feePercent) / 100;
  const netAmount = amount - feeAmount;
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-8" hover={false}>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Calculator className="text-cyan-400" size={28} />
            Fee Simulator
          </h2>
          <p className="text-white/60 mb-8">See how your ProofScore affects transaction fees</p>
          
          <div className="space-y-8">
            <div>
              <label className="block text-white/80 font-medium mb-3">Transfer Amount (VFIDE)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-xl font-bold focus:outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
            
            <div>
              <label className="block text-white/80 font-medium mb-3">
                Simulated ProofScore: <span className="text-cyan-400">{simulatedScore}</span>
              </label>
              <input type="range" min={0} max={10000} value={simulatedScore} onChange={(e) => setSimulatedScore(Number(e.target.value))} className="w-full h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500" />
              <div className="flex justify-between text-white/40 text-xs mt-2">
                <span>0</span>
                <span>4000 (5%)</span>
                <span>8000 (0.25%)</span>
                <span>10000</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-center">
                <p className="text-white/60 text-sm mb-1">Fee Rate</p>
                <p className="text-2xl font-bold text-amber-400">{feePercent.toFixed(2)}%</p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-white/60 text-sm mb-1">Fee Amount</p>
                <p className="text-2xl font-bold text-red-400">-{feeAmount.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-white/60 text-sm mb-1">You Receive</p>
                <p className="text-2xl font-bold text-emerald-400">{netAmount.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <p className="text-cyan-400 text-sm">
                💡 <strong>Tip:</strong> Your current score of {currentScore} gives you a {calculateFee(currentScore).toFixed(2)}% fee rate.
                {currentScore < 8000 && ` Increase your score to 8000 to unlock the minimum 0.25% rate!`}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function ScoreSimulatorTab({ currentScore }: { currentScore: number }) {
  const [activities, setActivities] = useState({
    transactions: 10,
    vaultDeposit: 1000,
    governanceVotes: 5,
    endorsements: 3,
    badges: 2,
  });
  
  const calculateBonus = () => {
    return (
      activities.transactions * 50 +
      Math.floor(activities.vaultDeposit / 100) * 10 +
      activities.governanceVotes * 100 +
      activities.endorsements * 150 +
      activities.badges * 200
    );
  };
  
  const projectedScore = Math.min(10000, currentScore + calculateBonus());
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-2xl mx-auto space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-8" hover={false}>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Sliders className="text-purple-400" size={28} />
            Score Simulator
          </h2>
          <p className="text-white/60 mb-8">Plan your path to a higher ProofScore</p>
          
          <div className="space-y-6">
            {[
              { key: 'transactions', label: 'Monthly Transactions', bonus: 50, max: 50 },
              { key: 'vaultDeposit', label: 'Vault Deposit (VFIDE)', bonus: 10, max: 10000, step: 100 },
              { key: 'governanceVotes', label: 'Governance Votes', bonus: 100, max: 20 },
              { key: 'endorsements', label: 'Endorsements Received', bonus: 150, max: 10 },
              { key: 'badges', label: 'New Badges Earned', bonus: 200, max: 10 },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-white/80 text-sm mb-2">
                    {item.label} <span className="text-cyan-400/60">(+{item.bonus} per)</span>
                  </label>
                  <input type="range" min={0} max={item.max} step={item.step || 1} value={activities[item.key as keyof typeof activities]} onChange={(e) => setActivities(prev => ({ ...prev, [item.key]: Number(e.target.value) }))} className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500" />
                </div>
                <div className="w-20 text-right">
                  <span className="text-white font-bold">{activities[item.key as keyof typeof activities]}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 p-6 bg-linear-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/80">Current Score</span>
              <span className="text-xl font-bold text-white">{currentScore}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-white/80">Projected Bonus</span>
              <span className="text-xl font-bold text-emerald-400">+{calculateBonus()}</span>
            </div>
            <div className="h-px bg-white/20 my-4" />
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Projected Score</span>
              <span className="text-3xl font-bold text-purple-400">{projectedScore}</span>
            </div>
          </div>
          
          {projectedScore >= 8000 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="text-emerald-400" size={24} />
              <span className="text-emerald-400">🎉 You will unlock the minimum 0.25% fee rate!</span>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function BadgesTab({ address }: { address: `0x${string}` | undefined }) {
  const { badgeIds, isLoading } = useUserBadges(address);
  
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <GlassCard className="p-6" hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="text-amber-400" size={24} />
              Your Badges
            </h2>
            <Link href="/badges" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium inline-flex items-center gap-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full" />
            </div>
          ) : (
            <>
              <BadgeGallery address={address} />
              <div className="mt-6">
                <BadgeProgress address={address} />
              </div>
            </>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
