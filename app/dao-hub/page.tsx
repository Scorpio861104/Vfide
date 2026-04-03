'use client';

import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { CouncilElectionABI } from '@/lib/abis';
import { OverviewTab } from './components/OverviewTab';
import { ProposalsTab } from './components/ProposalsTab';
import { TreasuryTab } from './components/TreasuryTab';
import { MembersTab } from './components/MembersTab';

type TabId = 'overview' | 'proposals' | 'treasury' | 'members';

type AccessState = 'disconnected' | 'locked' | 'active';

const TAB_LABELS: Record<TabId, string> = { overview: 'Overview', proposals: 'Proposals', treasury: 'Treasury', members: 'Members' };
const TAB_IDS: TabId[] = ['overview', 'proposals', 'treasury', 'members'];
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export default function DaoHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { address, isConnected } = useAccount();

  const councilAddress = (CONTRACT_ADDRESSES.CouncilElection || ZERO_ADDRESS) as `0x${string}`;
  const memberArgs = [address || ZERO_ADDRESS] as const;

  const { data: currentMembership } = useReadContract({
    address: councilAddress,
    abi: CouncilElectionABI as any,
    functionName: 'isCouncil',
    args: memberArgs,
  });

  const { data: legacyMembership } = useReadContract({
    address: councilAddress,
    abi: CouncilElectionABI as any,
    functionName: 'isCouncilMember',
    args: memberArgs,
  });

  const { data: termState } = useReadContract({
    address: councilAddress,
    abi: CouncilElectionABI as any,
    functionName: 'canServeNextTerm',
    args: memberArgs,
  });

  const isMember = Boolean((currentMembership as boolean | undefined) ?? (legacyMembership as boolean | undefined));
  const isTermEligible = Array.isArray(termState) ? Boolean(termState[0]) : true;

  const accessState: AccessState = !isConnected
    ? 'disconnected'
    : isMember && isTermEligible
      ? 'active'
      : 'locked';

  const accessMessage = accessState === 'active'
    ? 'Access Active'
    : 'Access Locked';

  const accessDetail = accessState === 'disconnected'
    ? 'Connect a wallet linked to an active DAO term to review live queues and governance operations.'
    : accessState === 'locked'
      ? 'Your council term has ended or you are no longer an active member.'
      : 'Verified council access is active for the current term.';

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-white mb-2">DAO Operations Hub</h1>
          </motion.div>
          <p className="text-white/60 mb-6">DAO Members Only</p>

          <div className={`mb-8 rounded-2xl border p-4 ${
            accessState === 'active'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}>
            <div className="text-sm font-semibold text-white">{accessMessage}</div>
            <p className="text-sm text-gray-200 mt-1">{accessDetail}</p>
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {TAB_IDS.map(id => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'proposals' && <ProposalsTab />}
          {activeTab === 'treasury' && <TreasuryTab />}
          {activeTab === 'members' && <MembersTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
