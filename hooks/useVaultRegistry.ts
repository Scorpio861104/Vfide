/**
 * Vault Registry and Recovery Hooks
 * 
 * Provides React hooks for interacting with VaultRegistry and VaultRecoveryClaim contracts
 * Enables wallet-independent vault search and recovery functionality
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toBytes, Address } from 'viem';
import { useState, useCallback } from 'react';

// Contract addresses (will be updated after deployment)
const VAULT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS as Address || '0x0000000000000000000000000000000000000000';
const VAULT_RECOVERY_CLAIM_ADDRESS = process.env.NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS as Address || '0x0000000000000000000000000000000000000000';

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs (minimal required functions)
// ═══════════════════════════════════════════════════════════════════════════════

const VAULT_REGISTRY_ABI = [
  {
    name: 'searchByRecoveryId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'recoveryId', type: 'string' }],
    outputs: [{ name: 'vault', type: 'address' }]
  },
  {
    name: 'searchByEmail',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'emailHash', type: 'bytes32' }],
    outputs: [{ name: 'vault', type: 'address' }]
  },
  {
    name: 'searchByUsername',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'username', type: 'string' }],
    outputs: [{ name: 'vault', type: 'address' }]
  },
  {
    name: 'searchByGuardian',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'guardian', type: 'address' }],
    outputs: [{ name: 'vaults', type: 'address[]' }]
  },
  {
    name: 'setRecoveryId',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'recoveryId', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'setEmailRecovery',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'emailHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'setUsername',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'username', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'getVaultInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'vault', type: 'address' }],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'originalOwner', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'lastActiveAt', type: 'uint256' },
          { name: 'proofScore', type: 'uint256' },
          { name: 'badgeCount', type: 'uint256' },
          { name: 'hasGuardians', type: 'bool' },
          { name: 'hasRecoveryId', type: 'bool' },
          { name: 'isRecoverable', type: 'bool' }
        ]
      }
    ]
  },
  {
    name: 'isRecoveryIdAvailable',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'recoveryId', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'isUsernameAvailable',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'username', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  // New search functions for wallet-less recovery
  {
    name: 'searchByWalletAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'oldWallet', type: 'address' }],
    outputs: [
      { name: 'vault', type: 'address' },
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'originalOwner', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'lastActiveAt', type: 'uint256' },
          { name: 'proofScore', type: 'uint256' },
          { name: 'badgeCount', type: 'uint256' },
          { name: 'hasGuardians', type: 'bool' },
          { name: 'hasRecoveryId', type: 'bool' },
          { name: 'isRecoverable', type: 'bool' }
        ]
      }
    ]
  },
  {
    name: 'searchByVaultAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'vaultAddress', type: 'address' }],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'originalOwner', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'lastActiveAt', type: 'uint256' },
          { name: 'proofScore', type: 'uint256' },
          { name: 'badgeCount', type: 'uint256' },
          { name: 'hasGuardians', type: 'bool' },
          { name: 'hasRecoveryId', type: 'bool' },
          { name: 'isRecoverable', type: 'bool' }
        ]
      }
    ]
  },
  {
    name: 'searchByCreationTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'limit', type: 'uint256' }
    ],
    outputs: [
      {
        name: 'matches',
        type: 'tuple[]',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'originalOwner', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'lastActiveAt', type: 'uint256' },
          { name: 'proofScore', type: 'uint256' },
          { name: 'badgeCount', type: 'uint256' },
          { name: 'hasGuardians', type: 'bool' },
          { name: 'hasRecoveryId', type: 'bool' },
          { name: 'isRecoverable', type: 'bool' }
        ]
      }
    ]
  },
  {
    name: 'getTotalVaults',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getVaultByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [
      { name: 'vault', type: 'address' },
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'originalOwner', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'lastActiveAt', type: 'uint256' },
          { name: 'proofScore', type: 'uint256' },
          { name: 'badgeCount', type: 'uint256' },
          { name: 'hasGuardians', type: 'bool' },
          { name: 'hasRecoveryId', type: 'bool' },
          { name: 'isRecoverable', type: 'bool' }
        ]
      }
    ]
  }
] as const;

const VAULT_RECOVERY_CLAIM_ABI = [
  {
    name: 'initiateClaim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'recoveryId', type: 'string' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'reason', type: 'string' }
    ],
    outputs: [{ name: 'claimId', type: 'uint256' }]
  },
  {
    name: 'guardianVote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'claimId', type: 'uint256' },
      { name: 'approve', type: 'bool' }
    ],
    outputs: []
  },
  {
    name: 'finalizeClaim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'claimId', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'challengeClaim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'claimId', type: 'uint256' },
      { name: 'reason', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'getClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'claimant', type: 'address' },
          { name: 'originalOwner', type: 'address' },
          { name: 'initiatedAt', type: 'uint64' },
          { name: 'challengeEndsAt', type: 'uint64' },
          { name: 'expiresAt', type: 'uint64' },
          { name: 'status', type: 'uint8' },
          { name: 'guardianApprovals', type: 'uint8' },
          { name: 'nodeVotes', type: 'uint8' },
          { name: 'evidenceHash', type: 'bytes32' },
          { name: 'claimReason', type: 'string' }
        ]
      }
    ]
  },
  {
    name: 'getActiveClaimForVault',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'vault', type: 'address' }],
    outputs: [
      { name: 'claimId', type: 'uint256' },
      {
        name: 'claim',
        type: 'tuple',
        components: [
          { name: 'vault', type: 'address' },
          { name: 'claimant', type: 'address' },
          { name: 'originalOwner', type: 'address' },
          { name: 'initiatedAt', type: 'uint64' },
          { name: 'challengeEndsAt', type: 'uint64' },
          { name: 'expiresAt', type: 'uint64' },
          { name: 'status', type: 'uint8' },
          { name: 'guardianApprovals', type: 'uint8' },
          { name: 'nodeVotes', type: 'uint8' },
          { name: 'evidenceHash', type: 'bytes32' },
          { name: 'claimReason', type: 'string' }
        ]
      }
    ]
  },
  {
    name: 'canFinalize',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'uint256' }],
    outputs: [
      { name: '', type: 'bool' },
      { name: 'reason', type: 'string' }
    ]
  },
  {
    name: 'challengeTimeRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VaultInfo {
  vault: Address;
  originalOwner: Address;
  createdAt: bigint;
  lastActiveAt: bigint;
  proofScore: bigint;
  badgeCount: bigint;
  hasGuardians: boolean;
  hasRecoveryId: boolean;
  isRecoverable: boolean;
}

export interface RecoveryClaim {
  vault: Address;
  claimant: Address;
  originalOwner: Address;
  initiatedAt: bigint;
  challengeEndsAt: bigint;
  expiresAt: bigint;
  status: number; // 0=None, 1=Pending, 2=GuardianApproved, 3=Challenged, 4=Approved, 5=Executed, 6=Rejected, 7=Expired
  guardianApprovals: number;
  nodeVotes: number;
  evidenceHash: `0x${string}`;
  claimReason: string;
}

export const ClaimStatus = {
  None: 0,
  Pending: 1,
  GuardianApproved: 2,
  Challenged: 3,
  Approved: 4,
  Executed: 5,
  Rejected: 6,
  Expired: 7
} as const;

export const ClaimStatusLabels: Record<number, string> = {
  0: 'None',
  1: 'Pending',
  2: 'Guardian Approved',
  3: 'Challenged',
  4: 'Approved',
  5: 'Executed',
  6: 'Rejected',
  7: 'Expired'
};

// ═══════════════════════════════════════════════════════════════════════════════
// VAULT SEARCH HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search for a vault by recovery ID
 */
