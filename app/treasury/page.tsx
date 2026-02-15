'use client';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  Heart, 
  PieChart, 
  ArrowRight, 
  Clock,
  Coins
} from "lucide-react";

type TabType = 'overview' | 'sanctum' | 'ecosystem' | 'revenue' | 'vesting';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

export default function TreasuryPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: PieChart, color: 'cyan' },
    { id: 'sanctum' as const, label: 'Sanctum (Charity)', icon: Heart, color: 'pink' },
    { id: 'ecosystem' as const, label: 'Ecosystem Vault', icon: Users, color: 'purple' },
    { id: 'revenue' as const, label: 'Revenue Splitter', icon: TrendingUp, color: 'emerald' },
    { id: 'vesting' as const, label: 'Dev Vesting', icon: Clock, color: 'amber' },
  ];

  const colorMap: Record<string, { active: string; hover: string }> = {
    cyan: { active: 'bg-linear-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25', hover: 'hover:bg-cyan-500/10 hover:text-cyan-400' },
    pink: { active: 'bg-linear-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25', hover: 'hover:bg-pink-500/10 hover:text-pink-400' },
    purple: { active: 'bg-linear-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25', hover: 'hover:bg-purple-500/10 hover:text-purple-400' },
    emerald: { active: 'bg-linear-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25', hover: 'hover:bg-emerald-500/10 hover:text-emerald-400' },
    amber: { active: 'bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25', hover: 'hover:bg-amber-500/10 hover:text-amber-400' },
  };

  return (
    <>
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(124,58,237,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
      </div>

      <motion.main 
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="min-h-screen pt-24 pb-16"
      >
        <div className="container mx-auto px-3 sm:px-4">
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-sm text-emerald-300 mb-4"
            >
              <Coins className="w-4 h-4" />
              Protocol Finances
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              <span className="bg-clip-text text-transparent bg-linear-to-r from-emerald-400 via-cyan-400 to-purple-400">
                Treasury Dashboard
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              View protocol treasury allocations, charity distributions, and ecosystem funding
            </p>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const colors = colorMap[tab.color];
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                    isActive ? colors?.active ?? '' : `bg-white/5 text-gray-400 ${colors?.hover ?? ''}`
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'sanctum' && <SanctumTab isConnected={isConnected} />}
              {activeTab === 'ecosystem' && <EcosystemTab isConnected={isConnected} />}
              {activeTab === 'revenue' && <RevenueTab />}
              {activeTab === 'vesting' && <VestingTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
      <Footer />
    </>
  );
}

// GlassCard component for consistent styling
function GlassCard({ children, className = "", gradient }: { 
  children: React.ReactNode; 
  className?: string;
  gradient?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ type: "spring", stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${gradient || 'from-white/8 to-white/2'} backdrop-blur-xl border border-white/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function OverviewTab() {
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-white mb-3">Treasury Data</h3>
        <p className="text-sm text-gray-400">
          Treasury balances and distributions will appear once treasury contracts and indexes are configured.
        </p>
      </GlassCard>
    </motion.div>
  );
}

function SanctumTab({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="space-y-8">
      {/* Sanctum Overview */}
      <div className="bg-linear-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Heart className="w-12 h-12 text-pink-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Sanctum Charity Vault</h2>
            <p className="text-zinc-400">~3% of all transfer fees fund charitable causes</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-pink-400">—</div>
            <div className="text-sm text-zinc-400">VFIDE Balance</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">—</div>
            <div className="text-sm text-zinc-400">Active Charities</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">—</div>
            <div className="text-sm text-zinc-400">Total Distributed</div>
          </div>
        </div>
      </div>

      {/* Registered Charities */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Registered Charities</h3>
        <div className="text-sm text-zinc-400">
          No charity allocations are available yet.
        </div>
      </div>

      {/* Pending Disbursements */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Pending Disbursements</h3>
        {!isConnected ? (
          <div className="text-center py-8 text-zinc-400">
            Connect wallet to view and approve disbursements
          </div>
        ) : (
          <div className="text-sm text-zinc-400">
            No pending disbursements found.
          </div>
        )}
      </div>
    </div>
  );
}

function EcosystemTab({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="space-y-8">
      {/* Ecosystem Overview */}
      <div className="bg-linear-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Users className="w-12 h-12 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Ecosystem Vault</h2>
            <p className="text-zinc-400">Funds council salaries, merchant rewards, and growth initiatives</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400">—</div>
            <div className="text-sm text-zinc-400">VFIDE Balance</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">—</div>
            <div className="text-sm text-zinc-400">Of Transfer Fees</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">—</div>
            <div className="text-sm text-zinc-400">Total Distributed</div>
          </div>
        </div>
      </div>

      {/* Allocation Breakdown */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Allocation Breakdown</h3>
        <div className="text-sm text-zinc-400">
          Allocation data will appear once ecosystem treasury contracts are connected.
        </div>
      </div>

      {/* Claim Rewards (if applicable) */}
      {isConnected && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-zinc-100 mb-4">Your Claimable Rewards</h3>
          <div className="text-sm text-zinc-400">
            No claimable rewards detected.
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueTab() {
  return (
    <div className="space-y-8">
      {/* Revenue Splitter Overview */}
      <div className="bg-linear-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <TrendingUp className="w-12 h-12 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Revenue Splitter</h2>
            <p className="text-zinc-400">Automatically distributes transfer fees to designated recipients</p>
          </div>
        </div>
      </div>

      {/* Revenue Flow */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Fee Flow</h3>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="p-4 bg-zinc-900 rounded-lg text-center">
            <div className="text-zinc-100 font-bold">Transfer Fees</div>
            <div className="text-xs text-zinc-400">0.25% - 5%</div>
          </div>
          <ArrowRight className="text-cyan-400" />
          <div className="p-4 bg-zinc-900 rounded-lg text-center">
            <div className="text-zinc-100 font-bold">BurnRouter</div>
            <div className="text-xs text-zinc-400">Calculates splits</div>
          </div>
          <ArrowRight className="text-cyan-400" />
          <div className="p-4 bg-zinc-900 rounded-lg text-center">
            <div className="text-zinc-100 font-bold">RevenueSplitter</div>
            <div className="text-xs text-zinc-400">Distributes</div>
          </div>
        </div>
      </div>

      {/* Payees */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Distribution Recipients</h3>
        <div className="text-sm text-zinc-400">
          Recipient configuration will appear once the revenue splitter is connected.
        </div>
      </div>
    </div>
  );
}

function VestingTab() {
  return (
    <div className="space-y-8">
      {/* Vesting Overview */}
      <div className="bg-linear-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Clock className="w-12 h-12 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Dev Reserve Vesting</h2>
            <p className="text-zinc-400">50M VFIDE locked with 60-day cliff, 36-month linear vesting (bi-monthly unlocks)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">—</div>
            <div className="text-sm text-zinc-400">Total Allocation</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">—</div>
            <div className="text-sm text-zinc-400">Vested</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-zinc-100">—</div>
            <div className="text-sm text-zinc-400">Claimed</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-cyan-400">—</div>
            <div className="text-sm text-zinc-400">Claimable Now</div>
          </div>
        </div>
      </div>

      {/* Vesting Timeline */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Vesting Timeline</h3>
        <div className="text-sm text-zinc-400">
          Vesting schedule will appear once the vesting contract is connected.
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">Vesting Progress</h3>
        <div className="text-sm text-zinc-400">
          Progress will update once vesting data is available.
        </div>
      </div>
    </div>
  );
}
