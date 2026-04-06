'use client';

import { Footer } from "@/components/layout/Footer";
import { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, ERC20ABI } from "@/lib/contracts";
import { ZERO_ADDRESS } from "@/lib/constants";
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

function isConfiguredAddress(value?: string) {
  return Boolean(value && value !== ZERO_ADDRESS);
}

function toTokenNumber(value: unknown) {
  return typeof value === 'bigint' ? Number.parseFloat(formatUnits(value, 18)) : 0;
}

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected } = useAccount();

  const hasTokenAddress = isConfiguredAddress(CONTRACT_ADDRESSES.VFIDEToken);
  const hasSanctumAddress = isConfiguredAddress(CONTRACT_ADDRESSES.SanctumVault);
  const hasEcosystemAddress = isConfiguredAddress(CONTRACT_ADDRESSES.EcosystemVault);
  const hasVestingAddress = isConfiguredAddress(CONTRACT_ADDRESSES.DevReserveVesting);

  const { data: sanctumBalanceRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [CONTRACT_ADDRESSES.SanctumVault],
    query: { enabled: hasTokenAddress && hasSanctumAddress },
  });

  const { data: ecosystemBalanceRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [CONTRACT_ADDRESSES.EcosystemVault],
    query: { enabled: hasTokenAddress && hasEcosystemAddress },
  });

  const { data: vestingBalanceRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [CONTRACT_ADDRESSES.DevReserveVesting],
    query: { enabled: hasTokenAddress && hasVestingAddress },
  });

  const treasurySnapshot = useMemo(() => {
    const sanctumBalance = toTokenNumber(sanctumBalanceRaw);
    const ecosystemBalance = toTokenNumber(ecosystemBalanceRaw);
    const vestingBalance = toTokenNumber(vestingBalanceRaw);
    const totalBalance = sanctumBalance + ecosystemBalance + vestingBalance;
    const liveSources = [sanctumBalanceRaw, ecosystemBalanceRaw, vestingBalanceRaw].filter((value) => typeof value === 'bigint').length;

    return {
      contractsReady: hasTokenAddress && (hasSanctumAddress || hasEcosystemAddress || hasVestingAddress),
      liveSources,
      sanctumBalance,
      ecosystemBalance,
      vestingBalance,
      totalBalance,
    };
  }, [ecosystemBalanceRaw, hasEcosystemAddress, hasSanctumAddress, hasTokenAddress, hasVestingAddress, sanctumBalanceRaw, vestingBalanceRaw]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <h1 className="text-4xl font-bold text-white mb-2">Treasury Dashboard</h1>
          <p className="text-white/60 mb-4">Protocol funds, fee distribution, and ecosystem health</p>

          <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-gray-200">
            <div className="font-semibold text-cyan-300">
              {treasurySnapshot.liveSources > 0
                ? `${treasurySnapshot.liveSources} vault balance${treasurySnapshot.liveSources === 1 ? '' : 's'} synced`
                : treasurySnapshot.contractsReady
                  ? 'Vault routes configured'
                  : 'Awaiting live contract addresses'}
            </div>
            <p className="mt-1 text-gray-300">
              {treasurySnapshot.liveSources > 0
                ? 'Treasury balances are now pulled from the configured VFIDE vault contracts and reflected throughout the tabs below.'
                : 'This view will switch from guidance mode to live treasury balances as soon as the VFIDE token and vault environment variables are restored.'}
            </p>
          </div>

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

          {activeTab === 'overview' && (
            <OverviewTab
              totalBalance={treasurySnapshot.totalBalance}
              sanctumBalance={treasurySnapshot.sanctumBalance}
              ecosystemBalance={treasurySnapshot.ecosystemBalance}
              vestingBalance={treasurySnapshot.vestingBalance}
              contractsReady={treasurySnapshot.contractsReady}
              liveSources={treasurySnapshot.liveSources}
            />
          )}
          {activeTab === 'sanctum' && (
            <SanctumTab
              isConnected={isConnected}
              vaultBalance={treasurySnapshot.sanctumBalance}
              contractsReady={treasurySnapshot.contractsReady}
            />
          )}
          {activeTab === 'ecosystem' && (
            <EcosystemTab
              isConnected={isConnected}
              vaultBalance={treasurySnapshot.ecosystemBalance}
              contractsReady={treasurySnapshot.contractsReady}
            />
          )}
          {activeTab === 'revenue' && <RevenueTab />}
          {activeTab === 'vesting' && (
            <VestingTab
              vestingBalance={treasurySnapshot.vestingBalance}
              contractsReady={treasurySnapshot.contractsReady}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
