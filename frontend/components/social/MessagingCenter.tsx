'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Lock,
  Shield,
  AlertCircle,
  Smile,
  Paperclip,
  MoreVertical,
  CheckCheck,
  Check,
} from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';
import { Friend, Message, Conversation } from '@/types/messaging';
import { 
  encryptMessage, 
  decryptMessage, 
  formatAddress, 
  getConversationId,
  STORAGE_KEYS 
} from '@/lib/messageEncryption';

interface MessagingCenterProps {
  friend: Friend;
}

export function MessagingCenter({ friend }: MessagingCenterProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState<'idle' | 'encrypting' | 'decrypting' | 'error'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationId = address && friend ? getConversationId(address, friend.address) : '';

  // Load conversation messages
  useEffect(() => {
    if (!address || !conversationId) return;
    
    const loadMessages = async () => {
      const stored = localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`);
      if (stored) {
        try {
          const msgs: Message[] = JSON.parse(stored);
          
          // Decrypt messages for display
          setEncryptionStatus('decrypting');
          const decryptedMsgs = await Promise.all(
            msgs.map(async (msg) => {
              try {
                if (msg.decryptedContent) return msg;
                
                // Simple verification function (in production, use proper signature verification)
                const verify = async (message: string, signature: string) => true;
                
                const { message: decrypted, verified } = await decryptMessage(
                  msg.encryptedContent,
                  msg.from,
                  verify
                );
                
                return {
                  ...msg,
                  decryptedContent: decrypted,
                  verified,
                };
              } catch (e) {
                console.error('Failed to decrypt message:', e);
                return {
                  ...msg,
                  decryptedContent: '[Decryption failed]',
                  verified: false,
                };
              }
            })
          );
          
          setMessages(decryptedMsgs);
          setEncryptionStatus('idle');
        } catch (e) {
          console.error('Failed to load messages:', e);
          setEncryptionStatus('error');
        }
      }
    };
    
    loadMessages();
  }, [address, conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to localStorage
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    
    localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(messages));
  }, [conversationId, messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !address || !signMessageAsync) return;
    
    setIsSending(true);
    setEncryptionStatus('encrypting');
    
    try {
      // Encrypt the message
      const encryptedContent = await encryptMessage(
        inputMessage,
        friend.address,
        (msg) => signMessageAsync({ message: msg })
      );
      
      // Create message object
      const newMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36)}`,
        conversationId,
        from: address,
        to: friend.address,
        encryptedContent,
        decryptedContent: inputMessage, // Store decrypted for sender
        timestamp: Date.now(),
        read: false,
        verified: true,
        type: 'direct',
      };
      
      // Add to messages
      setMessages([...messages, newMessage]);
      setInputMessage('');
      setEncryptionStatus('idle');
      
      // In production, send to backend/IPFS/blockchain here
      // await sendToBackend(newMessage);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
      setEncryptionStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-[#3A3A4F] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-[#0A0A0F] font-bold text-sm">
              {friend.alias ? friend.alias[0].toUpperCase() : friend.address.slice(2, 4).toUpperCase()}
            </div>
            {friend.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#50C878] rounded-full border-2 border-[#1A1A2E]" />
            )}
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-bold text-[#F5F3E8]">
              {friend.alias || formatAddress(friend.address)}
            </h3>
            <p className="text-xs text-[#6B6B78] flex items-center gap-1">
              <Lock className="w-3 h-3" />
              End-to-end encrypted
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {encryptionStatus === 'encrypting' && (
            <div className="flex items-center gap-1 text-xs text-[#00F0FF]">
              <Shield className="w-3 h-3 animate-pulse" />
              Encrypting...
            </div>
          )}
          {encryptionStatus === 'error' && (
            <div className="flex items-center gap-1 text-xs text-[#FF6B9D]">
              <AlertCircle className="w-3 h-3" />
              Error
            </div>
          )}
          <button className="p-2 rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#00F0FF]/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-[#00F0FF]" />
            </div>
            <h3 className="text-lg font-bold text-[#F5F3E8] mb-2">No messages yet</h3>
            <p className="text-sm text-[#6B6B78] max-w-xs">
              Send an encrypted message to start the conversation
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => {
              const isOwn = message.from.toLowerCase() === address?.toLowerCase();
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
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
                        <Shield className="w-3 h-3 text-[#50C878]" title="Verified signature" />
                      )}
                      {isOwn && (
                        message.read ? (
                          <CheckCheck className="w-3 h-3 text-[#00F0FF]" title="Read" />
                        ) : (
                          <Check className="w-3 h-3 text-[#6B6B78]" title="Sent" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#3A3A4F]">
        <div className="flex items-end gap-2">
          <button className="p-2 rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors">
            <Smile className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type an encrypted message..."
              rows={1}
              className="w-full px-4 py-2 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm resize-none focus:border-[#00F0FF] focus:outline-none"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          <button className="p-2 rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isSending}
            className="p-2 rounded-lg bg-[#00F0FF] text-[#0A0A0F] hover:bg-[#00D5E0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Encryption notice */}
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-[#6B6B78]">
          <Lock className="w-3 h-3" />
          <span>Messages are encrypted using your wallet signature</span>
        </div>
      </div>
    </div>
  );
}
