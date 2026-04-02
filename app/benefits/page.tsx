'use client';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Gift, Layers, Trophy, BarChart3 } from "lucide-react";

import { OverviewTab } from "./components/OverviewTab";
import { TiersTab } from "./components/TiersTab";
import { RewardsTab } from "./components/RewardsTab";
import { StatsTab } from "./components/StatsTab";

const tabs = [
  { id: 'overview', label: 'Overview', icon: Gift },
  { id: 'tiers', label: 'Membership Tiers', icon: Layers },
  { id: 'rewards', label: 'Available Rewards', icon: Trophy },
  { id: 'stats', label: 'My Stats', icon: BarChart3 },
] as const;

type TabId = typeof tabs[number]['id'];

export default function BenefitsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected, address } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <h1 className="text-4xl font-bold text-white mb-2">Member Benefits</h1>
          <p className="text-white/60 mb-8">Tier rewards and ProofScore benefits</p>

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
          {activeTab === 'tiers' && <TiersTab />}
          {activeTab === 'rewards' && <RewardsTab isConnected={isConnected} />}
          {activeTab === 'stats' && <StatsTab isConnected={isConnected} address={address} />}
        </div>
      </div>
      <Footer />
    </>
  );
}
