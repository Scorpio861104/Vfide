"use client";

import { useEffect, useCallback, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useToast } from '@/components/ui/toast';
import {
  getPreferredWallet,
  setPreferredWallet,
  getLastConnectionTime,
  setLastConnectionTime,
  incrementConnectionAttempts,
  resetConnectionAttempts,
  getConnectionCooldown,
  setSessionStartTime,
  getSessionDuration,
  formatSessionDuration,
  clearSessionData,
} from '@/lib/walletPreferences';
import { CONNECTION_TIMEOUT_MS, CONNECTION_LIMITS as _CONNECTION_LIMITS, POLLING_INTERVALS as _POLLING_INTERVALS } from '@/lib/walletConstants';

/**
 * Enhanced Wallet Connection Hook
 * 
 * Phase 1 enhancements:
 * - Connection status indicators
 * - Enhanced error messages
 * - Connection state tracking
 * - User-friendly error handling
 * 
 * Phase 2 enhancements:
 * - Preferred wallet management
 * - Connection attempt tracking with cooldown
 * - Last connection timestamp
 * - Session duration tracking
 * - Connection timeout (30s)
 */
export function useEnhancedWalletConnect() {
  const { isConnecting, isReconnecting, isConnected, address, connector } = useAccount();
  const { connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { showToast } = useToast();
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionTimeout, setConnectionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Track connection status and show appropriate messages
  const connectionStatus = isConnecting || isReconnecting || isPending
    ? 'connecting'
    : isConnected
    ? 'connected'
    : 'disconnected';

  // Phase 2: Get preferred wallet
  const preferredWallet = getPreferredWallet();

  // Phase 2: Get last connection info
  const lastConnectionTime = getLastConnectionTime();
  const sessionDuration = isConnected ? getSessionDuration() : 0;

  // Phase 2: Check connection cooldown
  useEffect(() => {
    const cooldown = getConnectionCooldown();
    setCooldownRemaining(cooldown);

    if (cooldown > 0) {
      const timer = setInterval(() => {
        const remaining = getConnectionCooldown();
        setCooldownRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
    return undefined;
  }, [connectionStatus]);

  // Enhanced error messages
  const getErrorMessage = useCallback((error: Error | null): string => {
    if (!error) return 'Connection failed';
    
    const message = error.message.toLowerCase();
    
    // User rejection
    if (message.includes('user rejected') || message.includes('user denied') || message.includes('user cancelled')) {
      return 'Connection cancelled. Please try again when ready.';
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Connection timed out. Please check your wallet and try again.';
    }
    
    // Network errors
    if (message.includes('network') || message.includes('rpc')) {
      return 'Network error. Please check your internet connection.';
    }
    
    // Wallet not found
    if (message.includes('not found') || message.includes('not installed')) {
      return 'Wallet not found. Please install the wallet extension.';
    }
    
    // Chain errors
    if (message.includes('chain') || message.includes('unsupported')) {
      return 'Unsupported network. Please switch to a supported network.';
    }
    
    // Generic error with original message
    return `Connection error: ${error.message}`;
  }, []);

  // Phase 2: Connection timeout handler - optimized to avoid stuck state
  useEffect(() => {
    if (isConnecting || isPending) {
      // Clear any existing timeout first
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      const timeout = setTimeout(() => {
        showToast('Connection taking too long. Please check MetaMask and try again.', 'error', 4000);
        setLastError('Connection timed out');
        // Force disconnect to reset state
        disconnect();
      }, CONNECTION_TIMEOUT_MS);

      setConnectionTimeout(timeout);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    } else {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        setConnectionTimeout(null);
      }
    }
    return undefined;
  }, [isConnecting, isPending, showToast, connectionTimeout]);

  // Show toast notifications for connection events
  useEffect(() => {
    if (isConnected && address && connectionStatus === 'connected') {
      showToast('Wallet connected successfully', 'success', 3000);
      
      // Phase 2: Update connection metadata
      setLastConnectionTime();
      resetConnectionAttempts();
      setSessionStartTime();
      
      // Phase 2: Save preferred wallet
      if (connector?.id) {
        setPreferredWallet(connector.id);
      }
      
      setLastError(null);
    }
  }, [isConnected, address, connectionStatus, showToast, connector]);

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      const errorMsg = getErrorMessage(connectError);
      setLastError(errorMsg);
      
      // Phase 2: Track connection attempts
      incrementConnectionAttempts();
      
      showToast(errorMsg, 'error', 5000);
    }
  }, [connectError, getErrorMessage, showToast]);

  // Phase 2: Clear session data on disconnect
  useEffect(() => {
    if (!isConnected && sessionDuration > 0) {
      clearSessionData();
    }
  }, [isConnected, sessionDuration]);

  // Copy address to clipboard
  const copyAddress = useCallback(async (addressToCopy: string) => {
    try {
      await navigator.clipboard.writeText(addressToCopy);
      showToast('Address copied to clipboard', 'success', 2000);
      return true;
    } catch (err) {
      showToast('Failed to copy address', 'error', 2000);
      return false;
    }
  }, [showToast]);

  // Get user-friendly connection status text
  const getStatusText = useCallback((): string => {
    if (cooldownRemaining > 0) {
      return `Too many attempts. Retry in ${Math.ceil(cooldownRemaining / 1000)}s`;
    }
    if (isConnecting) return 'Connecting to wallet...';
    if (isReconnecting) return 'Reconnecting...';
    if (isPending) return 'Waiting for approval...';
    if (isConnected) return 'Connected';
    return 'Not connected';
  }, [isConnecting, isReconnecting, isPending, isConnected, cooldownRemaining]);

  return {
    connectionStatus,
    statusText: getStatusText(),
    isProcessing: isConnecting || isReconnecting || isPending,
    lastError,
    copyAddress,
    connect,
    disconnect,
    connector,
    // Phase 2: Additional metadata
    preferredWallet,
    lastConnectionTime,
    sessionDuration,
    sessionDurationFormatted: formatSessionDuration(sessionDuration),
    cooldownRemaining,
    isInCooldown: cooldownRemaining > 0,
  };
}
