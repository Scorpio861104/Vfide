'use client';

/**
 * Flash Loans: information panel for prospective borrowers.
 *
 * Flash-loan borrowers are CONTRACTS that implement
 * IERC3156FlashBorrower — an end-user wallet can't borrow directly.
 * The most this UI can do is help a developer plan an integration:
 *
 *   - Look up the cheapest lender with enough liquidity (findBestLender)
 *   - Quote the fee for a given amount (flashFee)
 *   - Show the entry-point address developers should target
 *
 * Anything else "Borrow"-like (collateral, duration, term) is the
 * wrong model — those belong in the term-loan flow at /lending.
 */

import { useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { Code, Info, Loader2, AlertCircle, Search } from 'lucide-react';
import { useFindBestLender, useFlashFee } from '@/hooks/useFlashLoan';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';

const VFIDE_DECIMALS = 18;

export function BorrowInfoTab() {
  const addrs = useContractAddresses();
  const configured = isConfiguredContractAddress(addrs.VFIDEFlashLoan);

  const [amountInput, setAmountInput] = useState('');
  const amountWei = (() => {
    if (!amountInput) return 0n;
    try {
      return parseUnits(amountInput, VFIDE_DECIMALS);
    } catch {
      return 0n;
    }
  })();

  const { lender, feeBps, isLoading: bestLoading } = useFindBestLender(amountWei);
  const { fee, isLoading: feeLoading } = useFlashFee(lender ?? undefined, amountWei);

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">VFIDEFlashLoan isn&rsquo;t deployed on this network yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-cyan-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-white font-semibold text-sm mb-1">How borrowing works</h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Flash loans are atomic: the entire borrow + use + repay happens in a single transaction.
              You can&rsquo;t borrow directly from a normal wallet — you need to deploy a contract that
              implements <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">IERC3156FlashBorrower</code>.
              Your contract calls <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">flashLoan(lender, receiver, amount, maxFeeBps, data)</code>,
              the protocol sends the tokens to it, runs <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">onFlashLoan</code>,
              and reverts the whole transaction if your contract hasn&rsquo;t paid back
              amount + fee by the end.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} className="text-cyan-400" aria-hidden="true" />
          <h3 className="text-white font-semibold text-sm">Quote a loan</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-3">
          Enter the principal you&rsquo;d want to borrow. The protocol finds the cheapest registered lender
          with enough liquidity and quotes the fee.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="Amount in VFIDE"
            aria-label="Flash loan amount to quote"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {amountWei > 0n && (
          <div className="space-y-2">
            {bestLoading ? (
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                Finding cheapest lender…
              </div>
            ) : lender ? (
              <>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
                  <span className="text-xs text-zinc-400">Best lender</span>
                  <span className="text-xs font-mono text-white">
                    {lender.slice(0, 10)}…{lender.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
                  <span className="text-xs text-zinc-400">Fee rate</span>
                  <span className="text-xs font-mono text-cyan-400">
                    {(Number(feeBps) / 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
                  <span className="text-xs text-zinc-400">Exact fee</span>
                  <span className="text-xs font-mono text-white">
                    {feeLoading ? (
                      <Loader2 size={11} className="animate-spin inline" aria-hidden="true" />
                    ) : (
                      `${formatUnits(fee, VFIDE_DECIMALS)} VFIDE`
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
                  <span className="text-xs text-zinc-400">Total repayment</span>
                  <span className="text-xs font-mono text-white">
                    {feeLoading ? (
                      <Loader2 size={11} className="animate-spin inline" aria-hidden="true" />
                    ) : (
                      `${formatUnits(amountWei + fee, VFIDE_DECIMALS)} VFIDE`
                    )}
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                No lender has enough liquidity for that amount right now.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Code size={16} className="text-purple-400" aria-hidden="true" />
          <h3 className="text-white font-semibold text-sm">Integration entry point</h3>
        </div>
        <p className="text-xs text-zinc-400 mb-2">VFIDEFlashLoan contract address:</p>
        <p className="text-xs font-mono text-white break-all rounded-lg bg-white/[0.03] border border-white/10 p-3">
          {addrs.VFIDEFlashLoan ?? 'Not deployed on this network'}
        </p>
      </div>
    </div>
  );
}
