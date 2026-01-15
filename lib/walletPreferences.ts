/**
 * Wallet Preferences Management
 * 
 * Phase 2: Wallet Management Features
 * - Preferred wallet setting (localStorage)
 * - Connection attempt tracking with cooldown
 * - Last connection timestamp
 * - Session duration tracking
 */

import { safeLocalStorage } from './utils';

// Storage keys
const PREFERRED_WALLET_KEY = 'vfide-preferred-wallet';
const LAST_CONNECTION_KEY = 'vfide-last-connection';
const CONNECTION_ATTEMPTS_KEY = 'vfide-connection-attempts';
const SESSION_START_KEY = 'vfide-session-start';

export interface WalletPreferences {
  preferredWallet?: string;
  lastConnectionTime?: number;
  connectionAttempts: number;
  lastAttemptTime?: number;
  sessionStartTime?: number;
}

/**
 * Get preferred wallet connector ID
 */
export function getPreferredWallet(): string | null {
  return safeLocalStorage.getItem(PREFERRED_WALLET_KEY);
}

/**
 * Set preferred wallet connector ID
 */
export function setPreferredWallet(connectorId: string): void {
  safeLocalStorage.setItem(PREFERRED_WALLET_KEY, connectorId);
}

/**
 * Clear preferred wallet setting
 */
export function clearPreferredWallet(): void {
  safeLocalStorage.removeItem(PREFERRED_WALLET_KEY);
}

/**
 * Get last connection timestamp
 */
export function getLastConnectionTime(): number | null {
  const time = safeLocalStorage.getItem(LAST_CONNECTION_KEY);
  return time ? parseInt(time, 10) : null;
}

/**
 * Set last connection timestamp
 */
export function setLastConnectionTime(timestamp: number = Date.now()): void {
  safeLocalStorage.setItem(LAST_CONNECTION_KEY, timestamp.toString());
}

/**
 * Get connection attempt data
 */
export function getConnectionAttempts(): { count: number; lastAttempt: number | null } {
  const data = safeLocalStorage.getItem(CONNECTION_ATTEMPTS_KEY);
  if (!data) {
    return { count: 0, lastAttempt: null };
  }
  
  try {
    const parsed = JSON.parse(data);
    return {
      count: parsed.count || 0,
      lastAttempt: parsed.lastAttempt || null,
    };
  } catch {
    return { count: 0, lastAttempt: null };
  }
}

/**
 * Increment connection attempt counter
 */
export function incrementConnectionAttempts(): void {
  const current = getConnectionAttempts();
  const data = {
    count: current.count + 1,
    lastAttempt: Date.now(),
  };
  safeLocalStorage.setItem(CONNECTION_ATTEMPTS_KEY, JSON.stringify(data));
}

/**
 * Reset connection attempt counter
 */
export function resetConnectionAttempts(): void {
  safeLocalStorage.removeItem(CONNECTION_ATTEMPTS_KEY);
}

/**
 * Check if connection is in cooldown period
 * Returns cooldown remaining in milliseconds, or 0 if not in cooldown
 */
export function getConnectionCooldown(maxAttempts = 5, cooldownMs = 30000): number {
  const attempts = getConnectionAttempts();
  
  if (attempts.count < maxAttempts) {
    return 0;
  }
  
  if (!attempts.lastAttempt) {
    return 0;
  }
  
  const elapsed = Date.now() - attempts.lastAttempt;
  const remaining = cooldownMs - elapsed;
  
  return remaining > 0 ? remaining : 0;
}

/**
 * Get session start time
 */
export function getSessionStartTime(): number | null {
  const time = safeLocalStorage.getItem(SESSION_START_KEY);
  return time ? parseInt(time, 10) : null;
}

/**
 * Set session start time
 */
export function setSessionStartTime(timestamp: number = Date.now()): void {
  safeLocalStorage.setItem(SESSION_START_KEY, timestamp.toString());
}

/**
 * Get session duration in milliseconds
 */
export function getSessionDuration(): number {
  const startTime = getSessionStartTime();
  if (!startTime) {
    return 0;
  }
  return Date.now() - startTime;
}

/**
 * Format session duration as human-readable string
 */
export function formatSessionDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Clear session data
 */
export function clearSessionData(): void {
  safeLocalStorage.removeItem(SESSION_START_KEY);
}

/**
 * Get all wallet preferences
 */
export function getAllWalletPreferences(): WalletPreferences {
  const attempts = getConnectionAttempts();
  return {
    preferredWallet: getPreferredWallet() || undefined,
    lastConnectionTime: getLastConnectionTime() || undefined,
    connectionAttempts: attempts.count,
    lastAttemptTime: attempts.lastAttempt || undefined,
    sessionStartTime: getSessionStartTime() || undefined,
  };
}

/**
 * Clear all wallet preferences
 */
export function clearAllWalletPreferences(): void {
  clearPreferredWallet();
  resetConnectionAttempts();
  clearSessionData();
  safeLocalStorage.removeItem(LAST_CONNECTION_KEY);
}
