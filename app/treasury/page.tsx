'use client';

export const dynamic = 'force-dynamic';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Landmark, Heart, Globe, TrendingUp, Clock } from "lucide-react";

import { OverviewTab } from "./components/OverviewTab";
import { SanctumTab } from "./components/SanctumTab";
import { EcosystemTab } from "./components/EcosystemTab";
import { RevenueTab } from "./components/RevenueTab";
import { VestingTab } from "./components/VestingTab";

const tabs = [
  { id: 'overview', label: 'Overview', icon: Landmark },
  { id: 'sanctum', label: 'Sanctum (Charity)', icon: Heart },
  { id: 'ecosystem', label: 'Ecosystem Vault', icon: Globe },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'vesting', label: 'Vesting', icon: Clock },
] as const;

type TabId = typeof tabs[number]['id'];

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <h1 className="text-4xl font-bold text-white mb-2">Treasury Dashboard</h1>
          <p className="text-white/60 mb-8">Protocol funds, fee distribution, and ecosystem health</p>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                <tab.icon size={16} />{tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'sanctum' && <SanctumTab isConnected={isConnected} />}
          {activeTab === 'ecosystem' && <EcosystemTab isConnected={isConnected} />}
          {activeTab === 'revenue' && <RevenueTab />}
          {activeTab === 'vesting' && <VestingTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
