'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket, getWebSocketURL } from '@/lib/websocket';

interface TypingIndicatorProps {
  conversationId: string;
  currentUserAddress: string;
  otherUserName?: string;
}

export function TypingIndicator({ conversationId, currentUserAddress, otherUserName }: TypingIndicatorProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { subscribe, isConnected } = useWebSocket(
    { url: getWebSocketURL() },
    currentUserAddress
  );

  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to typing events
    const unsubscribe = subscribe('typing', (message) => {
      if (message.conversationId === conversationId && message.from !== currentUserAddress) {
        // Type guard for message.data
        const data = message.data as { typing?: boolean };
        if (data && typeof data === 'object' && 'typing' in data) {
          if (data.typing) {
            setTypingUsers(prev => [...new Set([...prev, message.from])]);
            setIsTyping(true);
          } else {
            setTypingUsers(prev => prev.filter(u => u !== message.from));
          }
        }
      }
    });

    return unsubscribe;
  }, [conversationId, currentUserAddress, isConnected, subscribe]);

  // Auto-hide typing indicator after 5 seconds
  useEffect(() => {
    if (typingUsers.length === 0) {
      setIsTyping(false);
      return;
    }

    const timer = setTimeout(() => {
      setTypingUsers([]);
      setIsTyping(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [typingUsers]);

  return (
    <AnimatePresence>
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-500"
        >
          <div className="flex gap-1">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
              className="w-2 h-2 bg-cyan-400 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
              className="w-2 h-2 bg-cyan-400 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
              className="w-2 h-2 bg-cyan-400 rounded-full"
            />
          </div>
          <span>{otherUserName || 'User'} is typing...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to handle typing events
 */
export function useTypingIndicator(conversationId: string, userAddress?: string) {
  const { send, isConnected } = useWebSocket(
    { url: getWebSocketURL() },
    userAddress
  );
  
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);

  const sendTypingEvent = (isTyping: boolean, recipientAddress: string) => {
    if (!isConnected || !userAddress) return;

    send({
      type: 'typing',
      from: userAddress,
      to: recipientAddress,
      conversationId,
      data: { typing: isTyping },
    });
  };

  const onTypingStart = (recipientAddress: string) => {
    if (typingTimer) clearTimeout(typingTimer);
    
    sendTypingEvent(true, recipientAddress);
    
    // Automatically send "stopped typing" after 3 seconds
    const timer = setTimeout(() => {
      sendTypingEvent(false, recipientAddress);
    }, 3000);
    
    setTypingTimer(timer);
  };

  const onTypingStop = (recipientAddress: string) => {
    if (typingTimer) {
      clearTimeout(typingTimer);
      setTypingTimer(null);
    }
    sendTypingEvent(false, recipientAddress);
  };

  return {
    onTypingStart,
    onTypingStop,
    isConnected,
  };
}

/**
 * Online/Offline presence indicator
 */
export function PresenceIndicator({ 
  userAddress, 
  size = 'sm' 
}: { 
  userAddress: string; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const [isOnline, setIsOnline] = useState(false);
  const { subscribe, isConnected } = useWebSocket(
    { url: getWebSocketURL() },
    userAddress
  );

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('presence', (message) => {
      if (message.from === userAddress) {
        // Type guard for message.data
        const data = message.data;
        if (data && typeof data === 'object' && 'online' in data) {
          const typedData = data as { online?: boolean };
          if (typeof typedData.online === 'boolean') {
            setIsOnline(typedData.online);
          }
        }
      }
    });

    return unsubscribe;
  }, [userAddress, isConnected, subscribe]);

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className="relative">
      <div
        className={`${sizes[size]} rounded-full ${
          isOnline ? 'bg-emerald-500' : 'bg-zinc-500'
        }`}
        title={isOnline ? 'Online' : 'Offline'}
      />
      {isOnline && (
        <div
          className={`absolute inset-0 ${sizes[size]} rounded-full bg-emerald-500 animate-ping`}
        />
      )}
    </div>
  );
}
