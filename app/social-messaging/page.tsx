'use client';

import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Users,
  Shield,
  Lock,
  UserPlus,
  Circle as CircleIcon,
  User,
  Search,
  Activity,
  Award,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useHasVault } from '@/hooks/useHasVault';
import { FriendsList } from '@/components/social/FriendsList';
import { MessagingCenter } from '@/components/social/MessagingCenter';
import { GroupMessaging } from '@/components/social/GroupMessaging';
import { FriendRequestsPanel } from '@/components/social/FriendRequestsPanel';
import { PrivacySettings } from '@/components/social/PrivacySettings';
import { FriendCirclesManager } from '@/components/social/FriendCirclesManager';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { SocialNotifications } from '@/components/social/SocialNotifications';
import { GlobalUserSearch } from '@/components/social/GlobalUserSearch';
import { ActivityFeed } from '@/components/social/ActivityFeed';
import { EndorsementsBadges } from '@/components/social/EndorsementsBadges';
import { FirstTimeUserBanner } from '@/components/ui/FirstTimeUserBanner';
import { Friend, Group } from '@/types/messaging';
import { FriendRequest } from '@/types/friendRequests';
import { STORAGE_KEYS } from '@/lib/messageEncryption';
import { analytics } from '@/lib/socialAnalytics';
import { gamification, useGamification } from '@/lib/gamification';
import { UserStatsWidget } from '@/components/gamification/GamificationWidgets';

type TabType = 'messages' | 'requests' | 'circles' | 'groups' | 'account' | 'privacy' | 'discover' | 'activity';

