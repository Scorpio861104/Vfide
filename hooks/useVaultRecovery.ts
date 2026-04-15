import { useAccount, useWriteContract, useReadContract, useWatchContractEvent, useChainId } from 'wagmi';
import { useMemo, useEffect, useState } from 'react';
import { isAddress } from 'viem';
import { CARD_BOUND_VAULT_ABI, CONTRACT_ADDRESSES, USER_VAULT_ABI, VAULT_HUB_ABI, ZERO_ADDRESS, isCardBoundVaultMode, isConfiguredContractAddress } from '@/lib/contracts';
import { parseContractError, logError } from '@/lib/errorHandling';
import { CURRENT_CHAIN_ID } from '@/lib/testnet';
const CARD_BOUND_ROTATION_DELAY_SECONDS = 7 * 24 * 60 * 60;

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
  const chainId = useChainId();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const cardBoundMode = isCardBoundVaultMode();
  const hasVaultAddress = !!vaultAddress && isAddress(vaultAddress) && vaultAddress !== ZERO_ADDRESS;
  const isVaultHubAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub);
  const recoverySupported = true;
  const inheritanceSupported = !cardBoundMode;

  const assertRecoveryActionSupported = () => {
    if (chainId !== CURRENT_CHAIN_ID) {
      throw new Error('Switch to the configured network before using recovery actions');
    }
  };

  const assertInheritanceSupported = () => {
    if (!inheritanceSupported) {
      throw new Error('Inheritance is not supported in CardBound vault mode');
    }
    if (chainId !== CURRENT_CHAIN_ID) {
      throw new Error('Switch to the configured network before using inheritance actions');
    }
  };

  const assertNonZeroAddress = (value: string, label: string) => {
    if (!isAddress(value) || value.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      throw new Error(`${label} must be a valid non-zero address`);
    }
  };
  
  // State only for time-based updates (countdown timer)
  const [now, setNow] = useState(() => Date.now());

  // Read vault owner/admin
  const { data: legacyVaultOwner } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: !cardBoundMode && hasVaultAddress },
  });

  const { data: cardBoundVaultAdmin } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'admin',
    query: { enabled: cardBoundMode && hasVaultAddress },
  });

  // Read guardian count
  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : USER_VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: hasVaultAddress },
  });

  // Check if user is guardian
  const { data: isUserGuardian } = useReadContract({
    address: vaultAddress,
    abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: hasVaultAddress && !!userAddress },
  });

  // Check if user guardian is mature (7-day waiting period)
  const { data: legacyUserGuardianMature } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !cardBoundMode && hasVaultAddress && !!userAddress && !!isUserGuardian },
  });

  // Read Next of Kin address
  const { data: nextOfKin, refetch: refetchNextOfKin } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'nextOfKin',
    query: { enabled: inheritanceSupported && hasVaultAddress },
  });

  // Read guardians list
  const { data: guardians, refetch: refetchGuardians } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getGuardians',
    query: { enabled: inheritanceSupported && hasVaultAddress },
  });

  // Read recovery status from contract
  const { data: legacyRecoveryData, refetch: refetchLegacyRecoveryStatus } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: !cardBoundMode && hasVaultAddress },
  });

  const { data: cardBoundGuardianThreshold } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianThreshold',
    query: { enabled: cardBoundMode && hasVaultAddress },
  });

  const { data: cardBoundGuardianSetupComplete } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'guardianSetupComplete',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: { enabled: isVaultHubAvailable && cardBoundMode && hasVaultAddress },
  });

  const { data: cardBoundPendingRotation, refetch: refetchCardBoundPendingRotation } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'pendingRotation',
    query: { enabled: cardBoundMode && hasVaultAddress },
  });

  // Read inheritance status from contract
  const { data: inheritanceData, refetch: refetchInheritanceStatus } = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: 'getInheritanceStatus',
    query: { enabled: inheritanceSupported && hasVaultAddress },
  });

  const vaultOwner = cardBoundMode ? cardBoundVaultAdmin : legacyVaultOwner;

  // Derive recovery status from contract data using useMemo (not useState + useEffect)
  const recoveryStatus: RecoveryStatus = useMemo(() => {
    if (cardBoundMode) {
      const data = cardBoundPendingRotation as [string, bigint, bigint, bigint] | undefined;
      if (data) {
        const [candidate, activateAt, approvals, _proposalNonce] = data;
        const activateMs = Number(activateAt) * 1000;
        const daysRemaining = Math.max(0, Math.ceil((activateMs - now) / (24 * 60 * 60 * 1000)));

        return {
          isActive: candidate !== ZERO_ADDRESS,
          proposedOwner: candidate !== ZERO_ADDRESS ? candidate : null,
          approvals: Number(approvals),
          threshold: Number((cardBoundGuardianThreshold as bigint | undefined) ?? 0n),
          expiryTime: activateMs > 0 ? activateMs : null,
          daysRemaining: activateMs > 0 ? daysRemaining : null,
        };
      }
    }

    const data = legacyRecoveryData as [string, bigint, bigint, bigint, boolean] | undefined;

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
  }, [cardBoundMode, cardBoundPendingRotation, cardBoundGuardianThreshold, legacyRecoveryData, now]);

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
    enabled: !cardBoundMode && hasVaultAddress,
    onLogs: () => {
      refetchLegacyRecoveryStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'RecoveryApproved',
    enabled: !cardBoundMode && hasVaultAddress,
    onLogs: () => {
      refetchLegacyRecoveryStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'RecoveryFinalized',
    enabled: !cardBoundMode && !!vaultAddress,
    onLogs: () => {
      refetchLegacyRecoveryStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    eventName: 'WalletRotationProposed',
    enabled: cardBoundMode && !!vaultAddress,
    onLogs: () => {
      refetchCardBoundPendingRotation();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    eventName: 'WalletRotationApproved',
    enabled: cardBoundMode && !!vaultAddress,
    onLogs: () => {
      refetchCardBoundPendingRotation();
    },
  });

  // Watch inheritance events
  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceRequested',
    enabled: inheritanceSupported && !!vaultAddress,
    onLogs: () => {
      refetchInheritanceStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceApproved',
    enabled: inheritanceSupported && !!vaultAddress,
    onLogs: () => {
      refetchInheritanceStatus();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    eventName: 'InheritanceFinalized',
    enabled: inheritanceSupported && !!vaultAddress,
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
    assertInheritanceSupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    assertNonZeroAddress(nextOfKinAddress, 'Next of Kin address');
    
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
    assertRecoveryActionSupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    assertNonZeroAddress(guardianAddress, 'Guardian address');
    if (cardBoundMode && cardBoundGuardianSetupComplete) {
      throw new Error('CardBound guardian changes are timelocked after setup. Use proposeGuardianChange/applyGuardianChange instead.');
    }
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : USER_VAULT_ABI,
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
    assertRecoveryActionSupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    assertNonZeroAddress(candidateAddress, 'Recovery target wallet');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : USER_VAULT_ABI,
        functionName: cardBoundMode ? 'proposeWalletRotation' : 'requestRecovery',
        args: cardBoundMode ? [candidateAddress, BigInt(CARD_BOUND_ROTATION_DELAY_SECONDS)] : [candidateAddress],
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
    assertRecoveryActionSupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : USER_VAULT_ABI,
        functionName: cardBoundMode ? 'approveWalletRotation' : 'guardianApproveRecovery',
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
    assertRecoveryActionSupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: cardBoundMode ? CARD_BOUND_VAULT_ABI : USER_VAULT_ABI,
        functionName: cardBoundMode ? 'finalizeWalletRotation' : 'finalizeRecovery',
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
    assertRecoveryActionSupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    if (cardBoundMode) {
      throw new Error('CardBound wallet rotations cannot be cancelled from the current recovery flow.');
    }
    
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
    assertInheritanceSupported();
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
    assertInheritanceSupported();
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
    assertInheritanceSupported();
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
    assertInheritanceSupported();
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
    assertInheritanceSupported();
    if (!vaultAddress) throw new Error('Vault address not provided');
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: USER_VAULT_ABI,
        functionName: 'denyInheritance',
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
    assertInheritanceSupported();
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
    isUserGuardianMature: cardBoundMode ? !!isUserGuardian : !!legacyUserGuardianMature,
    nextOfKin: inheritanceSupported ? nextOfKin as `0x${string}` | undefined : undefined,
    recoveryStatus,
    inheritanceStatus,
    isWritePending,
    recoverySupported,
    inheritanceSupported,
    
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
    refetchRecoveryState: cardBoundMode ? refetchCardBoundPendingRotation : refetchLegacyRecoveryStatus,
    refetchInheritanceState: refetchInheritanceStatus,
    refetchNextOfKin,
    refetchGuardians,
  };
}
