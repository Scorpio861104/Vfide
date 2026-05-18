'use client';

/**
 * VFIDEFlashLoan hooks.
 *
 * Mental model:
 *
 * Flash loans are atomic single-transaction loans. The borrower in a
 * flash loan is a CONTRACT that implements IERC3156FlashBorrower —
 * `flashLoan()` sends tokens to the receiver, calls `onFlashLoan(...)`
 * on it, and reverts the whole transaction if the receiver doesn't
 * repay amount + fee by the end of the call. That means a normal
 * end-user wallet can't be a flash-loan borrower; only an integrator
 * contract can.
 *
 * What end users CAN do on this contract:
 *   - Become a LENDER by calling deposit(amount). Their VFIDE sits in
 *     the contract until borrowed; they earn `feeBps` of every flash
 *     loan facilitated against their balance.
 *   - Withdraw their balance (whatever isn't currently lent out).
 *
 * So the "flash loans" page is really a lender-management dashboard.
 *
 * Contract reverts we translate:
 *   - FL_Zero                  — amount is 0
 *   - FL_MinInitialDeposit     — first-time deposits must meet a floor
 *   - FL_NotRegistered         — caller has never deposited (for withdraw)
 *   - FL_InsufficientBalance   — withdraw exceeds available balance
 *   - "FL: lender cap"         — MAX_LENDERS already registered
 *   - "FL: not initialized"    — systemExempt not yet confirmed by DAO
 */

'use client';

import { useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { type Address, erc20Abi } from 'viem';
import { VFIDEFlashLoanABI } from '@/lib/abis';
import { isConfiguredContractAddress, getContractConfigurationError } from '@/lib/contracts';
import { useContractAddresses } from './useContractAddresses';

export interface LenderInfo {
  balance: bigint;       // VFIDE currently sitting in your lender slot
  feeBps: bigint;        // your fee rate in basis points (e.g. 50 = 0.50%)
  totalEarned: bigint;   // lifetime fee earnings
  totalVolume: bigint;   // lifetime volume facilitated
  loanCount: bigint;     // number of flash loans facilitated
  paused: boolean;       // you have paused yourself out of the rotation
  registered: boolean;   // you've ever deposited
}

function parseLenderTuple(raw: unknown): LenderInfo | null {
  if (!raw || !Array.isArray(raw)) return null;
  const arr = raw as readonly unknown[];
  if (arr.length < 7) return null;
  return {
    balance: arr[0] as bigint,
    feeBps: arr[1] as bigint,
    totalEarned: arr[2] as bigint,
    totalVolume: arr[3] as bigint,
    loanCount: arr[4] as bigint,
    paused: !!arr[5],
    registered: !!arr[6]};
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** Info about a specific lender (the connected user by default). */
export function useLenderInfo(lenderAddress?: Address) {
  const { VFIDEFlashLoan } = useContractAddresses();
  const { address } = useAccount();
  const target = lenderAddress ?? address;
  const { data, isLoading, refetch } = useReadContract({
    address: VFIDEFlashLoan,
    abi: VFIDEFlashLoanABI,
    functionName: 'getLenderInfo',
    args: target ? [target] : undefined,
    query: { enabled: !!target && isConfiguredContractAddress(VFIDEFlashLoan) },
  });
  return {
    info: parseLenderTuple(data),
    isLoading,
    refetch};
}

/** Total registered lender count. */
export function useLenderCount() {
  const { VFIDEFlashLoan } = useContractAddresses();
  const { data, isLoading, refetch } = useReadContract({
    address: VFIDEFlashLoan,
    abi: VFIDEFlashLoanABI,
    functionName: 'lenderCount',
    query: { enabled: isConfiguredContractAddress(VFIDEFlashLoan) },
  });
  return { count: (data as bigint | undefined) ?? 0n, isLoading, refetch };
}

/** Paginated lender list — returns up to `limit` addresses starting at `offset`. */
export function useGetLenders(offset: bigint, limit: bigint) {
  const { VFIDEFlashLoan } = useContractAddresses();
  const { data, isLoading, refetch } = useReadContract({
    address: VFIDEFlashLoan,
    abi: VFIDEFlashLoanABI,
    functionName: 'getLenders',
    args: [offset, limit],
    query: { enabled: isConfiguredContractAddress(VFIDEFlashLoan) },
  });
  return {
    addresses: (data as Address[] | undefined) ?? [],
    isLoading,
    refetch};
}

/** Cheapest lender with enough liquidity for `amount`. */
export function useFindBestLender(amount: bigint) {
  const { VFIDEFlashLoan } = useContractAddresses();
  const { data, isLoading } = useReadContract({
    address: VFIDEFlashLoan,
    abi: VFIDEFlashLoanABI,
    functionName: 'findBestLender',
    args: [amount],
    query: { enabled: amount > 0n && isConfiguredContractAddress(VFIDEFlashLoan) },
  });
  if (!data || !Array.isArray(data)) {
    return { lender: null as Address | null, feeBps: 0n, isLoading };
  }
  const [lender, feeBps] = data as unknown as readonly [Address, bigint];
  // findBestLender returns address(0) + max-uint when no lender can fulfill.
  const zeroLender = lender === '0x0000000000000000000000000000000000000000';
  return {
    lender: zeroLender ? null : lender,
    feeBps: zeroLender ? 0n : feeBps,
    isLoading};
}

/** Max flash-loanable amount from a specific lender. */
export function useMaxFlashLoan(lender: Address | undefined) {
  const { VFIDEFlashLoan } = useContractAddresses();
  const { data, isLoading } = useReadContract({
    address: VFIDEFlashLoan,
    abi: VFIDEFlashLoanABI,
    functionName: 'maxFlashLoan',
    args: lender ? [lender] : undefined,
    query: { enabled: !!lender && isConfiguredContractAddress(VFIDEFlashLoan) },
  });
  return { max: (data as bigint | undefined) ?? 0n, isLoading };
}

/** Fee a lender will charge for a given amount. */
export function useFlashFee(lender: Address | undefined, amount: bigint) {
  const { VFIDEFlashLoan } = useContractAddresses();
  const { data, isLoading } = useReadContract({
    address: VFIDEFlashLoan,
    abi: VFIDEFlashLoanABI,
    functionName: 'flashFee',
    args: lender && amount > 0n ? [lender, amount] : undefined,
    query: { enabled: !!lender && amount > 0n && isConfiguredContractAddress(VFIDEFlashLoan) },
  });
  return { fee: (data as bigint | undefined) ?? 0n, isLoading };
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * Deposit VFIDE to become a lender (or top up an existing position).
 * Orchestrates the ERC20 approve→deposit pair.
 */
export function useDeposit() {
  const { VFIDEFlashLoan, VFIDEToken } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const deposit = useCallback(
    async (amount: bigint) => {
      if (!isConfiguredContractAddress(VFIDEFlashLoan)) {
        throw getContractConfigurationError('VFIDEFlashLoan');
      }
      if (!isConfiguredContractAddress(VFIDEToken)) {
        throw getContractConfigurationError('VFIDEToken');
      }
      if (amount === 0n) throw new Error('Deposit amount must be > 0');

      await writeContractAsync({
        address: VFIDEToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VFIDEFlashLoan, amount],
      });

      return writeContractAsync({
        address: VFIDEFlashLoan,
        abi: VFIDEFlashLoanABI,
        functionName: 'deposit',
        args: [amount],
      });
    },
    [VFIDEFlashLoan, VFIDEToken, writeContractAsync],
  );

  return { deposit, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

/** Withdraw your lender balance (whatever isn't currently lent out). */
export function useWithdrawLender() {
  const { VFIDEFlashLoan } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const withdraw = useCallback(
    async (amount: bigint) => {
      if (!isConfiguredContractAddress(VFIDEFlashLoan)) {
        throw getContractConfigurationError('VFIDEFlashLoan');
      }
      return writeContractAsync({
        address: VFIDEFlashLoan,
        abi: VFIDEFlashLoanABI,
        functionName: 'withdraw',
        args: [amount],
      });
    },
    [VFIDEFlashLoan, writeContractAsync],
  );

  return { withdraw, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

// ─── Error translation ─────────────────────────────────────────────────────

export function translateFlashLoanError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('FL_Zero'))                return 'Amount must be greater than 0.';
  if (msg.includes('FL_MinInitialDeposit'))   return 'First-time deposit must meet the minimum.';
  if (msg.includes('FL_NotRegistered'))       return 'You haven’t deposited as a lender yet.';
  if (msg.includes('FL_InsufficientBalance')) return 'Withdraw exceeds your available balance.';
  if (msg.includes('FL: lender cap'))         return 'Lender cap reached — no new lenders right now.';
  if (msg.includes('FL: not initialized'))    return 'Contract not yet activated by DAO.';
  if (msg.includes('rejected') || msg.includes('denied') || msg.includes('User rejected')) {
    return 'Transaction cancelled.';
  }
  return msg.slice(0, 200);
}