export function useSearchByRecoveryId(recoveryId: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'searchByRecoveryId',
    args: [recoveryId],
    query: {
      enabled: !!recoveryId && recoveryId.length > 0
    }
  });

  return {
    vault: data as Address | undefined,
    isLoading,
    error,
    refetch
  };
}

/**
 * Search for a vault by email (hashed client-side)
 */
export function useSearchByEmail(email: string) {
  const emailHash = email ? keccak256(toBytes(email.toLowerCase())) : undefined;
  
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'searchByEmail',
    args: emailHash ? [emailHash] : undefined,
    query: {
      enabled: !!emailHash
    }
  });

  return {
    vault: data as Address | undefined,
    isLoading,
    error,
    refetch
  };
}

/**
 * Search for a vault by username
 */
export function useSearchByUsername(username: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'searchByUsername',
    args: [username],
    query: {
      enabled: !!username && username.length > 0
    }
  });

  return {
    vault: data as Address | undefined,
    isLoading,
    error,
    refetch
  };
}

/**
 * Search for vaults by guardian address
 */
export function useSearchByGuardian(guardianAddress: Address | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'searchByGuardian',
    args: guardianAddress ? [guardianAddress] : undefined,
    query: {
      enabled: !!guardianAddress
    }
  });

  return {
    vaults: data as Address[] | undefined,
    isLoading,
    error,
    refetch
  };
}

