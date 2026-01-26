'use client';

/**
 * Smart Wallet Detection & Capabilities Hook
 * 
 * Detects if the connected wallet is a smart contract wallet (ERC-4337)
 * and exposes its capabilities like gasless transactions, batching, etc.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { type Address } from 'viem';

// ==================== TYPES ====================

export type WalletType = 'eoa' | 'smart-contract' | 'safe' | 'coinbase-smart' | 'unknown';

export interface SmartWalletCapabilities {
  /** Whether this is a smart contract wallet */
  isSmartWallet: boolean;
  /** Specific wallet type */
  walletType: WalletType;
  /** Can batch multiple calls in one transaction */
  supportsBatching: boolean;
  /** Supports gasless/sponsored transactions */
  supportsGasless: boolean;
  /** Supports session keys for pre-approved actions */
  supportsSessionKeys: boolean;
  /** Supports social recovery */
  supportsSocialRecovery: boolean;
  /** Has built-in 2FA/multisig */
  supportsMultisig: boolean;
  /** Native account abstraction (zkSync) */
  supportsNativeAA: boolean;
  /** Whether wallet can execute from a paymaster */
  supportsPaymaster: boolean;
}

export interface UseSmartWalletResult {
  /** Current wallet capabilities */
  capabilities: SmartWalletCapabilities;
  /** Whether detection is still loading */
  isLoading: boolean;
  /** Error during detection */
  error: string | null;
  /** Wallet implementation address (for proxies) */
  implementationAddress: Address | null;
  /** Refresh detection */
  refresh: () => Promise<void>;
}

// ==================== CONSTANTS ====================

// Known smart wallet implementation signatures (reserved for future use)
const _SAFE_PROXY_SIGNATURE = '0x1626ba7e'; // isValidSignature
const _COINBASE_SMART_WALLET_SIGNATURE = '0x52d1902d'; // proxiableUUID

// Known factory addresses for smart wallets (reserved for future use)
const _KNOWN_FACTORIES: Record<string, WalletType> = {
  // Safe (Gnosis) factories
  '0xa6b71e26c5e0845f74c812102ca7114b6a896ab2': 'safe', // Safe v1.3.0
  '0xc22834581ebc8527d974f8a1c97e1bea4ef910bc': 'safe', // Safe v1.4.1
  // Coinbase Smart Wallet
  '0x000000a56aaca3e9a4c479ea6b6cd0dbcb6634f5': 'coinbase-smart',
};

// ==================== DETECTION LOGIC ====================

async function detectWalletType(
  address: Address,
  publicClient: ReturnType<typeof usePublicClient>
): Promise<{ type: WalletType; implementation: Address | null }> {
  if (!publicClient || !address) {
    return { type: 'unknown', implementation: null };
  }

  try {
    // Check if address has code (smart contract)
    const code = await publicClient.getCode({ address });
    
    if (!code || code === '0x') {
      return { type: 'eoa', implementation: null };
    }

    // It's a smart contract wallet - detect which type

    // Check for Safe signature
    try {
      // Try to read the singleton/implementation address
      const singletonSlot = await publicClient.getStorageAt({
        address,
        slot: '0x0', // Safe stores singleton at slot 0
      });
      
      if (singletonSlot && singletonSlot !== '0x' + '0'.repeat(64)) {
        // Likely a Safe proxy
        const implAddress = ('0x' + singletonSlot.slice(-40)) as Address;
        return { type: 'safe', implementation: implAddress };
      }
    } catch {
      // Not a Safe
    }

    // Check for Coinbase Smart Wallet
    try {
      // Try ERC-1967 implementation slot
      const implSlot = await publicClient.getStorageAt({
        address,
        slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
      });
      
      if (implSlot && implSlot !== '0x' + '0'.repeat(64)) {
        const implAddress = ('0x' + implSlot.slice(-40)) as Address;
        
        // Check if it's a known Coinbase implementation
        if (implAddress.toLowerCase().includes('coinbase')) {
          return { type: 'coinbase-smart', implementation: implAddress };
        }
        
        return { type: 'smart-contract', implementation: implAddress };
      }
    } catch {
      // Not an ERC-1967 proxy
    }

    // Generic smart contract wallet
    return { type: 'smart-contract', implementation: null };
  } catch (error) {
    console.error('Wallet type detection failed:', error);
    return { type: 'unknown', implementation: null };
  }
}

