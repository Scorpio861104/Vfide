/**
 * Connection History Tracking
 * 
 * Phase 3: Track recent wallet connections
 */

import { safeLocalStorage } from './utils';

const HISTORY_KEY = 'vfide-connection-history';
const MAX_HISTORY_ITEMS = 10;

export interface ConnectionHistoryItem {
  address: string;
  connectorId: string;
  connectorName?: string;
  chainId: number;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Get connection history
 */
export function getConnectionHistory(): ConnectionHistoryItem[] {
  const data = safeLocalStorage.getItem(HISTORY_KEY);
  if (!data) {
    return [];
  }
  
  try {
    const history = JSON.parse(data);
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

/**
 * Add connection to history
 */
export function addConnectionToHistory(item: Omit<ConnectionHistoryItem, 'timestamp'>): void {
  const history = getConnectionHistory();
  
  const newItem: ConnectionHistoryItem = {
    ...item,
    timestamp: Date.now(),
  };
  
  // Add to beginning of array
  history.unshift(newItem);
  
  // Keep only last N items
  const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
  
  safeLocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/**
 * Clear connection history
 */
export function clearConnectionHistory(): void {
  safeLocalStorage.removeItem(HISTORY_KEY);
}

/**
 * Get successful connections count
 */
export function getSuccessfulConnectionsCount(): number {
  const history = getConnectionHistory();
  return history.filter(item => item.success).length;
}

/**
 * Get failed connections count
 */
export function getFailedConnectionsCount(): number {
  const history = getConnectionHistory();
  return history.filter(item => !item.success).length;
}

/**
 * Get most used wallet
 */
export function getMostUsedWallet(): string | null {
  const history = getConnectionHistory();
  const successfulConnections = history.filter(item => item.success);
  
  if (successfulConnections.length === 0) {
    return null;
  }
  
  // Count occurrences
  const counts = new Map<string, number>();
  successfulConnections.forEach(item => {
    counts.set(item.connectorId, (counts.get(item.connectorId) || 0) + 1);
  });
  
  // Find max
  let maxCount = 0;
  let mostUsed: string | null = null;
  counts.forEach((count, connectorId) => {
    if (count > maxCount) {
      maxCount = count;
      mostUsed = connectorId;
    }
  });
  
  return mostUsed;
}

/**
 * Format timestamp as relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) {
    return 'Just now';
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
