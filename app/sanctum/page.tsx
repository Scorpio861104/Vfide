'use client';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Heart, Gift, History, Coins, BarChart3 } from "lucide-react";

import { OverviewTab } from "./components/OverviewTab";
import { CharitiesTab } from "./components/CharitiesTab";
import { DisbursementsTab } from "./components/DisbursementsTab";
import { DonateTab } from "./components/DonateTab";
import { HistoryTab } from "./components/HistoryTab";

const tabs = [
  { id: 'overview', label: 'Overview', icon: Heart },
  { id: 'charities', label: 'Charities', icon: Gift },
  { id: 'disbursements', label: 'Disbursements', icon: Coins },
  { id: 'donate', label: 'Donate', icon: Heart },
  { id: 'history', label: 'History', icon: History },
] as const;

type TabId = typeof tabs[number]['id'];

export default function SanctumPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-4xl font-bold text-white">The Sanctum</h1>
            <Heart className="text-pink-400" size={32} aria-hidden="true" />
          </div>
          <p className="text-white/60 mb-8">20% of all protocol fees fund verified charitable causes</p>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                <tab.icon size={16} />{tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'charities' && <CharitiesTab />}
          {activeTab === 'disbursements' && <DisbursementsTab isConnected={isConnected} />}
          {activeTab === 'donate' && <DonateTab isConnected={isConnected} />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
