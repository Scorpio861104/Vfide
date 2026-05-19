'use client';

/**
 * VFIDETermLoan hooks.
 *
 * Term loans are peer-to-peer: a lender creates an OPEN offer, a
 * borrower accepts, a guardian co-signs, the loan becomes ACTIVE.
 * Repayment can happen in one shot via repay() or via an agreed
 * installment plan.
 *
 * State machine (`LoanState` enum):
 *   OPEN          — lender created offer; nobody has accepted yet
 *   COSIGNING     — borrower accepted; awaiting guardian signature
 *   ACTIVE        — fully signed; principal disbursed
 *   GRACE         — past deadline, in grace window
 *   RESTRUCTURED  — payment plan agreed
 *   REPAID        — successfully closed
 *   DEFAULTED     — full default
 *   CANCELLED     — lender pulled the offer before acceptance
 *
 * Important contract constraints:
 *   MAX_INTEREST_BPS = 1200      — 12% APR cap
 *   MIN_DURATION = 1 day, MAX_DURATION = 30 days
 *   MAX_ACTIVE_LOANS per user = 10
 *
 * Reverts we translate to UI strings:
 *   TL_Zero              — principal is 0
 *   TL_InvalidTerms      — interest > cap or duration out of range
 *   TL_LoanCap           — too many active loans
 *   TL_DebtOutstanding   — you have unresolved defaults
 *   TL_WrongState        — action doesn’t match loan’s LoanState
 *   TL_SelfLoan          — lender == borrower
 *   TL_Paused            — user is service-banned
 *   TL_NotBorrower / TL_NotLender / TL_NotGuarantor
 *   TL_ScoreTooLow       — borrower’s ProofScore below tier threshold
 *   TL_AlreadySigned     — guardian already signed
 *
 * Note: the contract uses VFIDE for both principal and repayment. The
 * lender approves PRINCIPAL during createLoan (contract pulls it on
 * creation); the borrower approves repayment amount before repay().
 */

'use client';

import { useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { type Address, erc20Abi } from 'viem';
import { VFIDETermLoanABI } from '@/lib/abis';
import { isConfiguredContractAddress, getContractConfigurationError } from '@/lib/contracts';
import { useContractAddresses } from './useContractAddresses';

export enum LoanState {
  OPEN = 0,
  COSIGNING = 1,
  ACTIVE = 2,
  GRACE = 3,
  RESTRUCTURED = 4,
  REPAID = 5,
  DEFAULTED = 6,
  CANCELLED = 7,
}

export const LOAN_STATE_LABEL: Record<number, string> = {
  [LoanState.OPEN]: 'Open',
  [LoanState.COSIGNING]: 'Awaiting cosign',
  [LoanState.ACTIVE]: 'Active',
  [LoanState.GRACE]: 'Grace period',
  [LoanState.RESTRUCTURED]: 'Restructured',
  [LoanState.REPAID]: 'Repaid',
  [LoanState.DEFAULTED]: 'Defaulted',
  [LoanState.CANCELLED]: 'Cancelled',
};

export interface Loan {
  lender: Address;
  borrower: Address;
  principal: bigint;
  interestBps: bigint;
  duration: bigint;
  startTime: bigint;
  deadline: bigint;
  amountRepaid: bigint;
  revenueAssignment: boolean;
  state: LoanState;
}

function parseLoanTuple(raw: unknown): Loan | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.lender !== 'string') return null;
  return {
    lender: r.lender as Address,
    borrower: r.borrower as Address,
    principal: r.principal as bigint,
    interestBps: r.interestBps as bigint,
    duration: r.duration as bigint,
    startTime: r.startTime as bigint,
    deadline: r.deadline as bigint,
    amountRepaid: r.amountRepaid as bigint,
    revenueAssignment: !!r.revenueAssignment,
    state: Number(r.state) as LoanState};
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export function useLoan(loanId: bigint | undefined) {
  const { VFIDETermLoan } = useContractAddresses();
  const { data, isLoading, refetch } = useReadContract({
    address: VFIDETermLoan,
    abi: VFIDETermLoanABI,
    functionName: 'getLoan',
    args: loanId !== undefined ? [loanId] : undefined,
    query: { enabled: loanId !== undefined && isConfiguredContractAddress(VFIDETermLoan) },
  });
  return { loan: parseLoanTuple(data), isLoading, refetch };
}

/**
 * Batch-load multiple loans by ID. The contract doesn't expose a
 * "list all loans" view, so the UI must know which IDs to ask about.
 * Practically: walk 0..totalLoans (from getStats[0]) and filter
 * client-side, or use an indexer for the offer-browse view.
 */
export function useLoansBatch(ids: bigint[]) {
  const { VFIDETermLoan } = useContractAddresses();
  const enabled = ids.length > 0 && isConfiguredContractAddress(VFIDETermLoan);
  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? ids.map((id) => ({
          address: VFIDETermLoan,
          abi: VFIDETermLoanABI as any,
          functionName: 'getLoan',
          args: [id],
        } as const))
      : [],
    query: { enabled },
  });

  const loans = (data ?? []).map((entry, i) => ({
    id: ids[i],
    loan: entry?.status === 'success' ? parseLoanTuple(entry.result) : null,
  }));

  return { loans, isLoading, refetch };
}

