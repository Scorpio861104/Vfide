'use client';

export const dynamic = 'force-dynamic';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Heart, Gift, History, Coins } from "lucide-react";

import { OverviewTab } from "./components/OverviewTab";
import { CharitiesTab } from "./components/CharitiesTab";
import { DisbursementsTab } from "./components/DisbursementsTab";
import { DonateTab } from "./components/DonateTab";
import { HistoryTab } from "./components/HistoryTab";
import { useLocale } from '@/lib/locale/LocaleProvider';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Heart },
  { id: 'charities', label: 'Charities', icon: Gift },
  { id: 'disbursements', label: 'Disbursements', icon: Coins },
  { id: 'donate', label: 'Donate', icon: Heart },
  { id: 'history', label: 'History', icon: History },
] as const;

type TabId = typeof tabs[number]['id'];

export default function SanctumPage() {
  const { locale } = useLocale();
  void locale;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative container mx-auto px-4 max-w-6xl py-8">
          <div className="badge-live mb-3">
            <Heart size={12} /> Charitable Protocol
          </div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-4xl font-black text-white tracking-tight">
              <span className="bg-gradient-to-r from-white to-pink-300 bg-clip-text text-transparent">The Sanctum</span>
            </h1>
            <Heart className="text-pink-400" size={32} aria-hidden="true" />
          </div>
          <p className="text-white/60 mb-8">20% of all protocol fees fund verified charitable causes</p>

          <div className="sticky top-7 md:top-[5.25rem] z-30 backdrop-blur-xl bg-zinc-950/80 flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-white/5">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'tab-pill-active flex items-center gap-2' : 'tab-pill-inactive flex items-center gap-2'}>
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
