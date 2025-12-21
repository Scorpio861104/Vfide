"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { SimpleWalletConnect } from "@/components/wallet/SimpleWalletConnect";
import { motion } from "framer-motion";
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Shield, ExternalLink, Copy, 
  CheckCircle2, AlertCircle, TrendingUp, Activity, Trophy, Star, Award,
  DollarSign, Lock, Gift, Banknote
} from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";
import { BadgeGallery } from "@/components/badge/BadgeGallery";
import { BadgeProgress } from "@/components/badge/BadgeProgress";
import { useUserBadges, useVaultBalance, useProofScore } from "@/lib/vfide-hooks";
import { getBadgeById, type BadgeMetadata } from "@/lib/badge-registry";

type TabType = 'wallet' | 'trust' | 'badges' | 'escrow' | 'payroll' | 'activity';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('wallet');
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  // Real blockchain data
  const { balance: vaultBalanceRaw, isLoading: vaultLoading } = useVaultBalance();
  const { score: proofscore, tier, isLoading: scoreLoading } = useProofScore(address);
  
  const walletAddress = address || "";
  const walletBalance = vaultLoading ? "Loading..." : vaultBalanceRaw;
  // Note: USD value will be available after DEX listing. Using presale reference price.
  const PRESALE_REFERENCE_PRICE = 0.01; // From whitepaper: Tier 1 presale price
  const usdValue = vaultLoading ? "..." : (parseFloat(vaultBalanceRaw) * PRESALE_REFERENCE_PRICE).toFixed(2);
  const vaultBalance = vaultBalanceRaw;
  
  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  if (!isConnected) {
    return (
      <>
        <GlobalNav />
        <main className="min-h-screen bg-[#1A1A1D] pt-20 flex items-center justify-center">
          <div className="text-center px-4">
            <Wallet className="text-[#00F0FF] mx-auto mb-6" size={64} />
            <h1 className="text-4xl font-bold text-[#F5F3E8] mb-4">Connect Your Wallet</h1>
            <p className="text-[#A0A0A5] mb-8 max-w-md">
              Connect your wallet to access your dashboard, view your ProofScore, and manage your badges.
            </p>
            <SimpleWalletConnect />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#1A1A1D] pt-20">
        {/* Header with Address */}
        <section className="py-8 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
                  Dashboard
                </h1>
                <div className="flex items-center gap-2">
                  <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-[#F5F3E8] font-mono text-sm">{`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}</span>
                    <button onClick={copyAddress} className="p-1 hover:bg-[#2A2A2F] rounded">
                      {copiedAddress ? <CheckCircle2 className="text-[#50C878]" size={14} /> : <Copy className="text-[#A0A0A5]" size={14} />}
                    </button>
                    <a href={`https://explorer.zksync.io/address/${walletAddress}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#2A2A2F] rounded">
                      <ExternalLink className="text-[#A0A0A5]" size={14} />
                    </a>
                  </div>
                  <div className="px-3 py-2 bg-[#00F0FF]/20 border border-[#00F0FF] rounded-lg">
                    <span className="text-[#00F0FF] font-bold text-sm">ProofScore {proofscore}</span>
                  </div>
                </div>
              </div>
              <SimpleWalletConnect />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#A0A0A5] text-xs">Wallet</span>
                  <Wallet className="text-[#00F0FF]" size={18} />
                </div>
                <div className="text-xl font-bold text-[#F5F3E8]">{walletBalance}</div>
                <div className="text-[#A0A0A5] text-xs">≈ ${usdValue}</div>
              </div>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#A0A0A5] text-xs">Vault</span>
                  <Shield className="text-[#50C878]" size={18} />
                </div>
                <div className="text-xl font-bold text-[#F5F3E8]">{vaultBalance}</div>
                <a href="/vault" className="text-[#00F0FF] text-xs hover:underline">Manage →</a>
              </div>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#A0A0A5] text-xs">ProofScore</span>
                  <TrendingUp className="text-[#FFD700]" size={18} />
                </div>
                <div className="text-xl font-bold text-[#00F0FF]">{scoreLoading ? '...' : proofscore}</div>
                <div className="text-[#50C878] text-xs">{tier || 'NEUTRAL'} tier</div>
              </div>
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#A0A0A5] text-xs">Status</span>
                  <Activity className="text-[#00F0FF]" size={18} />
                </div>
                <div className="text-xl font-bold text-[#50C878]">Active</div>
                <div className="text-[#A0A0A5] text-xs">Connected</div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="bg-[#1A1A1D] border-b border-[#3A3A3F] sticky top-20 z-40">
          <div className="container mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" role="tablist" aria-label="Dashboard sections">
              {[
                { id: 'wallet' as const, label: 'Wallet', icon: Wallet },
                { id: 'trust' as const, label: 'ProofScore', icon: Star },
                { id: 'badges' as const, label: 'Badges', icon: Trophy },
                { id: 'escrow' as const, label: 'Escrow', icon: Lock },
                { id: 'payroll' as const, label: 'Payroll', icon: Banknote },
                { id: 'activity' as const, label: 'Activity', icon: Activity },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-[#00F0FF] text-[#1A1A1D]'
                      : 'bg-transparent text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A2F]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Content */}
        <div className="container mx-auto px-4 py-8">
          <div role="tabpanel" id="tabpanel-wallet" hidden={activeTab !== 'wallet'}>
            {activeTab === 'wallet' && <WalletTab />}
          </div>
          <div role="tabpanel" id="tabpanel-trust" hidden={activeTab !== 'trust'}>
            {activeTab === 'trust' && <TrustTab proofscore={proofscore} />}
          </div>
          <div role="tabpanel" id="tabpanel-badges" hidden={activeTab !== 'badges'}>
            {activeTab === 'badges' && <BadgesTab address={address} />}
          </div>
          <div role="tabpanel" id="tabpanel-escrow" hidden={activeTab !== 'escrow'}>
            {activeTab === 'escrow' && <EscrowTab />}
          </div>
          <div role="tabpanel" id="tabpanel-payroll" hidden={activeTab !== 'payroll'}>
            {activeTab === 'payroll' && <PayrollTab />}
          </div>
          <div role="tabpanel" id="tabpanel-activity" hidden={activeTab !== 'activity'}>
            {activeTab === 'activity' && <ActivityTab />}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function WalletTab() {
  const recentTransactions = [
    { type: "receive", amount: "+500 VFIDE", from: "0x1a2b...3c4d", timestamp: "2 hours ago", status: "completed", txHash: "0xabc123..." },
    { type: "send", amount: "-150 VFIDE", to: "0x5e6f...7g8h", timestamp: "1 day ago", status: "completed", txHash: "0xdef456..." },
    { type: "vault_deposit", amount: "-2000 VFIDE", to: "Your Vault", timestamp: "3 days ago", status: "completed", txHash: "0xghi789..." },
    { type: "receive", amount: "+1250 VFIDE", from: "Merchant Payment", timestamp: "5 days ago", status: "completed", txHash: "0xjkl012..." },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Quick Actions */}
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#F5F3E8] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button className="p-4 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2">
              <ArrowUpRight size={18} /> Send
            </button>
            <button className="p-4 border-2 border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 flex items-center justify-center gap-2">
              <ArrowDownLeft size={18} /> Receive
            </button>
            <button className="p-4 border-2 border-[#50C878] text-[#50C878] rounded-lg font-bold hover:bg-[#50C878]/10 flex items-center justify-center gap-2">
              <Shield size={18} /> To Vault
            </button>
            <button className="p-4 border-2 border-[#A0A0A5] text-[#A0A0A5] rounded-lg font-bold hover:border-[#F5F3E8] hover:text-[#F5F3E8] flex items-center justify-center gap-2">
              <ExternalLink size={18} /> Explorer
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#F5F3E8] mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {recentTransactions.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${tx.type === "receive" ? "bg-[#50C878]/20 text-[#50C878]" : tx.type === "vault_deposit" ? "bg-[#0080FF]/20 text-[#0080FF]" : "bg-[#FF6B6B]/20 text-[#FF6B6B]"}`}>
                    {tx.type === "receive" ? <ArrowDownLeft size={18} /> : tx.type === "vault_deposit" ? <Shield size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <div className="text-[#F5F3E8] font-bold">{tx.amount}</div>
                    <div className="text-[#A0A0A5] text-sm">{tx.type === "receive" ? `From ${tx.from}` : `To ${tx.to}`}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#A0A0A5] text-xs">{tx.timestamp}</div>
                  <a href={`https://explorer.zksync.io/tx/${tx.txHash}`} className="text-[#00F0FF] text-xs hover:underline">View →</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#F5F3E8] mb-4 flex items-center gap-2">
            <Shield className="text-[#50C878]" size={20} /> Security
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#1A1A1D] rounded-lg">
              <CheckCircle2 className="text-[#50C878]" size={18} />
              <div>
                <div className="text-[#F5F3E8] text-sm font-bold">Vault Created</div>
                <div className="text-[#A0A0A5] text-xs">Non-custodial</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#1A1A1D] rounded-lg">
              <CheckCircle2 className="text-[#50C878]" size={18} />
              <div>
                <div className="text-[#F5F3E8] text-sm font-bold">3 Guardians</div>
                <div className="text-[#A0A0A5] text-xs">Recovery enabled</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#1A1A1D] rounded-lg">
              <AlertCircle className="text-[#FFD700]" size={18} />
              <div>
                <div className="text-[#F5F3E8] text-sm font-bold">Backup Keys</div>
                <div className="text-[#A0A0A5] text-xs">Recommended</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustTab({ proofscore }: { proofscore: number }) {
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  const handleRequestReview = () => {
    if (!disputeReason.trim()) return;
    // In production, this would call VFIDETrust.requestScoreReview(reason)
    setDisputeSubmitted(true);
    setShowDisputeForm(false);
    setTimeout(() => setDisputeSubmitted(false), 5000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-8 text-center">
        <div className="text-[#A0A0A5] text-sm mb-2">Your ProofScore</div>
        <div className="text-7xl font-bold text-[#00F0FF] mb-4">{proofscore}</div>
        <div className="inline-block px-4 py-2 bg-[#00F0FF]/20 border border-[#00F0FF] rounded-lg mb-6">
          <span className="text-[#00F0FF] font-bold">TRUSTED</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#A0A0A5]">Next Tier</span>
            <span className="text-[#F5F3E8] font-bold">VERIFIED (900)</span>
          </div>
          <div className="w-full h-2 bg-[#1A1A1D] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00F0FF] to-[#0080FF]" style={{ width: `${(proofscore / 900) * 100}%` }} />
          </div>
        </div>

        {/* Score Review Request */}
        <div className="mt-6 pt-6 border-t border-[#3A3A3F]">
          {disputeSubmitted ? (
            <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg">
              <p className="text-green-400 text-sm font-bold">Review request submitted!</p>
              <p className="text-[#A0A0A5] text-xs mt-1">DAO will review within 7 days</p>
            </div>
          ) : showDisputeForm ? (
            <div className="text-left space-y-3">
              <label className="text-[#A0A0A5] text-sm">Why should your score be higher?</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain why you believe your score is incorrect..."
                className="w-full bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg px-3 py-2 text-[#F5F3E8] placeholder-[#505055] text-sm resize-none h-20 focus:border-[#00F0FF] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRequestReview}
                  disabled={!disputeReason.trim()}
                  className="flex-1 bg-[#00F0FF] hover:bg-[#00D4E0] disabled:bg-[#3A3A3F] text-[#0D0D0F] font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  Submit Review
                </button>
                <button
                  onClick={() => setShowDisputeForm(false)}
                  className="px-4 bg-[#3A3A3F] hover:bg-[#4A4A4F] text-[#F5F3E8] font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDisputeForm(true)}
              className="text-[#A0A0A5] hover:text-[#00F0FF] text-sm transition-colors"
            >
              Think your score is wrong? Request Review
            </button>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Score Breakdown</h3>
        <div className="space-y-4">
          {[
            { label: "Base Score", desc: "Starting point", value: 100 },
            { label: "Transaction Activity", desc: "Regular usage rewards", value: 320 },
            { label: "Endorsements", desc: "5 endorsements received", value: 50 },
            { label: "Account Age", desc: "6 months active", value: 72 },
            { label: "Badge Bonuses", desc: "Achievement points", value: 200 },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1D] rounded-lg">
              <div>
                <div className="text-[#F5F3E8] font-bold">{item.label}</div>
                <div className="text-[#A0A0A5] text-sm">{item.desc}</div>
              </div>
              <div className="text-2xl font-bold text-[#00F0FF]">+{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3 bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">ProofScore → Fee (Dynamic Linear)</h3>
        <div className="mb-4 p-4 bg-[#1A1A1D] rounded-lg border border-[#3A3A3F]">
          <div className="text-sm text-[#A0A0A5] mb-2">Your current fee rate:</div>
          <div className="text-2xl font-bold text-[#00F0FF]">
            {proofscore <= 200 ? '5.00%' : proofscore >= 9000 ? '0.25%' : 
              ((5.00 - ((proofscore - 200) * 4.75 / 8800)).toFixed(2) + '%')}
          </div>
          <div className="text-xs text-[#A0A0A5] mt-1">Based on ProofScore {proofscore}</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            { score: "≤200", fee: "5.00%", color: "#EF4444" },
            { score: "2500", fee: "3.76%", color: "#F59E0B" },
            { score: "5000", fee: "2.41%", color: "#B8B8BD" },
            { score: "≥9000", fee: "0.25%", color: "#22C55E" },
          ].map((t, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-[#1A1A1D] border border-[#3A3A3F]">
              <div className="text-sm text-[#A0A0A5]">{t.score}</div>
              <div className="text-lg font-bold" style={{ color: t.color }}>{t.fee}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-[#A0A0A5] text-center">Fee scales linearly from 5% (score ≤200) to 0.25% (score ≥9000)</div>
      </div>
    </div>
  );
}

function BadgesTab({ address }: { address: `0x${string}` | undefined }) {
  const { badgeIds } = useUserBadges(address);
  const earnedBadges = badgeIds.map(id => getBadgeById(id)).filter(Boolean) as BadgeMetadata[];
  const totalPoints = earnedBadges.reduce((sum, badge) => sum + badge.points, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Badges Earned</span>
            <Trophy className="text-[#FFD700]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#F5F3E8]">{badgeIds.length}</div>
          <div className="text-[#A0A0A5] text-xs">Keep participating!</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Total Points</span>
            <Star className="text-[#00F0FF]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#00F0FF]">+{totalPoints}</div>
          <div className="text-[#A0A0A5] text-xs">Contributing to ProofScore</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">NFTs Minted</span>
            <Award className="text-[#50C878]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#F5F3E8]">0</div>
          <div className="text-[#A0A0A5] text-xs">Mint as soulbound NFTs</div>
        </div>
      </div>

      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Your Badges</h3>
        <BadgeGallery address={address} />
      </div>

      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Progress</h3>
        <BadgeProgress />
      </div>
    </div>
  );
}

function ActivityTab() {
  const activities = [
    { action: "Payment Received", details: "125 VFIDE from merchant", time: "2 hours ago", icon: ArrowDownLeft, color: "#50C878" },
    { action: "Endorsed User", details: "0x1a2b...3c4d", time: "1 day ago", icon: CheckCircle2, color: "#00F0FF" },
    { action: "Voted on Proposal", details: "#18 - Reduce Merchant Fee", time: "2 days ago", icon: Star, color: "#FFD700" },
    { action: "Vault Deposit", details: "5,000 VFIDE", time: "5 days ago", icon: Shield, color: "#0080FF" },
    { action: "Badge Earned", details: "Early Adopter", time: "1 week ago", icon: Trophy, color: "#9B59B6" },
  ];

  return (
    <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
      <h2 className="text-xl font-bold text-[#F5F3E8] mb-6">Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center justify-between p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full" style={{ backgroundColor: `${activity.color}20`, color: activity.color }}>
                <activity.icon size={18} />
              </div>
              <div>
                <div className="text-[#F5F3E8] font-bold">{activity.action}</div>
                <div className="text-[#A0A0A5] text-sm">{activity.details}</div>
              </div>
            </div>
            <div className="text-[#A0A0A5] text-sm">{activity.time}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EscrowTab() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Mock escrow data - in production, fetch from contract
  const activeEscrows = [
    { id: 1, seller: "0x1a2b...3c4d", amount: "500", status: "active", createdAt: "2 days ago", timeout: "5 days left" },
    { id: 2, seller: "0x5e6f...7g8h", amount: "1,200", status: "pending_release", createdAt: "1 week ago", timeout: "2 days left" },
  ];

  return (
    <div className="space-y-6">
      {/* Escrow Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Active Escrows</span>
            <Lock className="text-[#00F0FF]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#F5F3E8]">{activeEscrows.length}</div>
          <div className="text-[#A0A0A5] text-xs">Protected transactions</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Total Locked</span>
            <DollarSign className="text-[#50C878]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#50C878]">1,700 VFIDE</div>
          <div className="text-[#A0A0A5] text-xs">In escrow contracts</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Completed</span>
            <CheckCircle2 className="text-[#FFD700]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#FFD700]">12</div>
          <div className="text-[#A0A0A5] text-xs">Successful releases</div>
        </div>
      </div>

      {/* Create Escrow */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#F5F3E8]">Create New Escrow</h3>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D4E0] transition-colors"
          >
            {showCreateForm ? 'Cancel' : '+ New Escrow'}
          </button>
        </div>
        
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 pt-4 border-t border-[#3A3A3F]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Seller Address</label>
                <input 
                  type="text" 
                  placeholder="0x..." 
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Amount (VFIDE)</label>
                <input 
                  type="number" 
                  placeholder="100" 
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#A0A0A5] text-sm mb-2">Timeout (days)</label>
              <select className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none">
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            <button className="w-full py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-[1.02] transition-transform">
              Create Escrow
            </button>
          </motion.div>
        )}
      </div>

      {/* Active Escrows */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Active Escrows</h3>
        <div className="space-y-3">
          {activeEscrows.map((escrow) => (
            <div key={escrow.id} className="p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-[#00F0FF]/20 rounded-full">
                    <Lock className="text-[#00F0FF]" size={20} />
                  </div>
                  <div>
                    <div className="text-[#F5F3E8] font-bold">{escrow.amount} VFIDE</div>
                    <div className="text-[#A0A0A5] text-sm">To: {escrow.seller}</div>
                    <div className="text-[#A0A0A5] text-xs">{escrow.createdAt} · {escrow.timeout}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-[#50C878] text-white rounded-lg font-bold text-sm hover:bg-[#45B069] transition-colors">
                    Release
                  </button>
                  <button className="px-4 py-2 border border-[#FF6B6B] text-[#FF6B6B] rounded-lg font-bold text-sm hover:bg-[#FF6B6B]/10 transition-colors">
                    Dispute
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PayrollTab() {
  // Mock payroll data - in production, fetch from contract
  const myStreams = [
    { id: 1, from: "VFIDE DAO", rate: "100", claimable: "342.50", status: "active", startDate: "Dec 1, 2025" },
    { id: 2, from: "Merchant Partner", rate: "50", claimable: "125.00", status: "active", startDate: "Dec 10, 2025" },
  ];

  const totalClaimable = myStreams.reduce((sum, s) => sum + parseFloat(s.claimable), 0);

  return (
    <div className="space-y-6">
      {/* Payroll Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Active Streams</span>
            <Banknote className="text-[#00F0FF]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#F5F3E8]">{myStreams.length}</div>
          <div className="text-[#A0A0A5] text-xs">Receiving payments</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Claimable Now</span>
            <Gift className="text-[#50C878]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#50C878]">{totalClaimable.toFixed(2)} VFIDE</div>
          <div className="text-[#A0A0A5] text-xs">Ready to withdraw</div>
        </div>
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A0A0A5] text-sm">Total Rate</span>
            <TrendingUp className="text-[#FFD700]" size={20} />
          </div>
          <div className="text-3xl font-bold text-[#FFD700]">150 VFIDE/day</div>
          <div className="text-[#A0A0A5] text-xs">Combined income</div>
        </div>
      </div>

      {/* Claim All Button */}
      <div className="bg-gradient-to-r from-[#00F0FF]/20 to-[#50C878]/20 border border-[#00F0FF]/30 rounded-xl p-6 text-center">
        <h3 className="text-2xl font-bold text-[#F5F3E8] mb-2">Claim Your Earnings</h3>
        <p className="text-[#A0A0A5] mb-4">You have {totalClaimable.toFixed(2)} VFIDE ready to claim</p>
        <button className="px-8 py-3 bg-gradient-to-r from-[#00F0FF] to-[#50C878] text-[#1A1A1D] rounded-xl font-bold hover:scale-105 transition-transform">
          Claim All ({totalClaimable.toFixed(2)} VFIDE)
        </button>
      </div>

      {/* Active Streams */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Your Payment Streams</h3>
        <div className="space-y-3">
          {myStreams.map((stream) => (
            <div key={stream.id} className="p-4 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-[#00F0FF]/20 rounded-full flex items-center justify-center">
                      <Banknote className="text-[#00F0FF]" size={20} />
                    </div>
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-[#50C878] rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </div>
                  <div>
                    <div className="text-[#F5F3E8] font-bold">{stream.from}</div>
                    <div className="text-[#00F0FF] text-sm">{stream.rate} VFIDE/day</div>
                    <div className="text-[#A0A0A5] text-xs">Started: {stream.startDate}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#50C878] font-bold text-xl">{stream.claimable} VFIDE</div>
                  <div className="text-[#A0A0A5] text-xs">Claimable</div>
                  <button className="mt-2 px-4 py-1 bg-[#50C878] text-white rounded-lg font-bold text-sm hover:bg-[#45B069] transition-colors">
                    Claim
                  </button>
                </div>
              </div>
              {/* Progress bar showing stream accumulation */}
              <div className="mt-3 pt-3 border-t border-[#3A3A3F]">
                <div className="flex justify-between text-xs text-[#A0A0A5] mb-1">
                  <span>Accumulating...</span>
                  <span>+{(parseFloat(stream.rate) / 86400).toFixed(6)} VFIDE/sec</span>
                </div>
                <div className="h-1 bg-[#3A3A3F] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#00F0FF] to-[#50C878]"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 5, repeat: Infinity }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
