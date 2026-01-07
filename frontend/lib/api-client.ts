'use client';

/**
 * API Client for VFIDE backend
 * Handles authentication, error handling, and type-safe requests
 */

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
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
   */
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('vfide_api_token', token);
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('vfide_api_token');
    }
    return this.token;
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vfide_api_token');
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
      headers['Authorization'] = `Bearer ${token}`;
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
      messages: any[];
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
    return this.request<{ success: boolean; message: any }>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markMessageRead(messageId: string, conversationId: string) {
    return this.request<{ success: boolean; message: any }>('/messages', {
      method: 'PATCH',
      body: JSON.stringify({ messageId, conversationId, read: true }),
    });
  }

  // ============ Users ============

  async getUser(address: string) {
    return this.request<{ user: any }>(`/users/${address}`);
  }

  async updateUser(address: string, data: any) {
    return this.request<{ success: boolean; user: any }>(`/users/${address}`, {
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
    return this.request<{ success: boolean; request: any }>('/friends', {
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
    return this.request<any>(`/gamification?address=${address}`);
  }

  async awardXP(address: string, amount: number, reason: string) {
    return this.request<{
      success: boolean;
      levelUp: boolean;
      progress: any;
      reason: string;
    }>('/gamification/xp', {
      method: 'POST',
      body: JSON.stringify({ address, amount, reason }),
    });
  }

  async getLeaderboard(category = 'xp', limit = 50) {
    return this.request<{
      leaderboard: any[];
      total: number;
      cached: boolean;
    }>(`/gamification/leaderboard?category=${category}&limit=${limit}`);
  }
}

// Export singleton instance
export const apiClient = new APIClient();

/**
 * React hook for API client
 */
export function useAPIClient() {
  return apiClient;
}
