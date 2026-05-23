import { useAccount, useWriteContract, useReadContract, useWatchContractEvent, useChainId, useSwitchChain } from 'wagmi';
import { useMemo, useEffect, useState } from 'react';
import { isAddress } from 'viem';
import { CARD_BOUND_VAULT_ABI, VAULT_HUB_ABI, ZERO_ADDRESS, isConfiguredContractAddress, getContractAddresses } from '@/lib/contracts'
import { useContractAddresses } from './useContractAddresses';
import { parseContractError, logError } from '@/lib/errorHandling';
import { CURRENT_CHAIN_ID } from '@/lib/testnet';
import { isSupportedChainId, getChainByChainId } from '@/lib/chains';
const CARD_BOUND_ROTATION_DELAY_SECONDS = 7 * 24 * 60 * 60;

interface RecoveryStatus {
  isActive: boolean;
  proposedOwner: string | null;
  approvals: number;
  threshold: number;
  expiryTime: number | null;
  daysRemaining: number | null;
}

interface _InheritanceStatus {
  isActive: boolean;
  approvals: number;
  threshold: number;
  denied: boolean;
  expiryTime: number | null;
  daysRemaining: number | null;
}

export function useVaultRecovery(vaultAddress?: `0x${string}`) {
  const CONTRACT_ADDRESSES = useContractAddresses();
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const hasVaultAddress = !!vaultAddress && isAddress(vaultAddress) && vaultAddress !== ZERO_ADDRESS;
  const isVaultHubAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub);
  const recoverySupported = true;
  const inheritanceSupported = false;

  // Resolve which chain we should be writing to. Recovery actions are vault-bound
  // (they hit the CardBoundVault directly), so the right chain is whichever chain
  // the vault was deployed on. We use the same fallback chain as useVaultHub:
  //   1) If wallet is on a supported chain that has VaultHub configured → use that.
  //   2) Otherwise fall back to NEXT_PUBLIC_DEFAULT_CHAIN_ID.
  // This avoids the previous bug where actions were hard-pinned to CURRENT_CHAIN_ID
  // even though the contracts may be deployed on multiple chains (Base + Polygon).
  const operationalChainId = (() => {
    if (typeof chainId === 'number' && isSupportedChainId(chainId)) {
      const addrs = getContractAddresses(chainId);
      if (isConfiguredContractAddress(addrs.VaultHub)) return chainId;
    }
    return CURRENT_CHAIN_ID;
  })();
  const isOnCorrectChain = chainId === operationalChainId;
  const expectedChainName = getChainByChainId(operationalChainId)?.name || `chain ${operationalChainId}`;

  /**
   * One-click chain switch. Returns true on success, false on failure (e.g.,
   * user rejected). UI components call this from a "Switch network" button
   * before invoking a recovery action.
   */
  const switchToPreferredChain = async (): Promise<boolean> => {
    if (isOnCorrectChain) return true;
    try {
      await switchChainAsync({ chainId: operationalChainId as 84532 | 8453 | 300 | 137 | 324 | 80002 });
      return true;
    } catch (e) {
      logError('switchToPreferredChain', e);
      return false;
    }
  };

  const assertRecoveryActionSupported = () => {
    if (!isOnCorrectChain) {
      throw new Error(`Switch to ${expectedChainName} before using recovery actions`);
    }
    if (!isVaultHubAvailable) {
      throw new Error(`Recovery is not available on this network (VaultHub is not configured for ${expectedChainName})`);
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
  const { data: cardBoundVaultAdmin } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'admin',
    query: { enabled: hasVaultAddress },
  });

  // Read guardian count
  const { data: guardianCount } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: hasVaultAddress },
  });

  // Check if user is guardian
  const { data: isUserGuardian } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: hasVaultAddress && !!userAddress },
  });

  const { data: cardBoundGuardianThreshold } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianThreshold',
    query: { enabled: hasVaultAddress },
  });

  const { data: cardBoundGuardianSetupComplete } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'guardianSetupComplete',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: { enabled: isVaultHubAvailable && hasVaultAddress },
  });

  const { data: cardBoundPendingRotation, refetch: refetchCardBoundPendingRotation } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'pendingRotation',
    query: { enabled: hasVaultAddress },
  });

  const vaultOwner = cardBoundVaultAdmin;

  // Derive recovery status from contract data using useMemo (not useState + useEffect)
  const recoveryStatus: RecoveryStatus = useMemo(() => {
    const data = cardBoundPendingRotation as [string, bigint, bigint, bigint] | undefined;
    if (data) {
      const [candidate, activateAt, approvals] = data;
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
    return {
      isActive: false,
      proposedOwner: null,
      approvals: 0,
      threshold: 0,
      expiryTime: null,
      daysRemaining: null,
    };
  }, [cardBoundPendingRotation, cardBoundGuardianThreshold, now]);

  // Update time every minute for countdown calculations
  useEffect(() => {
    if (!recoveryStatus.expiryTime) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, [recoveryStatus.expiryTime]);

  // Watch recovery events to update status in real-time
  useWatchContractEvent({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    eventName: 'WalletRotationProposed',
    enabled: !!vaultAddress,
    onLogs: () => {
      refetchCardBoundPendingRotation();
    },
  });

  useWatchContractEvent({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    eventName: 'WalletRotationApproved',
    enabled: !!vaultAddress,
    onLogs: () => {
      refetchCardBoundPendingRotation();
    },
  });

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
    if (cardBoundGuardianSetupComplete) {
      throw new Error('CardBound guardian changes are timelocked after setup. Use proposeGuardianChange/applyGuardianChange instead.');
    }
    
    try {
      return await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'setGuardian',
        args: [guardianAddress, active],
        chainId: operationalChainId as 84532 | 8453 | 300 | 137 | 324 | 80002,
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
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'proposeWalletRotation',
        args: [candidateAddress, BigInt(CARD_BOUND_ROTATION_DELAY_SECONDS)],
        chainId: operationalChainId as 84532 | 8453 | 300 | 137 | 324 | 80002,
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
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'approveWalletRotation',
        chainId: operationalChainId as 84532 | 8453 | 300 | 137 | 324 | 80002,
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
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'finalizeWalletRotation',
        chainId: operationalChainId as 84532 | 8453 | 300 | 137 | 324 | 80002,
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
    throw new Error('Vault-only recovery uses timelocked wallet rotation and does not support legacy cancelRecovery.');
  };

  // ========================
  // INHERITANCE FUNCTIONS
  // ========================
  
  return {
    // State
    vaultOwner,
    guardianCount: guardianCount ? Number(guardianCount) : 0,
    guardians: undefined,
    isUserGuardian: !!isUserGuardian,
    isUserGuardianMature: !!isUserGuardian,
    recoveryStatus,
    isWritePending,
    recoverySupported,
    inheritanceSupported,

    // Guardian management
    setGuardian,
    addGuardian,
    removeGuardian,

    // Recovery
    requestRecovery,
    approveRecovery,
    finalizeRecovery,
    cancelRecovery,
    // Refetch functions
    refetchRecoveryState: refetchCardBoundPendingRotation,
    refetchGuardians: () => Promise.resolve(),

    // Chain status — let UI render a "Switch to X" button before invoking
    // recovery actions instead of throwing after the user clicks.
    isOnCorrectChain,
    expectedChainName,
    expectedChainId: operationalChainId,
    switchToPreferredChain,
    isSwitchingChain,
  };
}