export function useAmountOwed(loanId: bigint | undefined) {
  const { VFIDETermLoan } = useContractAddresses();
  const { data, isLoading, refetch } = useReadContract({
    address: VFIDETermLoan,
    abi: VFIDETermLoanABI,
    functionName: 'amountOwed',
    args: loanId !== undefined ? [loanId] : undefined,
    query: { enabled: loanId !== undefined && isConfiguredContractAddress(VFIDETermLoan) },
  });
  if (!data || !Array.isArray(data)) {
    return { remaining: 0n, overdue: false, defaultable: false, isLoading, refetch };
  }
  const [remaining, overdue, defaultable] = data as unknown as readonly [bigint, boolean, boolean];
  return { remaining, overdue, defaultable, isLoading, refetch };
}

export function useMaxBorrowable() {
  const { VFIDETermLoan } = useContractAddresses();
  const { address } = useAccount();
  const { data, isLoading, refetch } = useReadContract({
    address: VFIDETermLoan,
    abi: VFIDETermLoanABI,
    functionName: 'maxBorrowable',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConfiguredContractAddress(VFIDETermLoan) },
  });
  return { max: (data as bigint | undefined) ?? 0n, isLoading, refetch };
}

export function useTermLoanStats() {
  const { VFIDETermLoan } = useContractAddresses();
  const { data, isLoading, refetch } = useReadContract({
    address: VFIDETermLoan,
    abi: VFIDETermLoanABI,
    functionName: 'getStats',
    query: { enabled: isConfiguredContractAddress(VFIDETermLoan) },
  });
  if (!data || !Array.isArray(data)) {
    return {
      totalLoans: 0n,
      totalVolume: 0n,
      totalDefaults: 0n,
      totalRestructured: 0n,
      totalProtocolFees: 0n,
      isLoading,
      refetch};
  }
  const [totalLoans, totalVolume, totalDefaults, totalRestructured, totalProtocolFees] =
    data as unknown as readonly [bigint, bigint, bigint, bigint, bigint];
  return { totalLoans, totalVolume, totalDefaults, totalRestructured, totalProtocolFees, isLoading, refetch };
}