/**
 * Get vault info for search results
 */
export function useVaultInfo(vaultAddress: Address | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'getVaultInfo',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress
    }
  });

  return {
    vaultInfo: data as VaultInfo | undefined,
    isLoading,
    error,
    refetch
  };
}

/**
 * Combined vault search hook with multiple methods
 */
export function useVaultSearch() {
  const [searchType, setSearchType] = useState<'recoveryId' | 'email' | 'username' | 'guardian'>('recoveryId');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Address | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (type: typeof searchType, query: string) => {
    setIsSearching(true);
    setError(null);
    setSearchResult(null);

    try {
      // In production, this would call the appropriate contract read
      // For now, simulate the search
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock: return null for not found, or mock address for demo
      if (query.toLowerCase() === 'demo' || query.length > 5) {
        setSearchResult('0x1234567890abcdef1234567890abcdef12345678' as Address);
      } else {
        setError('No vault found with that identifier');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, []);

  return {
    searchType,
    setSearchType,
    searchQuery,
    setSearchQuery,
    searchResult,
    isSearching,
    error,
    search: () => search(searchType, searchQuery)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET-LESS VAULT DISCOVERY HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search for a vault by old wallet address
 * User may have their old address saved in email confirmations, browser history, etc.
 */
export function useSearchByWalletAddress(oldWallet: Address | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'searchByWalletAddress',
    args: oldWallet ? [oldWallet] : undefined,
    query: {
      enabled: !!oldWallet
    }
  });

  const result = data as [Address, VaultInfo] | undefined;
  
  return {
    vault: result?.[0],
    vaultInfo: result?.[1],
    isLoading,
    error,
    refetch
  };
}

/**
 * Search for a vault by vault address directly
 * User may have their vault address saved from transaction history
 */
export function useSearchByVaultAddress(vaultAddress: Address | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'searchByVaultAddress',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress
    }
  });

  return {
    vaultInfo: data as VaultInfo | undefined,
    isLoading,
    error,
    refetch
  };
}

/**
 * Search vaults by creation time range
 * Helps users who remember approximately when they created their vault
 */
export function useSearchByCreationTime(startTime: bigint | undefined, endTime: bigint | undefined, limit: number = 20) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'searchByCreationTime',
    args: startTime && endTime ? [startTime, endTime, BigInt(limit)] : undefined,
    query: {
      enabled: !!startTime && !!endTime
    }
  });

  return {
    matches: data as VaultInfo[] | undefined,
    isLoading,
    error,
    refetch
  };
}

/**
 * Get total number of vaults in registry
 */
