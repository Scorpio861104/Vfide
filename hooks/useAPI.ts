'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { apiClient, APIError } from '@/lib/api-client';

/**
 * User profile type
 */
export interface UserProfile {
  address: string;
  alias?: string;
  bio?: string;
  email?: string;
  location?: string;
  website?: string;
  avatar?: string;
  proofScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

type ApiUser = {
  address: string;
  username?: string;
  avatar?: string;
  bio?: string;
  email?: string;
  location?: string;
  website?: string;
  proofScore?: number;
  createdAt?: number | string;
  updatedAt?: number | string;
};

const normalizeUserProfile = (user: ApiUser): UserProfile => {
  const toIso = (value?: number | string) =>
    typeof value === 'number' ? new Date(value).toISOString() : value;

  return {
    address: user.address,
    alias: user.username,
    bio: user.bio,
    email: user.email,
    location: user.location,
    website: user.website,
    avatar: user.avatar,
    proofScore: user.proofScore,
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
  };
};

/**
 * Hook for API authentication
 */
export function useAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    if (!address) {
      setError('No wallet connected');
      return false;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const message = `Sign this message to authenticate with VFIDE.\n\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      await apiClient.authenticate(address, message, signature);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      const error = err as APIError;
      setError(error.message);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, signMessageAsync]);

  const logout = useCallback(() => {
    apiClient.clearToken();
    setIsAuthenticated(false);
  }, []);

  // Check if token is valid on mount
  useEffect(() => {
    const token = apiClient.getToken();
    if (token) {
      apiClient.verifyToken()
        .then(() => setIsAuthenticated(true))
        .catch(() => {
          apiClient.clearToken();
          setIsAuthenticated(false);
        });
    }
  }, []);

  return {
    isAuthenticated,
    isAuthenticating,
    error,
    authenticate,
    logout,
  };
}

/**
 * Hook for fetching messages
 */
export function useMessages(conversationId: string, enabled = true) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getMessages(conversationId);
      setMessages(response.messages);
    } catch (err) {
      const error = err as APIError;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, enabled]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (data: {
    from: string;
    to: string;
    encryptedContent: string;
    signature?: string;
  }) => {
    try {
      const response = await apiClient.sendMessage({
        conversationId,
        ...data,
      });
      setMessages(prev => [...prev, response.message]);
      return response.message;
    } catch (err) {
      const error = err as APIError;
      throw new Error(error.message);
    }
  }, [conversationId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}

/**
 * Hook for user profile
 */
export function useUserProfile(address?: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getUser(address);
      setProfile(normalizeUserProfile(response.user));
    } catch (err) {
      const error = err as APIError;
      if (error.statusCode === 404) {
        setProfile(null);
      } else {
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (data: { username?: string; displayName?: string; bio?: string; avatarUrl?: string }) => {
    if (!address) return;

    try {
      const response = await apiClient.updateUser(address, data);
      setProfile(normalizeUserProfile(response.user));
      return response.user;
    } catch (err) {
      const error = err as APIError;
      throw new Error(error.message);
    }
  }, [address]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!address) return;

    try {
      const response = await apiClient.uploadAvatar(address, file);
      setProfile((prev) => prev ? { ...prev, avatar: response.avatarUrl } : null);
      return response.avatarUrl;
    } catch (err) {
      const error = err as APIError;
      throw new Error(error.message);
    }
  }, [address]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    uploadAvatar,
    refetch: fetchProfile,
  };
}

/**
 * Hook for friends list
 */
export function useFriends(address?: string) {
  const [friends, setFriends] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getFriends(address);
      setFriends(response.friends);
    } catch (err) {
      const error = err as APIError;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const sendFriendRequest = useCallback(async (to: string) => {
    if (!address) return;

    try {
      const response = await apiClient.sendFriendRequest(address, to);
      return response.request;
    } catch (err) {
      const error = err as APIError;
      throw new Error(error.message);
    }
  }, [address]);

  const removeFriend = useCallback(async (friendAddress: string) => {
    if (!address) return;

    try {
      await apiClient.removeFriend(address, friendAddress);
      setFriends(prev => prev.filter(f => f !== friendAddress));
    } catch (err) {
      const error = err as APIError;
      throw new Error(error.message);
    }
  }, [address]);

  return {
    friends,
    isLoading,
    error,
    sendFriendRequest,
    removeFriend,
    refetch: fetchFriends,
  };
}

/**
 * Hook for gamification data
 */
export function useGamification(address?: string) {
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getGamificationProgress(address);
      setProgress(response);
    } catch (err) {
      const error = err as APIError;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const awardXP = useCallback(async (amount: number, reason: string) => {
    if (!address) return;

    try {
      const response = await apiClient.awardXP(address, amount, reason);
      setProgress(response.progress);
      return response;
    } catch (err) {
      const error = err as APIError;
      throw new Error(error.message);
    }
  }, [address]);

  return {
    progress,
    isLoading,
    error,
    awardXP,
    refetch: fetchProgress,
  };
}

/**
 * Hook for leaderboard
 */
export function useLeaderboard(category: 'xp' | 'level' | 'achievements' = 'xp', limit = 50) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getLeaderboard(category, limit);
      setLeaderboard(response.leaderboard);
      setCached(response.cached);
    } catch (err) {
      const error = err as APIError;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [category, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    isLoading,
    error,
    cached,
    refetch: fetchLeaderboard,
  };
}
