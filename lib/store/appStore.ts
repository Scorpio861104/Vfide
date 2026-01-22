/**
 * Centralized State Management with Zustand
 * 
 * This store manages vault operations and rewards state
 * to simplify complex state management across components
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface VaultState {
  address: string;
  balance: string;
  lockedBalance: string;
  lastUpdated: number;
}

export interface RewardState {
  totalRewards: string;
  unclaimedRewards: string;
  claimedRewards: string;
  pendingClaims: string[];
  lastUpdated: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoClaimRewards: boolean;
  language: string;
}

// Store interface
interface AppState {
  // Vault state
  vault: VaultState | null;
  setVault: (vault: VaultState) => void;
  updateVaultBalance: (balance: string) => void;
  clearVault: () => void;

  // Rewards state
  rewards: RewardState | null;
  setRewards: (rewards: RewardState) => void;
  addPendingClaim: (claimId: string) => void;
  removePendingClaim: (claimId: string) => void;
  clearRewards: () => void;

  // User preferences
  preferences: UserPreferences;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  resetPreferences: () => void;

  // Connection state
  isConnected: boolean;
  userAddress: string | null;
  setConnection: (connected: boolean, address?: string) => void;

  // Loading states
  loading: {
    vault: boolean;
    rewards: boolean;
  };
  setLoading: (key: 'vault' | 'rewards', loading: boolean) => void;

  // Global actions
  reset: () => void;
}

// Default values
const defaultPreferences: UserPreferences = {
  theme: 'system',
  notifications: true,
  autoClaimRewards: false,
  language: 'en',
};

const defaultLoading = {
  vault: false,
  rewards: false,
};

// Create the store - simplified without persistence to avoid dependency issues
export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  vault: null,
  rewards: null,
  preferences: defaultPreferences,
  isConnected: false,
  userAddress: null,
  loading: defaultLoading,

  // Vault actions
  setVault: (vault) => set({ vault }),
  
  updateVaultBalance: (balance) => set((state) => ({
    vault: state.vault ? {
      ...state.vault,
      balance,
      lastUpdated: Date.now(),
    } : null,
  })),
  
  clearVault: () => set({ vault: null }),

  // Rewards actions
  setRewards: (rewards) => set({ rewards }),
  
  addPendingClaim: (claimId) => set((state) => ({
    rewards: state.rewards ? {
      ...state.rewards,
      pendingClaims: [...state.rewards.pendingClaims, claimId],
    } : null,
  })),
  
  removePendingClaim: (claimId) => set((state) => ({
    rewards: state.rewards ? {
      ...state.rewards,
      pendingClaims: state.rewards.pendingClaims.filter(id => id !== claimId),
    } : null,
  })),
  
  clearRewards: () => set({ rewards: null }),

  // Preferences actions
  setPreferences: (newPreferences) => set((state) => ({
    preferences: {
      ...state.preferences,
      ...newPreferences,
    },
  })),
  
  resetPreferences: () => set({ preferences: defaultPreferences }),

  // Connection actions
  setConnection: (connected, address) => set({
    isConnected: connected,
    userAddress: address || null,
  }),

  // Loading actions
  setLoading: (key, loading) => set((state) => ({
    loading: {
      ...state.loading,
      [key]: loading,
    },
  })),

  // Global reset
  reset: () => set({
    vault: null,
    rewards: null,
    preferences: defaultPreferences,
    isConnected: false,
    userAddress: null,
    loading: defaultLoading,
  }),
}));

// Selectors for optimized re-renders
export const selectVault = (state: AppState) => state.vault;
export const selectRewards = (state: AppState) => state.rewards;
export const selectPreferences = (state: AppState) => state.preferences;
export const selectIsConnected = (state: AppState) => state.isConnected;
export const selectLoading = (state: AppState) => state.loading;