export default function SocialPage() {
  const { address, isConnected } = useAccount();
  const { hasVault, vaultAddress: _vaultAddress, isLoading: isLoadingVault } = useHasVault();
  const { recordActivity, unlockAchievement } = useGamification(address);
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [selectedFriend, setSelectedFriend] = useState<Friend | undefined>();
  const [_selectedGroup, setSelectedGroup] = useState<Group | undefined>();
  const [friends, setFriends] = useState<Friend[]>([]);

  // Load friends from localStorage
  React.useEffect(() => {
    if (!address) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_${address}`);
    if (stored) {
      try {
        setFriends(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load friends:', e);
      }
    }
  }, [address]);

  // Track wallet connection and unlock achievement
  React.useEffect(() => {
    if (isConnected && address) {
      analytics.track('wallet_connected', { userAddress: address });
      unlockAchievement('first_connection');
      recordActivity();
    }
  }, [isConnected, address, unlockAchievement, recordActivity]);

  // Track vault status and unlock achievement
  React.useEffect(() => {
    if (hasVault && address) {
      analytics.track('vault_created', { userAddress: address, hasVault: true });
      unlockAchievement('vault_creator');
    }
  }, [hasVault, address, unlockAchievement]);

  // Accept friend request handler
  const handleAcceptRequest = (request: FriendRequest) => {
    if (!address) return;
    
    const newFriend: Friend = {
      address: request.from,
      alias: request.fromAlias,
      addedDate: Date.now(),
      isFavorite: false,
      proofScore: request.fromProofScore || 0,
    };

    const stored = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_${address}`);
    const existingFriends: Friend[] = stored ? JSON.parse(stored) : [];
    const updated = [...existingFriends, newFriend];
    setFriends(updated);
    localStorage.setItem(`${STORAGE_KEYS.FRIENDS}_${address}`, JSON.stringify(updated));

    // Award XP and update gamification stats
    gamification.incrementStat(address, 'friendsAdded');
    gamification.awardXP(address, 25, 'Added a friend');
  };

  const handleRejectRequest = (_request: FriendRequest) => {
    // Rejected request handled
  };

  const tabs = [
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle, color: '#00F0FF' },
    { id: 'requests' as const, label: 'Requests', icon: UserPlus, color: '#FFD700' },
    { id: 'circles' as const, label: 'Circles', icon: CircleIcon, color: '#FF8C42' },
    { id: 'groups' as const, label: 'Groups', icon: Users, color: '#A78BFA' },
    { id: 'discover' as const, label: 'Discover', icon: Search, color: '#00D5E0' },
    { id: 'activity' as const, label: 'Activity', icon: Activity, color: '#50C878' },
    { id: 'account' as const, label: 'Account', icon: User, color: '#00F0FF' },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield, color: '#FF6B9D' },
  ];

  return (
    <>

      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          {/* Wallet Connection Guard */}
          {!isConnected && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-linear-to-br from-zinc-900 to-zinc-950 border border-zinc-700 rounded-2xl p-8 md:p-12 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-zinc-950" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
                  Access encrypted messaging, friend connections, and social features.
                  Your wallet is your identity—no email or signup required.
                </p>
                
                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                  <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                    <MessageCircle className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-100">Encrypted Messaging</p>
                    <p className="text-xs text-zinc-500 mt-1">End-to-end encryption</p>
                  </div>
                  <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                    <Users className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-100">Groups & Friends</p>
                    <p className="text-xs text-zinc-500 mt-1">Build your network</p>
                  </div>
                  <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                    <Award className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-zinc-100">Endorsements</p>
                    <p className="text-xs text-zinc-500 mt-1">Build reputation</p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </motion.div>
            </div>
          )}

          {/* Header */}
          {isConnected && (
          <React.Fragment>
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold text-zinc-100 mb-2 md:mb-3 flex items-center gap-2 md:gap-3">
                  <MessageCircle className="w-8 h-8 md:w-10 md:h-10 text-cyan-400" />
                  Social Hub
                </h1>
                <p className="text-zinc-400 text-sm md:text-lg flex items-center gap-2">
                  <Lock className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Connect with friends through end-to-end encrypted messaging</span>
                  <span className="sm:hidden">Encrypted messaging</span>
                </p>
              </div>

              {/* Connection Status, Gamification & Notifications */}
              {address && (
                <div className="flex items-center gap-2 md:gap-3">
                  <UserStatsWidget userAddress={address} compact />
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 bg-zinc-900 border border-zinc-700 rounded-lg px-3 md:px-4 py-2 md:py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-emerald-500 rounded-full animate-pulse" />
                      <div>
                        <div className="text-xs text-zinc-400">Connected</div>
                        <div className="text-xs md:text-sm font-medium text-zinc-100">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </div>
                      </div>
                    </div>
                    {isLoadingVault ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-500/10 border border-zinc-500/30 rounded-full">
                        <div className="w-3 h-3 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-zinc-500 font-semibold">Checking...</span>
                      </div>
                    ) : hasVault ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-cyan-400/10 border border-cyan-400/30 rounded-full">
                        <Lock className="w-3 h-3 text-cyan-400" />
                        <span className="text-xs text-cyan-400 font-semibold">Vault Active</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="relative">
                    <SocialNotifications />
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* First-time user banner */}
          {isConnected && (
            <div className="px-4 sm:px-6 lg:px-8">
              <FirstTimeUserBanner
                storageKey={`vfide_social_welcome_${address}`}
                message={
                  hasVault 
                    ? "✨ Your vault is active! You can now send and request payments directly in messages."
                    : "👋 Welcome to VFIDE Social! Start messaging friends securely. Create a vault to unlock payment features."
                }
                actionText={hasVault ? undefined : "Create Vault"}
                onAction={hasVault ? undefined : () => window.location.href = '/vault'}
              />
            </div>
          )}

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            {/* Mobile: Horizontal scroll */}
            <div className="lg:hidden overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? ''
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    }`}
                    style={
                      activeTab === tab.id
                        ? { backgroundColor: `${tab.color}20`, color: tab.color, borderColor: `${tab.color}80`, border: '1px solid' }
                        : {}
                    }
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop: Grid */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-4 gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                      activeTab === tab.id
                        ? ''
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    }`}
                    style={
                      activeTab === tab.id
                        ? { backgroundColor: `${tab.color}20`, color: tab.color, borderColor: `${tab.color}80`, border: '1px solid' }
                        : {}
                    }
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-3 gap-6"
                style={{ minHeight: '600px' }}
              >
                {/* Friends List */}
                <div className="lg:col-span-1">
                  <FriendsList
                    onSelectFriend={(friend) => {
                      setSelectedFriend(friend);
                      setSelectedGroup(undefined);
                      // Store friends for group creation
                      const stored = localStorage.getItem(`vfide_friends_${address}`);
                      if (stored) {
                        try {
                          setFriends(JSON.parse(stored));
                        } catch (e) {
                          // Invalid JSON in localStorage, ignore and use default empty array
                          if (process.env.NODE_ENV === 'development') {
                            console.warn('Failed to parse friends from localStorage:', e);
                          }
                        }
                      }
                    }}
                    selectedFriend={selectedFriend}
                  />
                </div>

                {/* Messaging Center */}
                <div className="lg:col-span-2">
                  {selectedFriend ? (
                    <MessagingCenter friend={selectedFriend} hasVault={hasVault} />
                  ) : (
                    <div className="bg-zinc-900 rounded-xl border border-zinc-700 h-full flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-24 h-24 rounded-full bg-cyan-400/10 flex items-center justify-center mb-6">
                        <MessageCircle className="w-12 h-12 text-cyan-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-zinc-100 mb-3">
                        Select a Friend to Start Messaging
                      </h3>
                      <p className="text-zinc-400 max-w-md mb-6">
                        All messages are encrypted using your wallet signature. Only you and your friend can read them.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span>End-to-end encrypted • Non-custodial • Private</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-4xl mx-auto">
                  <FriendRequestsPanel
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                  />
                </div>
              </motion.div>
            )}

            {/* Circles Tab */}
            {activeTab === 'circles' && (
              <motion.div
                key="circles"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-7xl mx-auto">
                  <FriendCirclesManager friends={friends} />
                </div>
              </motion.div>
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <motion.div
                key="groups"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GroupMessaging />
              </motion.div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-4xl mx-auto space-y-6">
                  <AccountSettings />
                  {address && (
                    <EndorsementsBadges 
                      userAddress={address}
                      showGiveEndorsement={false}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-6xl mx-auto">
                  <PrivacySettings />
                </div>
              </motion.div>
            )}

            {/* Discover Tab */}
            {activeTab === 'discover' && (
              <motion.div
                key="discover"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-4xl mx-auto">
                  <GlobalUserSearch />
                </div>
              </motion.div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && address && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-4xl mx-auto">
                  <ActivityFeed userAddress={address} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-zinc-900 border border-cyan-400/30 rounded-lg p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-400/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-zinc-100 mb-2">End-to-End Encryption</h4>
                <p className="text-sm text-zinc-400 mb-3">
                  All messages are encrypted using your wallet signature before leaving your device.
                  Only you and your intended recipient can decrypt and read the messages. VFIDE cannot access your conversations.
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-500" />
                    <span>Wallet-based encryption</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    <span>Private by default</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-500" />
                    <span>Decentralized storage (coming soon)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          </React.Fragment>
          )}
        </main>

        <Footer />
      </PageWrapper>
    </>
  );
}
