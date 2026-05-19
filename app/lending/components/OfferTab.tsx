'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
/**
 * Lending: lender creates a new loan offer.
 *
 * Form: principal, interest %, duration days. The hook orchestrates
 * the ERC20 approve→createLoan sequence. After creation the loan
 * sits in OPEN state until a borrower accepts.
 *
 * Contract constraints baked into validation:
 *   - principal > 0
 *   - interest ≤ 12% (1200 bps)
 *   - duration 1–30 days
 *   - lender must not have > MAX_ACTIVE_LOANS (10) open
 */

import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, erc20Abi, formatUnits } from 'viem';
import { Plus, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useCreateLoan, translateTermLoanError } from '@/hooks/useTermLoan';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';

const VFIDE_DECIMALS = 18;

export function OfferTab() {
  const { address } = useAccount();
  const addrs = useContractAddresses();
  const configured = isConfiguredContractAddress(addrs.VFIDETermLoan);
  const vfideConfigured = isConfiguredContractAddress(addrs.VFIDEToken);

  const { createLoan, isPending, isConfirming, isConfirmed } = useCreateLoan();

  const [form, setForm] = useState({
    principal: '',
    interestPct: '5',
    durationDays: '7',
  });
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flip success only after confirmation, not just submission, so
  // the success view reflects the actual on-chain create.
  useEffect(() => {
    if (isConfirmed && submitted) {
      setSuccess(true);
      setSubmitted(false);
      setForm({ principal: '', interestPct: '5', durationDays: '7' });
    }
  }, [isConfirmed, submitted]);

  // Read the user's VFIDE balance. The contract pulls the full
  // principal at createLoan time via transferFrom, so the lender
  // needs to have at least `principal` VFIDE in their wallet —
  // not just approval. Checking here prevents a confusing
  // "ERC20: transfer amount exceeds balance" revert at the approve
  // step.
  const { data: vfideBalanceRaw } = useReadContract({
    address: addrs.VFIDEToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && vfideConfigured },
  });
  const vfideBalance = (vfideBalanceRaw as bigint | undefined) ?? 0n;

  // Parse the principal upfront so it can be used both for the balance
  // check and the submit handler.
  let principalWei = 0n;
  if (form.principal) {
    try {
      principalWei = parseUnits(form.principal, VFIDE_DECIMALS);
    } catch {
      principalWei = 0n;
    }
  }
  const insufficientBalance = principalWei > 0n && vfideBalance < principalWei;

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Plus size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">Connect your wallet to create a loan offer.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
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

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle size={48} className="text-emerald-400 mb-4" aria-hidden="true" />
        <h3 className="text-white font-bold text-lg mb-2">Offer Posted</h3>
        <p className="text-zinc-400 text-sm mb-6">
          Your offer is now visible in the Browse tab. Funds are locked in the contract until a borrower
          accepts or you cancel.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors"
        >
          Post Another
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // principalWei already computed at component scope for the balance check.
    if (principalWei === 0n) {
      setError('Principal must be greater than 0.');
      return;
    }
    if (insufficientBalance) {
      setError(`Insufficient VFIDE \u2014 you have ${formatUnits(vfideBalance, VFIDE_DECIMALS)} VFIDE.`);
      return;
    }

    const interestPct = parseFloat(form.interestPct);
    if (!Number.isFinite(interestPct) || interestPct < 0 || interestPct > 12) {
      setError('Interest must be between 0% and 12%.');
      return;
    }
    const interestBps = BigInt(Math.round(interestPct * 100));

    const durationDays = parseInt(form.durationDays, 10);
    if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 30) {
      setError('Duration must be between 1 and 30 days.');
      return;
    }
    const durationSeconds = BigInt(durationDays) * 86400n;

    try {
      await createLoan({
        principal: principalWei,
        interestBps,
        durationSeconds,
      });
      setSubmitted(true);
    } catch (e: unknown) {
      setError(translateTermLoanError(e));
    }
  };

  // Repayment estimate (exact bigint math, then formatted with viem's formatUnits
  // to avoid JS Number precision loss on large principals).
  const interestPctNum = parseFloat(form.interestPct || '0');
  const interestBpsBig = Number.isFinite(interestPctNum) ? BigInt(Math.round(interestPctNum * 100)) : 0n;
  const interestWei = principalWei > 0n ? (principalWei * interestBpsBig) / 10000n : 0n;
  const totalWei = principalWei + interestWei;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center gap-2 mb-5">
        <Plus size={16} className="text-cyan-400" aria-hidden="true" />
        <h3 className="text-white font-semibold">New Loan Offer</h3>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-zinc-300">
        <Info size={14} className="text-cyan-400 mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Two-tx flow: approve the TermLoan contract for the principal, then post the offer. Your VFIDE
          stays in the contract until accepted (you can cancel before then) and is paid out to the
          borrower automatically when their guardian co-signs.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="loan-principal" className="text-xs text-zinc-400 mb-1.5 block">
            Principal (VFIDE)
          </label>
          <input
            id="loan-principal"
            required
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="100"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            value={form.principal}
            onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value}))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="loan-interest" className="text-xs text-zinc-400 mb-1.5 block">
              Interest (% APR, max 12)
            </label>
            <input
              id="loan-interest"
              required
              type="number"
            inputMode="decimal"
              min="0"
              max="12"
              step="0.01"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              value={form.interestPct}
              onChange={(e) => setForm((f) => ({ ...f, interestPct: e.target.value}))}
            />
          </div>
          <div>
            <label htmlFor="loan-duration" className="text-xs text-zinc-400 mb-1.5 block">
              Duration (days, 1–30)
            </label>
            <input
              id="loan-duration"
              required
              type="number"
            inputMode="decimal"
              min="1"
              max="30"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              value={form.durationDays}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value}))}
            />
          </div>
        </div>

        {principalWei > 0n && (
          <p className="text-xs text-zinc-400">
            Borrower owes you <span className="text-cyan-400 font-mono">{formatUnits(totalWei, VFIDE_DECIMALS)} VFIDE</span> total
            (<span className="font-mono">{formatUnits(interestWei, VFIDE_DECIMALS)}</span> interest)
            at end of term.
          </p>
        )}

        {insufficientBalance && (
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <AlertCircle size={14} aria-hidden="true" />
            Insufficient VFIDE — you have {formatUnits(vfideBalance, VFIDE_DECIMALS)}.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={14} aria-hidden="true" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || isConfirming || insufficientBalance}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm font-semibold transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          {isPending || isConfirming ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          {isPending ? 'Submitting…' : isConfirming ? 'Confirming…' : 'Post Offer'}
        </button>
      </form>
    </div>
  );
}
