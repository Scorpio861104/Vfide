"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAccount, useReconnect, useDisconnect } from 'wagmi';
import { safeLocalStorage } from '@/lib/utils';
import { linkWallet } from '@/lib/biometricAuth';

// Storage keys for session persistence
const SESSION_KEY = 'vfide-session';
const LAST_WALLET_KEY = 'vfide-last-wallet';
const LAST_CHAIN_KEY = 'vfide-last-chain';
const STAY_CONNECTED_KEY = 'vfide-stay-connected';
const AUTO_DISCONNECT_KEY = 'vfide-auto-disconnect';
const AUTO_DISCONNECT_TIME_KEY = 'vfide-auto-disconnect-time';

// Default auto-disconnect timeout in minutes
const DEFAULT_AUTO_DISCONNECT_MINUTES = 30;

// Reconnection timeout in milliseconds
const RECONNECTION_TIMEOUT_MS = 10000; // 10 seconds

// Activity tracking debounce in milliseconds
const ACTIVITY_DEBOUNCE_MS = 30000; // 30 seconds

interface SessionData {
  address: string;
  connectorId: string;
  chainId: number;
  connectedAt: number;
  lastActive: number;
  permanent: boolean; // If true, session never expires
}

/**
 * Hook to persist wallet connection across page refreshes and browser sessions
 * 
 * Features:
 * - Auto-reconnect on page load with visual feedback
 * - Permanent connection option (never expires)
 * - Session tracking with timestamps
 * - Last used wallet/chain memory
 * - Biometric authentication support
 * - Multi-wallet linking
 * - Graceful handling of disconnects
 * - Debounced activity tracking for performance
 * - Auto-disconnect countdown with visual warning
 */
