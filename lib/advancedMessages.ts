/**
 * Advanced Message Features
 * Threads, reactions, editing, pinned messages, and more
 */

export interface MessageThread {
  parentMessageId: string;
  replies: ThreadReply[];
  createdAt: number;
  lastReplyAt: number;
}

export interface ThreadReply {
  id: string;
  from: string;
  content: string;
  timestamp: number;
  reactions: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  timestamp: number;
}

export interface PinnedMessage {
  messageId: string;
  content: string;
  from: string;
  pinnedBy: string;
  pinnedAt: number;
}

export interface MessageEdit {
  originalContent: string;
  editedContent: string;
  editedAt: number;
  reason?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  allowMultiple: boolean;
  anonymous: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User addresses who voted
}

export interface ScheduledMessage {
  id: string;
  to: string;
  content: string;
  scheduledFor: number;
  createdAt: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

/**
 * Create a thread reply
 */
export function createThreadReply(
  parentMessageId: string,
  from: string,
  content: string
): ThreadReply {
  return {
    id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    from,
    content,
    timestamp: Date.now(),
    reactions: [],
  };
}

/**
 * Add reaction to message
 */
export function addReactionToMessage(
  existingReactions: MessageReaction[],
  emoji: string,
  userId: string
): MessageReaction[] {
  // Find if this emoji already exists
  const existing = existingReactions.find((r) => r.emoji === emoji);

  if (existing) {
    // User already reacted with this emoji - remove it (toggle)
    if (existing.users.includes(userId)) {
      return existingReactions.map((r) =>
        r.emoji === emoji
          ? { ...r, users: r.users.filter((u) => u !== userId) }
          : r
      ).filter((r) => r.users.length > 0); // Remove if no users left
    } else {
      // Add user to this emoji
      return existingReactions.map((r) =>
        r.emoji === emoji
          ? { ...r, users: [...r.users, userId] }
          : r
      );
    }
  } else {
    // New emoji reaction
    return [
      ...existingReactions,
      {
        emoji,
        users: [userId],
        timestamp: Date.now(),
      },
    ];
  }
}

/**
 * Create a poll
 */
export function createPoll(
  question: string,
  options: string[],
  createdBy: string,
  expiresInHours?: number,
  allowMultiple: boolean = false,
  anonymous: boolean = false
): Poll {
  return {
    id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    question,
    options: options.map((text, index) => ({
      id: `option_${index}`,
      text,
      votes: [],
    })),
    createdBy,
    createdAt: Date.now(),
    expiresAt: expiresInHours ? Date.now() + expiresInHours * 60 * 60 * 1000 : undefined,
    allowMultiple,
    anonymous,
  };
}

/**
 * Vote on poll
 */
export function voteOnPoll(
  poll: Poll,
  optionId: string,
  userId: string
): Poll {
  const updatedOptions = poll.options.map((option) => {
    // Remove user from other options if not multiple choice
    if (!poll.allowMultiple && option.id !== optionId) {
      return {
        ...option,
        votes: option.votes.filter((v) => v !== userId),
      };
    }

    // Toggle vote for selected option
    if (option.id === optionId) {
      if (option.votes.includes(userId)) {
        return {
          ...option,
          votes: option.votes.filter((v) => v !== userId),
        };
      } else {
        return {
          ...option,
          votes: [...option.votes, userId],
        };
      }
    }

    return option;
  });

  return {
    ...poll,
    options: updatedOptions,
  };
}

/**
 * Get poll results
 */
export function getPollResults(poll: Poll): {
  totalVotes: number;
  results: { optionId: string; text: string; votes: number; percentage: number }[];
} {
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  const results = poll.options.map((opt) => ({
    optionId: opt.id,
    text: opt.text,
    votes: opt.votes.length,
    percentage: totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0,
  }));

  return { totalVotes, results };
}

/**
 * Check if poll is expired
 */
export function isPollExpired(poll: Poll): boolean {
  return poll.expiresAt ? Date.now() >= poll.expiresAt : false;
}

/**
 * Schedule a message
 */
export function createScheduledMessage(
  to: string,
  content: string,
  scheduledFor: number
): ScheduledMessage {
  return {
    id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    to,
    content,
    scheduledFor,
    createdAt: Date.now(),
    status: 'pending',
  };
}

/**
 * Message search
 */
export function searchMessages(
  messages: Array<Record<string, unknown>>,
  query: string,
  filters?: {
    from?: string;
    dateFrom?: number;
    dateTo?: number;
    hasMedia?: boolean;
  }
): Array<Record<string, unknown>> {
  let filtered = messages;

  // Text search
  if (query) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter((msg) => {
      const content = (msg.content as string | undefined)?.toLowerCase();
      const decryptedContent = (msg.decryptedContent as string | undefined)?.toLowerCase();
      return content?.includes(lowerQuery) || decryptedContent?.includes(lowerQuery);
    });
  }

