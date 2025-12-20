"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  Heart, 
  PieChart, 
  ArrowRight, 
  Shield, 
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

type TabType = 'overview' | 'sanctum' | 'ecosystem' | 'revenue' | 'vesting';

export default function TreasuryPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: PieChart },
    { id: 'sanctum' as const, label: 'Sanctum (Charity)', icon: Heart },
    { id: 'ecosystem' as const, label: 'Ecosystem Vault', icon: Users },
    { id: 'revenue' as const, label: 'Revenue Splitter', icon: TrendingUp },
    { id: 'vesting' as const, label: 'Dev Vesting', icon: Clock },
  ];

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[#0D0D0F] pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8] mb-4">
              Treasury Dashboard
            </h1>
            <p className="text-[#A0A0A5] text-lg max-w-2xl mx-auto">
              View protocol treasury allocations, charity distributions, and ecosystem funding
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#00F0FF] text-[#0D0D0F]'
                    : 'bg-[#2A2A2F] text-[#A0A0A5] hover:text-[#F5F3E8]'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'sanctum' && <SanctumTab isConnected={isConnected} />}
          {activeTab === 'ecosystem' && <EcosystemTab isConnected={isConnected} />}
          {activeTab === 'revenue' && <RevenueTab />}
          {activeTab === 'vesting' && <VestingTab />}
        </div>
      </main>
      <Footer />
    </>
  );
}

