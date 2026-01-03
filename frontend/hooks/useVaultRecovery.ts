import { useAccount, useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';
import { useMemo, useEffect, useState } from 'react';
import { USER_VAULT_ABI } from '@/lib/contracts';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

interface RecoveryStatus {
  isActive: boolean;
  proposedOwner: string | null;
  approvals: number;
  expiryTime: number | null;
  daysRemaining: number | null;
}

interface InheritanceStatus {
  isActive: boolean;
  claimant: string | null;
  guardianApprovals: number;
  guardianDenials: number;
  expiryTime: number | null;
  daysRemaining: number | null;
}

export function useVaultRecovery(vaultAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  
  // State only for time-based updates (countdown timer)
  const [now, setNow] = useState(() => Date.now());

  // Read vault owner
  const { data: vaultOwner } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: !!vaultAddress },
  });

  // Read guardian count
  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: !!vaultAddress },
  });

  // Check if user is guardian
  const { data: isUserGuardian } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!vaultAddress && !!userAddress },
  });

  // Check if user guardian is mature (7-day waiting period)
  const { data: isUserGuardianMature } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!vaultAddress && !!userAddress && !!isUserGuardian },
  });

  // Read Next of Kin address
  const { data: nextOfKin, refetch: refetchNextOfKin } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'nextOfKin',
    query: { enabled: !!vaultAddress },
  });

  // Read guardians list
  const { data: guardians, refetch: refetchGuardians } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getGuardians',
    query: { enabled: !!vaultAddress },
  });

  // Read recovery status from contract
  const { data: recoveryData, refetch: refetchRecoveryStatus } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: !!vaultAddress },
  });

  // Read inheritance status from contract
  const { data: inheritanceData, refetch: refetchInheritanceStatus } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getInheritanceStatus',
    query: { enabled: !!vaultAddress },
  });

  // Derive recovery status from contract data using useMemo (not useState + useEffect)
  const recoveryStatus: RecoveryStatus = useMemo(() => {
    // recoveryData returns: [candidate, approvals, expiry, isActive]
    const data = recoveryData as [string, number, bigint, boolean] | undefined;
    
    if (data) {
      const [candidate, approvals, expiry, isActive] = data;
      const expiryMs = Number(expiry) * 1000;
      const daysRemaining = Math.max(0, Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000)));
      
      return {
        isActive: isActive && candidate !== ZERO_ADDRESS,
        proposedOwner: candidate !== ZERO_ADDRESS ? candidate : null,
        approvals: approvals || 0,
        expiryTime: expiryMs > 0 ? expiryMs : null,
        daysRemaining: expiryMs > 0 ? daysRemaining : null,
      };
    }
    return {
      isActive: false,
      proposedOwner: null,
      approvals: 0,
      expiryTime: null,
      daysRemaining: null,
    };
  }, [recoveryData, now]);

  // Derive inheritance status from contract data using useMemo
  const inheritanceStatus: InheritanceStatus = useMemo(() => {
    // inheritanceData returns: [claimant, guardianApprovals, guardianDenials, expiry, isActive]
    const data = inheritanceData as [string, number, number, bigint, boolean] | undefined;
    
    if (data) {
      const [claimant, guardianApprovals, guardianDenials, expiry, isActive] = data;
      const expiryMs = Number(expiry) * 1000;
      const daysRemaining = Math.max(0, Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000)));
      
      return {
        isActive: isActive && claimant !== ZERO_ADDRESS,
        claimant: claimant !== ZERO_ADDRESS ? claimant : null,
        guardianApprovals: guardianApprovals || 0,
        guardianDenials: guardianDenials || 0,
        expiryTime: expiryMs > 0 ? expiryMs : null,
        daysRemaining: expiryMs > 0 ? daysRemaining : null,
      };
    }
    return {
      isActive: false,
      claimant: null,
      guardianApprovals: 0,
      guardianDenials: 0,
      expiryTime: null,
      daysRemaining: null,
    };
  }, [inheritanceData, now]);

  // Update time every minute for countdown calculations
  useEffect(() => {
    const hasActiveStatus = recoveryStatus.expiryTime || inheritanceStatus.expiryTime;
    if (!hasActiveStatus) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, [recoveryStatus.expiryTime, inheritanceStatus.expiryTime]);

  // Watch recovery events to update status in real-time
  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'RecoveryRequested',
    onLogs: () => {
      refetchRecoveryStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'RecoveryApproved',
    onLogs: () => {
      refetchRecoveryStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'RecoveryFinalized',
    onLogs: () => {
      refetchRecoveryStatus();
    },
  });

  // Watch inheritance events
  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceRequested',
    onLogs: () => {
      refetchInheritanceStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceApproved',
    onLogs: () => {
      refetchInheritanceStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceFinalized',
    onLogs: () => {
      refetchInheritanceStatus();
    },
  });

  // ========================
  // NEXT OF KIN FUNCTIONS
  // ========================
  
  /**
   * Set the Next of Kin address for inheritance
   * The Next of Kin can claim the vault assets after a 1-year waiting period
   */
  const setNextOfKinAddress = async (nextOfKinAddress: `0x${string}`) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'setNextOfKin',
      args: [nextOfKinAddress],
    });
  };

  // ========================
  // GUARDIAN FUNCTIONS
  // ========================
  
  /**
   * Set or remove a guardian
   * Full UserVault uses address-based guardians (not slot-based)
   */
  const setGuardian = async (guardianAddress: `0x${string}`, active: boolean) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'setGuardian',
      args: [guardianAddress, active],
    });
  };

  /**
   * Add a guardian (convenience wrapper)
   */
  const addGuardian = async (guardianAddress: `0x${string}`) => {
    return setGuardian(guardianAddress, true);
  };

  /**
   * Remove a guardian (convenience wrapper)
   */
  const removeGuardian = async (guardianAddress: `0x${string}`) => {
    return setGuardian(guardianAddress, false);
  };

  // ========================
  // RECOVERY FUNCTIONS
  // ========================
  
  /**
   * Request account recovery (by a guardian)
   * The candidate becomes the proposed new owner
   */
  const requestRecovery = async (candidateAddress: `0x${string}`) => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'requestRecovery',
      args: [candidateAddress],
    });
  };

  /**
   * Approve the current recovery request (by a mature guardian)
   */
  const approveRecovery = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'approveRecovery',
    });
  };

  /**
   * Finalize the recovery after sufficient approvals
   */
  const finalizeRecovery = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'finalizeRecovery',
    });
  };

  /**
   * Cancel a pending recovery (by owner)
   */
  const cancelRecovery = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'cancelRecovery',
    });
  };

  // ========================
  // INHERITANCE FUNCTIONS
  // ========================
  
  /**
   * Request inheritance claim (by Next of Kin)
   */
  const requestInheritance = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'requestInheritance',
    });
  };

  /**
   * Approve inheritance claim (by a guardian)
   */
  const approveInheritance = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'approveInheritance',
    });
  };

  /**
   * Deny inheritance claim (by a guardian)
   */
  const denyInheritance = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'denyInheritance',
    });
  };

  /**
   * Finalize inheritance (after waiting period + approvals)
   */
  const finalizeInheritance = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'finalizeInheritance',
    });
  };

  /**
   * Cancel inheritance claim (by owner)
   */
  const cancelInheritance = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'cancelInheritance',
    });
  };

  /**
   * Cancel inheritance claim (by a guardian)
   */
  const guardianCancelInheritance = async () => {
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    return await writeContractAsync({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: 'guardianCancelInheritance',
    });
  };

  return {
    // State
    vaultOwner,
    guardianCount: guardianCount ? Number(guardianCount) : 0,
    guardians: guardians as `0x${string}`[] | undefined,
    isUserGuardian: !!isUserGuardian,
    isUserGuardianMature: !!isUserGuardianMature,
    nextOfKin: nextOfKin as `0x${string}` | undefined,
    recoveryStatus,
    inheritanceStatus,
    isWritePending,
    
    // Next of Kin
    setNextOfKinAddress,
    
    // Guardian management
    setGuardian,
    addGuardian,
    removeGuardian,
    
    // Recovery
    requestRecovery,
    approveRecovery,
    finalizeRecovery,
    cancelRecovery,
    
    // Inheritance
    requestInheritance,
    approveInheritance,
    denyInheritance,
    finalizeInheritance,
    cancelInheritance,
    guardianCancelInheritance,
    
    // Refetch functions
    refetchRecoveryState: refetchRecoveryStatus,
    refetchInheritanceState: refetchInheritanceStatus,
    refetchNextOfKin,
    refetchGuardians,
  };
}