  // Filter by sender
  if (filters?.from) {
    filtered = filtered.filter((msg) => msg.from === filters.from);
  }

  // Filter by date range
  if (filters?.dateFrom) {
    filtered = filtered.filter((msg) => msg.timestamp >= filters.dateFrom!);
  }

  if (filters?.dateTo) {
    filtered = filtered.filter((msg) => msg.timestamp <= filters.dateTo!);
  }

  // Filter by media
  if (filters?.hasMedia !== undefined) {
    filtered = filtered.filter((msg) =>
      filters.hasMedia ? msg.attachments?.length > 0 : !msg.attachments || msg.attachments.length === 0
    );
  }

  return filtered;
}

/**
 * Message templates
 */
export const MESSAGE_TEMPLATES = [
  {
    category: 'Greetings',
    templates: [
      { text: 'Hey! How are you?', emoji: '👋' },
      { text: 'Good morning!', emoji: '🌅' },
      { text: 'Good night!', emoji: '🌙' },
      { text: 'Have a great day!', emoji: '✨' },
    ],
  },
  {
    category: 'Crypto',
    templates: [
      { text: 'Just sent you some ETH!', emoji: '💰' },
      { text: 'Check out this transaction', emoji: '🔗' },
      { text: 'What\'s your wallet address?', emoji: '📱' },
      { text: 'VFIDE to the moon! 🚀', emoji: '🌙' },
    ],
  },
  {
    category: 'Meetings',
    templates: [
      { text: 'Are you available for a call?', emoji: '📞' },
      { text: 'Let\'s schedule a meeting', emoji: '📅' },
      { text: 'Running 5 minutes late', emoji: '⏰' },
      { text: 'Thanks for the meeting!', emoji: '🤝' },
    ],
  },
  {
    category: 'Responses',
    templates: [
      { text: 'Sure, sounds good!', emoji: '👍' },
      { text: 'Let me think about it', emoji: '🤔' },
      { text: 'Not interested, sorry', emoji: '😕' },
      { text: 'I\'ll get back to you', emoji: '📩' },
    ],
  },
];

/**
 * Auto-reply rules
 */
export interface AutoReply {
  id: string;
  enabled: boolean;
  trigger: 'all' | 'keywords' | 'specific_users';
  keywords?: string[];
  users?: string[];
  message: string;
  activeHours?: { start: number; end: number }; // 0-23
}

