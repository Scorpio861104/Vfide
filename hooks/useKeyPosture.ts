'use client';

/**
 * useKeyPosture — surfaces the vault's key-separation posture from on-chain state.
 *
 * Reads the CardBoundVault's `admin` (settings authority), `activeWallet` (everyday spending key) and
 * `recoveryAdminUnseparated` flag, and derives whether the two authorities are separated. Also exposes the
 * re-separation actions the contract already supports — `transferAdmin` (general separation) and
 * `splitAdminFromActive` (post-recovery re-separation, which the contract nudges via the weekly
 * RecoverySplitReminder event). This makes the previously contract-only posture visible and actionable in the UI.
 *
 * Honesty (Veritas Law): the hook reports the ACTUAL on-chain configuration. It never claims a posture the chain
 * does not show, and returns 'unknown' while loading or when the connected account has no vault.
 */

import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useMemo } from 'react';
import { isAddress } from 'viem';
import { CARD_BOUND_VAULT_ABI, ZERO_ADDRESS } from '@/lib/contracts';
import { parseContractError } from '@/lib/errorHandling';
import { useUserVault } from './useVaultHooks';

export type KeyPosture = 'separated' | 'unseparated' | 'actionNeeded' | 'unknown';

export function useKeyPosture() {
  const { address } = useAccount();
  const { vaultAddress, hasVault, isLoading: vaultLoading } = useUserVault();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const enabled = !!vaultAddress && !!hasVault;

  const { data: admin, refetch: refetchAdmin, isLoading: adminLoading } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'admin',
    query: { enabled },
  });

  const { data: activeWallet, refetch: refetchActive, isLoading: activeLoading } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'activeWallet',
    query: { enabled },
  });

  const { data: recoveryUnseparated, refetch: refetchFlag, isLoading: flagLoading } = useReadContract({
    address: vaultAddress ?? undefined,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'recoveryAdminUnseparated',
    query: { enabled },
  });

  const adminStr = typeof admin === 'string' ? admin : null;
  const activeStr = typeof activeWallet === 'string' ? activeWallet : null;
  const flag = recoveryUnseparated === true;

  const isLoading = vaultLoading || adminLoading || activeLoading || flagLoading;

  const posture: KeyPosture = useMemo(() => {
    if (!hasVault) return 'unknown';
    if (isLoading || !adminStr || !activeStr) return 'unknown';
    if (flag) return 'actionNeeded'; // post-recovery: admin == activeWallet; re-separate via splitAdminFromActive
    if (adminStr.toLowerCase() === activeStr.toLowerCase()) return 'unseparated'; // default: one key holds both
    return 'separated';
  }, [hasVault, isLoading, adminStr, activeStr, flag]);

  const refetch = () => {
    void refetchAdmin();
    void refetchActive();
    void refetchFlag();
  };

  const validateNewAdmin = (newAdmin: string) => {
    if (!vaultAddress) throw new Error('No vault found for the connected account');
    if (!isAddress(newAdmin) || newAdmin.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      throw new Error('Enter a valid, non-zero address for the settings key');
    }
    if (activeStr && newAdmin.toLowerCase() === activeStr.toLowerCase()) {
      throw new Error('The settings key must be different from your spending key');
    }
  };

  /** Post-recovery re-separation. Valid only while `recoveryAdminUnseparated` is set (contract-enforced). */
  const splitAdminFromActive = async (newAdmin: string): Promise<`0x${string}`> => {
    validateNewAdmin(newAdmin);
    try {
      return await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'splitAdminFromActive',
        args: [newAdmin as `0x${string}`],
      });
    } catch (error) {
      throw new Error(`Could not re-separate keys: ${parseContractError(error).userMessage}`);
    }
  };

  /** General separation: move settings (admin) authority to a separate, rarely-used key. Two-step (acceptAdmin). */
  const transferAdmin = async (newAdmin: string): Promise<`0x${string}`> => {
    validateNewAdmin(newAdmin);
    try {
      return await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'transferAdmin',
        args: [newAdmin as `0x${string}`],
      });
    } catch (error) {
      throw new Error(`Could not start the settings-key transfer: ${parseContractError(error).userMessage}`);
    }
  };

  return {
    connectedAddress: address ?? null,
    hasVault: !!hasVault,
    vaultAddress: vaultAddress ?? null,
    admin: adminStr,
    activeWallet: activeStr,
    recoveryAdminUnseparated: flag,
    posture,
    isLoading,
    isWritePending,
    splitAdminFromActive,
    transferAdmin,
    refetch,
  };
}
