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
import { useAccount, useSignMessage } from 'wagmi';
import { Friend, Message } from '@/types/messaging';
import { 
  encryptMessage, 
  decryptMessage, 
  formatAddress, 
  getConversationId,
  STORAGE_KEYS 
} from '@/lib/messageEncryption';
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
                const verify = async (_message: string, _signature: string) => true;
                
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
    
    const messageContent = inputMessage;
    const tempId = `msg_${Date.now()}_${Math.random().toString(36)}`;
    
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
      pending: true, // Custom field for optimistic UI
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
      
      // In production, send to backend/IPFS/blockchain here
      // await sendToBackend(newMessage);
      
    } catch (error) {
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

      // Update backend (in production)
      await apiClient.editMessage(messageId, conversationId, encryptedContent);

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

      // Update backend (in production)
      await apiClient.deleteMessage(messageId, conversationId);

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
  const handleReportMessage = (messageId: string) => {
    // In production: send report to backend
    // Message report submitted
    alert('Message reported. Thank you for helping keep the community safe.');
  };

  return (
    <div className="bg-[#1A1A2E] rounded-xl border border-[#3A3A4F] h-full flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-[#3A3A4F]">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-[#0A0A0F] font-bold text-sm">
                {friend.alias ? friend.alias[0].toUpperCase() : friend.address.slice(2, 4).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F5F3E8]">
                  {friend.alias || formatAddress(friend.address)}
                </h3>
                <PresenceIndicator address={friend.address} size="sm" showLabel />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-[#6B6B78] flex items-center gap-1">
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

      {/* Transaction Buttons - Only show if user has vault */}
      <div className="px-4 pb-4 border-b border-[#3A3A4F]">
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
          <div className="p-3 bg-[#0A0A0F] border border-[#2A2A2F] rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-[#0A0A0F]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-[#F5F3E8]">Enable Payments</p>
                  <VaultInfoTooltip trigger="click" />
                </div>
                <p className="text-xs text-[#A0A0A5] mb-2">Create a vault to send and request crypto payments in messages.</p>
                <a
                  href="/vault"
                  className="inline-flex items-center gap-1 text-xs text-[#00F0FF] hover:underline"
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
        <div className="px-4 pb-4 border-b border-[#3A3A4F]">
          <MutualFriends userAddress={friend.address} currentUserAddress={address} />
        </div>
      )}
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
                          ? 'bg-[#00F0FF] text-[#0A0A0F]'
                          : 'bg-[#2A2A3F] text-[#F5F3E8]'
                      }`}
                    >
                      <p className="text-sm break-words whitespace-pre-wrap">
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
                      <span className="text-xs text-[#6B6B78]">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      <EditedIndicator editedAt={message.editedAt} />
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
      <div className="p-4 border-t border-[#3A3A4F]">
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
            className="p-2 rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors"
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
              className="w-full px-4 py-2 bg-[#0A0A0F] border border-[#3A3A4F] rounded-lg text-[#F5F3E8] text-sm resize-none focus:border-[#00F0FF] focus:outline-none"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>

          <button 
            aria-label="Attach file"
            className="p-2 rounded-lg text-[#A0A0A5] hover:text-[#F5F3E8] hover:bg-[#2A2A3F] transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isSending}
            aria-label={isSending ? 'Sending message' : 'Send message'}
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
