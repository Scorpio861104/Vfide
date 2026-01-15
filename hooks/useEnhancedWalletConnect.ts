"use client";

import { useEffect, useCallback, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useToast } from '@/components/ui/toast';

/**
 * Enhanced Wallet Connection Hook
 * 
 * Adds Phase 1 enhancements:
 * - Connection status indicators
 * - Enhanced error messages
 * - Connection state tracking
 * - User-friendly error handling
 */
export function useEnhancedWalletConnect() {
  const { isConnecting, isReconnecting, isConnected, address, connector } = useAccount();
  const { connect, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { showToast } = useToast();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Track connection status and show appropriate messages
  const connectionStatus = isConnecting || isReconnecting || isPending
    ? 'connecting'
    : isConnected
    ? 'connected'
    : 'disconnected';

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

  // Show toast notifications for connection events
  useEffect(() => {
    if (isConnected && address && connectionStatus === 'connected') {
      showToast('Wallet connected successfully', 'success', 3000);
      setConnectionAttempts(0);
      setLastError(null);
    }
  }, [isConnected, address, connectionStatus, showToast]);

  // Handle connection errors
  useEffect(() => {
    if (connectError) {
      const errorMsg = getErrorMessage(connectError);
      setLastError(errorMsg);
      setConnectionAttempts(prev => prev + 1);
      showToast(errorMsg, 'error', 5000);
    }
  }, [connectError, getErrorMessage, showToast]);

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
    if (isConnecting) return 'Connecting to wallet...';
    if (isReconnecting) return 'Reconnecting...';
    if (isPending) return 'Waiting for approval...';
    if (isConnected) return 'Connected';
    return 'Not connected';
  }, [isConnecting, isReconnecting, isPending, isConnected]);

  return {
    connectionStatus,
    statusText: getStatusText(),
    isProcessing: isConnecting || isReconnecting || isPending,
    connectionAttempts,
    lastError,
    copyAddress,
    connect,
    disconnect,
    connector,
  };
}
