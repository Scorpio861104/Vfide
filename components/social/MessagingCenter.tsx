'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { VoiceNoteRecorder } from './VoiceNote';
import { useAccount, useSignMessage } from 'wagmi';
import { Friend, Message } from '@/types/messaging';
import { 
  encryptMessage, 
  formatAddress, 
  getConversationId,
  STORAGE_KEYS,
  stripDecryptedContentForStorage,
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
import { safeLocalStorage } from '@/lib/utils';
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
  const [directoryKey, setDirectoryKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationId = address && friend ? getConversationId(address, friend.address) : '';
  const recipientEncryptionKey = (friend.encryptionPublicKey?.trim() || directoryKey || '').trim();
  const canEncryptForRecipient = Boolean(recipientEncryptionKey);

  useEffect(() => {
    let isActive = true;

    const loadRecipientKey = async () => {
      if (friend.encryptionPublicKey?.trim()) {
        setDirectoryKey(null);
        return;
      }

      try {
        const response = await fetch(`/api/security/keys?address=${encodeURIComponent(friend.address)}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!isActive) return;
        if (!response.ok) {
          setDirectoryKey(null);
          return;
        }

        const data = await response.json();
        const key = typeof data.encryptionPublicKey === 'string' ? data.encryptionPublicKey.trim() : '';
        setDirectoryKey(key || null);
      } catch {
        if (isActive) {
          setDirectoryKey(null);
        }
      }
    };

    loadRecipientKey();
    return () => {
      isActive = false;
    };
  }, [friend.address, friend.encryptionPublicKey]);

  // Load conversation messages with AbortController for proper cleanup
  useEffect(() => {
    if (!address || !conversationId) return;
    
    const abortController = new AbortController();
    let isActive = true;
    
    const loadMessages = async () => {
      try {
        const stored = safeLocalStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`);
        if (!stored) return;
        
        const msgs: Message[] = JSON.parse(stored);
        
        // Check if component is still mounted
        if (!isActive || abortController.signal.aborted) return;
        
        // Never persist or trust plaintext message content from browser storage.
        // Without recipient-owned key exchange in this session, render encrypted placeholders only.
        setEncryptionStatus('decrypting');
        const decryptedMsgs = msgs.map((msg) => ({
          ...msg,
          decryptedContent: undefined,
          verified: Boolean(msg.verified),
        }));
        
        // Only update state if component is still mounted
        if (isActive && !abortController.signal.aborted) {
          setMessages(decryptedMsgs);
          setEncryptionStatus('idle');
        }
      } catch {
        if (isActive && !abortController.signal.aborted) {
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
    
    const encryptedOnlyMessages = stripDecryptedContentForStorage(messages);
    safeLocalStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(encryptedOnlyMessages));
  }, [conversationId, messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !address || !signMessageAsync) return;

    if (!canEncryptForRecipient || !recipientEncryptionKey) {
      setEncryptionStatus('error');
      alert('Secure messaging is not ready for this contact yet. Ask them to share an encryption key first.');
      return;
    }
    
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
        recipientEncryptionKey,
        (msg) => signMessageAsync({ message: msg })
      );
      
      // Update the optimistic message with real data
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, encryptedContent, verified: true, pending: false }
          : msg
      ));
      
      setEncryptionStatus('idle');
      
      // Announce message sent
      announce('Message sent', 'polite');
      
      // In production, send to backend/IPFS/blockchain here
      // await sendToBackend(newMessage);
      
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

  const handleVoiceRecorded = useCallback((blob: Blob, duration: number) => {
    void blob;
    const roundedDuration = Math.max(1, Math.round(duration));
    setInputMessage((current) => current.trim()
      ? `${current.trim()} 🎤 Voice note ready (${roundedDuration}s)`
      : `🎤 Voice note ready (${roundedDuration}s)`);
    announce(`Voice note attached for ${roundedDuration} seconds`, 'polite');
  }, [announce]);

  // Handle message edit
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!address) return;

    if (!canEncryptForRecipient || !recipientEncryptionKey) {
      setEncryptionStatus('error');
      alert('Cannot securely edit message until recipient encryption key is available.');
      return;
    }

    try {
      // Encrypt new content
      const encryptedContent = await encryptMessage(
        newContent,
        recipientEncryptionKey,
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
      safeLocalStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(updatedMessages));
    } catch {
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
      safeLocalStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(updatedMessages));
    } catch {
      alert('Failed to delete message. Please try again.');
    }
  };

  // Handle copy message
  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      announce('Message copied to clipboard', 'polite');
    } catch {
      announce('Failed to copy. Please select and copy manually.', 'assertive');
    }
  };

  // Handle report message
  const handleReportMessage = (_messageId: string) => {
    // In production: send report to backend
    // Message report submitted
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-zinc-950 font-bold text-sm">
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
                  Secure messaging
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center shrink-0">
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
        {!canEncryptForRecipient && (
          <div className="mb-3 rounded-lg border border-amber-600/40 bg-amber-950/30 p-3 text-xs text-amber-200">
            This contact has not shared an encryption key yet. Message sending is disabled to prevent insecure delivery.
          </div>
        )}
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
              onChange={(e) =>  setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
             
              aria-label="Message input"
              rows={1}
              disabled={!canEncryptForRecipient}
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

          <VoiceNoteRecorder onRecorded={handleVoiceRecorded} />

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isSending || !canEncryptForRecipient}
            aria-label={isSending ? 'Sending message' : 'Send message'}
            data-onboarding="message-button"
            className="p-2 rounded-lg bg-cyan-400 text-zinc-950 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Encryption notice */}
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-zinc-500">
          <Lock className="w-3 h-3" />
          <span>Messages are sent only when a recipient encryption key is available</span>
        </div>
      </div>
    </div>
  );
}
