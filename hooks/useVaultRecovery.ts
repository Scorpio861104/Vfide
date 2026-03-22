import { useAccount, useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';
import { useMemo, useEffect, useState } from 'react';
import { USER_VAULT_ABI, isCardBoundVaultMode } from '@/lib/contracts';
import { parseContractError, logError } from '@/lib/errorHandling';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

interface RecoveryStatus {
  isActive: boolean;
  proposedOwner: string | null;
  approvals: number;
  threshold: number;
  expiryTime: number | null;
  daysRemaining: number | null;
}

interface InheritanceStatus {
  isActive: boolean;
  approvals: number;
  threshold: number;
  denied: boolean;
  expiryTime: number | null;
  daysRemaining: number | null;
}

export function useVaultRecovery(vaultAddress?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const recoverySupported = !isCardBoundVaultMode();

  const assertRecoverySupported = () => {
    if (!recoverySupported) {
      throw new Error('Recovery/inheritance is not supported in CardBound vault mode');
    }
  };
  
  // State only for time-based updates (countdown timer)
  const [now, setNow] = useState(() => Date.now());

  // Read vault owner
  const { data: vaultOwner } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: recoverySupported && !!vaultAddress },
  });

  // Read guardian count
  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: recoverySupported && !!vaultAddress },
  });

  // Check if user is guardian
  const { data: isUserGuardian } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!vaultAddress && !!userAddress },
  });

  // Check if user guardian is mature (7-day waiting period)
  const { data: isUserGuardianMature } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!vaultAddress && !!userAddress && !!isUserGuardian },
  });

  // Read Next of Kin address
  const { data: nextOfKin, refetch: refetchNextOfKin } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'nextOfKin',
    query: { enabled: recoverySupported && !!vaultAddress },
  });

  // Read guardians list
  const { data: guardians, refetch: refetchGuardians } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getGuardians',
    query: { enabled: recoverySupported && !!vaultAddress },
  });

  // Read recovery status from contract
  const { data: recoveryData, refetch: refetchRecoveryStatus } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: recoverySupported && !!vaultAddress },
  });

  // Read inheritance status from contract
  const { data: inheritanceData, refetch: refetchInheritanceStatus } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getInheritanceStatus',
    query: { enabled: recoverySupported && !!vaultAddress },
  });

  // Derive recovery status from contract data using useMemo (not useState + useEffect)
  const recoveryStatus: RecoveryStatus = useMemo(() => {
    // getRecoveryStatus returns: [proposedOwner, approvals, threshold, expiryTime, active]
    const data = recoveryData as [string, bigint, bigint, bigint, boolean] | undefined;
    
    if (data) {
      const [candidate, approvals, threshold, expiry, isActive] = data;
      const expiryMs = Number(expiry) * 1000;
      const daysRemaining = Math.max(0, Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000)));
      
      return {
        isActive: isActive && candidate !== ZERO_ADDRESS,
        proposedOwner: candidate !== ZERO_ADDRESS ? candidate : null,
        approvals: Number(approvals),
        threshold: Number(threshold),
        expiryTime: expiryMs > 0 ? expiryMs : null,
        daysRemaining: expiryMs > 0 ? daysRemaining : null,
      };
    }
    return {
      isActive: false,
      proposedOwner: null,
      approvals: 0,
      threshold: 0,
      expiryTime: null,
      daysRemaining: null,
    };
  }, [recoveryData, now]);

  // Derive inheritance status from contract data using useMemo
  const inheritanceStatus: InheritanceStatus = useMemo(() => {
    // getInheritanceStatus returns: [active, approvals, threshold, expiryTime, denied]
    const data = inheritanceData as [boolean, bigint, bigint, bigint, boolean] | undefined;
    
    if (data) {
      const [isActive, approvals, threshold, expiry, denied] = data;
      const expiryMs = Number(expiry) * 1000;
      const daysRemaining = Math.max(0, Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000)));
      
      return {
        isActive,
        approvals: Number(approvals),
        threshold: Number(threshold),
        denied,
        expiryTime: expiryMs > 0 ? expiryMs : null,
        daysRemaining: expiryMs > 0 ? daysRemaining : null,
      };
    }
    return {
      isActive: false,
      approvals: 0,
      threshold: 0,
      denied: false,
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
    enabled: recoverySupported && !!vaultAddress,
    onLogs: () => {
      refetchRecoveryStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'RecoveryApproved',
    enabled: recoverySupported && !!vaultAddress,
    onLogs: () => {
      refetchRecoveryStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'RecoveryFinalized',
    enabled: recoverySupported && !!vaultAddress,
    onLogs: () => {
      refetchRecoveryStatus();
    },
  });

  // Watch inheritance events
  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceRequested',
    enabled: recoverySupported && !!vaultAddress,
    onLogs: () => {
      refetchInheritanceStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceApproved',
    enabled: recoverySupported && !!vaultAddress,
    onLogs: () => {
      refetchInheritanceStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceFinalized',
    enabled: recoverySupported && !!vaultAddress,
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
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'setNextOfKin',
        args: [nextOfKinAddress],
      });
    } catch (error) {
      logError('setNextOfKinAddress', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to set Next of Kin: ${parsed.userMessage}`);
    }
  };

  // ========================
  // GUARDIAN FUNCTIONS
  // ========================
  
  /**
   * Set or remove a guardian
   * Full UserVault uses address-based guardians (not slot-based)
   */
  const setGuardian = async (guardianAddress: `0x${string}`, active: boolean) => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'setGuardian',
        args: [guardianAddress, active],
      });
    } catch (error) {
      logError('setGuardian', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to ${active ? 'add' : 'remove'} guardian: ${parsed.userMessage}`);
    }
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
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'requestRecovery',
        args: [candidateAddress],
      });
    } catch (error) {
      logError('requestRecovery', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to request recovery: ${parsed.userMessage}`);
    }
  };

  /**
   * Approve the current recovery request (by a mature guardian)
   */
  const approveRecovery = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'guardianApproveRecovery',
      });
    } catch (error) {
      logError('approveRecovery', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to approve recovery: ${parsed.userMessage}`);
    }
  };

  /**
   * Finalize the recovery after sufficient approvals
   */
  const finalizeRecovery = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'finalizeRecovery',
      });
    } catch (error) {
      logError('finalizeRecovery', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to finalize recovery: ${parsed.userMessage}`);
    }
  };

  /**
   * Cancel a pending recovery (by owner)
   */
  const cancelRecovery = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'cancelRecovery',
      });
    } catch (error) {
      logError('cancelRecovery', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to cancel recovery: ${parsed.userMessage}`);
    }
  };

  // ========================
  // INHERITANCE FUNCTIONS
  // ========================
  
  /**
   * Request inheritance claim (by Next of Kin)
   */
  const requestInheritance = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'requestInheritance',
      });
    } catch (error) {
      logError('requestInheritance', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to request inheritance: ${parsed.userMessage}`);
    }
  };

  /**
   * Approve inheritance claim (by a guardian)
   */
  const approveInheritance = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'approveInheritance',
      });
    } catch (error) {
      logError('approveInheritance', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to approve inheritance: ${parsed.userMessage}`);
    }
  };

  /**
   * Deny inheritance claim (by owner)
   */
  const denyInheritance = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'denyInheritance',
      });
    } catch (error) {
      logError('denyInheritance', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to deny inheritance: ${parsed.userMessage}`);
    }
  };

  /**
   * Finalize inheritance (after waiting period + approvals)
   */
  const finalizeInheritance = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'finalizeInheritance',
      });
    } catch (error) {
      logError('finalizeInheritance', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to finalize inheritance: ${parsed.userMessage}`);
    }
  };

  /**
   * Cancel inheritance claim (by owner)
   */
  const cancelInheritance = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'cancelInheritance',
      });
    } catch (error) {
      logError('cancelInheritance', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to cancel inheritance: ${parsed.userMessage}`);
    }
  };

  /**
   * Cancel inheritance claim (by a guardian)
   */
  const guardianCancelInheritance = async () => {
    assertRecoverySupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'guardianCancelInheritance',
      });
    } catch (error) {
      logError('guardianCancelInheritance', error);
      const parsed = parseContractError(error);
      throw new Error(`Failed to cancel inheritance as guardian: ${parsed.userMessage}`);
    }
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
    recoverySupported,
    
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