function OverviewTab() {
  const treasuryStats = [
    { label: 'Total Treasury', value: '45.2M VFIDE', icon: Wallet, color: '#00F0FF' },
    { label: 'Sanctum (Charity)', value: '2.1M VFIDE', icon: Heart, color: '#FF6B6B' },
    { label: 'Ecosystem Vault', value: '18.5M VFIDE', icon: Users, color: '#4ECDC4' },
    { label: 'Operations', value: '12.3M VFIDE', icon: TrendingUp, color: '#FFD700' },
  ];

  const recentDistributions = [
    { recipient: 'Council Salaries', amount: '50,000 VFIDE', date: '2 hours ago', type: 'council' },
    { recipient: 'Education Grants', amount: '25,000 VFIDE', date: '1 day ago', type: 'charity' },
    { recipient: 'LP Incentives', amount: '100,000 VFIDE', date: '3 days ago', type: 'ecosystem' },
    { recipient: 'Merchant Rewards', amount: '15,000 VFIDE', date: '5 days ago', type: 'ecosystem' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {treasuryStats.map((stat, idx) => (
          <div key={idx} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <stat.icon size={24} style={{ color: stat.color }} />
              <span className="text-xs text-[#A0A0A5]">Live</span>
            </div>
            <div className="text-2xl font-bold text-[#F5F3E8] mb-1">{stat.value}</div>
            <div className="text-sm text-[#A0A0A5]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Allocation Chart */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Fee Distribution Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-[#1A1A1D] rounded-lg">
            <div className="text-4xl font-bold text-orange-400 mb-2">~86%</div>
            <div className="text-[#F5F3E8] font-bold">Burn</div>
            <div className="text-xs text-[#A0A0A5]">Deflationary mechanism</div>
          </div>
          <div className="text-center p-4 bg-[#1A1A1D] rounded-lg">
            <div className="text-4xl font-bold text-pink-400 mb-2">~3%</div>
            <div className="text-[#F5F3E8] font-bold">Sanctum</div>
            <div className="text-xs text-[#A0A0A5]">Charity fund</div>
          </div>
          <div className="text-center p-4 bg-[#1A1A1D] rounded-lg">
            <div className="text-4xl font-bold text-cyan-400 mb-2">~11%</div>
            <div className="text-[#F5F3E8] font-bold">Ecosystem</div>
            <div className="text-xs text-[#A0A0A5]">Council, merchants, incentives</div>
          </div>
        </div>
      </div>

      {/* Recent Distributions */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Recent Distributions</h3>
        <div className="space-y-3">
          {recentDistributions.map((dist, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1D] rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  dist.type === 'council' ? 'bg-purple-500/20' :
                  dist.type === 'charity' ? 'bg-pink-500/20' : 'bg-cyan-500/20'
                }`}>
                  {dist.type === 'council' ? <Users size={20} className="text-purple-400" /> :
                   dist.type === 'charity' ? <Heart size={20} className="text-pink-400" /> :
                   <TrendingUp size={20} className="text-cyan-400" />}
                </div>
                <div>
                  <div className="text-[#F5F3E8] font-bold">{dist.recipient}</div>
                  <div className="text-xs text-[#A0A0A5]">{dist.date}</div>
                </div>
              </div>
              <div className="text-[#00F0FF] font-bold">{dist.amount}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SanctumTab({ isConnected }: { isConnected: boolean }) {
  const charities = [
    { name: 'Education Foundation', allocation: 40, totalReceived: '850,000 VFIDE', status: 'active' },
    { name: 'Environmental Fund', allocation: 30, totalReceived: '620,000 VFIDE', status: 'active' },
    { name: 'Healthcare Initiative', allocation: 20, totalReceived: '410,000 VFIDE', status: 'active' },
    { name: 'Community Development', allocation: 10, totalReceived: '205,000 VFIDE', status: 'active' },
  ];

  const pendingDisbursements = [
    { id: 1, charity: 'Education Foundation', amount: '50,000 VFIDE', approvals: 2, required: 3 },
    { id: 2, charity: 'Environmental Fund', amount: '30,000 VFIDE', approvals: 1, required: 3 },
  ];

  return (
    <div className="space-y-8">
      {/* Sanctum Overview */}
      <div className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-500/30 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <Heart className="w-12 h-12 text-pink-400" />
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8]">Sanctum Charity Vault</h2>
            <p className="text-[#A0A0A5]">~3% of all transfer fees fund charitable causes</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-pink-400">2.1M</div>
            <div className="text-sm text-[#A0A0A5]">VFIDE Balance</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-[#F5F3E8]">4</div>
            <div className="text-sm text-[#A0A0A5]">Active Charities</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">2.08M</div>
            <div className="text-sm text-[#A0A0A5]">Total Distributed</div>
          </div>
        </div>
      </div>

      {/* Registered Charities */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Registered Charities</h3>
        <div className="space-y-4">
          {charities.map((charity, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1D] rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <Heart size={20} className="text-pink-400" />
                </div>
                <div>
                  <div className="text-[#F5F3E8] font-bold">{charity.name}</div>
                  <div className="text-xs text-[#A0A0A5]">Allocation: {charity.allocation}%</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#00F0FF] font-bold">{charity.totalReceived}</div>
                <div className="text-xs text-green-400">Active</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Disbursements */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Pending Disbursements</h3>
        {!isConnected ? (
          <div className="text-center py-8 text-[#A0A0A5]">
            Connect wallet to view and approve disbursements
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDisbursements.map((disb) => (
              <div key={disb.id} className="p-4 bg-[#1A1A1D] rounded-lg border border-yellow-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[#F5F3E8] font-bold">{disb.charity}</div>
                    <div className="text-[#00F0FF] font-bold">{disb.amount}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">{disb.approvals}/{disb.required} Approvals</div>
                    <div className="text-xs text-[#A0A0A5]">Multi-sig required</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors">
                    Approve
                  </button>
                  <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EcosystemTab({ isConnected }: { isConnected: boolean }) {
  const allocations = [
    { name: 'Council Salaries', percentage: 40, amount: '7.4M VFIDE', icon: Users },
    { name: 'Merchant Rewards', percentage: 25, amount: '4.6M VFIDE', icon: Wallet },
    { name: 'Headhunter Bounties', percentage: 20, amount: '3.7M VFIDE', icon: TrendingUp },
    { name: 'Operations', percentage: 15, amount: '2.8M VFIDE', icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* Ecosystem Overview */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <Users className="w-12 h-12 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8]">Ecosystem Vault</h2>
            <p className="text-[#A0A0A5]">Funds council salaries, merchant rewards, and growth initiatives</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400">18.5M</div>
            <div className="text-sm text-[#A0A0A5]">VFIDE Balance</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-[#F5F3E8]">11%</div>
            <div className="text-sm text-[#A0A0A5]">Of Transfer Fees</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">42.1M</div>
            <div className="text-sm text-[#A0A0A5]">Total Distributed</div>
          </div>
        </div>
      </div>

      {/* Allocation Breakdown */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Allocation Breakdown</h3>
        <div className="space-y-4">
          {allocations.map((alloc, idx) => (
            <div key={idx} className="p-4 bg-[#1A1A1D] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <alloc.icon size={20} className="text-cyan-400" />
                  <span className="text-[#F5F3E8] font-bold">{alloc.name}</span>
                </div>
                <span className="text-[#00F0FF] font-bold">{alloc.amount}</span>
              </div>
              <div className="w-full h-2 bg-[#3A3A3F] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" 
                  style={{ width: `${alloc.percentage}%` }}
                />
              </div>
              <div className="text-right text-xs text-[#A0A0A5] mt-1">{alloc.percentage}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Claim Rewards (if applicable) */}
      {isConnected && (
        <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Your Claimable Rewards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#1A1A1D] rounded-lg">
              <div className="text-[#A0A0A5] text-sm mb-1">Merchant Rewards</div>
              <div className="text-2xl font-bold text-[#00F0FF]">0 VFIDE</div>
              <button className="mt-3 w-full bg-[#3A3A3F] text-[#707075] font-bold py-2 rounded-lg cursor-not-allowed">
                No Rewards Available
              </button>
            </div>
            <div className="p-4 bg-[#1A1A1D] rounded-lg">
              <div className="text-[#A0A0A5] text-sm mb-1">Headhunter Bounties</div>
              <div className="text-2xl font-bold text-[#00F0FF]">0 VFIDE</div>
              <button className="mt-3 w-full bg-[#3A3A3F] text-[#707075] font-bold py-2 rounded-lg cursor-not-allowed">
                No Bounties Available
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueTab() {
  const payees = [
    { name: 'Burn Address', share: 86, description: 'Deflationary burn' },
    { name: 'Sanctum Vault', share: 3, description: 'Charity fund' },
    { name: 'Ecosystem Vault', share: 11, description: 'Operations & rewards' },
  ];

  return (
    <div className="space-y-8">
      {/* Revenue Splitter Overview */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <TrendingUp className="w-12 h-12 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8]">Revenue Splitter</h2>
            <p className="text-[#A0A0A5]">Automatically distributes transfer fees to designated recipients</p>
          </div>
        </div>
      </div>

      {/* Revenue Flow */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Fee Flow</h3>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="p-4 bg-[#1A1A1D] rounded-lg text-center">
            <div className="text-[#F5F3E8] font-bold">Transfer Fees</div>
            <div className="text-xs text-[#A0A0A5]">0.25% - 5%</div>
          </div>
          <ArrowRight className="text-[#00F0FF]" />
          <div className="p-4 bg-[#1A1A1D] rounded-lg text-center">
            <div className="text-[#F5F3E8] font-bold">BurnRouter</div>
            <div className="text-xs text-[#A0A0A5]">Calculates splits</div>
          </div>
          <ArrowRight className="text-[#00F0FF]" />
          <div className="p-4 bg-[#1A1A1D] rounded-lg text-center">
            <div className="text-[#F5F3E8] font-bold">RevenueSplitter</div>
            <div className="text-xs text-[#A0A0A5]">Distributes</div>
          </div>
        </div>
      </div>

      {/* Payees */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Distribution Recipients</h3>
        <div className="space-y-4">
          {payees.map((payee, idx) => (
            <div key={idx} className="p-4 bg-[#1A1A1D] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[#F5F3E8] font-bold">{payee.name}</div>
                  <div className="text-xs text-[#A0A0A5]">{payee.description}</div>
                </div>
                <div className="text-2xl font-bold text-[#00F0FF]">{payee.share}%</div>
              </div>
              <div className="w-full h-3 bg-[#3A3A3F] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    payee.name === 'Burn Address' ? 'bg-orange-500' :
                    payee.name === 'Sanctum Vault' ? 'bg-pink-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${payee.share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VestingTab() {
  const vestingSchedule = {
    total: '50,000,000 VFIDE',
    vested: '8,333,333 VFIDE',
    claimed: '5,000,000 VFIDE',
    claimable: '3,333,333 VFIDE',
    vestingStart: 'June 1, 2025',
    vestingEnd: 'June 1, 2028',
    cliffEnd: 'December 1, 2025',
    monthlyUnlock: '1,388,889 VFIDE',
  };

  return (
    <div className="space-y-8">
      {/* Vesting Overview */}
      <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <Clock className="w-12 h-12 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8]">Dev Reserve Vesting</h2>
            <p className="text-[#A0A0A5]">50M VFIDE locked with 6-month cliff, 36-month linear vesting</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{vestingSchedule.total}</div>
            <div className="text-sm text-[#A0A0A5]">Total Allocation</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{vestingSchedule.vested}</div>
            <div className="text-sm text-[#A0A0A5]">Vested</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-[#F5F3E8]">{vestingSchedule.claimed}</div>
            <div className="text-sm text-[#A0A0A5]">Claimed</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-[#00F0FF]">{vestingSchedule.claimable}</div>
            <div className="text-sm text-[#A0A0A5]">Claimable Now</div>
          </div>
        </div>
      </div>

      {/* Vesting Timeline */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-6">Vesting Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <CheckCircle className="text-green-400" size={24} />
            <div>
              <div className="text-[#F5F3E8] font-bold">Vesting Start</div>
              <div className="text-sm text-[#A0A0A5]">{vestingSchedule.vestingStart}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CheckCircle className="text-green-400" size={24} />
            <div>
              <div className="text-[#F5F3E8] font-bold">Cliff End</div>
              <div className="text-sm text-[#A0A0A5]">{vestingSchedule.cliffEnd}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AlertCircle className="text-yellow-400" size={24} />
            <div>
              <div className="text-[#F5F3E8] font-bold">Linear Vesting</div>
              <div className="text-sm text-[#A0A0A5]">{vestingSchedule.monthlyUnlock}/month</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Clock className="text-[#A0A0A5]" size={24} />
            <div>
              <div className="text-[#F5F3E8] font-bold">Vesting Complete</div>
              <div className="text-sm text-[#A0A0A5]">{vestingSchedule.vestingEnd}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">Vesting Progress</h3>
        <div className="w-full h-6 bg-[#1A1A1D] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: '16.67%' }} />
        </div>
        <div className="flex justify-between text-sm text-[#A0A0A5] mt-2">
          <span>16.67% Vested</span>
          <span>6 of 36 months</span>
        </div>
      </div>
    </div>
  );
}
