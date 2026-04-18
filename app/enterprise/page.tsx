'use client';

export const dynamic = 'force-dynamic';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Building2, CreditCard, TrendingUp, Zap } from "lucide-react";

import { OverviewTab } from "./components/OverviewTab";
import { GatewayTab } from "./components/GatewayTab";
import { FiatTab } from "./components/FiatTab";
import { FinanceTab } from "./components/FinanceTab";

const tabs = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'gateway', label: 'Enterprise Gateway', icon: Zap },
  { id: 'fiat', label: 'Fiat On/Off Ramp', icon: CreditCard },
  { id: 'finance', label: 'Finance', icon: TrendingUp },
] as const;
type TabId = typeof tabs[number]['id'];

export default function EnterprisePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <h1 className="text-4xl font-bold text-white mb-2">Enterprise Gateway</h1>
          <p className="text-white/60 mb-8">High-volume payment infrastructure for businesses</p>

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
          {activeTab === 'gateway' && <GatewayTab isConnected={isConnected} />}
          {activeTab === 'fiat' && <FiatTab isConnected={isConnected} />}
          {activeTab === 'finance' && <FinanceTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
