import React, { useState } from 'react';
import { MessageThread, ThreadReply, createThreadReply } from '@/lib/advancedMessages';

interface ThreadViewProps {
  thread: MessageThread;
  onAddReply: (reply: ThreadReply) => void;
  onClose: () => void;
  userAddress: string;
}

export default function ThreadView({ thread, onAddReply, onClose, userAddress }: ThreadViewProps) {
  const [replyText, setReplyText] = useState('');

  const handleSendReply = () => {
    if (!replyText.trim()) return;

    const reply = createThreadReply(userAddress, replyText);
    onAddReply(reply);
    setReplyText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:right-4 md:top-4 md:bottom-4 md:w-96 bg-[#0A0A0F] border-2 border-[#00F0FF] rounded-lg shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#00F0FF]/20">
        <div>
          <h3 className="text-lg font-bold text-[#00F0FF]">Thread</h3>
          <p className="text-sm text-gray-400">{thread.replies.length} replies</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Thread Replies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {thread.replies.map((reply) => {
          const isOwnReply = reply.from === userAddress;

          return (
            <div key={reply.id} className={`flex ${isOwnReply ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  isOwnReply
                    ? 'bg-[#00F0FF]/20 text-white'
                    : 'bg-gray-800 text-white'
                }`}
              >
                {/* Sender Address (shortened) */}
                {!isOwnReply && (
                  <p className="text-xs text-[#00F0FF] mb-1">
                    {reply.from.slice(0, 6)}...{reply.from.slice(-4)}
                  </p>
                )}

                {/* Reply Content */}
                <p className="break-words">{reply.content}</p>

                {/* Timestamp */}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(reply.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>

                {/* Reactions */}
                {reply.reactions && reply.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {reply.reactions.map((reaction, idx) => (
                      <div
                        key={idx}
                        className="bg-black/30 rounded-full px-2 py-1 text-xs flex items-center gap-1"
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-gray-400">{reaction.users.length}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {thread.replies.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-2">💬</p>
            <p>No replies yet</p>
            <p className="text-sm">Be the first to reply!</p>
          </div>
        )}
      </div>

      {/* Reply Input */}
      <div className="border-t border-[#00F0FF]/20 p-4">
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Reply to thread..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none focus:outline-none focus:border-[#00F0FF] transition-colors"
            rows={2}
          />
          <button
            onClick={handleSendReply}
            disabled={!replyText.trim()}
            className="px-4 py-2 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
