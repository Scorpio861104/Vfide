'use client';

import { Footer } from "@/components/layout/Footer";
import { QuickWalletConnect } from "@/components/wallet/QuickWalletConnect";
import { Skeleton } from "@/components/ui/Skeleton";
import { SEOHead } from "@/components/seo/SEOHead";
import { ProofScoreRing } from "@/components/ui/ProofScoreRing";
import { PageWrapper } from "@/components/ui/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { safeParseFloat } from "@/lib/validation";
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Shield, ExternalLink, Copy, 
  CheckCircle2, TrendingUp, Activity, Trophy, Star, Award,
  Lock, Gift, Banknote, Vote, Calculator, ChevronRight,
  Sliders, Sparkles, Zap
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useAccount, useChainId } from 'wagmi';
import { BadgeGallery } from "@/components/badge/BadgeGallery";
import { BadgeProgress } from "@/components/badge/BadgeProgress";
import { useUserBadges, useVaultBalance, useProofScore, useVfidePrice } from "@/lib/vfide-hooks";
import { getExplorerUrlForChainId } from '@/lib/chains';
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

const ecosystemLoadout = [
  {
    icon: Shield,
    label: "Vault Security",
    description: "Self-custody vault controls",
    href: "/vault",
  },
  {
    icon: Lock,
    label: "Escrow",
    description: "Dispute-safe settlements",
    href: "/escrow",
  },
  {
    icon: Vote,
    label: "DAO Hub",
    description: "Proposals + dispute flow",
    href: "/dao-hub",
  },
  {
    icon: Sparkles,
    label: "Flashloans P2P",
    description: "Peer-powered credit pools",
    href: "/flashlight",
  },
  {
    icon: Banknote,
    label: "Social Pay",
    description: "Merchant & QR commerce",
    href: "/merchant",
  },
  {
    icon: Gift,
    label: "Rewards",
    description: "ProofScore boosters",
    href: "/rewards",
  },
];

function GlassCard({ children, className = "", hover = true }: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -4 } : {}}
      transition={{ type: "spring", stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 ${hover ? 'ring-effect' : ''} ${className}`}
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
          ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' 
          : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20'} ring-effect`}
      >
        <div className={`p-3 rounded-xl ${isPrimary ? 'bg-white/20' : 'bg-gradient-to-br from-white/10 to-white/5'}`}>
          <Icon size={24} />
        </div>
        <span className="text-sm">{label}</span>
      </motion.div>
    </Link>
  );
}

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
                  
                  <motion.div whileHover={{ scale: 1.05 }} className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 rounded-full">
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

function OverviewTab({ proofscore, feeRate }: { proofscore: number; feeRate: number }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={itemVariants}>
          <GlassCard className="p-6" hover={false}>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="text-amber-400" size={24} />
              Quick Actions
            </h2>
            <p className="text-white/50 text-sm mb-5">Jump straight into your most-used flows.</p>
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

      <motion.div variants={itemVariants}>
        <GlassCard className="p-6" hover={false}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-cyan-300" size={22} />
              Ecosystem Loadout
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              Fully loaded
            </span>
          </div>
          <p className="text-white/50 text-sm mb-5">
            Every core system is online and ready—move between vaults, governance, escrow, and credit in a single flow.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {ecosystemLoadout.map((item) => (
              <Link key={item.label} href={item.href}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/25 hover:bg-white/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white/10 p-2 text-cyan-200 group-hover:text-cyan-100 transition-colors">
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{item.label}</div>
                      <div className="text-xs text-white/50 mt-1">{item.description}</div>
                    </div>
                    <ChevronRight className="text-white/40 mt-1 transition-transform group-hover:translate-x-1" size={16} />
                  </div>
                </div>
              </Link>
            ))}
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
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(item.value / item.max) * 100}%` }} transition={{ duration: 1, delay: index * 0.1 }} className={`h-full rounded-full bg-gradient-to-r ${
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
        <RecentActivitySection />
      </motion.div>
    </motion.div>
  );
}

// Separate component to fetch activity from API
function RecentActivitySection() {
  const { address } = useAccount();
  const [activities, setActivities] = useState<Array<{type: string; desc: string; time: string; icon: typeof ArrowUpRight; color: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!address) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/activities/${address}`);
        if (res.ok) {
          const data = await res.json();
          // Map API response to activity format
          setActivities((data.activities || []).slice(0, 4).map((a: { type: string; description: string; timestamp: string }) => ({
            desc: a.description,
            time: formatTimeAgo(new Date(a.timestamp).getTime()),
            icon: a.type === 'send' ? ArrowUpRight : a.type === 'receive' ? ArrowDownLeft : a.type === 'badge' ? Award : Vote,
            color: a.type === 'send' ? 'cyan' : a.type === 'receive' ? 'emerald' : a.type === 'badge' ? 'amber' : 'purple',
          })));
        }
      } catch {
        // API failed - show empty state
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivity();
  }, [address]);

  return (
    <GlassCard className="p-6" hover={false}>
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Activity className="text-cyan-400" size={24} />
        Recent Activity
      </h2>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-white/10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-white/60 text-center py-8">No recent activity. Start transacting to see your history!</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <motion.div key={`${activity.type}-${activity.time}-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-xl hover:bg-white/8 transition-colors">
              <div className={`p-2 rounded-xl shrink-0 ${
                activity.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' :
                activity.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                activity.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                <activity.icon size={16} className="sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs sm:text-sm truncate">{activity.desc}</p>
                <p className="text-white/40 text-xs">{activity.time}</p>
              </div>
              <ChevronRight className="text-white/20" size={16} />
            </motion.div>
          ))}
        </div>
      )}
      <div className="mt-4 text-center">
        <Link href="/explorer" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium inline-flex items-center gap-1">
          View All Activity <ChevronRight size={14} />
        </Link>
      </div>
    </GlassCard>
  );
}

// Helper function for time formatting
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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
          
          <div className="mt-8 p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30">
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
  const { badgeIds: _badgeIds, isLoading } = useUserBadges(address);
  
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
