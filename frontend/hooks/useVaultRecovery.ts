import { useAccount, useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseAbi } from 'viem';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const VAULT_ABI = parseAbi([
  // Read functions
  'function owner() view returns (address)',
  'function guardianCount() view returns (uint8)',
  'function isGuardian(address) view returns (bool)',
  
  // Recovery state reads - UserVaultLite/VaultHubLite
  'function recoveryCandidate() view returns (address)',
  'function recoveryApprovals() view returns (uint8)',
  'function recoveryExpiry() view returns (uint64)',
  'function hasApprovedRecovery(address) view returns (bool)',
  
  // Write functions - VaultHubLite signatures
  'function setGuardian(uint8 slot, address guardian) external',
  'function startRecovery(address candidate) external',
  'function approveRecovery() external',
  'function executeRecovery() external',
  'function cancelRecovery() external',
  
  // Events - VaultHubLite events
  'event GuardianSet(address indexed guardian, uint8 slot, bool active)',
  'event RecoveryStarted(address indexed candidate)',
  'event RecoveryApproved(address indexed guardian)',
  'event RecoveryExecuted(address indexed newOwner)',
]);

interface RecoveryStatus {
  isActive: boolean;
  proposedOwner: string | null;
  approvals: number;
  expiryTime: number | null;
  daysRemaining: number | null;
}

export function useVaultRecovery(vaultAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>({
    isActive: false,
    proposedOwner: null,
    approvals: 0,
    expiryTime: null,
    daysRemaining: null,
  });

  // Read vault owner
  const { data: vaultOwner } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'owner',
    query: { enabled: !!vaultAddress },
  });

  // Read guardian count
  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: !!vaultAddress },
  });

  // Check if user is guardian
  const { data: isUserGuardian } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!vaultAddress && !!userAddress },
  });

  // Read recovery state from contract (persists across page refresh)
  const { data: recoveryCandidate, refetch: refetchCandidate } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'recoveryCandidate',
    query: { enabled: !!vaultAddress },
  });

  const { data: contractRecoveryApprovals, refetch: refetchApprovals } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'recoveryApprovals',
    query: { enabled: !!vaultAddress },
  });

  const { data: recoveryExpiry, refetch: refetchExpiry } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'recoveryExpiry',
    query: { enabled: !!vaultAddress },
  });

  // Initialize recovery status from contract state
  useEffect(() => {
    const candidate = recoveryCandidate as `0x${string}` | undefined;
    const approvals = contractRecoveryApprovals as number | undefined;
    const expiry = recoveryExpiry as bigint | undefined;
    
    const computeStatus = () => {
      if (candidate && candidate !== ZERO_ADDRESS && expiry) {
        const expiryMs = Number(expiry) * 1000;
        const now = Date.now();
        const daysRemaining = Math.max(0, Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000)));
        return {
          isActive: expiryMs > now,
          proposedOwner: candidate,
          approvals: approvals || 0,
          expiryTime: expiryMs,
          daysRemaining,
        } as const;
      }
      return {
        isActive: false,
        proposedOwner: null,
        approvals: 0,
        expiryTime: null,
        daysRemaining: null,
      } as const;
    };

    const status = computeStatus();
    setTimeout(() => setRecoveryStatus(status), 0);
  }, [recoveryCandidate, contractRecoveryApprovals, recoveryExpiry]);

  // Watch recovery events to update status in real-time - VaultHubLite events
  useWatchContractEvent({
    address: vaultAddress,
    abi: VAULT_ABI,
    eventName: 'RecoveryStarted',
    onLogs: (logs) => {
      const latestLog = logs[logs.length - 1];
      if (latestLog && latestLog.args.candidate) {
        // Refetch contract state for accuracy
        refetchCandidate();
        refetchApprovals();
        refetchExpiry();
      }
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: VAULT_ABI,
    eventName: 'RecoveryApproved',
    onLogs: () => {
      // Refetch contract state for accuracy
      refetchApprovals();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: VAULT_ABI,
    eventName: 'RecoveryExecuted',
    onLogs: () => {
      // Refetch all recovery state
      refetchCandidate();
      refetchApprovals();
      refetchExpiry();
    },
  });

  // Calculate days remaining
  useEffect(() => {
    if (recoveryStatus.expiryTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = recoveryStatus.expiryTime! - now;
        const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
        setRecoveryStatus(prev => ({ ...prev, daysRemaining }));
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [recoveryStatus.expiryTime]);

  // Write functions
  // NOTE: setNextOfKin not available in VaultHubLite
  const setNextOfKinAddress = async () => {
    throw new Error('Next of kin feature not available in VaultHubLite');
  };

  // VaultHubLite uses slot-based guardians
  const setGuardian = async (slot: number, guardianAddress: `0x${string}`) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'setGuardian',
      args: [slot, guardianAddress],
    });
  };

  // Legacy wrapper for backwards compatibility - adds to first empty slot
  const addGuardian = async (guardianAddress: `0x${string}`) => {
    // In VaultHubLite, we use slot 0 by default
    return setGuardian(0, guardianAddress);
  };

  const removeGuardian = async (slot: number) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'setGuardian',
      args: [slot, '0x0000000000000000000000000000000000000000'],
    });
  };

  // VaultHubLite uses startRecovery, not requestRecovery
  const startRecovery = async (candidateAddress: `0x${string}`) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'startRecovery',
      args: [candidateAddress],
    });
  };

  // Legacy alias for backwards compatibility
  const requestRecovery = startRecovery;

  const approveRecovery = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'approveRecovery',
    });
  };

  // VaultHubLite uses executeRecovery, not finalizeRecovery
  const executeRecovery = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'executeRecovery',
    });
  };

  // Legacy alias for backwards compatibility
  const finalizeRecovery = executeRecovery;

  const cancelRecovery = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'cancelRecovery',
    });
  };

  return {
    // State
    vaultOwner,
    guardianCount: guardianCount ? Number(guardianCount) : 0,
    isUserGuardian: !!isUserGuardian,
    recoveryStatus,
    isWritePending,
    
    // Actions - VaultHubLite aligned
    setNextOfKinAddress,   // Throws - not available in VaultHubLite
    setGuardian,           // Slot-based guardian management
    addGuardian,           // Legacy wrapper
    removeGuardian,        // Slot-based
    startRecovery,         // VaultHubLite name
    requestRecovery,       // Legacy alias
    approveRecovery,
    executeRecovery,       // VaultHubLite name
    finalizeRecovery,      // Legacy alias
    cancelRecovery,
    
    // Refetch functions
    refetchRecoveryState: () => {
      refetchCandidate();
      refetchApprovals();
      refetchExpiry();
    },
  };
}
