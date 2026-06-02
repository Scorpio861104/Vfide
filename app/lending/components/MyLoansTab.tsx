'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
/**
 * Lending: the user's loans (as lender, borrower, or guarantor).
 *
 * Like BrowseTab, iterates 0..totalLoans and filters client-side.
 * For each loan that involves the user, render role-appropriate
 * actions:
 *   - lender, OPEN: cancelLoan
 *   - lender, ACTIVE-past-deadline: claimDefault
 *   - borrower, ACTIVE/GRACE/RESTRUCTURED: repay
 *   - everyone: see the current state and outstanding balance
 */

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Loader2, Coins, AlertCircle, X, Download, AlertTriangle, PenLine, Clock } from 'lucide-react';
import {
  useTermLoanStats,
  useLoansBatch,
  useCancelLoan,
  useRepay,
  useClaimDefault,
  useSignAsGuarantor,
  translateTermLoanError,
  LoanState,
  LOAN_STATE_LABEL,
  type Loan,
} from '@/hooks/useTermLoan';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';
import { VFIDETermLoanABI } from '@/lib/abis';

const VFIDE_DECIMALS = 18;
const MAX_FETCH = 200;

export function MyLoansTab() {
  const { address } = useAccount();
  const addrs = useContractAddresses();
  const configured = isConfiguredContractAddress(addrs.VFIDETermLoan);

  const { totalLoans, refetch: refetchStats } = useTermLoanStats();

  const ids = useMemo<bigint[]>(() => {
    const n = Number(totalLoans);
    if (!Number.isFinite(n) || n === 0) return [];
    const count = Math.min(n, MAX_FETCH);
    return Array.from({ length: count }, (_, i) => BigInt(i));
  }, [totalLoans]);

  const { loans, isLoading, refetch } = useLoansBatch(ids);

  const myLoans = useMemo(() => {
    if (!address) return [];
    return loans
      .filter((e): e is { id: bigint; loan: Loan } => !!e.loan)
      .filter(({ loan }) => {
        const a = address.toLowerCase();
        // Show loans the user is party to, OR any loan awaiting guardian co-sign
        // (guardians need to find loans to sign; the contract enforces membership on-chain)
        return (
          loan.lender.toLowerCase() === a ||
          loan.borrower.toLowerCase() === a ||
          loan.state === LoanState.COSIGNING
        );
      });
  }, [loans, address]);

  const {
    cancelLoan,
    isPending: cancelPending,
    isConfirming: cancelConfirming,
    isConfirmed: cancelConfirmed,
  } = useCancelLoan();
  const {
    repay,
    isPending: repayPending,
    isConfirming: repayConfirming,
    isConfirmed: repayConfirmed,
  } = useRepay();
  const {
    claimDefault,
    isPending: claimPending,
    isConfirming: claimConfirming,
    isConfirmed: claimConfirmed,
  } = useClaimDefault();
  const {
    signAsGuarantor,
    isPending: signPending,
    isConfirming: signConfirming,
    isConfirmed: signConfirmed,
  } = useSignAsGuarantor();

  const [actingOn, setActingOn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refetch on confirmation. Each effect handles one action's
  // confirmation independently so that whichever flips first triggers
  // the right refresh.
  useEffect(() => {
    let _cancelled = false;
    if (cancelConfirmed && actingOn) {
      refetch();
      refetchStats();
      setActingOn(null);
    }
    return () => { _cancelled = true; };
    }, [cancelConfirmed, actingOn, refetch, refetchStats]);
  useEffect(() => {
    let _cancelled = false;
    if (repayConfirmed && actingOn) {
      refetch();
      refetchStats();
      setActingOn(null);
    }
    return () => { _cancelled = true; };
    }, [repayConfirmed, actingOn, refetch, refetchStats]);
  useEffect(() => {
    let _cancelled = false;
    if (claimConfirmed && actingOn) {
      refetch();
      refetchStats();
      setActingOn(null);
    }
    return () => { _cancelled = true; };
    }, [claimConfirmed, actingOn, refetch, refetchStats]);
  useEffect(() => {
    let _cancelled = false;
    if (signConfirmed && actingOn) {
      refetch();
      refetchStats();
      setActingOn(null);
    }
    return () => { _cancelled = true; };
    }, [signConfirmed, actingOn, refetch, refetchStats]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Coins size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">Connect your wallet to view your loans.</p>
        <div className="mt-6 flex justify-center">
          <VfideConnectButton size="md" />
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">VFIDETermLoan isn&rsquo;t deployed on this network yet.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-accent animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (myLoans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Coins size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">You don&rsquo;t have any loans yet.</p>
        <p className="text-zinc-500 text-xs mt-1">Browse open offers or post your own.</p>
      </div>
    );
  }

  const busy = cancelPending || cancelConfirming || repayPending || repayConfirming || claimPending || claimConfirming || signPending || signConfirming;

  async function actWith(promise: Promise<unknown>, id: bigint) {
    setError(null);
    setActingOn(id.toString());
    try {
      await promise;
      // Refetch + actingOn clearing are driven by the useEffects above
      // gated on isConfirmed. Don't clear actingOn here, or the row's
      // pending spinner will disappear before the chain catches up.
    } catch (e: unknown) {
      setError(translateTermLoanError(e));
      setActingOn(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        {myLoans.map(({ id, loan }) => (
          <LoanRow
            key={id.toString()}
            id={id}
            loan={loan}
            userAddress={address}
            busy={busy}
            actingOn={actingOn}
            termLoanAddress={addrs.VFIDETermLoan}
            onCancel={() => actWith(cancelLoan(id), id)}
            onClaimDefault={() => actWith(claimDefault(id), id)}
            onRepay={(amount) => actWith(repay(id, amount), id)}
            onSignAsGuarantor={() => actWith(signAsGuarantor(id), id)}
          />
        ))}
      </div>
    </div>
  );
}

interface LoanRowProps {
  id: bigint;
  loan: Loan;
  userAddress: string;
  busy: boolean;
  actingOn: string | null;
  termLoanAddress: `0x${string}` | undefined;
  onCancel: () => void;
  onClaimDefault: () => void;
  onRepay: (amount: bigint) => void;
  onSignAsGuarantor: () => void;
}

function LoanRow({ id, loan, userAddress, busy, actingOn, termLoanAddress, onCancel, onClaimDefault, onRepay, onSignAsGuarantor }: LoanRowProps) {
  const isLender = loan.lender.toLowerCase() === userAddress.toLowerCase();
  const isBorrower = loan.borrower.toLowerCase() === userAddress.toLowerCase();
  const isThisBusy = actingOn === id.toString();
  // Note: guardian membership is checked on-chain; we surface the button for all
  // users when a loan is in COSIGNING — the contract will revert if they're not a guardian.

  const { data: owedData } = useReadContract({
    address: termLoanAddress,
    abi: VFIDETermLoanABI,
    functionName: 'amountOwed',
    args: [id],
    query: { enabled: !!termLoanAddress && loan.state !== LoanState.OPEN && loan.state !== LoanState.CANCELLED },
  });
  const [remaining = 0n, , defaultable = false] = (owedData as readonly [bigint, boolean, boolean] | undefined) ?? [];

  const stateLabel = LOAN_STATE_LABEL[loan.state] ?? 'Unknown';
  const stateColor =
    loan.state === LoanState.REPAID ? 'text-emerald-400' :
    loan.state === LoanState.DEFAULTED ? 'text-red-400' :
    loan.state === LoanState.GRACE ? 'text-amber-400' :
    loan.state === LoanState.OPEN ? 'text-accent' :
    'text-zinc-400';

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-zinc-400">Loan #{id.toString()}</p>
            <span className={`text-xs font-semibold ${stateColor}`}>{stateLabel}</span>
            {isLender && <span className="text-xs text-purple-400">as lender</span>}
            {isBorrower && <span className="text-xs text-emerald-400">as borrower</span>}
            {loan.state === LoanState.COSIGNING && !isLender && !isBorrower && (
              <span className="text-xs text-cyan-400">as guarantor?</span>
            )}
          </div>
          <p className="text-sm font-mono text-white">
            {formatUnits(loan.principal, VFIDE_DECIMALS)} VFIDE · {(Number(loan.interestBps) / 100).toFixed(2)}% ·{' '}
            {(Number(loan.duration) / 86400).toFixed(0)}d
          </p>
        </div>
        <div className="text-right text-xs text-zinc-400">
          {remaining > 0n && (
            <>
              <p>Outstanding</p>
              <p className="font-mono text-white">{formatUnits(remaining, VFIDE_DECIMALS)} VFIDE</p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        {/* COSIGNING state: guardian must co-sign to activate the loan */}
        {loan.state === LoanState.COSIGNING && isBorrower && (
          <div className="flex items-center gap-2 text-xs text-amber-300 w-full">
            <Clock size={11} aria-hidden="true" />
            Awaiting guardian co-sign — share this loan ID with one of your guardians.
          </div>
        )}
        {loan.state === LoanState.COSIGNING && !isBorrower && (
          <button
            onClick={onSignAsGuarantor}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            aria-label={`Sign as guarantor for loan ${id.toString()}`}
          >
            {isThisBusy ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <PenLine size={11} aria-hidden="true" />}
            Sign as guarantor
          </button>
        )}
        {isLender && loan.state === LoanState.OPEN && (
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {isThisBusy ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <X size={11} aria-hidden="true" />}
            Cancel offer
          </button>
        )}

        {isBorrower && (loan.state === LoanState.ACTIVE || loan.state === LoanState.GRACE || loan.state === LoanState.RESTRUCTURED) && remaining > 0n && (
          <button
            onClick={() => onRepay(remaining)}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors disabled:opacity-50"
          >
            {isThisBusy ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <Download size={11} aria-hidden="true" />}
            Repay {formatUnits(remaining, VFIDE_DECIMALS)} VFIDE
          </button>
        )}

        {isLender && defaultable && (
          <button
            onClick={onClaimDefault}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-400 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            {isThisBusy ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <AlertTriangle size={11} aria-hidden="true" />}
            Claim default
          </button>
        )}
      </div>
    </div>
  );
}
