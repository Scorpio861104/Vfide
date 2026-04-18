'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { Shield, UserCog, Users } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';
import { UserStatsWidget } from '@/components/gamification/GamificationWidgets';
import { FirstTimeUserBanner } from '@/components/ui/FirstTimeUserBanner';
import { useHasVault } from '@/hooks/useHasVault';
import { ZERO_ADDRESS } from '@/lib/contracts';
import { analytics } from '@/lib/socialAnalytics';
import { useGamification } from '@/lib/gamification';
import { AccountTab } from './components/AccountTab';
import { CirclesTab } from './components/CirclesTab';
import { DiscoverTab } from './components/DiscoverTab';
import { GroupsTab } from './components/GroupsTab';
import { MessagesTab } from './components/MessagesTab';
import { PrivacyTab } from './components/PrivacyTab';
import { RequestsTab } from './components/RequestsTab';

type TabId = 'messages' | 'requests' | 'circles' | 'groups' | 'discover' | 'account' | 'privacy';

const TAB_LABELS: Record<TabId, string> = {
  messages: 'Messages',
  requests: 'Requests',
  circles: 'Circles',
  groups: 'Groups',
  discover: 'Discover',
  account: 'Account',
  privacy: 'Privacy',
};

const TAB_IDS: TabId[] = ['messages', 'requests', 'circles', 'groups', 'discover', 'account', 'privacy'];

export default function SocialMessagingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('messages');
  const { address, isConnected } = useAccount();
  const { hasVault, vaultAddress, isLoading } = useHasVault();
  const { recordActivity } = useGamification(address);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    analytics.track('vault_info_viewed', { userAddress: address, hasVault });
    recordActivity?.();
  }, [address, hasVault, isConnected, recordActivity]);

  if (!isConnected) {
    return (
      <>
        <div className="min-h-screen bg-zinc-950 pt-20">
          <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
              <h1 className="mb-3 text-4xl font-bold text-white">Connect Your Wallet</h1>
              <p className="mb-6 text-gray-300">Access encrypted messaging, circles, and community coordination by connecting your wallet.</p>
              <ConnectButton />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-white">
                Social Hub
              </h1>
              <p className="text-white/60">Connect with the VFIDE community through encrypted messaging, circles, and trusted endorsements.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              {isLoading ? 'Checking vault status…' : hasVault ? 'Vault Active' : 'Vault Recommended'}
              {typeof vaultAddress === 'string' ? <span className="ml-2 text-cyan-300">{vaultAddress.slice(0, 8)}...</span> : null}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <FirstTimeUserBanner message="Secure your profile and start building trusted circles." />
            <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <UserStatsWidget userAddress={address ?? ZERO_ADDRESS} />
            </div>
          </div>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {(id === 'messages' || id === 'groups' || id === 'circles') && <Users size={14} />}
                {id === 'account' && <UserCog size={14} />}
                {id === 'privacy' && <Shield size={14} />}
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'messages' && <MessagesTab hasVault={hasVault} />}
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'circles' && <CirclesTab />}
          {activeTab === 'groups' && <GroupsTab />}
          {activeTab === 'discover' && <DiscoverTab />}
          {activeTab === 'account' && <AccountTab address={address} />}
          {activeTab === 'privacy' && <PrivacyTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
