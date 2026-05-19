'use client';

export const dynamic = 'force-dynamic';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass, Lock, MessageCircle, Shield, UserCog, Users, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import { Footer } from '@/components/layout/Footer';
import { UserStatsWidget } from '@/components/gamification/GamificationWidgets';
import { FirstTimeUserBanner } from '@/components/ui/FirstTimeUserBanner';
import { useHasVault } from '@/hooks/useHasVault';
import { useGamification } from '@/lib/gamification';
import { ZERO_ADDRESS } from '@/lib/contracts';
import { analytics } from '@/lib/socialAnalytics';

import { AccountTab } from './components/AccountTab';
import { CirclesTab } from './components/CirclesTab';
import { DiscoverTab } from './components/DiscoverTab';
import { GroupsTab } from './components/GroupsTab';
import { MessagesTab } from './components/MessagesTab';
import { PrivacyTab } from './components/PrivacyTab';
import { RequestsTab } from './components/RequestsTab';

type TabId = 'messages' | 'requests' | 'circles' | 'groups' | 'discover' | 'account' | 'privacy';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'messages',  label: 'Messages',  icon: MessageCircle },
  { id: 'requests',  label: 'Requests',  icon: UserX },
  { id: 'circles',   label: 'Circles',   icon: Users },
  { id: 'groups',    label: 'Groups',    icon: Users },
  { id: 'discover',  label: 'Discover',  icon: Compass },
  { id: 'account',   label: 'Account',   icon: UserCog },
  { id: 'privacy',   label: 'Privacy',   icon: Shield },
];

export default function SocialMessagingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('messages');
  const { address, isConnected } = useAccount();
  const { hasVault, vaultAddress, isLoading } = useHasVault();
  const { recordActivity } = useGamification(address);

  useEffect(() => {
    if (!isConnected) return;
    analytics.track('vault_info_viewed', { userAddress: address, hasVault });
    recordActivity?.();
  }, [address, hasVault, isConnected, recordActivity]);

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      {!isConnected ? (
        <div className="relative container mx-auto max-w-lg px-4 py-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card-premium text-center py-14 px-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="text-violet-400" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h1>
            <p className="text-white/50 mb-8">Access encrypted messaging, circles, and community coordination.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="relative container mx-auto max-w-6xl px-4 py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="badge-live"><span className="badge-live-dot" />Social Network</span>
            </div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                    Social Messaging
                  </span>
                </h1>
                <p className="text-white/50 text-lg">Encrypted messaging, circles, and trusted community coordination.</p>
              </div>
              <div className="analytics-card px-4 py-3 text-sm">
                <div className="text-xs text-white/40 mb-1">Vault Status</div>
                <div className={`font-bold ${hasVault ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isLoading ? 'Checking…' : hasVault ? '✓ Vault Active' : '⚠ Vault Recommended'}
                </div>
                {typeof vaultAddress === 'string' && (
                  <div className="text-xs text-white/30 mt-0.5">{vaultAddress.slice(0, 10)}…</div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Banners row */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <FirstTimeUserBanner message="Secure your profile and start building trusted circles." />
            <div className="glass-card-premium p-4">
              <UserStatsWidget userAddress={address ?? ZERO_ADDRESS} />
            </div>
          </div>

          {/* Sticky Tab Bar */}
          <div className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
            style={{ background: 'rgba(9,9,11,0.85)' }}>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={activeTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}>
              {activeTab === 'messages'  && <MessagesTab hasVault={hasVault} />}
              {activeTab === 'requests'  && <RequestsTab />}
              {activeTab === 'circles'   && <CirclesTab />}
              {activeTab === 'groups'    && <GroupsTab />}
              {activeTab === 'discover'  && <DiscoverTab />}
              {activeTab === 'account'   && <AccountTab address={address} />}
              {activeTab === 'privacy'   && <PrivacyTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
      <Footer />
    </div>
  );
}
