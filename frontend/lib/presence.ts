/**
 * User Presence System
 * 
 * Manages online/offline status and last seen timestamps for users.
 * Integrates with WebSocket for real-time presence updates.
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './websocket';

export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

export interface UserPresence {
  address: string;
  status: PresenceStatus;
  lastSeen: number; // Unix timestamp
  lastActivity: number; // Unix timestamp
}

export interface PresenceUpdate {
  address: string;
  status: PresenceStatus;
  timestamp: number;
}

// In-memory presence cache (will sync with backend in production)
const presenceCache = new Map<string, UserPresence>();

// Constants
const AWAY_THRESHOLD = 5 * 60 * 1000; // 5 minutes of inactivity = away
const OFFLINE_THRESHOLD = 15 * 60 * 1000; // 15 minutes = offline
const PRESENCE_BROADCAST_INTERVAL = 30 * 1000; // Broadcast every 30 seconds
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

/**
 * Get user's presence status from cache
 */
export function getPresence(address: string): UserPresence | null {
  return presenceCache.get(address) || null;
}

/**
 * Update user's presence in cache
 */
export function updatePresence(address: string, update: Partial<UserPresence>): void {
  const existing = presenceCache.get(address) || {
    address,
    status: 'offline' as PresenceStatus,
    lastSeen: Date.now(),
    lastActivity: Date.now(),
  };

  presenceCache.set(address, {
    ...existing,
    ...update,
  });
}

/**
 * Get multiple users' presence status
 */
export function getBulkPresence(addresses: string[]): Map<string, UserPresence> {
  const result = new Map<string, UserPresence>();
  
  addresses.forEach(address => {
    const presence = getPresence(address);
    if (presence) {
      result.set(address, presence);
    }
  });
  
  return result;
}

/**
 * Calculate status based on last activity time
 */
export function calculateStatus(lastActivity: number): PresenceStatus {
  const now = Date.now();
  const timeSinceActivity = now - lastActivity;
  
  if (timeSinceActivity < AWAY_THRESHOLD) {
    return 'online';
  } else if (timeSinceActivity < OFFLINE_THRESHOLD) {
    return 'away';
  } else {
    return 'offline';
  }
}

/**
 * Format last seen timestamp for display
 */
export function formatLastSeen(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60 * 1000) {
    return 'Just now';
  } else if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
}

/**
 * Hook for managing user presence
 */
export function usePresence(userAddress?: string) {
  const { isConnected, send, subscribe } = useWebSocket();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [status, setStatus] = useState<PresenceStatus>('online');

  // Track user activity
  useEffect(() => {
    if (!userAddress) return;

    const handleActivity = () => {
      setLastActivity(Date.now());
      setStatus('online');
      
      // Update local cache
      updatePresence(userAddress, {
        status: 'online',
        lastActivity: Date.now(),
        lastSeen: Date.now(),
      });
    };

    // Listen to activity events
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [userAddress]);

  // Auto-update status based on inactivity
  useEffect(() => {
    if (!userAddress) return;

    const interval = setInterval(() => {
      const newStatus = calculateStatus(lastActivity);
      if (newStatus !== status) {
        setStatus(newStatus);
        updatePresence(userAddress, { status: newStatus });
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [userAddress, lastActivity, status]);

  // Broadcast presence via WebSocket
  useEffect(() => {
    if (!userAddress || !isConnected) return;

    // Send initial presence
    send('presence', {
      address: userAddress,
      status,
      timestamp: Date.now(),
    });

    // Broadcast periodically
    const interval = setInterval(() => {
      send('presence', {
        address: userAddress,
        status,
        timestamp: Date.now(),
      });
    }, PRESENCE_BROADCAST_INTERVAL);

    return () => clearInterval(interval);
  }, [userAddress, isConnected, status, send]);

  // Listen for presence updates from other users
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('presence', (data: PresenceUpdate) => {
      updatePresence(data.address, {
        status: data.status,
        lastSeen: data.timestamp,
        lastActivity: data.timestamp,
      });
    });

    return unsubscribe;
  }, [isConnected, subscribe]);

  // Handle tab visibility (mark as away when hidden)
  useEffect(() => {
    if (!userAddress) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStatus('away');
        updatePresence(userAddress, { status: 'away' });
        send('presence', {
          address: userAddress,
          status: 'away',
          timestamp: Date.now(),
        });
      } else {
        setStatus('online');
        setLastActivity(Date.now());
        updatePresence(userAddress, {
          status: 'online',
          lastActivity: Date.now(),
        });
        send('presence', {
          address: userAddress,
          status: 'online',
          timestamp: Date.now(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userAddress, send]);

  return {
    status,
    lastActivity,
    isOnline: status === 'online',
    isAway: status === 'away',
    isOffline: status === 'offline',
  };
}

/**
 * Hook for tracking another user's presence
 */
export function useUserPresence(address: string) {
  const { isConnected, subscribe } = useWebSocket();
  const [presence, setPresence] = useState<UserPresence | null>(() => getPresence(address));

  useEffect(() => {
    // Get initial presence
    const initial = getPresence(address);
    if (initial) {
      setPresence(initial);
    }

    if (!isConnected) return;

    // Subscribe to updates for this user
    const unsubscribe = subscribe('presence', (data: PresenceUpdate) => {
      if (data.address === address) {
        const updated = getPresence(address);
        setPresence(updated);
      }
    });

    return unsubscribe;
  }, [address, isConnected, subscribe]);

  return presence;
}

/**
 * Hook for tracking multiple users' presence
 */
export function useBulkPresence(addresses: string[]) {
  const { isConnected, subscribe } = useWebSocket();
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(() => 
    getBulkPresence(addresses)
  );

  useEffect(() => {
    // Get initial presence
    setPresenceMap(getBulkPresence(addresses));

    if (!isConnected) return;

    // Subscribe to updates
    const unsubscribe = subscribe('presence', (data: PresenceUpdate) => {
      if (addresses.includes(data.address)) {
        setPresenceMap(getBulkPresence(addresses));
      }
    });

    return unsubscribe;
  }, [addresses.join(','), isConnected, subscribe]);

  return presenceMap;
}
