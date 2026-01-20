/**
 * Example: Integrating Custom Reactions into Message Components
 * 
 * This example shows how to add reaction support to your existing message components
 */

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ReactionPicker, ReactionDisplay } from '@/components/messages/ReactionPicker';
import { apiClient } from '@/lib/api-client';
import { VFIDE_CUSTOM_REACTIONS } from '@/lib/customReactions';
import { Smile } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: Date;
  reactions?: Record<string, any>;
  conversationId: string;
}

export function MessageWithReactions({ message }: { message: Message }) {
  const { address } = useAccount();
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || {});
  const [isLoading, setIsLoading] = useState(false);

  const handleAddReaction = async (reaction: {
    type: 'emoji' | 'custom_image';
    emoji?: string;
    imageUrl?: string;
    imageName?: string;
  }) => {
    if (!address) return;

    setIsLoading(true);
    try {
      const result = await apiClient.addReaction(
        message.id,
        message.conversationId,
        reaction,
        address
      );
      // Update reactions from the message in the response
      if (result.success && result.message) {
        setReactions(result.message.reactions || {});
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleReaction = async (reaction: {
    type: 'emoji' | 'custom_image';
    emoji?: string;
    imageUrl?: string;
  }) => {
    if (!address) return;

    setIsLoading(true);
    try {
      // Check if user already reacted with this
      const reactionKey = reaction.type === 'emoji' ? reaction.emoji! : reaction.imageUrl!;
      const existingReaction = reactions[reactionKey];
      const userHasReacted = existingReaction?.users?.some(
        (u: any) => u.address.toLowerCase() === address.toLowerCase()
      );

      if (userHasReacted) {
        // Remove reaction
        await fetch('/api/messages/reaction', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: message.id,
            conversationId: message.conversationId,
            reactionType: reaction.type,
            emoji: reaction.emoji,
            imageUrl: reaction.imageUrl,
            userAddress: address
          })
        });
      } else {
        // Add reaction
        await handleAddReaction(reaction);
      }

      // Refetch reactions
      // In production, you'd get this from the API response or WebSocket update
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative bg-zinc-900 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
      {/* Message Content */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-400">
            {message.sender.slice(0, 8)}...
          </span>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <p className="text-gray-200">{message.content}</p>
      </div>

      {/* Reactions Display */}
      <ReactionDisplay
        reactions={reactions}
        currentUserAddress={address}
        onToggle={handleToggleReaction}
      />

      {/* Add Reaction Button */}
      <div className="relative mt-3">
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={isLoading || !address}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Smile className="w-4 h-4" />
          Add Reaction
        </button>

        {/* Reaction Picker */}
        {showPicker && address && (
          <ReactionPicker
            onSelect={handleAddReaction}
            onClose={() => setShowPicker(false)}
            customImages={VFIDE_CUSTOM_REACTIONS}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Example: Message Thread with Reactions
 */

export function MessageThread({ messages }: { messages: Message[] }) {
  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => (
        <MessageWithReactions key={message.id} message={message} />
      ))}
    </div>
  );
}

/**
 * Example: Quick Reaction Bar (like Discord/Slack)
 * Shows common reactions as quick-click buttons
 */

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏'];

export function QuickReactionBar({ messageId, conversationId }: { messageId: string; conversationId: string }) {
  const { address } = useAccount();
  const [showMore, setShowMore] = useState(false);

  const handleQuickReact = async (emoji: string) => {
    if (!address) return;
    
    try {
      await apiClient.addReaction(
        messageId,
        conversationId,
        { type: 'emoji', emoji },
        address
      );
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleQuickReact(emoji)}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors text-lg"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <button
        onClick={() => setShowMore(!showMore)}
        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
        title="More reactions"
      >
        <Smile className="w-4 h-4 text-gray-400" />
      </button>
      
      {showMore && address && (
        <div className="absolute">
          <ReactionPicker
            onSelect={(reaction) => {
              if (reaction.type === 'emoji' && reaction.emoji) {
                handleQuickReact(reaction.emoji);
              } else {
                apiClient.addReaction(messageId, conversationId, reaction, address);
              }
              setShowMore(false);
            }}
            onClose={() => setShowMore(false)}
            customImages={VFIDE_CUSTOM_REACTIONS}
          />
        </div>
      )}
    </div>
  );
}
