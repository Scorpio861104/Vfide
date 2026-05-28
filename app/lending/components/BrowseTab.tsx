'use client';

/**
 * Lending: browse open loan offers.
 *
 * The contract doesn't expose a "list all open loans" view, so we
 * iterate IDs 0..totalLoans, batch the getLoan reads, and filter
 * client-side to LoanState.OPEN. This scales linearly with totalLoans;
 * once volume is high enough to make this expensive, replace with an
 * event-indexer query.
 *
 * Each open offer shows the offered terms (principal, interest %,
 * duration) and an Accept button that calls acceptLoan(id). After
 * acceptance the loan moves to COSIGNING state until a guardian
 * signs.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { Loader2, Inbox, Coins, Clock, Percent, CheckCircle, AlertCircle } from 'lucide-react';
import {
  useTermLoanStats,
  useLoansBatch,
  useAcceptLoan,
  useMaxBorrowable,
  translateTermLoanError,
  LoanState,
  type Loan,
} from '@/hooks/useTermLoan';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';

const VFIDE_DECIMALS = 18;
// Cap how many loans we'll fetch in a single render. For early testnet
// volumes this is fine; for production this needs an indexer or a
// dedicated paginated view function on the contract.
const MAX_FETCH = 200;

export function BrowseTab() {
  const { address } = useAccount();
  const addrs = useContractAddresses();
  const configured = isConfiguredContractAddress(addrs.VFIDETermLoan);

  const { totalLoans, isLoading: statsLoading, refetch: refetchStats } = useTermLoanStats();

  const ids = useMemo<bigint[]>(() => {
    const n = Number(totalLoans);
    if (!Number.isFinite(n) || n === 0) return [];
    const count = Math.min(n, MAX_FETCH);
    return Array.from({ length: count }, (_, i) => BigInt(i));
  }, [totalLoans]);

  const { loans, isLoading, refetch } = useLoansBatch(ids);
  const { acceptLoan, isPending, isConfirming, isConfirmed } = useAcceptLoan();
  // Borrow tier: the contract caps how much an individual can borrow
  // based on their ProofScore. Reading it here lets us disable the
  // Accept button on offers beyond the user's ceiling, which prevents
  // a confusing TL_ScoreTooLow revert after they pay gas.
  const { max: maxBorrow } = useMaxBorrowable();

  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refetch on confirmation, not submission. acceptLoan moves the
  // loan from OPEN to COSIGNING; the user should see it disappear
  // from the browse list once the chain confirms.
  useEffect(() => {
    let cancelled = false;
    if (isConfirmed && accepting) {
      refetch();
      refetchStats();
      setAccepting(null);
    }
    return () => { cancelled = true; };
    }, [isConfirmed, accepting, refetch, refetchStats]);

  const openOffers = useMemo(
    () =>
      loans
        .filter((entry): entry is { id: bigint; loan: Loan } => !!entry.loan && entry.loan.state === LoanState.OPEN)
        // Hide your own offers — you can't accept them.
        .filter((entry) => !address || entry.loan.lender.toLowerCase() !== address.toLowerCase()),
    [loans, address],
  );

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">VFIDETermLoan isn&rsquo;t deployed on this network yet.</p>
      </div>
    );
  }

  const loading = statsLoading || isLoading;

  const handleAccept = async (id: bigint) => {
    setError(null);
    setAccepting(id.toString());
    try {
      await acceptLoan(id);
      // Refetch is now driven by the useEffect above gated on isConfirmed.
      // Don't clear `accepting` here — that happens on confirmation.
    } catch (e: unknown) {
      setError(translateTermLoanError(e));
      setAccepting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-accent animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (openOffers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">No open loan offers right now.</p>
        <p className="text-zinc-500 text-xs mt-1">Check back later or make your own offer in the Offer tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {totalLoans > BigInt(MAX_FETCH) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          Showing the first {MAX_FETCH} loans only. Pagination via an indexer is pending.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {openOffers.map(({ id, loan }) => {
          const durationDays = Number(loan.duration) / 86400;
          const interestPct = Number(loan.interestBps) / 100;
          const interestAmount = (loan.principal * loan.interestBps) / 10000n;
          const total = loan.principal + interestAmount;
          return (
            <div key={id.toString()} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Loan #{id.toString()}</p>
                  <p className="text-xl font-bold text-white font-mono">
                    {formatUnits(loan.principal, VFIDE_DECIMALS)} VFIDE
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400">From</p>
                  <p className="text-xs font-mono text-white">
                    {loan.lender.slice(0, 8)}…{loan.lender.slice(-4)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-1 mb-1 text-zinc-500">
                    <Percent size={10} aria-hidden="true" />
                    <p className="text-xs">Interest</p>
                  </div>
                  <p className="text-sm text-accent font-mono">{interestPct.toFixed(2)}%</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1 text-zinc-500">
                    <Clock size={10} aria-hidden="true" />
                    <p className="text-xs">Duration</p>
                  </div>
                  <p className="text-sm text-white font-mono">{durationDays.toFixed(0)}d</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1 text-zinc-500">
                    <Coins size={10} aria-hidden="true" />
                    <p className="text-xs">Repay</p>
                  </div>
                  <p className="text-sm text-white font-mono">{formatUnits(total, VFIDE_DECIMALS)}</p>
                </div>
              </div>

              <AcceptButton
                principal={loan.principal}
                maxBorrow={maxBorrow}
                connected={!!address}
                accepting={accepting === id.toString()}
                confirming={accepting === id.toString() && isConfirming}
                disabled={isPending || isConfirming}
                onClick={() => handleAccept(id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AcceptButtonProps {
  principal: bigint;
  maxBorrow: bigint;
  connected: boolean;
  accepting: boolean;
  confirming: boolean;
  disabled: boolean;
  onClick: () => void;
}

function AcceptButton({ principal, maxBorrow, connected, accepting, confirming, disabled, onClick }: AcceptButtonProps) {
  // If maxBorrow is 0 (not yet read or genuinely 0), don't gate — the
  // contract will revert clearly enough if the user really can't borrow.
  // Only gate when we have a positive ceiling that the offer exceeds.
  const tooLarge = connected && maxBorrow > 0n && principal > maxBorrow;

  if (!connected) {
    return (
      <button
        disabled
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-zinc-700/20 px-4 py-2 text-sm font-semibold text-zinc-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <CheckCircle size={14} aria-hidden="true" />
        Connect wallet to accept
      </button>
    );
  }

  if (tooLarge) {
    return (
      <button
        disabled
        title="This offer's principal exceeds your current borrow limit based on your ProofScore."
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-400 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <AlertCircle size={14} aria-hidden="true" />
        Above your borrow limit
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || accepting}
      className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent/20 hover:bg-accent/30 px-4 py-2 text-sm font-semibold text-accent transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      {accepting ? (
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <CheckCircle size={14} aria-hidden="true" />
      )}
      {confirming ? 'Confirming…' : accepting ? 'Submitting…' : 'Accept'}
    </button>
  );
}
