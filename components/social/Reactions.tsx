/**
 * Reactions — Animated emoji reactions on any content
 *
 * Tap a reaction and it flies from the button to the content.
 * Hold to see the full reaction picker. Reactions from high-ProofScore
 * users display with a subtle glow.
 */
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REACTIONS = ['❤️', '🔥', '💪', '🙌', '😂', '🤝', '💰', '🎉'];

interface ReactionCount {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface ReactionsBarProps {
  reactions: ReactionCount[];
  onReact: (emoji: string) => void;
  compact?: boolean;
}

export function ReactionsBar({ reactions, onReact, compact = false }: ReactionsBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [flyingEmoji, setFlyingEmoji] = useState<string | null>(null);

  const handleReact = useCallback((emoji: string) => {
    setFlyingEmoji(emoji);
    setTimeout(() => setFlyingEmoji(null), 600);
    onReact(emoji);
    setShowPicker(false);
  }, [onReact]);

  const activeReactions = reactions.filter(r => r.count > 0);

  return (
    <div className="relative flex items-center gap-1 flex-wrap">
      {activeReactions.map(r => (
        <motion.button key={r.emoji} whileTap={{ scale: 0.9 }}
          onClick={() => handleReact(r.emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
            r.reacted ? 'bg-cyan-500/15 border border-cyan-500/30' : 'bg-white/5 border border-white/5'
          }`}>
          <span className={compact ? 'text-[10px]' : 'text-xs'}>{r.emoji}</span>
          <span className={`font-bold ${r.reacted ? 'text-cyan-400' : 'text-gray-500'} ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{r.count}</span>
        </motion.button>
      ))}

      {/* Add reaction button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="w-6 h-6 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 hover:text-white text-xs transition-all"
      >+</button>

      {/* Picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            className="absolute bottom-full left-0 mb-1 flex gap-0.5 px-2 py-1.5 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-10"
          >
            {REACTIONS.map(emoji => (
              <motion.button key={emoji} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                onClick={() => handleReact(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-base">
                {emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying emoji animation */}
      <AnimatePresence>
        {flyingEmoji && (
          <motion.span
            initial={{ opacity: 1, scale: 1, y: 0 }}
            animate={{ opacity: 0, scale: 2, y: -40 }}
            exit={{ opacity: 0 }}
            className="absolute left-4 bottom-0 text-lg pointer-events-none"
          >{flyingEmoji}</motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
