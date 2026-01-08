'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import MediaUploader from '@/components/social/MediaUploader';
import MediaGallery from '@/components/social/MediaGallery';
import CallModal from '@/components/social/CallModal';
import IncomingCallModal from '@/components/social/IncomingCallModal';
import StoryViewer from '@/components/social/StoryViewer';
import StoryCreator from '@/components/social/StoryCreator';
import StoryRing from '@/components/social/StoryRing';
import ThreadView from '@/components/social/ThreadView';
import PollCard from '@/components/social/PollCard';
import ReactionPicker from '@/components/social/ReactionPicker';
import CommunityBrowser from '@/components/social/CommunityBrowser';
import { useCall } from '@/lib/callSystem';
import { useStories } from '@/lib/storiesSystem';
import { useMessageThreads } from '@/lib/advancedMessages';
import { MediaAttachment } from '@/lib/mediaSharing';
import { createPoll, voteOnPoll } from '@/lib/advancedMessages';

export default function SocialShowcase() {
  const { address } = useAccount();
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  // Media
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);

  // Calls
  const {
    call,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    initiateCall,
    answerCall,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useCall();

  // Stories
  const { stories, createStory, deleteStory, viewStory, reactToStory } = useStories(address || '');

  // Threads
  const { threads, addReply } = useMessageThreads();

  // Poll
  const [poll, setPoll] = useState(
    createPoll(
      "What's the best blockchain?",
      ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
      address || '',
      48,
      false,
      false
    )
  );

  const demoSections = [
    { id: 'media', title: '📸 Media Sharing', icon: '📸' },
    { id: 'calls', title: '📞 Voice/Video Calls', icon: '📞' },
    { id: 'stories', title: '📱 Stories', icon: '📱' },
    { id: 'threads', title: '💬 Message Threads', icon: '💬' },
    { id: 'polls', title: '📊 Polls', icon: '📊' },
    { id: 'reactions', title: '❤️ Reactions', icon: '❤️' },
    { id: 'communities', title: '🏛️ Communities', icon: '🏛️' },
  ];

  if (!address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Please connect your wallet</p>
          <p className="text-gray-400">to view the Social Features Showcase</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gradient-to-r from-[#00F0FF]/10 to-[#FF6B9D]/10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-[#00F0FF] mb-2">
            🚀 VFIDE Social Features Showcase
          </h1>
          <p className="text-gray-400">
            Experience all the new social features • Built for Web3
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Demo Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {demoSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveDemo(activeDemo === section.id ? null : section.id)}
              className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
                activeDemo === section.id
                  ? 'bg-[#00F0FF]/20 border-[#00F0FF]'
                  : 'bg-gray-900 border-gray-700 hover:border-[#00F0FF]'
              }`}
            >
              <div className="text-4xl mb-2">{section.icon}</div>
              <p className="text-sm font-semibold text-center">{section.title}</p>
            </button>
          ))}
        </div>

        {/* Demo Content */}
        {activeDemo === 'media' && (
          <div className="bg-gray-900 border-2 border-[#00F0FF] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">📸 Media Sharing</h2>
            <p className="text-gray-400 mb-6">
              Upload images, videos, audio, and files. View them in a beautiful gallery with
              lightbox.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setActiveDemo('media-uploader')}
                className="px-6 py-3 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
              >
                Open Media Uploader
              </button>

              {mediaAttachments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Uploaded Media:</h3>
                  <MediaGallery attachments={mediaAttachments} />
                </div>
              )}
            </div>
          </div>
        )}

        {activeDemo === 'calls' && (
          <div className="bg-gray-900 border-2 border-[#00F0FF] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">📞 Voice & Video Calls</h2>
            <p className="text-gray-400 mb-6">
              WebRTC-powered peer-to-peer calling with full controls.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => initiateCall('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'voice', address)}
                className="px-6 py-3 bg-[#50C878] text-white font-semibold rounded-lg hover:bg-[#50C878]/80 transition-colors"
              >
                📞 Test Voice Call
              </button>
              <button
                onClick={() => initiateCall('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'video', address)}
                className="px-6 py-3 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
              >
                📹 Test Video Call
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400">
                💡 Tip: Click a button to see the call UI. In production, this would initiate a
                real WebRTC connection.
              </p>
            </div>
          </div>
        )}

        {activeDemo === 'stories' && (
          <div className="bg-gray-900 border-2 border-[#00F0FF] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">📱 Stories & Status</h2>
            <p className="text-gray-400 mb-6">
              Instagram-style stories with 24-hour expiration and reactions.
            </p>

            <div className="space-y-6">
              <button
                onClick={() => setActiveDemo('story-creator')}
                className="px-6 py-3 bg-[#FF6B9D] text-white font-semibold rounded-lg hover:bg-[#FF6B9D]/80 transition-colors"
              >
                + Create Story
              </button>

              {stories.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Active Stories:</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {Array.from(
                      new Map(stories.map((s) => [s.userId, s])).values()
                    ).map((story) => (
                      <StoryRing
                        key={story.userId}
                        userId={story.userId}
                        userName={story.userName}
                        userAvatar={story.userAvatar}
                        stories={stories.filter((s) => s.userId === story.userId)}
                        hasUnviewed={!story.viewedBy.includes(address)}
                        onClick={() => setActiveDemo('story-viewer')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeDemo === 'threads' && (
          <div className="bg-gray-900 border-2 border-[#00F0FF] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">💬 Message Threads</h2>
            <p className="text-gray-400 mb-6">
              Reply to specific messages without cluttering the main chat.
            </p>

            <button
              onClick={() => setActiveDemo('thread-view')}
              className="px-6 py-3 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
            >
              Open Thread Example
            </button>

            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-400">
                💡 Threads appear as a sidebar, keeping conversations organized.
              </p>
            </div>
          </div>
        )}

        {activeDemo === 'polls' && (
          <div className="bg-gray-900 border-2 border-[#00F0FF] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">📊 Polls & Voting</h2>
            <p className="text-gray-400 mb-6">
              Create polls in messages with multiple choice and anonymous options.
            </p>

            <PollCard
              poll={poll}
              onVote={(optionId) => {
                const updatedPoll = { ...poll };
                voteOnPoll(updatedPoll, optionId, address);
                setPoll(updatedPoll);
              }}
              userAddress={address}
            />
          </div>
        )}

        {activeDemo === 'reactions' && (
          <div className="bg-gray-900 border-2 border-[#00F0FF] rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">❤️ Message Reactions</h2>
            <p className="text-gray-400 mb-6">
              React to messages with any emoji. Quick reactions or browse all.
            </p>

            <div className="flex justify-center">
              <ReactionPicker
                onReact={(emoji) => alert(`You reacted with ${emoji}`)}
                userAddress={address}
              />
            </div>
          </div>
        )}

        {activeDemo === 'communities' && (
          <div className="bg-gray-900 border-2 border-[#00F0FF] rounded-xl p-8 h-[600px]">
            <CommunityBrowser
              userAddress={address}
              onCommunitySelect={(community) =>
                alert(`Opened community: ${community.name}`)
              }
            />
          </div>
        )}

        {/* Feature Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#00F0FF]/20 to-transparent border border-[#00F0FF]/30 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📸</div>
            <div className="text-3xl font-bold text-[#00F0FF] mb-1">
              {mediaAttachments.length}
            </div>
            <p className="text-gray-400 text-sm">Media Uploaded</p>
          </div>
          <div className="bg-gradient-to-br from-[#FF6B9D]/20 to-transparent border border-[#FF6B9D]/30 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📱</div>
            <div className="text-3xl font-bold text-[#FF6B9D] mb-1">{stories.length}</div>
            <p className="text-gray-400 text-sm">Active Stories</p>
          </div>
          <div className="bg-gradient-to-br from-[#50C878]/20 to-transparent border border-[#50C878]/30 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-3xl font-bold text-[#50C878] mb-1">{threads.size}</div>
            <p className="text-gray-400 text-sm">Message Threads</p>
          </div>
          <div className="bg-gradient-to-br from-[#FFD700]/20 to-transparent border border-[#FFD700]/30 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">🏛️</div>
            <div className="text-3xl font-bold text-[#FFD700] mb-1">12</div>
            <p className="text-gray-400 text-sm">Permissions</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeDemo === 'media-uploader' && (
        <MediaUploader
          onUploadComplete={(attachments) => {
            setMediaAttachments([...mediaAttachments, ...attachments]);
            setActiveDemo('media');
          }}
          onCancel={() => setActiveDemo('media')}
          userAddress={address}
        />
      )}

      {call && call.status !== 'ended' && (
        <CallModal
          call={call}
          localStream={localStream}
          remoteStream={remoteStream}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
        />
      )}

      {activeDemo === 'story-creator' && (
        <StoryCreator
          onClose={() => setActiveDemo('stories')}
          onCreate={(story) => {
            createStory(story);
            setActiveDemo('stories');
          }}
          userAddress={address}
          userName={`User ${address.slice(0, 6)}`}
        />
      )}

      {activeDemo === 'story-viewer' && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          onClose={() => setActiveDemo('stories')}
          onView={viewStory}
          onReact={reactToStory}
          userAddress={address}
        />
      )}

      {activeDemo === 'thread-view' && (
        <ThreadView
          thread={{
            parentMessageId: 'demo-msg-1',
            replies: [
              {
                id: '1',
                from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                content: 'This is a great feature!',
                timestamp: Date.now() - 3600000,
                reactions: [],
              },
              {
                id: '2',
                from: address,
                content: 'Thanks! Glad you like it.',
                timestamp: Date.now() - 1800000,
                reactions: [],
              },
            ],
            createdAt: Date.now() - 7200000,
            lastReplyAt: Date.now() - 1800000,
          }}
          onAddReply={(reply) => addReply('demo-msg-1', reply)}
          onClose={() => setActiveDemo('threads')}
          userAddress={address}
        />
      )}
    </div>
  );
}