function getCapabilitiesForType(
  type: WalletType,
  chainId: number | undefined
): SmartWalletCapabilities {
  const isZkSync = chainId === 324 || chainId === 300; // zkSync mainnet or sepolia

  const baseCapabilities: SmartWalletCapabilities = {
    isSmartWallet: false,
    walletType: type,
    supportsBatching: false,
    supportsGasless: false,
    supportsSessionKeys: false,
    supportsSocialRecovery: false,
    supportsMultisig: false,
    supportsNativeAA: isZkSync, // zkSync has native AA for all accounts
    supportsPaymaster: isZkSync,
  };

  switch (type) {
    case 'eoa':
      return {
        ...baseCapabilities,
        isSmartWallet: false,
      };

    case 'safe':
      return {
        ...baseCapabilities,
        isSmartWallet: true,
        supportsBatching: true,
        supportsGasless: true, // Via relay
        supportsMultisig: true,
        supportsSocialRecovery: true, // Via modules
        supportsPaymaster: true,
      };

    case 'coinbase-smart':
      return {
        ...baseCapabilities,
        isSmartWallet: true,
        supportsBatching: true,
        supportsGasless: true, // Built-in
        supportsSessionKeys: true,
        supportsSocialRecovery: true, // Passkey recovery
        supportsPaymaster: true,
      };

    case 'smart-contract':
      return {
        ...baseCapabilities,
        isSmartWallet: true,
        supportsBatching: true, // Assume ERC-4337 compatible
        supportsPaymaster: true,
      };

    default:
      return baseCapabilities;
  }
}

// ==================== HOOK ====================

export function useSmartWallet(): UseSmartWalletResult {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  
  const [walletType, setWalletType] = useState<WalletType>('unknown');
  const [implementation, setImplementation] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectWallet = useCallback(async () => {
    if (!address || !publicClient) {
      setWalletType('unknown');
      setImplementation(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await detectWalletType(address, publicClient);
      setWalletType(result.type);
      setImplementation(result.implementation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed');
      setWalletType('unknown');
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    detectWallet();
  }, [detectWallet]);

  const capabilities = useMemo(
    () => getCapabilitiesForType(walletType, chainId),
    [walletType, chainId]
  );

  return {
    capabilities,
    isLoading,
    error,
    implementationAddress: implementation,
    refresh: detectWallet,
  };
}

// ==================== UTILITY HOOKS ====================

/**
 * Quick check if connected wallet supports gasless transactions
 */
export function useSupportsGasless(): boolean {
  const { capabilities, isLoading } = useSmartWallet();
  return !isLoading && capabilities.supportsGasless;
}

/**
 * Quick check if connected wallet supports batching
 */
export function useSupportsBatching(): boolean {
  const { capabilities, isLoading } = useSmartWallet();
  return !isLoading && capabilities.supportsBatching;
}

/**
 * Get wallet type label for display
 */
export function useWalletTypeLabel(): string {
  const { capabilities, isLoading } = useSmartWallet();
  
  if (isLoading) return 'Detecting...';
  
  switch (capabilities.walletType) {
    case 'eoa': return 'Standard Wallet';
    case 'safe': return 'Safe (Multisig)';
    case 'coinbase-smart': return 'Coinbase Smart Wallet';
    case 'smart-contract': return 'Smart Contract Wallet';
    default: return 'Unknown';
  }
}

export default useSmartWallet;
