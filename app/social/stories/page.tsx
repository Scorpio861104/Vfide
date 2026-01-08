'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import SocialNav from '@/components/social/SocialNav';
import StoryCreator from '@/components/social/StoryCreator';
import StoryViewer from '@/components/social/StoryViewer';
import StoryRing from '@/components/social/StoryRing';
import { useStories } from '@/lib/storiesSystem';

export default function StoriesPage() {
  const { address } = useAccount();
  const { stories, createStory, viewStory, reactToStory, groupedStories } = useStories(address || '');
  const [showCreator, setShowCreator] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const viewingStories = viewingUserId ? groupedStories.get(viewingUserId) || [] : [];

  if (!address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SocialNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/social" className="text-[#00F0FF] hover:underline mb-2 inline-block">
              ← Back to Social Hub
            </Link>
            <h1 className="text-3xl font-bold text-white">Stories</h1>
            <p className="text-gray-400">Share moments that disappear in 24 hours</p>
          </div>
          <button
            onClick={() => setShowCreator(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#FF6B9D] to-[#00F0FF] text-white font-semibold rounded-lg hover:opacity-80 transition-opacity"
          >
            + Create Story
          </button>
        </div>

        {/* Stories List */}
        {stories.length === 0 ? (
          <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Stories Yet</h2>
            <p className="text-gray-400 mb-6">
              Be the first to share a story with your friends
            </p>
            <button
              onClick={() => setShowCreator(true)}
              className="px-8 py-3 bg-[#FF6B9D] text-white font-semibold rounded-lg hover:bg-[#FF6B9D]/80 transition-colors"
            >
              Create Your First Story
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Active Stories</h2>
            <div className="flex gap-6 overflow-x-auto pb-4">
              {Array.from(groupedStories.entries()).map(([userId, userStories]) => {
                const firstStory = userStories[0];
                return (
                  <StoryRing
                    key={userId}
                    userId={userId}
                    userName={firstStory.userName}
                    userAvatar={firstStory.userAvatar}
                    stories={userStories}
                    hasUnviewed={!firstStory.viewedBy.includes(address)}
                    onClick={() => setViewingUserId(userId)}
                    size="lg"
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreator && (
        <StoryCreator
          onClose={() => setShowCreator(false)}
          onCreate={(story) => {
            createStory(story);
            setShowCreator(false);
          }}
          userAddress={address}
          userName={`User ${address.slice(0, 6)}`}
        />
      )}

      {viewingUserId && viewingStories.length > 0 && (
        <StoryViewer
          stories={viewingStories}
          onClose={() => setViewingUserId(null)}
          onView={viewStory}
          onReact={reactToStory}
          userAddress={address}
        />
      )}
    </div>
  );
}
