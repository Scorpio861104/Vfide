"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useAccount, useReconnect } from 'wagmi';
import { safeLocalStorage } from '@/lib/utils';

// Storage keys for session persistence
const SESSION_KEY = 'vfide-session';
const LAST_WALLET_KEY = 'vfide-last-wallet';
const LAST_CHAIN_KEY = 'vfide-last-chain';

interface SessionData {
  address: string;
  connectorId: string;
  chainId: number;
  connectedAt: number;
  lastActive: number;
}

/**
 * Hook to persist wallet connection across page refreshes and browser sessions
 * 
 * Features:
 * - Auto-reconnect on page load
 * - Session tracking with timestamps
 * - Last used wallet/chain memory
 * - Activity heartbeat to keep session fresh
 * - Graceful handling of disconnects
 */
export function useWalletPersistence() {
  const { address, isConnected, connector, chain } = useAccount();
  const { reconnect, connectors } = useReconnect();
  const hasAttemptedReconnect = useRef(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Save session data when connected
  const saveSession = useCallback(() => {
    if (!isConnected || !address || !connector || !chain) return;

    const session: SessionData = {
      address,
      connectorId: connector.id,
      chainId: chain.id,
      connectedAt: Date.now(),
      lastActive: Date.now(),
    };

    safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
    safeLocalStorage.setItem(LAST_WALLET_KEY, connector.id);
    safeLocalStorage.setItem(LAST_CHAIN_KEY, chain.id.toString());
  }, [isConnected, address, connector, chain]);

  // Update last active timestamp (heartbeat)
  const updateActivity = useCallback(() => {
    const sessionStr = safeLocalStorage.getItem(SESSION_KEY);
    if (!sessionStr) return;

    try {
      const session: SessionData = JSON.parse(sessionStr);
      session.lastActive = Date.now();
      safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Invalid session, clear it
      safeLocalStorage.removeItem(SESSION_KEY);
    }
  }, []);

  // Clear session on disconnect
  const clearSession = useCallback(() => {
    safeLocalStorage.removeItem(SESSION_KEY);
    // Keep last wallet/chain for future convenience
  }, []);

  // Get stored session
  const getSession = useCallback((): SessionData | null => {
    const sessionStr = safeLocalStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;

    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }, []);

  // Get last used wallet connector ID
  const getLastWallet = useCallback((): string | null => {
    return safeLocalStorage.getItem(LAST_WALLET_KEY);
  }, []);

  // Get last used chain ID
  const getLastChain = useCallback((): number | null => {
    const chainStr = safeLocalStorage.getItem(LAST_CHAIN_KEY);
    return chainStr ? parseInt(chainStr, 10) : null;
  }, []);

  // Check if session is valid (less than 7 days old)
  const isSessionValid = useCallback((session: SessionData): boolean => {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return now - session.lastActive < SEVEN_DAYS;
  }, []);

  // Auto-reconnect on mount
  useEffect(() => {
    if (hasAttemptedReconnect.current) return;
    if (isConnected) return;

    const session = getSession();
    if (!session || !isSessionValid(session)) {
      hasAttemptedReconnect.current = true;
      return;
    }

    // Find the connector that was last used
    const lastConnector = connectors.find(c => c.id === session.connectorId);
    
    if (lastConnector) {
      hasAttemptedReconnect.current = true;
      // Attempt reconnection
      reconnect({ connectors: [lastConnector] });
    }
  }, [isConnected, getSession, isSessionValid, connectors, reconnect]);

  // Save session when connection state changes
  useEffect(() => {
    if (isConnected && address && connector && chain) {
      saveSession();
    }
  }, [isConnected, address, connector, chain, saveSession]);

  // Clear session on disconnect
  useEffect(() => {
    if (!isConnected && hasAttemptedReconnect.current) {
      // Only clear if we've already attempted reconnect (actual disconnect)
      const session = getSession();
      if (session) {
        clearSession();
      }
    }
  }, [isConnected, getSession, clearSession]);

  // Activity heartbeat - update last active every 5 minutes
  useEffect(() => {
    if (!isConnected) {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      return;
    }

    // Update immediately on connect
    updateActivity();

    // Set up interval
    heartbeatInterval.current = setInterval(updateActivity, 5 * 60 * 1000);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [isConnected, updateActivity]);

  // Update activity on user interactions
  useEffect(() => {
    if (!isConnected) return;

    const handleActivity = () => updateActivity();

    // Track meaningful user activity
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [isConnected, updateActivity]);

  return {
    getSession,
    getLastWallet,
    getLastChain,
    isSessionValid,
    clearSession,
  };
}