export function createAutoReply(
  trigger: AutoReply['trigger'],
  message: string,
  options?: {
    keywords?: string[];
    users?: string[];
    activeHours?: { start: number; end: number };
  }
): AutoReply {
  return {
    id: `autoreply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    enabled: true,
    trigger,
    message,
    ...options,
  };
}

/**
 * Check if auto-reply should trigger
 */
export function shouldTriggerAutoReply(
  autoReply: AutoReply,
  message: string,
  from: string
): boolean {
  if (!autoReply.enabled) return false;

  // Check active hours
  if (autoReply.activeHours) {
    const currentHour = new Date().getHours();
    const { start, end } = autoReply.activeHours;
    
    if (end > start) {
      if (currentHour < start || currentHour >= end) return false;
    } else {
      // Spans midnight
      if (currentHour < start && currentHour >= end) return false;
    }
  }

  // Check trigger conditions
  if (autoReply.trigger === 'all') return true;

  if (autoReply.trigger === 'keywords' && autoReply.keywords) {
    const lowerMessage = message.toLowerCase();
    return autoReply.keywords.some((kw) => lowerMessage.includes(kw.toLowerCase()));
  }

  if (autoReply.trigger === 'specific_users' && autoReply.users) {
    return autoReply.users.includes(from);
  }

  return false;
}

/**
 * Storage for advanced features
 */
export const advancedMessageStorage = {
  // Threads
  saveThread(conversationId: string, thread: MessageThread): void {
    const key = `vfide_threads_${conversationId}`;
    const threads: MessageThread[] = JSON.parse(localStorage.getItem(key) || '[]');
    const index = threads.findIndex((t) => t.parentMessageId === thread.parentMessageId);
    
    if (index >= 0) {
      threads[index] = thread;
    } else {
      threads.push(thread);
    }
    
    localStorage.setItem(key, JSON.stringify(threads));
  },

  loadThreads(conversationId: string): MessageThread[] {
    const key = `vfide_threads_${conversationId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  // Pinned messages
  savePinned(conversationId: string, pinned: PinnedMessage): void {
    const key = `vfide_pinned_${conversationId}`;
    const pinnedMessages: PinnedMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    pinnedMessages.push(pinned);
    localStorage.setItem(key, JSON.stringify(pinnedMessages));
  },

  loadPinned(conversationId: string): PinnedMessage[] {
    const key = `vfide_pinned_${conversationId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  removePinned(conversationId: string, messageId: string): void {
    const key = `vfide_pinned_${conversationId}`;
    const pinnedMessages: PinnedMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = pinnedMessages.filter((p) => p.messageId !== messageId);
    localStorage.setItem(key, JSON.stringify(filtered));
  },

  // Scheduled messages
  saveScheduled(scheduled: ScheduledMessage): void {
    const key = 'vfide_scheduled_messages';
    const messages: ScheduledMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    messages.push(scheduled);
    localStorage.setItem(key, JSON.stringify(messages));
  },

  loadScheduled(): ScheduledMessage[] {
    const key = 'vfide_scheduled_messages';
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  updateScheduled(scheduled: ScheduledMessage): void {
    const key = 'vfide_scheduled_messages';
    const messages: ScheduledMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    const index = messages.findIndex((m) => m.id === scheduled.id);
    if (index >= 0) {
      messages[index] = scheduled;
      localStorage.setItem(key, JSON.stringify(messages));
    }
  },

  // Auto-replies
  saveAutoReply(autoReply: AutoReply): void {
    const key = 'vfide_auto_replies';
    const replies: AutoReply[] = JSON.parse(localStorage.getItem(key) || '[]');
    const index = replies.findIndex((r) => r.id === autoReply.id);
    
    if (index >= 0) {
      replies[index] = autoReply;
    } else {
      replies.push(autoReply);
    }
    
    localStorage.setItem(key, JSON.stringify(replies));
  },

  loadAutoReplies(): AutoReply[] {
    const key = 'vfide_auto_replies';
    return JSON.parse(localStorage.getItem(key) || '[]');
  },
};

/**
 * React hook for message threads
 */
export function useMessageThreads(conversationId: string) {
  const [threads, setThreads] = React.useState<Map<string, MessageThread>>(new Map());

  React.useEffect(() => {
    const loaded = advancedMessageStorage.loadThreads(conversationId);
    const threadsMap = new Map(loaded.map((t) => [t.parentMessageId, t]));
    setThreads(threadsMap);
  }, [conversationId]);

  const addReply = React.useCallback((parentMessageId: string, reply: ThreadReply) => {
    setThreads((prev) => {
      const next = new Map(prev);
      const existing = next.get(parentMessageId);

      if (existing) {
        const updated = {
          ...existing,
          replies: [...existing.replies, reply],
          lastReplyAt: Date.now(),
        };
        next.set(parentMessageId, updated);
        advancedMessageStorage.saveThread(conversationId, updated);
      } else {
        const newThread: MessageThread = {
          parentMessageId,
          replies: [reply],
          createdAt: Date.now(),
          lastReplyAt: Date.now(),
        };
        next.set(parentMessageId, newThread);
        advancedMessageStorage.saveThread(conversationId, newThread);
      }

      return next;
    });
  }, [conversationId]);

  return {
    threads,
    addReply,
  };
}

// For React hooks
import * as React from 'react';
