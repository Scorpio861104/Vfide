'use client';

import React, { useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { FixedSizeList } from 'react-window';
import { motion } from 'framer-motion';
import { Shield, CheckCheck, Check } from 'lucide-react';
import { Message } from '@/types/messaging';

interface VirtualMessageListProps {
  messages: Message[];
  currentUserAddress: string;
  height: number;
  width: number;
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (hours < 48) {
    return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

interface MessageRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: Message[];
    currentUserAddress: string;
  };
}

const MessageRow: React.FC<MessageRowProps> = ({ index, style, data }) => {
  const { messages, currentUserAddress } = data;
  const message = messages[index];
  const isOwn = message.from.toLowerCase() === currentUserAddress.toLowerCase();
  
  return (
    <div style={style} className="px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {/* Message bubble */}
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-[#00F0FF] text-[#0A0A0F]'
                : 'bg-[#2A2A3F] text-[#F5F3E8]'
            }`}
          >
            <p className="text-sm break-words whitespace-pre-wrap">
              {message.decryptedContent || '[Encrypted]'}
            </p>
          </div>

          {/* Metadata */}
          <div className={`flex items-center gap-1 mt-1 px-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-[#6B6B78]">
              {formatTimestamp(message.timestamp)}
            </span>
            {message.verified && (
              <span title="Verified signature">
                <Shield className="w-3 h-3 text-[#50C878]" />
              </span>
            )}
            {isOwn && (
              message.read ? (
                <span title="Read">
                  <CheckCheck className="w-3 h-3 text-[#00F0FF]" />
                </span>
              ) : (
                <span title="Sent">
                  <Check className="w-3 h-3 text-[#6B6B78]" />
                </span>
              )
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function VirtualMessageList({
  messages,
  currentUserAddress,
  height,
  width,
}: VirtualMessageListProps) {
  const listRef = useRef<FixedSizeList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <List
      ref={listRef}
      height={height}
      itemCount={messages.length}
      itemSize={100} // Approximate height per message
      width={width}
      itemData={{ messages, currentUserAddress }}
    >
      {MessageRow}
    </List>
  );
}
