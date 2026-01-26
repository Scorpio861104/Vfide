'use client';

/**
 * Embedded Wallet Provider
 * 
 * Enables email/social login for users without existing wallets.
 * Provides a seamless onboarding experience with:
 * - Email magic link authentication
 * - Social login (Google, Apple, Twitter, Discord)
 * - Automatic wallet creation
 * - Secure key management
 * 
 * Designed to work alongside traditional wallet connectors.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type Address } from 'viem';

// ==================== TYPES ====================

export type EmbeddedWalletProvider = 'privy' | 'dynamic' | 'web3auth' | 'magic' | 'particle';
export type AuthMethod = 'email' | 'google' | 'apple' | 'twitter' | 'discord' | 'github' | 'sms';

export interface EmbeddedWalletConfig {
  provider: EmbeddedWalletProvider;
  appId: string;
  /** Allowed authentication methods */
  authMethods?: AuthMethod[];
  /** App name shown in login UI */
  appName?: string;
  /** App logo URL */
  appLogo?: string;
  /** Primary color for branding */
  primaryColor?: string;
  /** Chains to support */
  supportedChains?: number[];
}

export interface EmbeddedUser {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  authMethod: AuthMethod;
  walletAddress: Address;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface LoginOptions {
  method: AuthMethod;
  /** For email login */
  email?: string;
  /** For SMS login */
  phone?: string;
  /** Redirect URL after OAuth */
  redirectUrl?: string;
}

export interface EmbeddedWalletState {
  isInitialized: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: EmbeddedUser | null;
  walletAddress: Address | null;
  error: string | null;
}

// ==================== EMBEDDED WALLET SERVICE ====================

export class EmbeddedWalletService {
  private config: EmbeddedWalletConfig;
  private state: EmbeddedWalletState = {
    isInitialized: false,
    isLoading: false,
    isAuthenticated: false,
    user: null,
    walletAddress: null,
    error: null,
  };
  private listeners: Set<(state: EmbeddedWalletState) => void> = new Set();

  constructor(config: EmbeddedWalletConfig) {
    this.config = config;
  }