export function useTotalVaults() {
  const { data, isLoading, error } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'getTotalVaults',
  });

  return {
    totalVaults: data ? Number(data) : 0,
    isLoading,
    error
  };
}

/**
 * Get vault by index for pagination/browsing
 */
export function useVaultByIndex(index: number | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'getVaultByIndex',
    args: index !== undefined ? [BigInt(index)] : undefined,
    query: {
      enabled: index !== undefined
    }
  });

  const result = data as [Address, VaultInfo] | undefined;
  
  return {
    vault: result?.[0],
    vaultInfo: result?.[1],
    isLoading,
    error,
    refetch
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOVERY SETUP HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set recovery ID for a vault
 */
export function useSetRecoveryId() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const setRecoveryId = useCallback((vault: Address, recoveryId: string) => {
    writeContract({
      address: VAULT_REGISTRY_ADDRESS,
      abi: VAULT_REGISTRY_ABI,
      functionName: 'setRecoveryId',
      args: [vault, recoveryId]
    });
  }, [writeContract]);

  return {
    setRecoveryId,
    isPending: isPending || isConfirming,
    isSuccess,
    error
  };
}

/**
 * Set email recovery for a vault
 */
export function useSetEmailRecovery() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const setEmailRecovery = useCallback((vault: Address, email: string) => {
    const emailHash = keccak256(toBytes(email.toLowerCase()));
    writeContract({
      address: VAULT_REGISTRY_ADDRESS,
      abi: VAULT_REGISTRY_ABI,
      functionName: 'setEmailRecovery',
      args: [vault, emailHash]
    });
  }, [writeContract]);

  return {
    setEmailRecovery,
    isPending: isPending || isConfirming,
    isSuccess,
    error
  };
}

/**
 * Set username for a vault
 */
export function useSetUsername() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const setUsername = useCallback((vault: Address, username: string) => {
    writeContract({
      address: VAULT_REGISTRY_ADDRESS,
      abi: VAULT_REGISTRY_ABI,
      functionName: 'setUsername',
      args: [vault, username]
    });
  }, [writeContract]);

  return {
    setUsername,
    isPending: isPending || isConfirming,
    isSuccess,
    error
  };
}

/**
 * Check if recovery ID is available
 */
export function useIsRecoveryIdAvailable(recoveryId: string) {
  const { data, isLoading } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'isRecoveryIdAvailable',
    args: [recoveryId],
    query: {
      enabled: !!recoveryId && recoveryId.length > 0
    }
  });

  return {
    isAvailable: data as boolean | undefined,
    isLoading
  };
}

/**
 * Check if username is available
 */
export function useIsUsernameAvailable(username: string) {
  const { data, isLoading } = useReadContract({
    address: VAULT_REGISTRY_ADDRESS,
    abi: VAULT_REGISTRY_ABI,
    functionName: 'isUsernameAvailable',
    args: [username],
    query: {
      enabled: !!username && username.length > 0
    }
  });

  return {
    isAvailable: data as boolean | undefined,
    isLoading
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECOVERY CLAIM HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initiate a recovery claim
 */
export function useInitiateClaim() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const initiateClaim = useCallback((
    vault: Address,
    recoveryId: string,
    reason: string,
    evidenceHash: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) => {
    writeContract({
      address: VAULT_RECOVERY_CLAIM_ADDRESS,
      abi: VAULT_RECOVERY_CLAIM_ABI,
      functionName: 'initiateClaim',
      args: [vault, recoveryId, evidenceHash, reason]
    });
  }, [writeContract]);

  return {
    initiateClaim,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
    txHash: hash
  };
}

/**
 * Get claim details
 */
export function useGetClaim(claimId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_RECOVERY_CLAIM_ADDRESS,
    abi: VAULT_RECOVERY_CLAIM_ABI,
    functionName: 'getClaim',
    args: claimId !== undefined ? [claimId] : undefined,
    query: {
      enabled: claimId !== undefined
    }
  });

  return {
    claim: data as RecoveryClaim | undefined,
    isLoading,
    error,
    refetch
  };
}

