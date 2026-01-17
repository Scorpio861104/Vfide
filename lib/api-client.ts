'use client';

/**
 * API Client for VFIDE backend
 * Handles authentication, error handling, and type-safe requests
 */

import type { Message, User, GamificationProgress, LeaderboardEntry } from './api-client.types';
import { AUTH_CONFIG, STORAGE_KEYS } from './config.constants';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  /**
   * Set authentication token
   * 
   * WARNING: This stores tokens in localStorage which is accessible to JavaScript
   * and vulnerable to XSS attacks. In production:
   * - Consider using httpOnly cookies for enhanced security
   * - Implement proper CSRF protection
   * - Ensure Content Security Policy (CSP) is configured
   * - Rotate tokens regularly and implement refresh token pattern
   */
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      // Store with a shorter TTL flag for security
      const tokenData = {
        token,
        createdAt: Date.now(),
        expiresIn: AUTH_CONFIG.SESSION_EXPIRY_MS
      };
      localStorage.setItem(STORAGE_KEYS.API_TOKEN, JSON.stringify(tokenData));
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.API_TOKEN);
      if (stored) {
        try {
          const tokenData = JSON.parse(stored);
          // Check if token has expired
          if (Date.now() - tokenData.createdAt > tokenData.expiresIn) {
            this.clearToken();
            return null;
          }
          this.token = tokenData.token;
        } catch {
          // Invalid token format, clear it
          this.clearToken();
          return null;
        }
      }
    }
    return this.token;
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.API_TOKEN);
    }
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new APIError(
          data.error || 'Request failed',
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      throw new APIError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  // ============ Authentication ============

  async authenticate(address: string, message: string, signature: string) {
    const response = await this.request<{
      success: boolean;
      token: string;
      address: string;
      expiresIn: number;
    }>('/auth', {
      method: 'POST',
      body: JSON.stringify({ address, message, signature }),
    });

    this.setToken(response.token);
    return response;
  }

  async verifyToken() {
    return this.request<{ valid: boolean; address: string }>('/auth/verify');
  }

  // ============ Messages ============

  async getMessages(conversationId: string, limit = 50, offset = 0) {
    return this.request<{
      messages: Message[];
      total: number;
      limit: number;
      offset: number;
    }>(`/messages?conversationId=${conversationId}&limit=${limit}&offset=${offset}`);
  }

  async sendMessage(data: {
    conversationId: string;
    from: string;
    to: string;
    encryptedContent: string;
    signature?: string;
  }) {
    return this.request<{ success: boolean; message: Message }>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markMessageRead(messageId: string, conversationId: string) {
    return this.request<{ success: boolean; message: Message }>('/messages', {
      method: 'PATCH',
      body: JSON.stringify({ messageId, conversationId, read: true }),
    });
  }

  async editMessage(messageId: string, conversationId: string, newEncryptedContent: string) {
    return this.request<{ success: boolean; message: Message }>('/messages/edit', {
      method: 'PATCH',
      body: JSON.stringify({ messageId, conversationId, encryptedContent: newEncryptedContent }),
    });
  }

  async deleteMessage(messageId: string, conversationId: string) {
    return this.request<{ success: boolean; message: Message }>('/messages/delete', {
      method: 'DELETE',
      body: JSON.stringify({ messageId, conversationId }),
    });
  }

  async addReaction(
    messageId: string, 
    conversationId: string, 
    reaction: { type?: 'emoji' | 'custom_image'; emoji?: string; imageUrl?: string; imageName?: string }, 
    userAddress: string
  ) {
    return this.request<{ success: boolean; message: any }>('/messages/reaction', {
      method: 'POST',
      body: JSON.stringify({ 
        messageId, 
        conversationId, 
        reactionType: reaction.type || 'emoji',
        emoji: reaction.emoji,
        imageUrl: reaction.imageUrl,
        imageName: reaction.imageName,
        userAddress 
      }),
    });
  }

  // ============ Users ============

  async getUser(address: string) {
    return this.request<{ user: User }>(`/users/${address}`);
  }

  async updateUser(address: string, data: Partial<User>) {
    return this.request<{ success: boolean; user: User }>(`/users/${address}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(address: string, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/api/users/${address}/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new APIError(data.error || 'Upload failed', response.status, data);
    }

    return data as { success: boolean; avatarUrl: string };
  }

  // ============ Friends ============

  async getFriends(address: string) {
    return this.request<{ friends: string[]; count: number }>(
      `/friends?address=${address}`
    );
  }

  async sendFriendRequest(from: string, to: string) {
    return this.request<{ success: boolean; request: { id: string; from: string; to: string; status: string } }>('/friends', {
      method: 'POST',
      body: JSON.stringify({ from, to }),
    });
  }

  async respondToFriendRequest(
    requestId: string,
    status: 'accepted' | 'rejected',
    userAddress: string
  ) {
    return this.request<{ success: boolean; message: string }>('/friends', {
      method: 'PATCH',
      body: JSON.stringify({ requestId, status, userAddress }),
    });
  }

  async removeFriend(user1: string, user2: string) {
    return this.request<{ success: boolean; message: string }>(
      `/friends?user1=${user1}&user2=${user2}`,
      { method: 'DELETE' }
    );
  }

  // ============ Gamification ============

  async getGamificationProgress(address: string) {
    return this.request<GamificationProgress>(`/gamification?address=${address}`);
  }

  async awardXP(address: string, amount: number, reason: string) {
    return this.request<{
      success: boolean;
      levelUp: boolean;
      progress: GamificationProgress;
      reason: string;
    }>('/gamification/xp', {
      method: 'POST',
      body: JSON.stringify({ address, amount, reason }),
    });
  }

  async getLeaderboard(category = 'xp', limit = 50) {
    return this.request<{
      leaderboard: LeaderboardEntry[];
      total: number;
      cached: boolean;
    }>(`/gamification/leaderboard?category=${category}&limit=${limit}`);
  }
}

/**
 * Global API client instance for making authenticated HTTP requests
 * 
 * Handles all backend communication including:
 * - Authentication (JWT tokens)
 * - Messages (send, edit, delete, reactions)
 * - User management (profiles, avatars)
 * - Friends system (requests, accept/reject)
 * - Gamification (XP, achievements, leaderboard)
 * 
 * Singleton pattern ensures consistent auth state and token management.
 */
export const apiClient = new APIClient();

/**
 * React hook for accessing the API client
 * 
 * Provides convenient access to all API methods with automatic
 * authentication and error handling.
 * 
 * @returns APIClient singleton instance
 * @example
 * const api = useAPIClient();
 * const messages = await api.getMessages(conversationId);
 * await api.sendMessage({ from, to, encryptedContent });
 */
export function useAPIClient() {
  return apiClient;
}
