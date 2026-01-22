"use client";

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAppStore } from '@/lib/store/appStore';

/**
 * Zustand Hydration Component
 * 
 * Syncs wallet connection state with Zustand store
 * Handles initial hydration from persisted storage
 */
export function ZustandHydration() {
  const { address, isConnected } = useAccount();
  const setConnection = useAppStore((state) => state.setConnection);

  // Sync wallet connection state with Zustand
  useEffect(() => {
    setConnection(isConnected, address);
  }, [isConnected, address, setConnection]);

  return null; // This component doesn't render anything
}

export default ZustandHydration;
