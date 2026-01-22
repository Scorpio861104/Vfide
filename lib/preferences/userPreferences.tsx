'use client';

/**
 * Advanced User Preferences System
 * 
 * Persistent preferences with sync across tabs, migration support,
 * and type-safe access.
 */

import { useState, useEffect, useCallback, useMemo, createContext, useContext, type ReactNode } from 'react';

// ==================== TYPES ====================

export interface UserPreferences {
  // Display
  theme: 'light' | 'dark' | 'system';
  colorScheme: 'default' | 'high-contrast' | 'colorblind';
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'comfortable' | 'spacious';
  
  // Transactions
  defaultGasSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  autoApproveLimit: number; // In USD
  showUSDValues: boolean;
  preferredCurrency: string;
  
  // Notifications
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSoundEffects: boolean;
  notifyOnTransactionConfirm: boolean;
  notifyOnPriceAlert: boolean;
  notifyOnSocialActivity: boolean;
  
  // Privacy
  hideBalances: boolean;
  hideSmallBalances: boolean;
  smallBalanceThreshold: number;
  anonymousMode: boolean;
  
  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderMode: boolean;
  keyboardShortcuts: boolean;
  
  // Advanced
  developerMode: boolean;
  testnetMode: boolean;
  experimentalFeatures: boolean;
  analyticsOptOut: boolean;
  
  // Custom user data
  favoriteTokens: string[];
  favoriteAddresses: Array<{ address: string; label: string }>;
  recentSearches: string[];
  customRPCs: Array<{ chainId: number; url: string; label: string }>;
}

export type PreferenceKey = keyof UserPreferences;

interface PreferencesContextValue {
  preferences: UserPreferences;
  setPreference: <K extends PreferenceKey>(key: K, value: UserPreferences[K]) => void;
  setPreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  resetPreference: <K extends PreferenceKey>(key: K) => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
  isLoaded: boolean;
}

// ==================== DEFAULT VALUES ====================

export const DEFAULT_PREFERENCES: UserPreferences = {
  // Display
  theme: 'dark',
  colorScheme: 'default',
  fontSize: 'medium',
  density: 'comfortable',
  
  // Transactions
  defaultGasSpeed: 'normal',
  autoApproveLimit: 0,
  showUSDValues: true,
  preferredCurrency: 'USD',
  
  // Notifications
  enablePushNotifications: true,
  enableEmailNotifications: false,
  enableSoundEffects: true,
  notifyOnTransactionConfirm: true,
  notifyOnPriceAlert: true,
  notifyOnSocialActivity: true,
  
  // Privacy
  hideBalances: false,
  hideSmallBalances: true,
  smallBalanceThreshold: 1,
  anonymousMode: false,
  
  // Accessibility
  reducedMotion: false,
  highContrast: false,
  screenReaderMode: false,
  keyboardShortcuts: true,
  
  // Advanced
  developerMode: false,
  testnetMode: false,
  experimentalFeatures: false,
  analyticsOptOut: false,
  
  // Custom
  favoriteTokens: [],
  favoriteAddresses: [],
  recentSearches: [],
  customRPCs: [],
};

// ==================== STORAGE ====================

const STORAGE_KEY = 'vfide_user_preferences';
const STORAGE_VERSION = 1;

interface StoredPreferences {
  version: number;
  preferences: UserPreferences;
  lastUpdated: number;
}

function loadFromStorage(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    
    const stored: StoredPreferences = JSON.parse(raw);
    
    // Migrate if needed
    if (stored.version < STORAGE_VERSION) {
      return migratePreferences(stored.preferences, stored.version);
    }
    
    // Merge with defaults to handle new preferences
    return { ...DEFAULT_PREFERENCES, ...stored.preferences };
  } catch (e) {
    console.error('Failed to load preferences:', e);
    return DEFAULT_PREFERENCES;
  }
}

