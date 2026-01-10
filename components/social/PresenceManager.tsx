/**
 * Presence Manager Component
 * 
 * Global presence tracker that should be mounted once in the app root.
 * Manages current user's presence status and broadcasts updates.
 */

'use client';

import React, { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePresence } from '@/lib/presence';

export function PresenceManager() {
  const { address } = useAccount();
  const { status, isOnline, isAway, isOffline } = usePresence(address);

  // Log status changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Presence]', address, status);
    }
  }, [address, status]);

  // Send offline status when unmounting
  useEffect(() => {
    return () => {
      if (address) {
        // In production, send offline status to backend
        console.log('[Presence] Disconnecting:', address);
      }
    };
  }, [address]);

  // Show connection status indicator (optional, can be removed)
  if (!address) {
    return null;
  }

  return (
    <>
      {/* Global presence status indicator (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 z-50 px-3 py-2 bg-black/80 text-white rounded-lg text-xs font-mono">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isOnline
                  ? 'bg-green-500 animate-pulse'
                  : isAway
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }`}
            />
            <span>Presence: {status}</span>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Hook for initializing presence system
 * Alternative to using PresenceManager component
 */
export function usePresenceInitializer() {
  const { address } = useAccount();
  usePresence(address);
}
