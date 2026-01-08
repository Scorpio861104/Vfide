import React, { useState } from 'react';
import { MessageReaction } from '@/lib/advancedMessages';

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  existingReactions?: MessageReaction[];
  userAddress: string;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥', '👍', '👎'];

const REACTION_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
  'Gestures': ['👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '👈', '👉', '👆', '👇'],
  'Emotions': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Symbols': ['🔥', '⭐', '✨', '💫', '⚡', '💥', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '✅', '❌'],
};

export default function ReactionPicker({ onReact, existingReactions = [], userAddress }: ReactionPickerProps) {
  const [showAll, setShowAll] = useState(false);

  const userReactions = existingReactions
    .filter((r) => r.users.includes(userAddress))
    .map((r) => r.emoji);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
      {!showAll ? (
        // Quick Reactions
        <div className="p-2 flex items-center gap-1">
          {QUICK_REACTIONS.map((emoji) => {
            const isActive = userReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={`text-2xl hover:bg-gray-800 rounded p-2 transition-all hover:scale-125 ${
                  isActive ? 'bg-[#00F0FF]/20 scale-110' : ''
                }`}
                title={emoji}
              >
                {emoji}
              </button>
            );
          })}
          <button
            onClick={() => setShowAll(true)}
            className="text-xl text-gray-400 hover:text-white hover:bg-gray-800 rounded p-2 ml-2"
          >
            ➕
          </button>
        </div>
      ) : (
        // All Reactions
        <div className="p-3 max-w-xs max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-semibold">All Reactions</h4>
            <button
              onClick={() => setShowAll(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {Object.entries(REACTION_CATEGORIES).map(([category, emojis]) => (
            <div key={category} className="mb-4">
              <p className="text-xs text-gray-400 mb-2">{category}</p>
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((emoji) => {
                  const isActive = userReactions.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => onReact(emoji)}
                      className={`text-2xl hover:bg-gray-800 rounded p-1 transition-all hover:scale-125 ${
                        isActive ? 'bg-[#00F0FF]/20 scale-110' : ''
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
