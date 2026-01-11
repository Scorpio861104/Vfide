/**
 * ReactionPicker Component
 * 
 * Allows users to select emojis or custom images as reactions to messages
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Image as ImageIcon, X } from 'lucide-react';

interface ReactionPickerProps {
  onSelect: (reaction: { 
    type: 'emoji' | 'custom_image'; 
    emoji?: string; 
    imageUrl?: string; 
    imageName?: string;
  }) => void;
  onClose: () => void;
  customImages?: Array<{ url: string; name: string }>;
}

const DEFAULT_EMOJIS = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🔥', '⭐', '✅', '❌', '🎉', '👏',
  '💯', '💪', '🙏', '💡', '🚀', '⚡'
];

export function ReactionPicker({ onSelect, onClose, customImages = [] }: ReactionPickerProps) {
  const [activeTab, setActiveTab] = useState<'emoji' | 'custom'>('emoji');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-full left-0 mb-2 bg-[#1A1A1F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[320px]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('emoji')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'emoji'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <Smile className="w-4 h-4" />
            Emojis
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Custom
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        <AnimatePresence mode="wait">
          {activeTab === 'emoji' && (
            <motion.div
              key="emoji"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-6 gap-2"
            >
              {DEFAULT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect({ type: 'emoji', emoji });
                    onClose();
                  }}
                  className="flex items-center justify-center w-10 h-10 text-2xl hover:bg-white/10 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}

          {activeTab === 'custom' && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {customImages.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {customImages.map((image) => (
                    <button
                      key={image.url}
                      onClick={() => {
                        onSelect({ 
                          type: 'custom_image', 
                          imageUrl: image.url,
                          imageName: image.name
                        });
                        onClose();
                      }}
                      className="relative group aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-400 transition-all"
                      title={image.name}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white font-medium">{image.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4">
                  <ImageIcon className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400 mb-2">No custom reactions yet</p>
                  <p className="text-xs text-gray-500">
                    Custom reactions can be added by server admins
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * ReactionDisplay Component
 * 
 * Shows existing reactions on a message
 */

interface Reaction {
  type: 'emoji' | 'custom_image';
  emoji?: string;
  imageUrl?: string;
  imageName?: string;
  users: Array<{
    address: string;
    username: string;
    avatar: string;
  }>;
}

interface ReactionDisplayProps {
  reactions: Record<string, Reaction>;
  currentUserAddress?: string;
  onToggle: (reaction: { 
    type: 'emoji' | 'custom_image'; 
    emoji?: string; 
    imageUrl?: string; 
  }) => void;
}

export function ReactionDisplay({ reactions, currentUserAddress, onToggle }: ReactionDisplayProps) {
  const reactionEntries = Object.entries(reactions);

  if (reactionEntries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {reactionEntries.map(([key, reaction]) => {
        const isActive = currentUserAddress && 
          reaction.users.some(u => u.address.toLowerCase() === currentUserAddress.toLowerCase());
        const count = reaction.users.length;

        return (
          <motion.button
            key={key}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle({
              type: reaction.type,
              emoji: reaction.emoji,
              imageUrl: reaction.imageUrl
            })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-all ${
              isActive
                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
            title={reaction.users.map(u => u.username || u.address.slice(0, 8)).join(', ')}
          >
            {reaction.type === 'emoji' ? (
              <span className="text-base">{reaction.emoji}</span>
            ) : (
              <img 
                src={reaction.imageUrl} 
                alt={reaction.imageName || 'reaction'} 
                className="w-5 h-5 rounded object-cover"
              />
            )}
            <span className="font-medium">{count}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