function saveToStorage(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored: StoredPreferences = {
      version: STORAGE_VERSION,
      preferences,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (e) {
    console.error('Failed to save preferences:', e);
  }
}

function migratePreferences(old: Partial<UserPreferences>, fromVersion: number): UserPreferences {
  const migrated = { ...DEFAULT_PREFERENCES, ...old };
  
  // Add migrations as versions increase
  if (fromVersion < 1) {
    // Example migration: rename old keys
  }
  
  return migrated;
}

// ==================== CONTEXT ====================

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loaded = loadFromStorage();
    setPreferencesState(loaded);
    setIsLoaded(true);
    
    // Apply system preferences
    applySystemPreferences(loaded);
    
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const stored: StoredPreferences = JSON.parse(e.newValue);
          setPreferencesState(prev => ({ ...prev, ...stored.preferences }));
        } catch {
          // Ignore parse errors
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Apply preferences to document
  useEffect(() => {
    if (!isLoaded) return;
    applyPreferencesToDocument(preferences);
    saveToStorage(preferences);
  }, [preferences, isLoaded]);

  const setPreference = useCallback(<K extends PreferenceKey>(key: K, value: UserPreferences[K]) => {
    setPreferencesState(prev => ({ ...prev, [key]: value }));
  }, []);

  const setPreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferencesState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
  }, []);

  const resetPreference = useCallback(<K extends PreferenceKey>(key: K) => {
    setPreferencesState(prev => ({ ...prev, [key]: DEFAULT_PREFERENCES[key] }));
  }, []);

  const exportPreferences = useCallback(() => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  const importPreferences = useCallback((json: string): boolean => {
    try {
      const imported = JSON.parse(json);
      const validated = { ...DEFAULT_PREFERENCES, ...imported };
      setPreferencesState(validated);
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo(() => ({
    preferences,
    setPreference,
    setPreferences,
    resetPreferences,
    resetPreference,
    exportPreferences,
    importPreferences,
    isLoaded,
  }), [preferences, setPreference, setPreferences, resetPreferences, resetPreference, exportPreferences, importPreferences, isLoaded]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

// ==================== HOOKS ====================

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

export function usePreference<K extends PreferenceKey>(key: K): [UserPreferences[K], (value: UserPreferences[K]) => void] {
  const { preferences, setPreference } = usePreferences();
  
  const setValue = useCallback((value: UserPreferences[K]) => {
    setPreference(key, value);
  }, [key, setPreference]);
  
  return [preferences[key], setValue];
}

// ==================== HELPERS ====================

function applySystemPreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  
  // Check for system reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Don't override if user explicitly set reducedMotion
    if (!localStorage.getItem(STORAGE_KEY)) {
      prefs.reducedMotion = true;
    }
  }
  
  // Check for system color scheme
  if (prefs.theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  }
}

function applyPreferencesToDocument(prefs: UserPreferences): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // Theme
  if (prefs.theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
  } else {
    root.classList.toggle('dark', prefs.theme === 'dark');
  }
  
  // Font size
  const fontSizes = { small: '14px', medium: '16px', large: '18px' };
  root.style.fontSize = fontSizes[prefs.fontSize];
  
  // Reduced motion
  root.classList.toggle('reduce-motion', prefs.reducedMotion);
  
  // High contrast
  root.classList.toggle('high-contrast', prefs.highContrast);
  
  // Density
  root.dataset.density = prefs.density;
  
  // Color scheme
  root.dataset.colorScheme = prefs.colorScheme;
}

// ==================== PREFERENCE CATEGORIES ====================

export const PREFERENCE_CATEGORIES = {
  display: {
    label: 'Display',
    icon: '🎨',
    keys: ['theme', 'colorScheme', 'fontSize', 'density'] as PreferenceKey[],
  },
  transactions: {
    label: 'Transactions',
    icon: '💸',
    keys: ['defaultGasSpeed', 'autoApproveLimit', 'showUSDValues', 'preferredCurrency'] as PreferenceKey[],
  },
  notifications: {
    label: 'Notifications',
    icon: '🔔',
    keys: ['enablePushNotifications', 'enableEmailNotifications', 'enableSoundEffects', 'notifyOnTransactionConfirm', 'notifyOnPriceAlert', 'notifyOnSocialActivity'] as PreferenceKey[],
  },
  privacy: {
    label: 'Privacy',
    icon: '🔒',
    keys: ['hideBalances', 'hideSmallBalances', 'smallBalanceThreshold', 'anonymousMode'] as PreferenceKey[],
  },
  accessibility: {
    label: 'Accessibility',
    icon: '♿',
    keys: ['reducedMotion', 'highContrast', 'screenReaderMode', 'keyboardShortcuts'] as PreferenceKey[],
  },
  advanced: {
    label: 'Advanced',
    icon: '⚙️',
    keys: ['developerMode', 'testnetMode', 'experimentalFeatures', 'analyticsOptOut'] as PreferenceKey[],
  },
};

export const PREFERENCE_LABELS: Record<PreferenceKey, string> = {
  theme: 'Theme',
  colorScheme: 'Color Scheme',
  fontSize: 'Font Size',
  density: 'UI Density',
  defaultGasSpeed: 'Default Gas Speed',
  autoApproveLimit: 'Auto-Approve Limit',
  showUSDValues: 'Show USD Values',
  preferredCurrency: 'Preferred Currency',
  enablePushNotifications: 'Push Notifications',
  enableEmailNotifications: 'Email Notifications',
  enableSoundEffects: 'Sound Effects',
  notifyOnTransactionConfirm: 'Transaction Confirmations',
  notifyOnPriceAlert: 'Price Alerts',
  notifyOnSocialActivity: 'Social Activity',
  hideBalances: 'Hide Balances',
  hideSmallBalances: 'Hide Small Balances',
  smallBalanceThreshold: 'Small Balance Threshold',
  anonymousMode: 'Anonymous Mode',
  reducedMotion: 'Reduced Motion',
  highContrast: 'High Contrast',
  screenReaderMode: 'Screen Reader Mode',
  keyboardShortcuts: 'Keyboard Shortcuts',
  developerMode: 'Developer Mode',
  testnetMode: 'Testnet Mode',
  experimentalFeatures: 'Experimental Features',
  analyticsOptOut: 'Opt Out of Analytics',
  favoriteTokens: 'Favorite Tokens',
  favoriteAddresses: 'Favorite Addresses',
  recentSearches: 'Recent Searches',
  customRPCs: 'Custom RPC Endpoints',
};

export default usePreferences;
