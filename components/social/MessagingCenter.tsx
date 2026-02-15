'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
import { secureId } from '@/lib/secureRandom';
import { useAccount, useSignMessage } from 'wagmi';
import { Friend, Message } from '@/types/messaging';
import {
  encryptMessage,
  decryptMessage,
  formatAddress,
  getConversationId,
  STORAGE_KEYS,
} from '@/lib/messageEncryption';
import { verifyMessage } from 'viem';
import { TransactionButtons } from './TransactionButtons';
import { EndorsementsBadges as _EndorsementsBadges } from './EndorsementsBadges';
import { MutualFriends } from './MutualFriends';
import { addNotification } from './SocialNotifications';
import { addActivity } from './ActivityFeed';
import { VaultInfoTooltip } from '../ui/VaultInfoTooltip';
import { analytics } from '@/lib/socialAnalytics';
import { PresenceIndicator, LastSeenText } from './PresenceIndicator';
import { MessageActions, EditedIndicator } from './MessageActions';
import { apiClient } from '@/lib/api-client';
import { PaymentButton } from '../crypto/PaymentButton';
import { useAnnounce } from '@/lib/accessibility';
import { rewardTokens } from '@/lib/crypto';
interface MessagingCenterProps {
  friend: Friend;
  hasVault?: boolean;
}

