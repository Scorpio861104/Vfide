'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import SocialNav from '@/components/social/SocialNav';
import CommunityBrowser from '@/components/social/CommunityBrowser';
import CommunityLayout from '@/components/social/CommunityLayout';
import { Community, CommunityMember } from '@/lib/communitiesSystem';

export default function CommunitiesPage() {
  const { address } = useAccount();
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  if (!address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  if (selectedCommunity) {
    // Mock user member data
    const userMember: CommunityMember = {
      userId: address,
      communityId: selectedCommunity.id,
      roles: [selectedCommunity.roles.find(r => r.name === 'Member')?.id || ''],
      joinedAt: Date.now(),
    };

    return (
      <CommunityLayout
        community={selectedCommunity}
        userMember={userMember}
        onChannelSelect={(channel) => console.log('Selected:', channel)}
        onLeave={() => setSelectedCommunity(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SocialNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/social" className="text-[#00F0FF] hover:underline mb-2 inline-block">
            ← Back to Social Hub
          </Link>
          <h1 className="text-3xl font-bold text-white">Communities</h1>
          <p className="text-gray-400">Discord-style servers with channels and roles</p>
        </div>

        {/* Browser */}
        <div className="bg-gray-900 border-2 border-gray-800 rounded-xl overflow-hidden">
          <CommunityBrowser
            userAddress={address}
            onCommunitySelect={setSelectedCommunity}
          />
        </div>
      </div>
    </div>
  );
}