/**
 * Get active claim for a vault
 */
export function useActiveClaimForVault(vaultAddress: Address | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: VAULT_RECOVERY_CLAIM_ADDRESS,
    abi: VAULT_RECOVERY_CLAIM_ABI,
    functionName: 'getActiveClaimForVault',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: !!vaultAddress
    }
  });

  const [claimId, claim] = (data as [bigint, RecoveryClaim] | undefined) || [undefined, undefined];

  return {
    claimId,
    claim,
    isLoading,
    error,
    refetch
  };
}

/**
 * Guardian vote on a claim
 */
export function useGuardianVote() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const vote = useCallback((claimId: bigint, approve: boolean) => {
    writeContract({
      address: VAULT_RECOVERY_CLAIM_ADDRESS,
      abi: VAULT_RECOVERY_CLAIM_ABI,
      functionName: 'guardianVote',
      args: [claimId, approve]
    });
  }, [writeContract]);

  return {
    vote,
    isPending: isPending || isConfirming,
    isSuccess,
    error
  };
}

/**
 * Challenge a claim (original owner only)
 */
export function useChallengeClaim() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const challenge = useCallback((claimId: bigint, reason: string) => {
    writeContract({
      address: VAULT_RECOVERY_CLAIM_ADDRESS,
      abi: VAULT_RECOVERY_CLAIM_ABI,
      functionName: 'challengeClaim',
      args: [claimId, reason]
    });
  }, [writeContract]);

  return {
    challenge,
    isPending: isPending || isConfirming,
    isSuccess,
    error
  };
}

/**
 * Finalize a claim after challenge period
 */
export function useFinalizeClaim() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const finalize = useCallback((claimId: bigint) => {
    writeContract({
      address: VAULT_RECOVERY_CLAIM_ADDRESS,
      abi: VAULT_RECOVERY_CLAIM_ABI,
      functionName: 'finalizeClaim',
      args: [claimId]
    });
  }, [writeContract]);

  return {
    finalize,
    isPending: isPending || isConfirming,
    isSuccess,
    error
  };
}

/**
 * Check if claim can be finalized
 */
export function useCanFinalize(claimId: bigint | undefined) {
  const { data, isLoading } = useReadContract({
    address: VAULT_RECOVERY_CLAIM_ADDRESS,
    abi: VAULT_RECOVERY_CLAIM_ABI,
    functionName: 'canFinalize',
    args: claimId !== undefined ? [claimId] : undefined,
    query: {
      enabled: claimId !== undefined
    }
  });

  const [canFinalize, reason] = (data as [boolean, string] | undefined) || [false, ''];

  return {
    canFinalize,
    reason,
    isLoading
  };
}

/**
 * Get challenge time remaining
 */
export function useChallengeTimeRemaining(claimId: bigint | undefined) {
  const { data, isLoading } = useReadContract({
    address: VAULT_RECOVERY_CLAIM_ADDRESS,
    abi: VAULT_RECOVERY_CLAIM_ABI,
    functionName: 'challengeTimeRemaining',
    args: claimId !== undefined ? [claimId] : undefined,
    query: {
      enabled: claimId !== undefined,
      refetchInterval: 60000 // Refetch every minute
    }
  });

  const seconds = data as bigint | undefined;
  const days = seconds ? Number(seconds) / 86400 : 0;
  const hours = seconds ? (Number(seconds) % 86400) / 3600 : 0;
  const minutes = seconds ? (Number(seconds) % 3600) / 60 : 0;

  return {
    seconds,
    days: Math.floor(days),
    hours: Math.floor(hours),
    minutes: Math.floor(minutes),
    isLoading,
    formatted: seconds ? `${Math.floor(days)}d ${Math.floor(hours)}h ${Math.floor(minutes)}m` : ''
  };
}
