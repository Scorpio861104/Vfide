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
  UserPlus,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { FriendsList } from '@/components/social/FriendsList';
import { MessagingCenter } from '@/components/social/MessagingCenter';
import { GroupsManager } from '@/components/social/GroupsManager';
import { FriendRequestsPanel } from '@/components/social/FriendRequestsPanel';
import { PrivacySettings } from '@/components/social/PrivacySettings';
import { Friend, Group } from '@/types/messaging';
import { FriendRequest } from '@/types/friendRequests';
import { STORAGE_KEYS } from '@/lib/messageEncryption';

type TabType = 'messages' | 'requests' | 'groups' | 'privacy' | 'analytics';

export default function SocialPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [selectedFriend, setSelectedFriend] = useState<Friend | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>();
  const [friends, setFriends] = useState<Friend[]>([]);

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

    // Load existing friends
    const stored = localStorage.getItem(`${STORAGE_KEYS.FRIENDS}_${address}`);
    const existingFriends: Friend[] = stored ? JSON.parse(stored) : [];
    
    // Add new friend
    const updated = [...existingFriends, newFriend];
    setFriends(updated);
    localStorage.setItem(`${STORAGE_KEYS.FRIENDS}_${address}`, JSON.stringify(updated));
  };

  const handleRejectRequest = (request: FriendRequest) => {
    // Request status updated in FriendRequestsPanel
    console.log('Rejected request from:', request.from);
  };

  const tabs = [
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle, color: '#00F0FF' },
    { id: 'requests' as const, label: 'Requests', icon: UserPlus, color: '#FFD700' },
    { id: 'groups' as const, label: 'Groups', icon: Users, color: '#A78BFA' },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield, color: '#FF6B9D' },
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
                <p className="text-[#6B6B78] text-sm mt-2">
                  <Shield className="w-3 h-3 inline mr-1" />
                  Privacy-first • Friend requests required • Block unwanted users
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
            <div className="flex gap-2 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'border'
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

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Messages Tab */}
                {activeTab === 'messages' && (
                  <div className="grid lg:grid-cols-[400px_1fr] gap-6 h-[calc(100vh-400px)]">
                    <FriendsList
                      onSelectFriend={setSelectedFriend}
                      selectedFriend={selectedFriend}
                    />
                    <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-xl overflow-hidden">
                      {selectedFriend ? (
                        <MessagingCenter friend={selectedFriend} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-[#6B6B78]">
                          <div className="text-center">
                            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-semibold mb-2">Select a friend to start messaging</p>
                            <p className="text-sm text-[#A0A0A5]">Your messages are end-to-end encrypted</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Friend Requests Tab */}
                {activeTab === 'requests' && (
                  <div className="max-w-4xl mx-auto">
                    <FriendRequestsPanel
                      onAccept={handleAcceptRequest}
                      onReject={handleRejectRequest}
                    />
                  </div>
                )}

                {/* Groups Tab */}
                {activeTab === 'groups' && (
                  <div className="max-w-6xl mx-auto">
                    <GroupsManager />
                  </div>
                )}

                {/* Privacy & Safety Tab */}
                {activeTab === 'privacy' && (
                  <div className="max-w-6xl mx-auto">
                    <PrivacySettings />
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-xl p-12 text-center">
                    <BarChart3 className="w-20 h-20 mx-auto mb-6 text-[#6B6B78]" />
                    <h3 className="text-2xl font-bold text-[#F5F3E8] mb-3">
                      Analytics Coming Soon
                    </h3>
                    <p className="text-[#A0A0A5] mb-6">
                      Track your messaging activity, response times, and engagement metrics
                    </p>
                    <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                      {[
                        { label: 'Message Volume', desc: 'Daily and weekly stats' },
                        { label: 'Response Time', desc: 'Average reply speed' },
                        { label: 'Top Contacts', desc: 'Most active friends' },
                      ].map((feature, idx) => (
                        <div key={idx} className="p-4 bg-[#0A0A0F] rounded-lg border border-[#2A2A2F]">
                          <div className="font-semibold text-[#F5F3E8] mb-1">{feature.label}</div>
                          <div className="text-sm text-[#6B6B78]">{feature.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </main>
      </PageWrapper>

      <Footer />
    </>
  );
}
