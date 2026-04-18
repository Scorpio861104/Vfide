'use client';

export const dynamic = 'force-dynamic';

import { Footer } from "@/components/layout/Footer";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { motion } from "framer-motion";
import { Clock, BarChart3, Gift } from "lucide-react";
import { CONTRACT_ADDRESSES, DevReserveVestingABI, isConfiguredContractAddress } from "@/lib/contracts";

import { OverviewTab } from "./components/OverviewTab";
import { ScheduleTab } from "./components/ScheduleTab";
import { ClaimTab } from "./components/ClaimTab";

const tabs = [
  { id: 'overview', label: 'Overview', icon: Clock },
  { id: 'schedule', label: 'Vesting Schedule', icon: BarChart3 },
  { id: 'claim', label: 'Claim Tokens', icon: Gift },
] as const;

const VESTING_ADDRESS = CONTRACT_ADDRESSES.DevReserveVesting;
const VESTING_ABI = DevReserveVestingABI;

type TabId = typeof tabs[number]['id'];

export default function VestingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { isConnected, address } = useAccount();
  const isAvailable = isConfiguredContractAddress(VESTING_ADDRESS)
  const readQuery = { enabled: isAvailable }
  const { data: beneficiary } = useReadContract({ address: VESTING_ADDRESS, abi: VESTING_ABI, functionName: 'BENEFICIARY', query: readQuery });
  const { data: claimsPaused } = useReadContract({ address: VESTING_ADDRESS, abi: VESTING_ABI, functionName: 'claimsPaused', query: readQuery });
  const { data: vestingStatus } = useReadContract({ address: VESTING_ADDRESS, abi: VESTING_ABI, functionName: 'getVestingStatus', query: readQuery });
  const { data: schedule } = useReadContract({ address: VESTING_ADDRESS, abi: VESTING_ABI, functionName: 'getVestingSchedule', query: readQuery });
  const typedVestingStatus = vestingStatus as readonly [bigint, bigint, bigint, bigint, number, bigint, boolean] | undefined;
  const claimable = typedVestingStatus?.[3] ?? 0n;
  const isBeneficiary = Boolean(address && beneficiary && String(beneficiary).toLowerCase() === String(address).toLowerCase());

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <h1 className="text-4xl font-bold text-white mb-2">Token Vesting</h1>
          <p className="text-white/60 mb-8">Vesting schedules and token release tracking</p>

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

          {activeTab === 'overview' && <OverviewTab vestingStatus={typedVestingStatus} />}
          {activeTab === 'schedule' && <ScheduleTab schedule={schedule as readonly { month: number; percentage: number; unlockTime: number | bigint; unlocked: boolean; }[] | undefined} />}
          {activeTab === 'claim' && (
            <ClaimTab
              isConnected={isConnected}
              isBeneficiary={isBeneficiary}
              claimable={claimable}
              claimsPaused={Boolean(claimsPaused)}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
