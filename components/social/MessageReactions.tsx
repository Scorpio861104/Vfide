'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // addresses of users who reacted
  hasReacted: boolean; // if current user reacted
}

interface MessageReactionsProps {
  _messageId: string; // Reserved for future reaction tracking by message ID
  reactions: MessageReaction[];
  onReact: (emoji: string) => void;
  onUnreact: (emoji: string) => void;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '🎉', '🔥', '👏', '🚀', '💯'];

export function MessageReactions({
  _messageId,
  reactions,
  onReact,
  onUnreact,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReactionClick = (emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      onUnreact(emoji);
    } else {
      onReact(emoji);
    }
  };

  return (
    <div className="relative">
      {/* Existing Reactions */}
      {reactions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {reactions.map(reaction => (
            <motion.button
              key={reaction.emoji}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleReactionClick(reaction.emoji, reaction.hasReacted)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                reaction.hasReacted
                  ? 'bg-[#00F0FF]/20 border border-[#00F0FF]'
                  : 'bg-[#2A2A3F]/50 border border-[#3A3A4F] hover:bg-[#3A3A4F]'
              }`}
              title={`${reaction.count} reaction${reaction.count > 1 ? 's' : ''}`}
            >
              <span className="text-sm">{reaction.emoji}</span>
              <span className={`${reaction.hasReacted ? 'text-[#00F0FF]' : 'text-[#6B6B78]'} font-medium`}>
                {reaction.count}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Add Reaction Button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-[#2A2A3F]/30 hover:bg-[#3A3A4F] border border-[#3A3A4F] rounded-full text-xs text-[#6B6B78] transition-colors"
        title="Add reaction"
      >
        <Smile className="w-3 h-3" />
        <span className="text-xs">React</span>
      </button>

      {/* Reaction Picker */}
      <AnimatePresence>
        {showPicker && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowPicker(false)}
            />

            {/* Picker Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute left-0 mt-2 p-2 bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl shadow-xl z-20"
            >
              <div className="flex gap-1">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setShowPicker(false);
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-[#2A2A3F] rounded-lg transition-colors text-xl"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Hook to manage message reactions in localStorage
 */
export function useMessageReactions(conversationId: string, currentUserAddress: string) {
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});

  // Load reactions
  React.useEffect(() => {
    if (typeof window === 'undefined' || !conversationId) return;

    try {
      const stored = localStorage.getItem(`vfide_reactions_${conversationId}`);
      if (stored) {
        setReactions(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load reactions:', e);
    }
  }, [conversationId]);

  const saveReactions = (newReactions: Record<string, MessageReaction[]>) => {
    setReactions(newReactions);
    localStorage.setItem(`vfide_reactions_${conversationId}`, JSON.stringify(newReactions));
  };

  const addReaction = (messageId: string, emoji: string) => {
    const messageReactions = reactions[messageId] || [];
    const existingReaction = messageReactions.find(r => r.emoji === emoji);

    if (existingReaction) {
      // Add user to existing reaction
      if (!existingReaction.users.includes(currentUserAddress)) {
        existingReaction.users.push(currentUserAddress);
        existingReaction.count += 1;
        existingReaction.hasReacted = true;
      }
    } else {
      // Create new reaction
      messageReactions.push({
        emoji,
        count: 1,
        users: [currentUserAddress],
        hasReacted: true,
      });
    }

    saveReactions({
      ...reactions,
      [messageId]: messageReactions,
    });
  };

  const removeReaction = (messageId: string, emoji: string) => {
    const messageReactions = reactions[messageId] || [];
    const existingReaction = messageReactions.find(r => r.emoji === emoji);

    if (existingReaction) {
      existingReaction.users = existingReaction.users.filter(u => u !== currentUserAddress);
      existingReaction.count -= 1;
      existingReaction.hasReacted = false;

      // Remove reaction if no one is using it
      if (existingReaction.count === 0) {
        const filtered = messageReactions.filter(r => r.emoji !== emoji);
        saveReactions({
          ...reactions,
          [messageId]: filtered,
        });
      } else {
        saveReactions({
          ...reactions,
          [messageId]: messageReactions,
        });
      }
    }
  };

  const getReactions = (messageId: string): MessageReaction[] => {
    return reactions[messageId] || [];
  };

  return {
    addReaction,
    removeReaction,
    getReactions,
  };
}
