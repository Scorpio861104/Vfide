'use client';

/**
 * LiquidityIncentives hooks.
 *
 * Exposes user-facing stake / unstake / read operations against the
 * LiquidityIncentives contract. Staking is gated by an ERC20 approve
 * since the contract pulls LP tokens via transferFrom.
 *
 * Contract surface used:
 *   - getAllPools() → address[]            // list of LP-token addresses
 *   - getPoolInfo(lpToken) → (name, totalStaked, active)
 *   - getUserStake(lpToken, user) → (amount, stakedAt, stakeDuration)
 *   - unstakeCooldown() → uint256          // seconds the user must wait
 *   - stake(lpToken, amount)
 *   - unstake(lpToken, amount)
 *
 * Reverts we translate:
 *   - LP_NotActive          — pool was disabled by governance
 *   - LP_Zero               — amount is 0
 *   - LP_InsufficientBalance — trying to unstake more than staked
 *   - LP_Cooldown           — cooldown still in effect since stake
 */

'use client';

import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { type Address, erc20Abi } from 'viem';
import { LiquidityIncentivesABI } from '@/lib/abis';
import { isConfiguredContractAddress, getContractConfigurationError } from '@/lib/contracts';
import { useContractAddresses } from './useContractAddresses';

export interface PoolInfo {
  lpToken: Address;
  name: string;
  totalStaked: bigint;
  active: boolean;
}

export interface UserStakeInfo {
  amount: bigint;
  stakedAt: bigint;
  stakeDuration: bigint;
}

export function usePoolList(): { pools: Address[]; isLoading: boolean } {
  const { LiquidityIncentives } = useContractAddresses();
  const { data, isLoading } = useReadContract({
    address: LiquidityIncentives,
    abi: LiquidityIncentivesABI,
    functionName: 'getAllPools',
    query: { enabled: isConfiguredContractAddress(LiquidityIncentives) },
  });
  return { pools: (data as Address[] | undefined) ?? [],
    isLoading};
}

/**
 * Fetch info for every pool in a single multicall.
 */
export function useAllPoolInfo(): { pools: PoolInfo[]; isLoading: boolean } {
  const { LiquidityIncentives } = useContractAddresses();
  const { pools: lpTokens, isLoading: listLoading } = usePoolList();

  const { data, isLoading: infoLoading } = useReadContracts({
    contracts: lpTokens.length
      ? lpTokens.map((lp) => ({
          address: LiquidityIncentives,
          abi: LiquidityIncentivesABI as any,
          functionName: 'getPoolInfo',
          // abi-parity-ok: getPoolInfo(address lpToken) — 1 arg, statically present
          args: [lp] as const,
        }))
      : [],
    query: { enabled: lpTokens.length > 0 && isConfiguredContractAddress(LiquidityIncentives) },
  });

  const pools: PoolInfo[] = lpTokens.map((lp, i) => {
    const res = data?.[i];
    if (!res || res.status !== 'success' || !res.result) {
      return { lpToken: lp, name: '', totalStaked: 0n, active: false };
    }
    const tuple = res.result as readonly [string, bigint, boolean];
    const [name, totalStaked, active] = tuple;
    return { lpToken: lp, name, totalStaked, active };
  });

  return { pools, isLoading: listLoading || infoLoading };
}

export function useUserStake(lpToken: Address | undefined): {
  data: UserStakeInfo | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const { LiquidityIncentives } = useContractAddresses();
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    address: LiquidityIncentives,
    abi: LiquidityIncentivesABI,
    functionName: 'getUserStake',
    args: lpToken && address ? [lpToken, address] : undefined,
    query: {
      enabled:
        !!lpToken && !!address && isConfiguredContractAddress(LiquidityIncentives),
    },
  });
  if (!data) return { data: null, isLoading, refetch };
  const [amount, stakedAt, stakeDuration] = data as readonly [bigint, bigint, bigint];
  return {
    data: { amount, stakedAt, stakeDuration },
    isLoading,
    refetch};
}

export function useUnstakeCooldown(): bigint {
  const { LiquidityIncentives } = useContractAddresses();
  const { data } = useReadContract({
    address: LiquidityIncentives,
    abi: LiquidityIncentivesABI,
    functionName: 'unstakeCooldown',
    query: { enabled: isConfiguredContractAddress(LiquidityIncentives) },
  });
  return (data as bigint | undefined) ?? 0n;
}

/**
 * Check ERC20 allowance for a given LP token. Used by the UI to decide
 * whether to show "Approve" vs "Stake".
 */
export function useLpAllowance(lpToken: Address | undefined) {
  const { LiquidityIncentives } = useContractAddresses();
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    address: lpToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: lpToken && address ? [address, LiquidityIncentives] : undefined,
    query: {
      enabled:
        !!lpToken && !!address && isConfiguredContractAddress(LiquidityIncentives),
    },
  });
  return { allowance: (data as bigint | undefined) ?? 0n,
    isLoading,
    refetch};
}

/**
 * Approve the LiquidityIncentives contract to transfer the user's LP tokens.
 * Sets max allowance — users rarely want to grant exact approvals for
 * staking-style flows, and re-approving on every stake hurts UX.
 */
export function useApproveLpToken() {
  const { LiquidityIncentives } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const approve = async (lpToken: Address, amount: bigint) => {
    if (!isConfiguredContractAddress(LiquidityIncentives)) {
      throw getContractConfigurationError('LiquidityIncentives');
    }
    return writeContractAsync({
      address: lpToken,
      abi: erc20Abi,
      functionName: 'approve',
      args: [LiquidityIncentives, amount],
    });
  };
  return { approve, isPending, error: error as Error | null, isConfirming, isConfirmed, txHash: txHash ?? null };
}

export function useStake() {
  const { LiquidityIncentives } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const stake = async (lpToken: Address, amount: bigint) => {
    if (!isConfiguredContractAddress(LiquidityIncentives)) {
      throw getContractConfigurationError('LiquidityIncentives');
    }
    if (amount <= 0n) throw new Error('Amount must be greater than zero.');
    return writeContractAsync({
      address: LiquidityIncentives,
      abi: LiquidityIncentivesABI,
      functionName: 'stake',
      args: [lpToken, amount],
    });
  };
  return { stake, isPending, isSuccess: isConfirmed, error: error as Error | null, isConfirming, isConfirmed, txHash: txHash ?? null };
}

export function useUnstake() {
  const { LiquidityIncentives } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const unstake = async (lpToken: Address, amount: bigint) => {
    if (!isConfiguredContractAddress(LiquidityIncentives)) {
      throw getContractConfigurationError('LiquidityIncentives');
    }
    if (amount <= 0n) throw new Error('Amount must be greater than zero.');
    return writeContractAsync({
      address: LiquidityIncentives,
      abi: LiquidityIncentivesABI,
      functionName: 'unstake',
      args: [lpToken, amount],
    });
  };
  return { unstake, isPending, isSuccess: isConfirmed, error: error as Error | null, isConfirming, isConfirmed, txHash: txHash ?? null };
}
