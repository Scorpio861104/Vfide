"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { SimpleWalletConnect } from "@/components/wallet/SimpleWalletConnect";
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, Shield, ExternalLink, Copy, 
  CheckCircle2, TrendingUp, Activity, Trophy, Star, Award,
  Lock, Gift, Banknote, Vote, Calculator, Bell, ChevronRight,
  Sliders, RotateCcw
} from "lucide-react";
import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { BadgeGallery } from "@/components/badge/BadgeGallery";
import { BadgeProgress } from "@/components/badge/BadgeProgress";
import { useUserBadges, useVaultBalance, useProofScore } from "@/lib/vfide-hooks";
import { getBadgeById, type BadgeMetadata } from "@/lib/badge-registry";
import Link from "next/link";

type TabType = 'overview' | 'fee-simulator' | 'score-simulator' | 'badges';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  const { balance: vaultBalanceRaw, isLoading: vaultLoading } = useVaultBalance();
  const { score: proofscore, tier, isLoading: scoreLoading } = useProofScore(address);
  
  const walletAddress = address || "";
  const walletBalance = vaultLoading ? "Loading..." : vaultBalanceRaw;
  const PRESALE_REFERENCE_PRICE = 0.01;
  const usdValue = vaultLoading ? "..." : (parseFloat(vaultBalanceRaw) * PRESALE_REFERENCE_PRICE).toFixed(2);
  
  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
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
        <main className="min-h-screen bg-[#1A1A1D] pt-20 flex items-center justify-center">
          <div className="text-center px-4">
            <Wallet className="text-[#00F0FF] mx-auto mb-6" size={64} />
            <h1 className="text-4xl font-bold text-[#F5F3E8] mb-4">Connect Your Wallet</h1>
            <p className="text-[#A0A0A5] mb-8 max-w-md">
              Connect your wallet to access your dashboard, view your ProofScore, and explore simulators.
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
        <section className="py-8 bg-gradient-to-b from-[#2A2A2F] to-[#1A1A1D] border-b border-[#3A3A3F]">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-display)] font-bold text-[#F5F3E8] mb-2">
                  Dashboard
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
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
                  <div className="px-3 py-2 bg-[#50C878]/20 border border-[#50C878] rounded-lg">
                    <span className="text-[#50C878] font-bold text-sm">{currentFeeRate.toFixed(2)}% fee</span>
                  </div>
                </div>
              </div>
              <SimpleWalletConnect />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#A0A0A5] text-xs">Wallet Balance</span>
                  <Wallet className="text-[#00F0FF]" size={18} />
                </div>
                <div className="text-xl font-bold text-[#F5F3E8]">{walletBalance}</div>
                <div className="text-[#A0A0A5] text-xs">≈ ${usdValue}</div>
              </div>
              <Link href="/vault" className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 hover:border-[#50C878] transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#A0A0A5] text-xs">Vault</span>
                  <Shield className="text-[#50C878]" size={18} />
                </div>
                <div className="text-xl font-bold text-[#F5F3E8]">{vaultBalanceRaw}</div>
                <div className="text-[#00F0FF] text-xs group-hover:underline">Manage →</div>
              </Link>
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
                  <span className="text-[#A0A0A5] text-xs">Current Fee Rate</span>
                  <Calculator className="text-[#00F0FF]" size={18} />
                </div>
                <div className="text-xl font-bold text-[#50C878]">{currentFeeRate.toFixed(2)}%</div>
                <div className="text-[#A0A0A5] text-xs">On transfers</div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#1A1A1D] border-b border-[#3A3A3F] sticky top-20 z-40">
          <div className="container mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" role="tablist">
              {[
                { id: 'overview' as const, label: 'Overview', icon: Activity },
                { id: 'fee-simulator' as const, label: 'Fee Simulator', icon: Calculator },
                { id: 'score-simulator' as const, label: 'Score Simulator', icon: Sliders },
                { id: 'badges' as const, label: 'Badges', icon: Trophy },
              ].map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-[#00F0FF] text-[#1A1A1D]'
                      : 'bg-transparent text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A2F]'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8">
          {activeTab === 'overview' && <OverviewTab proofscore={proofscore} feeRate={currentFeeRate} />}
          {activeTab === 'fee-simulator' && <FeeSimulatorTab currentScore={proofscore} />}
          {activeTab === 'score-simulator' && <ScoreSimulatorTab currentScore={proofscore} />}
          {activeTab === 'badges' && <BadgesTab address={address} />}
        </div>
      </main>

      <Footer />
    </>
  );
}

function OverviewTab({ proofscore, feeRate }: { proofscore: number; feeRate: number }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h2 className="text-xl font-bold text-[#F5F3E8] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Link href="/pay" className="p-4 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] rounded-lg font-bold hover:scale-105 transition-transform flex flex-col items-center gap-2 text-center">
            <ArrowUpRight size={24} />
            <span>Send</span>
          </Link>
          <Link href="/vault" className="p-4 border-2 border-[#50C878] text-[#50C878] rounded-lg font-bold hover:bg-[#50C878]/10 flex flex-col items-center gap-2 text-center">
            <Shield size={24} />
            <span>Vault</span>
          </Link>
          <Link href="/escrow" className="p-4 border-2 border-[#00F0FF] text-[#00F0FF] rounded-lg font-bold hover:bg-[#00F0FF]/10 flex flex-col items-center gap-2 text-center">
            <Lock size={24} />
            <span>Escrow</span>
          </Link>
          <Link href="/payroll" className="p-4 border-2 border-[#FFD700] text-[#FFD700] rounded-lg font-bold hover:bg-[#FFD700]/10 flex flex-col items-center gap-2 text-center">
            <Banknote size={24} />
            <span>Payroll</span>
          </Link>
          <Link href="/governance" className="p-4 border-2 border-[#9B59B6] text-[#9B59B6] rounded-lg font-bold hover:bg-[#9B59B6]/10 flex flex-col items-center gap-2 text-center">
            <Vote size={24} />
            <span>Governance</span>
          </Link>
          <Link href="/rewards" className="p-4 border-2 border-[#FF6B6B] text-[#FF6B6B] rounded-lg font-bold hover:bg-[#FF6B6B]/10 flex flex-col items-center gap-2 text-center">
            <Gift size={24} />
            <span>Rewards</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#F5F3E8] mb-4">Your ProofScore</h2>
          <div className="text-center py-6">
            <div className="text-6xl font-bold text-[#00F0FF] mb-2">{proofscore}</div>
            <div className="inline-block px-4 py-1 bg-[#00F0FF]/20 border border-[#00F0FF] rounded-full text-[#00F0FF] font-bold text-sm mb-4">
              {proofscore >= 8000 ? 'ELITE' : proofscore >= 7000 ? 'VERIFIED' : proofscore >= 5000 ? 'TRUSTED' : 'NEUTRAL'}
            </div>
            <div className="text-[#50C878] text-lg font-bold">{feeRate.toFixed(2)}% transfer fee</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#A0A0A5]">
              <span>Score Range</span>
              <span>0 - 10,000</span>
            </div>
            <div className="w-full h-3 bg-[#1A1A1D] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF6B6B] via-[#FFD700] to-[#50C878]" style={{ width: `${(proofscore / 10000) * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-[#A0A0A5]">
              <span>5% fee</span>
              <span>0.25% fee</span>
            </div>
          </div>
        </div>

        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#F5F3E8] flex items-center gap-2 mb-4">
            <Bell size={20} className="text-[#FFD700]" />
            Notifications
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg flex items-start gap-3">
              <Vote className="text-[#FFD700] shrink-0 mt-0.5" size={18} />
              <div>
                <div className="text-[#F5F3E8] font-bold text-sm">Active Vote</div>
                <div className="text-[#A0A0A5] text-xs">Proposal #142: Treasury allocation ends in 5 hours</div>
                <Link href="/governance" className="text-[#00F0FF] text-xs hover:underline">Vote now →</Link>
              </div>
            </div>
            <div className="p-3 bg-[#50C878]/10 border border-[#50C878]/30 rounded-lg flex items-start gap-3">
              <Gift className="text-[#50C878] shrink-0 mt-0.5" size={18} />
              <div>
                <div className="text-[#F5F3E8] font-bold text-sm">Claimable Rewards</div>
                <div className="text-[#A0A0A5] text-xs">467.50 VFIDE from payroll streams</div>
                <Link href="/payroll" className="text-[#00F0FF] text-xs hover:underline">Claim →</Link>
              </div>
            </div>
            <div className="p-3 bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-lg flex items-start gap-3">
              <Shield className="text-[#00F0FF] shrink-0 mt-0.5" size={18} />
              <div>
                <div className="text-[#F5F3E8] font-bold text-sm">Guardian Request</div>
                <div className="text-[#A0A0A5] text-xs">0x1a2b...3c4d wants you as guardian</div>
                <Link href="/vault" className="text-[#00F0FF] text-xs hover:underline">Review →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#F5F3E8]">Recent Activity</h2>
          <a href="https://explorer.zksync.io" target="_blank" rel="noopener noreferrer" className="text-[#00F0FF] text-sm hover:underline flex items-center gap-1">
            View all <ExternalLink size={14} />
          </a>
        </div>
        <div className="space-y-2">
          {[
            { action: "Payment Received", details: "125 VFIDE", time: "2 hours ago", icon: ArrowDownLeft, color: "#50C878" },
            { action: "Voted on Proposal", details: "#142 - Treasury", time: "1 day ago", icon: Vote, color: "#9B59B6" },
            { action: "Badge Earned", details: "Early Adopter", time: "2 days ago", icon: Trophy, color: "#FFD700" },
            { action: "Vault Deposit", details: "1,000 VFIDE", time: "3 days ago", icon: Shield, color: "#0080FF" },
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1D] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full" style={{ backgroundColor: `${activity.color}20`, color: activity.color }}>
                  <activity.icon size={16} />
                </div>
                <div>
                  <div className="text-[#F5F3E8] font-bold text-sm">{activity.action}</div>
                  <div className="text-[#A0A0A5] text-xs">{activity.details}</div>
                </div>
              </div>
              <div className="text-[#A0A0A5] text-xs">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeeSimulatorTab({ currentScore }: { currentScore: number }) {
  const [simulatedScore, setSimulatedScore] = useState(currentScore);
  const [transferAmount, setTransferAmount] = useState(1000);

  const calculateFee = (score: number) => {
    if (score <= 4000) return 5.00;
    if (score >= 8000) return 0.25;
    return 5.00 - ((score - 4000) * 4.75 / 4000);
  };

  const feePercent = calculateFee(simulatedScore);
  const feeAmount = (transferAmount * feePercent) / 100;
  const receivedAmount = transferAmount - feeAmount;
  const burnAmount = feeAmount * 0.40;
  const sanctumAmount = feeAmount * 0.10;
  const ecosystemAmount = feeAmount * 0.50;
  const currentFee = calculateFee(currentScore);
  const feeDifference = currentFee - feePercent;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#00F0FF]/20 to-[#0080FF]/20 border border-[#00F0FF]/30 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2 flex items-center gap-2">
          <Calculator size={28} className="text-[#00F0FF]" />
          Transaction Fee Simulator
        </h2>
        <p className="text-[#A0A0A5]">
          See exactly how much you will pay in fees based on your ProofScore. Adjust the sliders to simulate different scenarios.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-[#F5F3E8]">Adjust Parameters</h3>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[#A0A0A5]">ProofScore</label>
              <span className="text-[#00F0FF] font-bold">{simulatedScore}</span>
            </div>
            <input
              type="range"
              min="0"
              max="10000"
              value={simulatedScore}
              onChange={(e) => setSimulatedScore(Number(e.target.value))}
              className="w-full h-3 bg-[#1A1A1D] rounded-full appearance-none cursor-pointer accent-[#00F0FF]"
            />
            <div className="flex justify-between text-xs text-[#A0A0A5] mt-1">
              <span>0 (5% fee)</span>
              <span>10,000 (0.25% fee)</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[#A0A0A5]">Transfer Amount (VFIDE)</label>
            </div>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(Math.max(0, Number(e.target.value)))}
              className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] text-xl font-bold focus:border-[#00F0FF] focus:outline-none"
            />
            <div className="flex gap-2 mt-2">
              {[100, 500, 1000, 5000, 10000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTransferAmount(amt)}
                  className={`px-3 py-1 rounded text-sm font-bold transition-colors ${
                    transferAmount === amt 
                      ? 'bg-[#00F0FF] text-[#1A1A1D]' 
                      : 'bg-[#1A1A1D] text-[#A0A0A5] hover:text-[#F5F3E8]'
                  }`}
                >
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setSimulatedScore(currentScore); setTransferAmount(1000); }}
            className="flex items-center gap-2 text-[#A0A0A5] hover:text-[#F5F3E8] transition-colors"
          >
            <RotateCcw size={16} />
            Reset to current values
          </button>
        </div>

        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-[#F5F3E8]">Fee Breakdown</h3>
          <div className="bg-[#1A1A1D] rounded-xl p-6 text-center">
            <div className="text-[#A0A0A5] text-sm mb-1">Fee Rate</div>
            <div className="text-5xl font-bold text-[#00F0FF] mb-2">{feePercent.toFixed(2)}%</div>
            {feeDifference !== 0 && (
              <div className={`text-sm font-bold ${feeDifference > 0 ? 'text-[#50C878]' : 'text-[#FF6B6B]'}`}>
                {feeDifference > 0 ? '↓' : '↑'} {Math.abs(feeDifference).toFixed(2)}% vs current
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-[#1A1A1D] rounded-lg">
              <span className="text-[#A0A0A5]">You Send</span>
              <span className="text-[#F5F3E8] font-bold">{transferAmount.toLocaleString()} VFIDE</span>
            </div>
            <div className="flex justify-between p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 rounded-lg">
              <span className="text-[#FF6B6B]">Fee Deducted</span>
              <span className="text-[#FF6B6B] font-bold">-{feeAmount.toFixed(2)} VFIDE</span>
            </div>
            <div className="flex justify-between p-3 bg-[#50C878]/10 border border-[#50C878]/30 rounded-lg">
              <span className="text-[#50C878]">Recipient Gets</span>
              <span className="text-[#50C878] font-bold">{receivedAmount.toFixed(2)} VFIDE</span>
            </div>
          </div>
          <div className="pt-4 border-t border-[#3A3A3F]">
            <div className="text-[#A0A0A5] text-sm mb-3">Where your fee goes:</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-[#1A1A1D] rounded-lg">
                <div className="text-[#FF6B6B] font-bold">{burnAmount.toFixed(2)}</div>
                <div className="text-[#A0A0A5] text-xs">Burned (40%)</div>
              </div>
              <div className="p-2 bg-[#1A1A1D] rounded-lg">
                <div className="text-[#FFD700] font-bold">{sanctumAmount.toFixed(2)}</div>
                <div className="text-[#A0A0A5] text-xs">Sanctum (10%)</div>
              </div>
              <div className="p-2 bg-[#1A1A1D] rounded-lg">
                <div className="text-[#00F0FF] font-bold">{ecosystemAmount.toFixed(2)}</div>
                <div className="text-[#A0A0A5] text-xs">Ecosystem (50%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Fee Scale by ProofScore</h3>
        <div className="relative h-16 bg-gradient-to-r from-[#FF6B6B] via-[#FFD700] to-[#50C878] rounded-lg overflow-hidden">
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
            style={{ left: `${(simulatedScore / 10000) * 100}%` }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#F5F3E8] text-[#1A1A1D] px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
              {simulatedScore} → {feePercent.toFixed(2)}%
            </div>
          </div>
          {simulatedScore !== currentScore && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[#00F0FF] opacity-50"
              style={{ left: `${(currentScore / 10000) * 100}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-[#FF6B6B]">0 → 5%</span>
          <span className="text-[#FFD700]">5000 → 2.41%</span>
          <span className="text-[#50C878]">10000 → 0.25%</span>
        </div>
      </div>
    </div>
  );
}

function ScoreSimulatorTab({ currentScore }: { currentScore: number }) {
  const [simulatedActions, setSimulatedActions] = useState<string[]>([]);
  
  const actions = [
    { id: 'tx_10', label: 'Complete 10 transactions', points: 50, category: 'activity' },
    { id: 'tx_100', label: 'Complete 100 transactions', points: 200, category: 'activity' },
    { id: 'endorse_5', label: 'Receive 5 endorsements', points: 100, category: 'social' },
    { id: 'endorse_20', label: 'Receive 20 endorsements', points: 300, category: 'social' },
    { id: 'vote_5', label: 'Vote on 5 proposals', points: 75, category: 'governance' },
    { id: 'vote_20', label: 'Vote on 20 proposals', points: 200, category: 'governance' },
    { id: 'merchant_reg', label: 'Register as merchant', points: 150, category: 'merchant' },
    { id: 'merchant_100tx', label: '100 merchant transactions', points: 400, category: 'merchant' },
    { id: 'badge_early', label: 'Earn Early Adopter badge', points: 100, category: 'badge' },
    { id: 'badge_voter', label: 'Earn Governance Voter badge', points: 150, category: 'badge' },
    { id: 'badge_merchant', label: 'Earn Trusted Merchant badge', points: 200, category: 'badge' },
    { id: 'guardian_add', label: 'Add 3 guardians', points: 50, category: 'security' },
    { id: 'kin_set', label: 'Set Next of Kin', points: 25, category: 'security' },
    { id: 'age_6mo', label: 'Account age: 6 months', points: 100, category: 'time' },
    { id: 'age_1yr', label: 'Account age: 1 year', points: 250, category: 'time' },
  ];

  const toggleAction = (id: string) => {
    setSimulatedActions(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const totalNewPoints = actions.filter(a => simulatedActions.includes(a.id)).reduce((sum, a) => sum + a.points, 0);
  const projectedScore = Math.min(10000, currentScore + totalNewPoints);
  const currentFee = currentScore <= 4000 ? 5.00 : currentScore >= 8000 ? 0.25 : 5.00 - ((currentScore - 4000) * 4.75 / 4000);
  const projectedFee = projectedScore <= 4000 ? 5.00 : projectedScore >= 8000 ? 0.25 : 5.00 - ((projectedScore - 4000) * 4.75 / 4000);
  const feeSavings = currentFee - projectedFee;

  const categoryColors: Record<string, string> = {
    activity: '#00F0FF',
    social: '#9B59B6',
    governance: '#FFD700',
    merchant: '#50C878',
    badge: '#FF6B6B',
    security: '#0080FF',
    time: '#A0A0A5',
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#9B59B6]/20 to-[#FFD700]/20 border border-[#9B59B6]/30 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2 flex items-center gap-2">
          <Sliders size={28} className="text-[#9B59B6]" />
          ProofScore Simulator
        </h2>
        <p className="text-[#A0A0A5]">
          Select actions to see how they would affect your ProofScore and transaction fees. Plan your path to lower fees!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#F5F3E8]">Select Actions</h3>
            <button onClick={() => setSimulatedActions([])} className="text-[#A0A0A5] hover:text-[#F5F3E8] text-sm flex items-center gap-1">
              <RotateCcw size={14} /> Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => toggleAction(action.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  simulatedActions.includes(action.id)
                    ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                    : 'border-[#3A3A3F] bg-[#1A1A1D] hover:border-[#505055]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-[#F5F3E8] font-bold text-sm">{action.label}</div>
                    <div className="text-xs mt-1 capitalize" style={{ color: categoryColors[action.category] }}>
                      {action.category}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${simulatedActions.includes(action.id) ? 'text-[#50C878]' : 'text-[#00F0FF]'}`}>
                    +{action.points}
                  </div>
                </div>
                {simulatedActions.includes(action.id) && (
                  <div className="mt-2 flex items-center gap-1 text-[#50C878] text-xs">
                    <CheckCircle2 size={14} /> Selected
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 text-center">
            <div className="text-[#A0A0A5] text-sm mb-2">Projected Score</div>
            <div className="flex items-center justify-center gap-4">
              <div>
                <div className="text-3xl font-bold text-[#A0A0A5]">{currentScore}</div>
                <div className="text-xs text-[#A0A0A5]">Current</div>
              </div>
              <div className="text-[#00F0FF]">→</div>
              <div>
                <div className="text-4xl font-bold text-[#00F0FF]">{projectedScore}</div>
                <div className="text-xs text-[#00F0FF]">Projected</div>
              </div>
            </div>
            {totalNewPoints > 0 && (
              <div className="mt-3 text-[#50C878] font-bold">+{totalNewPoints} points</div>
            )}
          </div>

          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <div className="text-[#A0A0A5] text-sm mb-3">Fee Impact</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#A0A0A5]">Current Fee</span>
                <span className="text-[#F5F3E8] font-bold">{currentFee.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A0A0A5]">Projected Fee</span>
                <span className="text-[#00F0FF] font-bold">{projectedFee.toFixed(2)}%</span>
              </div>
              {feeSavings > 0 && (
                <div className="pt-2 border-t border-[#3A3A3F]">
                  <div className="flex justify-between">
                    <span className="text-[#50C878]">Savings</span>
                    <span className="text-[#50C878] font-bold">↓ {feeSavings.toFixed(2)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {feeSavings > 0 && (
            <div className="bg-[#50C878]/10 border border-[#50C878]/30 rounded-xl p-6">
              <div className="text-[#50C878] font-bold mb-2">💰 On a 10,000 VFIDE transfer:</div>
              <div className="text-[#F5F3E8]">
                You would save <span className="font-bold text-[#50C878]">{(10000 * feeSavings / 100).toFixed(2)} VFIDE</span>
              </div>
            </div>
          )}

          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 text-center">
            <div className="text-[#A0A0A5] text-sm mb-3">Ready to improve your score?</div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/governance" className="px-4 py-2 bg-[#FFD700] text-[#1A1A1D] rounded-lg font-bold text-sm hover:scale-105 transition-transform">
                Vote Now
              </Link>
              <Link href="/badges" className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold text-sm hover:scale-105 transition-transform">
                Earn Badges
              </Link>
            </div>
          </div>
        </div>
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
          <Link href="/badges" className="text-[#00F0FF] text-xs hover:underline">Mint as NFTs →</Link>
        </div>
      </div>

      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#F5F3E8]">Your Badges</h3>
          <Link href="/badges" className="text-[#00F0FF] text-sm hover:underline flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <BadgeGallery address={address} />
      </div>

      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Progress Towards Next Badges</h3>
        <BadgeProgress />
      </div>
    </div>
  );
}
