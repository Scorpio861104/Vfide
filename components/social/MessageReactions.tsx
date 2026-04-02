'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';
import { safeLocalStorage } from '@/lib/utils';

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
                  ? 'bg-cyan-400/20 border border-cyan-400'
                  : 'bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-700'
              }`}
              title={`${reaction.count} reaction${reaction.count > 1 ? 's' : ''}`}
            >
              <span className="text-sm">{reaction.emoji}</span>
              <span className={`${reaction.hasReacted ? 'text-cyan-400' : 'text-zinc-500'} font-medium`}>
                {reaction.count}
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Add Reaction Button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-zinc-800/30 hover:bg-zinc-700 border border-zinc-700 rounded-full text-xs text-zinc-500 transition-colors"
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
              className="absolute left-0 mt-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20"
            >
              <div className="flex gap-1">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setShowPicker(false);
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 rounded-lg transition-colors text-xl"
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
      const stored = safeLocalStorage.getItem(`vfide_reactions_${conversationId}`);
      if (stored) {
        setReactions(JSON.parse(stored));
      }
    } catch {
      // reactions stay empty on parse failure
    }
  }, [conversationId]);

  const saveReactions = (newReactions: Record<string, MessageReaction[]>) => {
    setReactions(newReactions);
    safeLocalStorage.setItem(`vfide_reactions_${conversationId}`, JSON.stringify(newReactions));
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
