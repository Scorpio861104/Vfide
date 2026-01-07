'use client';

import { GlobalNav } from '@/components/layout/GlobalNav';
import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Users,
  BarChart3,
  Shield,
  Lock,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { FriendsList } from '@/components/social/FriendsList';
import { MessagingCenter } from '@/components/social/MessagingCenter';
import { GroupsManager } from '@/components/social/GroupsManager';
import { Friend, Group } from '@/types/messaging';

type TabType = 'messages' | 'groups' | 'analytics';

export default function SocialPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [selectedFriend, setSelectedFriend] = useState<Friend | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>();
  const [friends, setFriends] = useState<Friend[]>([]);

  const tabs = [
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle, color: '#00F0FF' },
    { id: 'groups' as const, label: 'Groups', icon: Users, color: '#A78BFA' },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, color: '#50C878' },
  ];

  return (
    <>
      <GlobalNav />

      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          {/* Header */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8] mb-3 flex items-center gap-3">
                  <MessageCircle className="w-10 h-10 text-[#00F0FF]" />
                  Social Hub
                </h1>
                <p className="text-[#A0A0A5] text-lg flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Connect with friends through end-to-end encrypted messaging
                </p>
              </div>

              {/* Connection Status */}
              {address && (
                <div className="flex items-center gap-3 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg px-4 py-3">
                  <div className="w-3 h-3 bg-[#50C878] rounded-full animate-pulse" />
                  <div>
                    <div className="text-xs text-[#A0A0A5]">Connected</div>
                    <div className="text-sm font-medium text-[#F5F3E8]">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex gap-2 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                    activeTab === tab.id
                      ? `bg-[${tab.color}]/20 text-[${tab.color}] border border-[${tab.color}]/50`
                      : 'text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F]'
                  }`}
                  style={
                    activeTab === tab.id
                      ? { backgroundColor: `${tab.color}20`, color: tab.color, borderColor: `${tab.color}80` }
                      : {}
                  }
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
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
                        } catch (e) {}
                      }
                    }}
                    selectedFriend={selectedFriend}
                  />
                </div>

                {/* Messaging Center */}
                <div className="lg:col-span-2">
                  {selectedFriend ? (
                    <MessagingCenter friend={selectedFriend} />
                  ) : (
                    <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] h-full flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-24 h-24 rounded-full bg-[#00F0FF]/10 flex items-center justify-center mb-6">
                        <MessageCircle className="w-12 h-12 text-[#00F0FF]" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#F5F3E8] mb-3">
                        Select a Friend to Start Messaging
                      </h3>
                      <p className="text-[#A0A0A5] max-w-md mb-6">
                        All messages are encrypted using your wallet signature. Only you and your friend can read them.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[#6B6B78]">
                        <Shield className="w-4 h-4 text-[#50C878]" />
                        <span>End-to-end encrypted • Non-custodial • Private</span>
                      </div>
                    </div>
                  )}
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
                className="grid lg:grid-cols-3 gap-6"
                style={{ minHeight: '600px' }}
              >
                {/* Groups Manager */}
                <div className="lg:col-span-1">
                  <GroupsManager
                    friends={friends}
                    onSelectGroup={(group) => {
                      setSelectedGroup(group);
                      setSelectedFriend(undefined);
                    }}
                    selectedGroup={selectedGroup}
                  />
                </div>

                {/* Group Chat */}
                <div className="lg:col-span-2">
                  {selectedGroup ? (
                    <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] h-full flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center mb-6 text-4xl font-bold text-[#F5F3E8]">
                        {selectedGroup.name[0].toUpperCase()}
                      </div>
                      <h3 className="text-2xl font-bold text-[#F5F3E8] mb-3">
                        {selectedGroup.name}
                      </h3>
                      <p className="text-[#A0A0A5] max-w-md mb-4">
                        {selectedGroup.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[#6B6B78] mb-6">
                        <Users className="w-4 h-4" />
                        <span>{selectedGroup.members.length} members</span>
                      </div>
                      <div className="text-sm text-[#FFD700]">
                        Group messaging coming soon! 🎉
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] h-full flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-24 h-24 rounded-full bg-[#A78BFA]/10 flex items-center justify-center mb-6">
                        <Users className="w-12 h-12 text-[#A78BFA]" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#F5F3E8] mb-3">
                        Create or Join a Group
                      </h3>
                      <p className="text-[#A0A0A5] max-w-md mb-6">
                        Start group conversations with your friends. All group messages are encrypted for all members.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[#6B6B78]">
                        <Shield className="w-4 h-4 text-[#50C878]" />
                        <span>Group encryption • Secure • Private</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] p-12 text-center">
                  <div className="w-24 h-24 rounded-full bg-[#50C878]/10 flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-12 h-12 text-[#50C878]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#F5F3E8] mb-3">
                    Social Analytics Coming Soon
                  </h3>
                  <p className="text-[#A0A0A5] max-w-md mx-auto">
                    Track your social influence, engagement metrics, and community growth.
                    Analytics dashboard will be available in the next update.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-[#1A1A2E] border border-[#00F0FF]/30 rounded-lg p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#00F0FF]/20 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-[#00F0FF]" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-[#F5F3E8] mb-2">End-to-End Encryption</h4>
                <p className="text-sm text-[#A0A0A5] mb-3">
                  All messages are encrypted using your wallet signature before leaving your device.
                  Only you and your intended recipient can decrypt and read the messages. VFIDE cannot access your conversations.
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-[#6B6B78]">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#50C878]" />
                    <span>Wallet-based encryption</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#50C878]" />
                    <span>Private by default</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#50C878]" />
                    <span>Decentralized storage (coming soon)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </main>

        <Footer />
      </PageWrapper>
    </>
  );
}
