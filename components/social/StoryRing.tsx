'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Story, isStoryExpired } from '@/lib/storiesSystem';

interface StoryRingProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  stories: Story[];
  hasUnviewed: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function StoryRing({
  userId: _userId,
  userName,
  userAvatar,
  stories,
  hasUnviewed,
  onClick,
  size = 'md',
}: StoryRingProps) {
  // Filter out expired stories
  const activeStories = stories.filter((s) => !isStoryExpired(s));

  if (activeStories.length === 0) return null;

  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  const ringClasses = hasUnviewed
    ? 'ring-2 ring-[#00F0FF] ring-offset-2 ring-offset-[#0A0A0F]'
    : 'ring-2 ring-[#3A3A4F] ring-offset-2 ring-offset-[#0A0A0F]';

  // Get the latest story thumbnail
  const latestStory = activeStories[activeStories.length - 1];
  const thumbnail =
    latestStory?.type === 'image' || latestStory?.type === 'video'
      ? latestStory.content
      : null;

  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-2 cursor-pointer group" 
      onClick={onClick}
    >
      {/* Story Ring */}
      <div className={`${sizeClasses[size]} relative`}>
        <div
          className={`w-full h-full rounded-full overflow-hidden ${ringClasses} transition-all`}
        >
          {thumbnail ? (
            <img src={thumbnail} alt={userName} className="w-full h-full object-cover" />
          ) : latestStory?.type === 'text' ? (
            <div
              className="w-full h-full flex items-center justify-center text-xs font-bold text-white p-2 text-center"
              style={{ background: latestStory?.backgroundColor }}
            >
              {latestStory?.content?.slice(0, 15)}...
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#00F0FF]/20 to-[#A78BFA]/20 flex items-center justify-center">
              <span className="text-2xl">{userAvatar || '👤'}</span>
            </div>
          )}
        </div>

        {/* Story Count Badge */}
        {activeStories.length > 1 && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00F0FF] text-[#0A0A0F] text-xs font-bold rounded-full flex items-center justify-center">
            {activeStories.length}
          </div>
        )}
      </div>

      {/* Username */}
      <p className="text-[#F5F3E8] text-sm text-center max-w-[80px] truncate group-hover:text-[#00F0FF] transition-colors">
        {userName}
      </p>
    </motion.div>
  );
}

export default StoryRing;
