import { useAccount, useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseAbi } from 'viem';

const VAULT_ABI = parseAbi([
  // Read functions
  'function owner() view returns (address)',
  'function guardianCount() view returns (uint8)',
  'function isGuardian(address) view returns (bool)',
  'function isGuardianMature(address) view returns (bool)',
  'function nextOfKin() view returns (address)',
  'function guardianAddTime(address) view returns (uint64)',
  
  // Recovery state (note: _recovery is private, we need to track via events)
  
  // Write functions
  'function setNextOfKin(address kin) external',
  'function setGuardian(address g, bool active) external',
  'function requestRecovery(address proposedOwner) external',
  'function guardianApproveRecovery() external',
  'function finalizeRecovery() external',
  'function cancelRecovery() external',
  
  // Events
  'event NextOfKinSet(address indexed kin)',
  'event GuardianSet(address indexed guardian, bool active)',
  'event RecoveryRequested(address indexed proposedOwner)',
  'event RecoveryApproved(address indexed guardian, address indexed proposedOwner, uint8 approvals)',
  'event RecoveryCancelled(address indexed cancelledBy)',
  'event RecoveryFinalized(address indexed newOwner)',
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

  // Check if guardian is mature
  const { data: isGuardianMature } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!vaultAddress && !!userAddress && !!isUserGuardian },
  });

  // Read Next of Kin
  const { data: nextOfKin } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'nextOfKin',
    query: { enabled: !!vaultAddress },
  });

  // Watch recovery events to track status
  useWatchContractEvent({
    address: vaultAddress,
    abi: VAULT_ABI,
    eventName: 'RecoveryRequested',
    onLogs: (logs) => {
      const latestLog = logs[logs.length - 1];
      if (latestLog && latestLog.args.proposedOwner) {
        setRecoveryStatus({
          isActive: true,
          proposedOwner: latestLog.args.proposedOwner as string,
          approvals: 0,
          expiryTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
          daysRemaining: 30,
        });
      }
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: VAULT_ABI,
    eventName: 'RecoveryApproved',
    onLogs: (logs) => {
      const latestLog = logs[logs.length - 1];
      if (latestLog && latestLog.args.approvals !== undefined) {
        setRecoveryStatus(prev => ({
          ...prev,
          approvals: Number(latestLog.args.approvals),
        }));
      }
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: VAULT_ABI,
    eventName: 'RecoveryFinalized',
    onLogs: () => {
      setRecoveryStatus({
        isActive: false,
        proposedOwner: null,
        approvals: 0,
        expiryTime: null,
        daysRemaining: null,
      });
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: VAULT_ABI,
    eventName: 'RecoveryCancelled',
    onLogs: () => {
      setRecoveryStatus({
        isActive: false,
        proposedOwner: null,
        approvals: 0,
        expiryTime: null,
        daysRemaining: null,
      });
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
  const setNextOfKinAddress = async (kinAddress: `0x${string}`) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'setNextOfKin',
      args: [kinAddress],
    });
  };

  const addGuardian = async (guardianAddress: `0x${string}`) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'setGuardian',
      args: [guardianAddress, true],
    });
  };

  const removeGuardian = async (guardianAddress: `0x${string}`) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'setGuardian',
      args: [guardianAddress, false],
    });
  };

  const requestRecovery = async (newOwnerAddress: `0x${string}`) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'requestRecovery',
      args: [newOwnerAddress],
    });
  };

  const approveRecovery = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'guardianApproveRecovery',
    });
  };

  const finalizeRecovery = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'finalizeRecovery',
    });
  };

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
    isGuardianMature: !!isGuardianMature,
    nextOfKin,
    recoveryStatus,
    isWritePending,
    
    // Actions
    setNextOfKinAddress,
    addGuardian,
    removeGuardian,
    requestRecovery,
    approveRecovery,
    finalizeRecovery,
    cancelRecovery,
  };
}