export function MessagingCenter({ friend, hasVault = false }: MessagingCenterProps) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { announce } = useAnnounce();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState<'idle' | 'encrypting' | 'decrypting' | 'error'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationId = address && friend ? getConversationId(address, friend.address) : '';

  // Load conversation messages with AbortController for proper cleanup
  useEffect(() => {
    if (!address || !conversationId) return;
    
    const abortController = new AbortController();
    let isActive = true;
    
    const loadMessages = async () => {
      try {
        const stored = localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`);
        if (!stored) return;
        
        const msgs: Message[] = JSON.parse(stored);
        
        // Check if component is still mounted
        if (!isActive || abortController.signal.aborted) return;
        
        // Decrypt messages for display
        setEncryptionStatus('decrypting');
        const decryptedMsgs = await Promise.all(
          msgs.map(async (msg) => {
            try {
              if (msg.decryptedContent) return msg;
              
              // Check abort signal during async operations
              if (abortController.signal.aborted) {
                throw new Error('Operation aborted');
              }
              
              const verify = async (message: string, signature: string) =>
                verifyMessage({
                  message,
                  signature: signature as `0x${string}`,
                  address: msg.from as `0x${string}`,
                });
              
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
              // Don't log errors if aborted
              if (!abortController.signal.aborted) {
                console.error('Failed to decrypt message:', e);
              }
              return {
                ...msg,
                decryptedContent: '[Decryption failed]',
                verified: false,
              };
            }
          })
        );
        
        // Only update state if component is still mounted
        if (isActive && !abortController.signal.aborted) {
          setMessages(decryptedMsgs);
          setEncryptionStatus('idle');
        }
      } catch (e) {
        if (isActive && !abortController.signal.aborted) {
          console.error('Failed to load messages:', e);
          setEncryptionStatus('error');
        }
      }
    };
    
    loadMessages();
    
    // Cleanup function
    return () => {
      isActive = false;
      abortController.abort();
    };
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
    
    const messageContent = inputMessage;
    const tempId = secureId('msg');
    
    // Optimistic update: Add message immediately with pending state
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      from: address,
      to: friend.address,
      encryptedContent: '', // Will be filled after encryption
      decryptedContent: messageContent,
      timestamp: Date.now(),
      read: false,
      verified: false, // Pending verification
      type: 'direct',
    };
    
    // Show message immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setInputMessage(''); // Clear input immediately for better UX
    setIsSending(true);
    setEncryptionStatus('encrypting');
    
    try {
      // Encrypt the message
      const encryptedContent = await encryptMessage(
        messageContent,
        friend.address,
        (msg) => signMessageAsync({ message: msg })
      );
      
      // Update the optimistic message with real data
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, encryptedContent, verified: true, pending: false }
          : msg
      ));
      
      setEncryptionStatus('idle');
      
      // Reward tokens for sending message
      if (address) {
        await rewardTokens(address, 'message_sent', '10');
      }
      
      // Announce message sent
      announce('Message sent', 'polite');
      
      // Persist to backend
      const response = await apiClient.sendMessage({
        conversationId,
        from: address,
        to: friend.address,
        encryptedContent,
      });

      if (response?.message?.id) {
        setMessages((prev) => prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                id: response.message.id,
                timestamp: response.message.timestamp,
              }
            : msg
        ));
      }
      
    } catch (_error) {
      // Rollback optimistic update on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setInputMessage(messageContent); // Restore input
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

  // Handle message edit
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!address) return;

    try {
      // Encrypt new content
      const encryptedContent = await encryptMessage(
        newContent,
        friend.address,
        (msg) => signMessageAsync({ message: msg })
      );

      // Update locally first
      setMessages(messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, decryptedContent: newContent, encryptedContent, editedAt: Date.now() }
          : msg
      ));

      // Announce edit
      announce('Message edited', 'polite');

      await apiClient.editMessage(messageId, encryptedContent);

      // Update localStorage
      const updatedMessages = messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, encryptedContent, editedAt: Date.now() }
          : msg
      );
      localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('Failed to edit message. Please try again.');
    }
  };

  // Handle message delete
  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Update locally first
      setMessages(messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, deletedAt: Date.now(), decryptedContent: undefined, encryptedContent: '' }
          : msg
      ));

      // Announce deletion
      announce('Message deleted', 'polite');

      await apiClient.deleteMessage(messageId);

      // Update localStorage
      const updatedMessages = messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, deletedAt: Date.now(), encryptedContent: '' }
          : msg
      );
      localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(updatedMessages));
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  // Handle copy message
  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // Optional: show toast notification
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle report message
  const handleReportMessage = async (messageId: string) => {
    try {
      await fetch('/api/messages/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          reason: 'user_report',
        }),
      });
    } catch (error) {
      console.error('Failed to report message:', error);
    }

    alert('Message reported. Thank you for helping keep the community safe.');
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-700 h-full flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-zinc-700">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-zinc-950 font-bold text-sm">
                {friend.alias ? friend.alias?.[0]?.toUpperCase() : friend.address.slice(2, 4).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">
                  {friend.alias || formatAddress(friend.address)}
                </h3>
                <PresenceIndicator address={friend.address} size="sm" showLabel />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  End-to-end encrypted
                </p>
                <LastSeenText address={friend.address} />
              </div>
            </div>
          </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {encryptionStatus === 'encrypting' && (
            <div className="flex items-center gap-1 text-xs text-cyan-400">
              <Shield className="w-3 h-3 animate-pulse" />
              Encrypting...
            </div>
          )}
          {encryptionStatus === 'error' && (
            <div className="flex items-center gap-1 text-xs text-pink-400">
              <AlertCircle className="w-3 h-3" />
              Error
            </div>
          )}
          <button className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Transaction Buttons - Only show if user has vault */}
      <div className="px-4 pb-4 border-b border-zinc-700">
        {hasVault ? (
          <TransactionButtons
            friend={friend}
            onPaymentRequest={(amount, message, token) => {
            if (address) {
              addNotification(friend.address, {
                type: 'payment_request',
                from: address,
                title: 'Payment Request',
                message: `Requesting ${amount} ${token}${message ? `: ${message}` : ''}`,
              });
              addActivity(address, {
                type: 'payment',
                user: address,
                content: `Requested ${amount} ${token} from ${friend.alias || formatAddress(friend.address)}`,
              });
            }
            alert(`Payment request sent: ${amount} ${token}`);
          }}
          onPaymentSend={(amount, message, token) => {
            if (address) {
              addNotification(friend.address, {
                type: 'payment_received',
                from: address,
                title: 'Payment Received',
                message: `Received ${amount} ${token}${message ? `: ${message}` : ''}`,
              });
              addActivity(address, {
                type: 'payment',
                user: address,
                content: `Sent ${amount} ${token} to ${friend.alias || formatAddress(friend.address)}`,
              });
            }
            alert(`Payment sent: ${amount} ${token} (Will integrate with Vault)`);
          }}
          />
        ) : (
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-zinc-950" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-zinc-100">Enable Payments</p>
                  <VaultInfoTooltip trigger="click" />
                </div>
                <p className="text-xs text-zinc-400 mb-2">Create a vault to send and request crypto payments in messages.</p>
                <a
                  href="/vault"
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                  onClick={() => analytics.trackVaultFunnel('clicked_create')}
                >
                  Create Vault →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mutual Friends */}
      {address && (
        <div className="px-4 pb-4 border-b border-zinc-700">
          <MutualFriends userAddress={friend.address} currentUserAddress={address} />
        </div>
      )}
    </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-400/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">No messages yet</h3>
            <p className="text-sm text-zinc-500 max-w-xs">
              Send an encrypted message to start the conversation
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => {
              const isOwn = message.from.toLowerCase() === address?.toLowerCase();
              
              // Don't render deleted messages from UI (still in data for audit)
              if (message.deletedAt) {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="px-4 py-2 text-sm text-gray-500 italic">
                      Message deleted
                    </div>
                  </motion.div>
                );
              }
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex group ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    {/* Message bubble */}
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-cyan-400 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-100'
                      }`}
                    >
                      <p className="text-sm wrap-break-word whitespace-pre-wrap">
                        {message.decryptedContent || '[Encrypted]'}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className={`flex items-center gap-2 mt-1 px-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {/* Tip button for received messages */}
                      {!isOwn && address && (
                        <PaymentButton
                          recipientAddress={message.from}
                          recipientName={friend.alias || formatAddress(friend.address)}
                          messageId={message.id}
                          conversationId={conversationId}
                          variant="tip"
                          compact
                        />
                      )}
                      <span className="text-xs text-zinc-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      <EditedIndicator editedAt={message.editedAt} />
                      {message.verified && (
                        <span title="Verified signature">
                          <Shield className="w-3 h-3 text-emerald-500" />
                        </span>
                      )}
                      {isOwn && (
                        message.read ? (
                          <span title="Read">
                            <CheckCheck className="w-3 h-3 text-cyan-400" />
                          </span>
                        ) : (
                          <span title="Sent">
                            <Check className="w-3 h-3 text-zinc-500" />
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  
                  {/* Message Actions */}
                  <div className={`${isOwn ? 'order-1 mr-2' : 'order-2 ml-2'} self-end mb-2`}>
                    <MessageActions
                      message={message}
                      isOwnMessage={isOwn}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                      onCopy={handleCopyMessage}
                      onReport={handleReportMessage}
                    />
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-700">
        {/* Payment Button Above Input */}
        {address && (
          <div className="mb-3 flex items-center gap-2">
            <PaymentButton
              recipientAddress={friend.address}
              recipientName={friend.alias || formatAddress(friend.address)}
              conversationId={conversationId}
              variant="send"
            />
            <span className="text-xs text-gray-500">Send crypto payment or request money</span>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <button 
            aria-label="Open emoji picker"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
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
              aria-label="Message input"
              rows={1}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-sm resize-none focus:border-cyan-400 focus:outline-none"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          <button 
            aria-label="Attach file"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isSending}
            aria-label={isSending ? 'Sending message' : 'Send message'}
            className="p-2 rounded-lg bg-cyan-400 text-zinc-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Encryption notice */}
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-zinc-500">
          <Lock className="w-3 h-3" />
          <span>Messages are encrypted using your wallet signature</span>
        </div>
      </div>
    </div>
  );
}