export function useLoanGuarantors(loanId: bigint | undefined) {
  const { VFIDETermLoan } = useContractAddresses();
  const { data, isLoading, refetch } = useReadContract({
    address: VFIDETermLoan,
    abi: VFIDETermLoanABI,
    functionName: 'getGuarantors',
    args: loanId !== undefined ? [loanId] : undefined,
    query: { enabled: loanId !== undefined && isConfiguredContractAddress(VFIDETermLoan) },
  });
  return { guarantors: (data as Address[] | undefined) ?? [], isLoading, refetch };
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/**
 * createLoan: lender opens an offer. Approves PrincipalAmount of VFIDE
 * to the TermLoan contract (which pulls it on creation), then calls
 * createLoan(principal, interestBps, duration).
 */
export function useCreateLoan() {
  const { VFIDETermLoan, VFIDEToken } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const createLoan = useCallback(
    async (args: { principal: bigint; interestBps: bigint; durationSeconds: bigint }) => {
      if (!isConfiguredContractAddress(VFIDETermLoan)) {
        throw getContractConfigurationError('VFIDETermLoan');
      }
      if (!isConfiguredContractAddress(VFIDEToken)) {
        throw getContractConfigurationError('VFIDEToken');
      }
      if (args.principal === 0n) throw new Error('Principal must be > 0');
      if (args.interestBps > 1200n) throw new Error('Interest cap is 12% APR (1200 bps).');
      const ONE_DAY = 86400n;
      if (args.durationSeconds < ONE_DAY || args.durationSeconds > ONE_DAY * 30n) {
        throw new Error('Duration must be between 1 and 30 days.');
      }

      await writeContractAsync({
        address: VFIDEToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VFIDETermLoan, args.principal],
      });

      return writeContractAsync({
        address: VFIDETermLoan,
        abi: VFIDETermLoanABI,
        functionName: 'createLoan',
        args: [args.principal, args.interestBps, args.durationSeconds],
      });
    },
    [VFIDETermLoan, VFIDEToken, writeContractAsync],
  );

  return { createLoan, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

export function useAcceptLoan() {
  const { VFIDETermLoan } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const acceptLoan = useCallback(
    async (id: bigint) => {
      if (!isConfiguredContractAddress(VFIDETermLoan)) throw getContractConfigurationError('VFIDETermLoan');
      return writeContractAsync({
        address: VFIDETermLoan,
        abi: VFIDETermLoanABI,
        functionName: 'acceptLoan',
        args: [id],
      });
    },
    [VFIDETermLoan, writeContractAsync],
  );
  return { acceptLoan, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

export function useSignAsGuarantor() {
  const { VFIDETermLoan } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const signAsGuarantor = useCallback(
    async (id: bigint) => {
      if (!isConfiguredContractAddress(VFIDETermLoan)) throw getContractConfigurationError('VFIDETermLoan');
      return writeContractAsync({
        address: VFIDETermLoan,
        abi: VFIDETermLoanABI,
        functionName: 'signAsGuarantor',
        args: [id],
      });
    },
    [VFIDETermLoan, writeContractAsync],
  );
  return { signAsGuarantor, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

/**
 * Repay: borrower approves VFIDE to TermLoan, then calls repay(id).
 * The contract pulls the full amountOwed in one go.
 */
export function useRepay() {
  const { VFIDETermLoan, VFIDEToken } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const repay = useCallback(
    async (id: bigint, repayAmount: bigint) => {
      if (!isConfiguredContractAddress(VFIDETermLoan)) throw getContractConfigurationError('VFIDETermLoan');
      if (!isConfiguredContractAddress(VFIDEToken)) throw getContractConfigurationError('VFIDEToken');
      if (repayAmount === 0n) throw new Error('Nothing to repay');

      await writeContractAsync({
        address: VFIDEToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VFIDETermLoan, repayAmount],
      });

      return writeContractAsync({
        address: VFIDETermLoan,
        abi: VFIDETermLoanABI,
        functionName: 'repay',
        args: [id],
      });
    },
    [VFIDETermLoan, VFIDEToken, writeContractAsync],
  );
  return { repay, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

export function usePayInstallment() {
  const { VFIDETermLoan, VFIDEToken } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const payInstallment = useCallback(
    async (id: bigint, installmentAmount: bigint) => {
      if (!isConfiguredContractAddress(VFIDETermLoan)) throw getContractConfigurationError('VFIDETermLoan');
      if (!isConfiguredContractAddress(VFIDEToken)) throw getContractConfigurationError('VFIDEToken');

      await writeContractAsync({
        address: VFIDEToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [VFIDETermLoan, installmentAmount],
      });

      return writeContractAsync({
        address: VFIDETermLoan,
        abi: VFIDETermLoanABI,
        functionName: 'payInstallment',
        args: [id],
      });
    },
    [VFIDETermLoan, VFIDEToken, writeContractAsync],
  );
  return { payInstallment, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

export function useCancelLoan() {
  const { VFIDETermLoan } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const cancelLoan = useCallback(
    async (id: bigint) => {
      if (!isConfiguredContractAddress(VFIDETermLoan)) throw getContractConfigurationError('VFIDETermLoan');
      return writeContractAsync({
        address: VFIDETermLoan,
        abi: VFIDETermLoanABI,
        functionName: 'cancelLoan',
        args: [id],
      });
    },
    [VFIDETermLoan, writeContractAsync],
  );
  return { cancelLoan, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

export function useClaimDefault() {
  const { VFIDETermLoan } = useContractAddresses();
  const { writeContractAsync, isPending, error, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const claimDefault = useCallback(
    async (id: bigint) => {
      if (!isConfiguredContractAddress(VFIDETermLoan)) throw getContractConfigurationError('VFIDETermLoan');
      return writeContractAsync({
        address: VFIDETermLoan,
        abi: VFIDETermLoanABI,
        functionName: 'claimDefault',
        args: [id],
      });
    },
    [VFIDETermLoan, writeContractAsync],
  );
  return { claimDefault, isPending, isConfirming, isConfirmed, txHash: txHash ?? null, error: error as Error | null };
}

// ─── Error translation ─────────────────────────────────────────────────────

export function translateTermLoanError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('TL_Zero'))            return 'Amount must be greater than 0.';
  if (msg.includes('TL_InvalidTerms'))    return 'Interest must be ≤ 12% and duration 1–30 days.';
  if (msg.includes('TL_LoanCap'))         return 'You have too many active loans (10 max).';
  if (msg.includes('TL_DebtOutstanding')) return 'You have unresolved defaults — repay those first.';
  if (msg.includes('TL_WrongState'))      return 'Loan is in a state that doesn’t allow this action.';
  if (msg.includes('TL_SelfLoan'))        return 'You can’t take your own loan offer.';
  if (msg.includes('TL_Paused'))          return 'Action blocked — service ban or fraud flag active.';
  if (msg.includes('TL_NotBorrower'))     return 'Only the borrower can do that.';
  if (msg.includes('TL_NotLender'))       return 'Only the lender can do that.';
  if (msg.includes('TL_NotGuarantor'))    return 'Only a registered guardian can co-sign.';
  if (msg.includes('TL_ScoreTooLow'))     return 'Your ProofScore is below the threshold for this loan size.';
  if (msg.includes('TL_AlreadySigned'))   return 'You’ve already signed this loan.';
  if (msg.includes('rejected') || msg.includes('denied') || msg.includes('User rejected')) {
    return 'Transaction cancelled.';
  }
  return msg.slice(0, 200);
}
