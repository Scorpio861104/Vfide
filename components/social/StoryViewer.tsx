import React, { useState, useEffect } from 'react';
import { Story, isStoryExpired, getStoryTimeRemaining } from '@/lib/storiesSystem';

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onView: (storyId: string) => void;
  onReact: (storyId: string, emoji: string) => void;
  userAddress: string;
}

export default function StoryViewer({
  stories,
  initialIndex = 0,
  onClose,
  onView,
  onReact,
  userAddress,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds per story

  // Auto-progress story
  useEffect(() => {
    if (isPaused || !currentStory) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = (elapsed / STORY_DURATION) * 100;

      if (progressPercent >= 100) {
        goToNext();
      } else {
        setProgress(progressPercent);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, currentStory]);

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.viewedBy.includes(userAddress)) {
      onView(currentStory.id);
    }
  }, [currentStory, userAddress]);

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleReaction = (emoji: string) => {
    onReact(currentStory.id, emoji);
    setShowReactions(false);
  };

  const quickReactions = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
        {stories.map((story, index) => (
          <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{
                width:
                  index < currentIndex
                    ? '100%'
                    : index === currentIndex
                    ? `${progress}%`
                    : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
            <span className="text-xl">{currentStory.userAvatar || '👤'}</span>
          </div>
          <div>
            <p className="text-white font-semibold">{currentStory.userName}</p>
            <p className="text-white/70 text-sm">{getStoryTimeRemaining(currentStory)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white text-2xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Story Content */}
      <div
        className="w-full h-full flex items-center justify-center cursor-pointer"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Navigation Areas */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          onClick={goToPrevious}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          onClick={goToNext}
        />

        {currentStory.type === 'text' ? (
          <div
            className="w-full h-full flex items-center justify-center p-12"
            style={{
              background: currentStory.backgroundColor,
            }}
          >
            <p
              className="text-4xl md:text-5xl font-bold text-center max-w-2xl break-words"
              style={{ color: currentStory.textColor }}
            >
              {currentStory.content}
            </p>
          </div>
        ) : currentStory.type === 'image' ? (
          <div className="w-full h-full relative">
            <img
              src={currentStory.content}
              alt="Story"
              className="w-full h-full object-contain"
            />
            {currentStory.caption && (
              <div className="absolute bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-xl text-center">{currentStory.caption}</p>
              </div>
            )}
          </div>
        ) : currentStory.type === 'video' ? (
          <div className="w-full h-full relative">
            <video
              src={currentStory.content}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
            />
            {currentStory.caption && (
              <div className="absolute bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-xl text-center">{currentStory.caption}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-8 left-4 right-4 flex items-center gap-4 z-20">
        {/* Reaction Button */}
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
        >
          ❤️ React
        </button>

        {/* View Count */}
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <span>👁️</span>
          <span>{currentStory.viewedBy.length} views</span>
        </div>

        {/* Reactions Count */}
        {currentStory.reactions.length > 0 && (
          <div className="flex items-center gap-1">
            {currentStory.reactions.slice(0, 3).map((reaction, idx) => (
              <span key={idx} className="text-xl">
                {reaction.emoji}
              </span>
            ))}
            {currentStory.reactions.length > 3 && (
              <span className="text-white/70 text-sm ml-1">
                +{currentStory.reactions.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Reaction Picker */}
      {showReactions && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-full px-6 py-3 flex gap-3 z-30">
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-3xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Paused Indicator */}
      {isPaused && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-6xl opacity-50 z-20">
          ⏸️
        </div>
      )}
    </div>
  );
}