  /**
   * Initialize the embedded wallet SDK
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized) return;

    this.updateState({ isLoading: true });

    try {
      // Check for existing session
      const existingSession = this.getStoredSession();
      
      if (existingSession) {
        this.updateState({
          isAuthenticated: true,
          user: existingSession,
          walletAddress: existingSession.walletAddress,
        });
      }

      this.updateState({ isInitialized: true, isLoading: false });
    } catch (error) {
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
      });
    }
  }

  /**
   * Start login flow
   */
  async login(options: LoginOptions): Promise<EmbeddedUser> {
    this.updateState({ isLoading: true, error: null });

    try {
      let user: EmbeddedUser;

      switch (options.method) {
        case 'email':
          user = await this.loginWithEmail(options.email!);
          break;
        case 'google':
        case 'apple':
        case 'twitter':
        case 'discord':
        case 'github':
          user = await this.loginWithOAuth(options.method, options.redirectUrl);
          break;
        case 'sms':
          user = await this.loginWithSMS(options.phone!);
          break;
        default:
          throw new Error(`Unsupported auth method: ${options.method}`);
      }

      this.storeSession(user);
      this.updateState({
        isLoading: false,
        isAuthenticated: true,
        user,
        walletAddress: user.walletAddress,
      });

      return user;
    } catch (error) {
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    this.clearSession();
    this.updateState({
      isAuthenticated: false,
      user: null,
      walletAddress: null,
    });
  }

  /**
   * Get current state
   */
  getState(): EmbeddedWalletState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: EmbeddedWalletState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Export wallet (for backup)
   */
  async exportWallet(): Promise<{ privateKey?: string; mnemonic?: string }> {
    if (!this.state.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    // In production, this would securely export the key
    // For now, show that it requires additional authentication
    throw new Error('Please complete additional verification to export your wallet');
  }

  // ==================== PRIVATE METHODS ====================

  private async loginWithEmail(email: string): Promise<EmbeddedUser> {
    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // In production, this would:
    // 1. Send magic link to email
    // 2. Wait for user to click link
    // 3. Create/retrieve wallet
    
    // Simulated response for demo
    await this.simulateNetworkDelay();
    
    return this.createMockUser(email, 'email');
  }

  private async loginWithOAuth(
    provider: AuthMethod,
    _redirectUrl?: string
  ): Promise<EmbeddedUser> {
    // In production, this would:
    // 1. Open OAuth popup/redirect
    // 2. Handle callback
    // 3. Create/retrieve wallet
    
    await this.simulateNetworkDelay();
    
    return this.createMockUser(`user@${provider}.com`, provider);
  }

  private async loginWithSMS(phone: string): Promise<EmbeddedUser> {
    // In production, this would:
    // 1. Send OTP to phone
    // 2. Verify OTP
    // 3. Create/retrieve wallet
    
    await this.simulateNetworkDelay();
    
    return this.createMockUser(phone, 'sms');
  }

  private createMockUser(identifier: string, method: AuthMethod): EmbeddedUser {
    // Generate deterministic address from identifier
    const hash = this.simpleHash(identifier);
    const address = ('0x' + hash.slice(0, 40)) as Address;

    return {
      id: `user_${hash.slice(0, 16)}`,
      email: method === 'email' ? identifier : undefined,
      phone: method === 'sms' ? identifier : undefined,
      name: identifier.split('@')[0],
      authMethod: method,
      walletAddress: address,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
  }

  private simpleHash(str: string): string {
    let hash = '';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash += char.toString(16).padStart(2, '0');
    }
    // Pad to 40 chars (20 bytes) for address
    while (hash.length < 40) {
      hash += '0';
    }
    return hash.slice(0, 40);
  }

  private async simulateNetworkDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private updateState(updates: Partial<EmbeddedWalletState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  private getStoredSession(): EmbeddedUser | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('vfide_embedded_session');
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      
      // Validate required fields
      if (!parsed || !parsed.address || !parsed.userId || !parsed.email) {
        return null;
      }
      
      // Safely parse dates with validation
      let createdAt: Date;
      let lastLoginAt: Date;
      
      try {
        createdAt = new Date(parsed.createdAt);
        lastLoginAt = new Date(parsed.lastLoginAt);
        
        // Validate dates are valid
        if (isNaN(createdAt.getTime()) || isNaN(lastLoginAt.getTime())) {
          return null;
        }
      } catch {
        return null;
      }
      
      return {
        ...parsed,
        createdAt,
        lastLoginAt,
      };
    } catch {
      // Corrupted session, clear it
      this.clearSession();
      return null;
    }
  }

  private storeSession(user: EmbeddedUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('vfide_embedded_session', JSON.stringify(user));
  }

  private clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('vfide_embedded_session');
  }
}

// ==================== REACT CONTEXT ====================

interface EmbeddedWalletContextValue {
  state: EmbeddedWalletState;
  login: (options: LoginOptions) => Promise<EmbeddedUser>;
  logout: () => Promise<void>;
  exportWallet: () => Promise<{ privateKey?: string; mnemonic?: string }>;
}

const EmbeddedWalletContext = createContext<EmbeddedWalletContextValue | null>(null);

// ==================== PROVIDER COMPONENT ====================

export interface EmbeddedWalletProviderProps {
  config: EmbeddedWalletConfig;
  children: ReactNode;
}

export function EmbeddedWalletProvider({ config, children }: EmbeddedWalletProviderProps) {
  const [service] = useState(() => new EmbeddedWalletService(config));
  const [state, setState] = useState<EmbeddedWalletState>(service.getState());

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = service.subscribe(setState);
    
    // Initialize service
    service.initialize();
    
    return unsubscribe;
  }, [service]);

  const login = useCallback(
    (options: LoginOptions) => service.login(options),
    [service]
  );

  const logout = useCallback(() => service.logout(), [service]);

  const exportWallet = useCallback(() => service.exportWallet(), [service]);

  return (
    <EmbeddedWalletContext.Provider value={{ state, login, logout, exportWallet }}>
      {children}
    </EmbeddedWalletContext.Provider>
  );
}

// ==================== HOOKS ====================

export function useEmbeddedWallet(): EmbeddedWalletContextValue {
  const context = useContext(EmbeddedWalletContext);
  
  if (!context) {
    throw new Error('useEmbeddedWallet must be used within EmbeddedWalletProvider');
  }
  
  return context;
}

/**
 * Hook for email login
 */
export function useEmailLogin() {
  const { login, state } = useEmbeddedWallet();
  const [email, setEmail] = useState('');

  const submit = useCallback(async () => {
    if (!email) throw new Error('Email required');
    return login({ method: 'email', email });
  }, [email, login]);

  return {
    email,
    setEmail,
    submit,
    isLoading: state.isLoading,
    error: state.error,
  };
}

/**
 * Hook for social login
 */
export function useSocialLogin() {
  const { login, state } = useEmbeddedWallet();

  const loginWithGoogle = useCallback(
    () => login({ method: 'google' }),
    [login]
  );

  const loginWithApple = useCallback(
    () => login({ method: 'apple' }),
    [login]
  );

  const loginWithTwitter = useCallback(
    () => login({ method: 'twitter' }),
    [login]
  );

  const loginWithDiscord = useCallback(
    () => login({ method: 'discord' }),
    [login]
  );

  return {
    loginWithGoogle,
    loginWithApple,
    loginWithTwitter,
    loginWithDiscord,
    isLoading: state.isLoading,
    error: state.error,
  };
}

export default EmbeddedWalletService;
