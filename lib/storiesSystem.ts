/**
 * Stories & Status Updates
 * Snapchat/Instagram-style ephemeral content sharing
 */

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'text' | 'image' | 'video';
  content: string; // Text content or media URL
  backgroundColor?: string; // For text stories
  textColor?: string;
  caption?: string;
  createdAt: number;
  expiresAt: number;
  viewedBy: string[]; // List of user addresses who viewed
  reactions: StoryReaction[];
}

export interface StoryReaction {
  userId: string;
  emoji: string;
  timestamp: number;
}

export interface StatusUpdate {
  userId: string;
  status: string; // Custom status text
  emoji?: string; // Status emoji
  expiresAt?: number; // Auto-clear after X hours
  createdAt: number;
}

// Story duration: 24 hours
export const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

// Status duration: 4 hours default
export const DEFAULT_STATUS_DURATION_MS = 4 * 60 * 60 * 1000;

// Predefined backgrounds for text stories
export const STORY_BACKGROUNDS = [
  { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', name: 'Purple Dream' },
  { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', name: 'Pink Passion' },
  { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', name: 'Ocean Blue' },
  { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', name: 'Mint Fresh' },
  { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', name: 'Sunset' },
  { gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', name: 'Deep Ocean' },
  { gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', name: 'Cotton Candy' },
  { gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', name: 'Rose Pink' },
  { gradient: '#0A0A0F', name: 'Dark' },
  { gradient: '#F5F3E8', name: 'Light' },
];

/**
 * Create a text story
 */
export function createTextStory(
  userId: string,
  userName: string,
  content: string,
  backgroundColor?: string,
  textColor?: string
): Story {
  return {
    id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userName,
    type: 'text',
    content,
    backgroundColor: backgroundColor || STORY_BACKGROUNDS[0]?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor: textColor || '#FFFFFF',
    createdAt: Date.now(),
    expiresAt: Date.now() + STORY_DURATION_MS,
    viewedBy: [],
    reactions: [],
  };
}

/**
 * Create a media story (image/video)
 */
export function createMediaStory(
  userId: string,
  userName: string,
  mediaUrl: string,
  type: 'image' | 'video',
  caption?: string,
  userAvatar?: string
): Story {
  return {
    id: `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userName,
    userAvatar,
    type,
    content: mediaUrl,
    caption,
    createdAt: Date.now(),
    expiresAt: Date.now() + STORY_DURATION_MS,
    viewedBy: [],
    reactions: [],
  };
}

/**
 * Check if story is expired
 */
export function isStoryExpired(story: Story): boolean {
  return Date.now() >= story.expiresAt;
}

/**
 * Get time remaining for story
 */
export function getStoryTimeRemaining(story: Story): string {
  const remaining = story.expiresAt - Date.now();
  
  if (remaining <= 0) return 'Expired';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Mark story as viewed
 */
export function markStoryViewed(story: Story, userId: string): Story {
  if (!story.viewedBy.includes(userId)) {
    return {
      ...story,
      viewedBy: [...story.viewedBy, userId],
    };
  }
  return story;
}

/**
 * Add reaction to story
 */
export function addStoryReaction(story: Story, userId: string, emoji: string): Story {
  // Remove existing reaction from this user
  const existingReactions = story.reactions.filter((r) => r.userId !== userId);
  
  // Add new reaction
  return {
    ...story,
    reactions: [
      ...existingReactions,
      { userId, emoji, timestamp: Date.now() },
    ],
  };
}

/**
 * Group stories by user
 */
export function groupStoriesByUser(stories: Story[]): Map<string, Story[]> {
  const grouped = new Map<string, Story[]>();
  
  for (const story of stories) {
    if (!isStoryExpired(story)) {
      const userStories = grouped.get(story.userId) || [];
      userStories.push(story);
      grouped.set(story.userId, userStories);
    }
  }
  
  // Sort each user's stories by creation time
  for (const [userId, userStories] of grouped) {
    grouped.set(userId, userStories.sort((a, b) => a.createdAt - b.createdAt));
  }
  
  return grouped;
}

/**
 * Get stories from friends/following
 */
export function getStoriesFromNetwork(
  allStories: Story[],
  following: string[]
): Story[] {
  return allStories.filter((story) => 
    following.includes(story.userId) && !isStoryExpired(story)
  );
}

/**
 * Story storage
 */
export const storyStorage = {
  save(story: Story): void {
    const key = 'vfide_stories';
    const stories: Story[] = JSON.parse(localStorage.getItem(key) || '[]');
    stories.push(story);
    localStorage.setItem(key, JSON.stringify(stories));
  },

  load(): Story[] {
    const key = 'vfide_stories';
    const stories: Story[] = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Filter out expired stories
    const active = stories.filter((s) => !isStoryExpired(s));
    
    // Save cleaned list
    localStorage.setItem(key, JSON.stringify(active));
    
    return active;
  },

  getUserStories(userId: string): Story[] {
    return this.load().filter((s) => s.userId === userId);
  },

  delete(storyId: string): void {
    const stories = this.load();
    const filtered = stories.filter((s) => s.id !== storyId);
    localStorage.setItem('vfide_stories', JSON.stringify(filtered));
  },

  update(story: Story): void {
    const stories = this.load();
    const index = stories.findIndex((s) => s.id === story.id);
    if (index !== -1) {
      stories[index] = story;
      localStorage.setItem('vfide_stories', JSON.stringify(stories));
    }
  },

  clearExpired(): void {
    const _active = this.load(); // Already filters expired
    // save is already done in load()
  },
};

/**
 * Status storage
 */
export const statusStorage = {
  save(status: StatusUpdate): void {
    const key = `vfide_status_${status.userId}`;
    localStorage.setItem(key, JSON.stringify(status));
  },

  load(userId: string): StatusUpdate | null {
    const key = `vfide_status_${userId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    const status: StatusUpdate = JSON.parse(stored);
    
    // Check if expired
    if (status.expiresAt && Date.now() >= status.expiresAt) {
      this.clear(userId);
      return null;
    }
    
    return status;
  },

  clear(userId: string): void {
    const key = `vfide_status_${userId}`;
    localStorage.removeItem(key);
  },

  loadAll(userIds: string[]): Map<string, StatusUpdate> {
    const statuses = new Map<string, StatusUpdate>();
    
    for (const userId of userIds) {
      const status = this.load(userId);
      if (status) {
        statuses.set(userId, status);
      }
    }
    
    return statuses;
  },
};

/**
 * Create status update
 */
export function createStatus(
  userId: string,
  statusText: string,
  emoji?: string,
  durationHours: number = 4
): StatusUpdate {
  return {
    userId,
    status: statusText,
    emoji,
    createdAt: Date.now(),
    expiresAt: Date.now() + durationHours * 60 * 60 * 1000,
  };
}

/**
 * Common status presets
 */
export const STATUS_PRESETS = [
  { emoji: '💻', text: 'Working', color: '#00F0FF' },
  { emoji: '😴', text: 'Sleeping', color: '#A78BFA' },
  { emoji: '🎮', text: 'Gaming', color: '#50C878' },
  { emoji: '🍕', text: 'Eating', color: '#FFD700' },
  { emoji: '🏃', text: 'Exercising', color: '#FF8C42' },
  { emoji: '📚', text: 'Studying', color: '#FF6B9D' },
  { emoji: '🎵', text: 'Listening to music', color: '#00F0FF' },
  { emoji: '🚗', text: 'Driving', color: '#A78BFA' },
  { emoji: '✈️', text: 'Traveling', color: '#50C878' },
  { emoji: '🎬', text: 'Watching', color: '#FFD700' },
  { emoji: '🙏', text: 'Do not disturb', color: '#FF6B9D' },
  { emoji: '😊', text: 'Available to chat', color: '#50C878' },
];

/**
 * React hook for stories
 */
export function useStories(userId: string) {
  const [stories, setStories] = React.useState<Story[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load stories
  React.useEffect(() => {
    setIsLoading(true);
    const loaded = storyStorage.load();
    setStories(loaded);
    setIsLoading(false);

    // Set up interval to clean expired stories
    const interval = setInterval(() => {
      storyStorage.clearExpired();
      setStories(storyStorage.load());
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Create story
  const createStory = React.useCallback((story: Story) => {
    storyStorage.save(story);
    setStories((prev) => [...prev, story]);
  }, []);

  // Delete story
  const deleteStory = React.useCallback((storyId: string) => {
    storyStorage.delete(storyId);
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  }, []);

  // View story
  const viewStory = React.useCallback((storyId: string) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? markStoryViewed(s, userId) : s))
    );

    const story = stories.find((s) => s.id === storyId);
    if (story) {
      storyStorage.update(markStoryViewed(story, userId));
    }
  }, [userId, stories]);

  // React to story
  const reactToStory = React.useCallback((storyId: string, emoji: string) => {
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? addStoryReaction(s, userId, emoji) : s))
    );

    const story = stories.find((s) => s.id === storyId);
    if (story) {
      storyStorage.update(addStoryReaction(story, userId, emoji));
    }
  }, [userId, stories]);

  return {
    stories,
    isLoading,
    createStory,
    deleteStory,
    viewStory,
    reactToStory,
    groupedStories: groupStoriesByUser(stories),
  };
}

/**
 * React hook for status
 */
export function useStatus(userId: string) {
  const [status, setStatus] = React.useState<StatusUpdate | null>(null);

  // Load status
  React.useEffect(() => {
    const loaded = statusStorage.load(userId);
    setStatus(loaded);

    // Check for expiry every minute
    const interval = setInterval(() => {
      const current = statusStorage.load(userId);
      setStatus(current);
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  // Update status
  const updateStatus = React.useCallback((statusText: string, emoji?: string, hours: number = 4) => {
    const newStatus = createStatus(userId, statusText, emoji, hours);
    statusStorage.save(newStatus);
    setStatus(newStatus);
  }, [userId]);

  // Clear status
  const clearStatus = React.useCallback(() => {
    statusStorage.clear(userId);
    setStatus(null);
  }, [userId]);

  return {
    status,
    updateStatus,
    clearStatus,
  };
}

// For React hooks
import * as React from 'react';