export function useWalletPersistence() {
  const { address, isConnected, connector, chain } = useAccount();
  const { reconnect, connectors } = useReconnect();
  const { disconnect } = useDisconnect();
  const hasAttemptedReconnect = useRef(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTime = useRef<number>(Date.now());
  
  // State for reconnection feedback
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  
  // State for inactivity warning
  const [minutesUntilDisconnect, setMinutesUntilDisconnect] = useState<number | null>(null);

  // Save session data when connected
  const saveSession = useCallback((permanent: boolean = false) => {
    if (!isConnected || !address || !connector || !chain) return;

    // Check if "Stay Connected" is enabled
    const stayConnected = safeLocalStorage.getItem(STAY_CONNECTED_KEY) === 'true' || permanent;

    const session: SessionData = {
      address,
      connectorId: connector.id,
      chainId: chain.id,
      connectedAt: Date.now(),
      lastActive: Date.now(),
      permanent: stayConnected,
    };

    safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
    safeLocalStorage.setItem(LAST_WALLET_KEY, connector.id);
    safeLocalStorage.setItem(LAST_CHAIN_KEY, chain.id.toString());
    
    // Also link this wallet for multi-wallet support
    linkWallet(address);
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

  // Check if session is valid (permanent sessions never expire, otherwise 30 days)
  const isSessionValid = useCallback((session: SessionData): boolean => {
    // Permanent sessions never expire
    if (session.permanent) return true;
    
    // Regular sessions expire after 30 days of inactivity
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return now - session.lastActive < THIRTY_DAYS;
  }, []);

  // Enable/disable permanent connection (Stay Connected)
  const setStayConnected = useCallback((enabled: boolean) => {
    safeLocalStorage.setItem(STAY_CONNECTED_KEY, enabled ? 'true' : 'false');
    
    // Update current session if connected
    const session = getSession();
    if (session) {
      session.permanent = enabled;
      safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, []);

  // Check if Stay Connected is enabled
  const isStayConnectedEnabled = useCallback((): boolean => {
    return safeLocalStorage.getItem(STAY_CONNECTED_KEY) === 'true';
  }, []);

  // Enable/disable auto-disconnect on inactivity
  const setAutoDisconnect = useCallback((enabled: boolean, minutes?: number) => {
    safeLocalStorage.setItem(AUTO_DISCONNECT_KEY, enabled ? 'true' : 'false');
    if (minutes !== undefined) {
      safeLocalStorage.setItem(AUTO_DISCONNECT_TIME_KEY, minutes.toString());
    }
  }, []);

  // Check if auto-disconnect is enabled
  const isAutoDisconnectEnabled = useCallback((): boolean => {
    return safeLocalStorage.getItem(AUTO_DISCONNECT_KEY) === 'true';
  }, []);

  // Get auto-disconnect timeout in minutes
  const getAutoDisconnectMinutes = useCallback((): number => {
    const time = safeLocalStorage.getItem(AUTO_DISCONNECT_TIME_KEY);
    return time ? parseInt(time, 10) : DEFAULT_AUTO_DISCONNECT_MINUTES;
  }, []);

  // Auto-reconnect on mount with feedback
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
      setIsReconnecting(true);
      setReconnectError(null);
      
      // Attempt reconnection with timeout
      const timeoutId = setTimeout(() => {
        setIsReconnecting(false);
        setReconnectError('Reconnection timed out');
      }, RECONNECTION_TIMEOUT_MS);
      
      reconnect({ connectors: [lastConnector] })
        .then(() => {
          clearTimeout(timeoutId);
          setIsReconnecting(false);
          setReconnectError(null);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          setIsReconnecting(false);
          setReconnectError(error.message || 'Failed to reconnect');
        });
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

  // Update activity on user interactions (debounced for performance)
  useEffect(() => {
    if (!isConnected) return;

    let debounceTimeout: NodeJS.Timeout | null = null;

    const handleActivity = () => {
      lastActivityTime.current = Date.now();
      
      // Debounce storage updates to once every 30 seconds
      if (debounceTimeout) return;
      
      debounceTimeout = setTimeout(() => {
        updateActivity();
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
          debounceTimeout = null;
        }
      }, ACTIVITY_DEBOUNCE_MS);
    };

    // Track meaningful user activity
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [isConnected, updateActivity]);

  // Auto-disconnect on inactivity with warning countdown
  useEffect(() => {
    if (!isConnected) {
      if (inactivityTimer.current) {
        clearInterval(inactivityTimer.current);
        inactivityTimer.current = null;
      }
      setMinutesUntilDisconnect(null);
      return;
    }

    // Check if auto-disconnect is enabled
    if (!isAutoDisconnectEnabled()) {
      setMinutesUntilDisconnect(null);
      return;
    }

    // Check inactivity every minute and update countdown
    inactivityTimer.current = setInterval(() => {
      const timeoutMinutes = getAutoDisconnectMinutes();
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime.current;
      const remainingMs = timeoutMs - timeSinceActivity;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

      // Show warning when less than 5 minutes remain
      if (remainingMinutes <= 5 && remainingMinutes > 0) {
        setMinutesUntilDisconnect(remainingMinutes);
      } else {
        setMinutesUntilDisconnect(null);
      }

      if (timeSinceActivity >= timeoutMs) {
        // Auto-disconnect due to inactivity
        console.log(`Auto-disconnecting after ${timeoutMinutes} minutes of inactivity`);
        disconnect();
        clearSession();
        setMinutesUntilDisconnect(null);
      }
    }, 60 * 1000); // Check every minute

    return () => {
      if (inactivityTimer.current) {
        clearInterval(inactivityTimer.current);
      }
    };
  }, [isConnected, isAutoDisconnectEnabled, getAutoDisconnectMinutes, disconnect, clearSession]);

  return {
    getSession,
    getLastWallet,
    getLastChain,
    isSessionValid,
    clearSession,
    setStayConnected,
    isStayConnectedEnabled,
    setAutoDisconnect,
    isAutoDisconnectEnabled,
    getAutoDisconnectMinutes,
    // New feedback states
    isReconnecting,
    reconnectError,
    minutesUntilDisconnect,
  };
}
