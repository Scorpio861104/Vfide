'use client';

/**
 * BorrowTab — ERC-3156 flash loan execution panel.
 *
 * Flash loans on VFIDE are ATOMIC — they execute and repay within a
 * single transaction. There is:
 *   • NO collateral
 *   • NO duration / repayment schedule
 *   • NO peer-to-peer negotiation
 *
 * The borrower must be a SMART CONTRACT that implements
 * IERC3156FlashBorrower.onFlashLoan(). This form constructs the
 * flashLoan(lender, receiver, amount, maxFeeBps, data) call.
 *
 * Contract: VFIDEFlashLoan.sol
 *   flashLoan(lender, receiver, amount, maxFeeBps, data) → bool
 *   DEFAULT_FEE_BPS = 9  (0.09%)
 *   MAX_LENDER_FEE_BPS = 100 (1.00%)
 *   BORROWER_COOLDOWN = 60 seconds between borrows
 */

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { Zap, Loader2, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useFlashFee, useFindBestLender } from '@/hooks/useFlashLoan';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';
import { VFIDEFlashLoanABI } from '@/lib/abis';

const VFIDE_DECIMALS = 18;
const DEFAULT_MAX_FEE_BPS = 9n; // 0.09%

interface FormState {
  receiverAddress: string;
  lenderAddress: string;
  amount: string;
  maxFeeBps: string;
}

const DEFAULT_FORM: FormState = {
  receiverAddress: '',
  lenderAddress: '',
  amount: '',
  maxFeeBps: '9',
};

export function BorrowTab() {
  const { address } = useAccount();
  const addrs = useContractAddresses();
  const configured = isConfiguredContractAddress(addrs.VFIDEFlashLoan);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Parse amount for fee preview
  const amountWei = (() => {
    try { return form.amount ? parseUnits(form.amount, VFIDE_DECIMALS) : 0n; }
    catch { return 0n; }
  })();

  // Auto-find best lender if none provided
  const { lender: bestLender } = useFindBestLender(amountWei);
  const lenderAddr = (form.lenderAddress && isAddress(form.lenderAddress))
    ? (form.lenderAddress as `0x${string}`)
    : bestLender ?? undefined;

  // Live fee preview from contract
  const { fee: feeWei } = useFlashFee(lenderAddr, amountWei);
  const feePct = feeWei && amountWei > 0n
    ? ((Number(feeWei) / Number(amountWei)) * 100).toFixed(4)
    : null;

  // On-chain write
  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const loading = isPending || isConfirming;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !configured) return;

    const receiver = form.receiverAddress.trim() as `0x${string}`;
    const lender = lenderAddr;
    const maxFee = BigInt(form.maxFeeBps || '9');

    if (!isAddress(receiver)) return;
    if (!lender || !isAddress(lender)) return;

    writeContract({
      address: addrs.VFIDEFlashLoan,
      abi: VFIDEFlashLoanABI as any,
      functionName: 'flashLoan',
      args: [lender, receiver, amountWei, maxFee, '0x'],
    });
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle size={40} className="text-emerald-400 mb-3" aria-hidden="true" />
        <h3 className="text-white font-semibold mb-1">Flash loan executed!</h3>
        <p className="text-zinc-400 text-sm mb-4">
          The loan was borrowed, your strategy ran, and repayment was collected — all in one transaction.
        </p>
        <button
          onClick={() => { reset(); setForm(DEFAULT_FORM); }}
          className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors"
        >
          Execute another
        </button>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">VFIDEFlashLoan isn&rsquo;t deployed on this network yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Info size={15} className="text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-xs text-amber-200/80">
          Flash loans execute atomically — borrow and repay happen within a single transaction.
          Your <strong>receiver</strong> must be a smart contract that implements{' '}
          <code className="font-mono text-amber-300">IERC3156FlashBorrower.onFlashLoan()</code>.
          No collateral is required; if repayment fails, the entire transaction reverts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Receiver contract */}
        <div>
          <label htmlFor="fl-receiver" className="block text-xs text-zinc-400 mb-1">
            Receiver Contract Address <span className="text-zinc-500">(must implement onFlashLoan)</span>
          </label>
          <input
            id="fl-receiver"
            type="text"
            value={form.receiverAddress}
            onChange={(e) => set('receiverAddress', e.target.value)}
            placeholder="0x…"
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="fl-amount" className="block text-xs text-zinc-400 mb-1">
            Borrow Amount (VFIDE)
          </label>
          <input
            id="fl-amount"
            type="number"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            min="0.000001"
            step="any"
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
          {feePct && feeWei !== undefined && (
            <p className="text-xs text-zinc-500 mt-1">
              Estimated fee: {formatUnits(feeWei, VFIDE_DECIMALS)} VFIDE ({feePct}%)
            </p>
          )}
        </div>

        {/* Lender + max fee in two columns */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fl-lender" className="block text-xs text-zinc-400 mb-1">
              Lender Address <span className="text-zinc-500">(leave blank for cheapest)</span>
            </label>
            <input
              id="fl-lender"
              type="text"
              value={form.lenderAddress}
              onChange={(e) => set('lenderAddress', e.target.value)}
              placeholder={bestLender ? `${bestLender.slice(0, 8)}… (best)` : '0x…'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label htmlFor="fl-maxfee" className="block text-xs text-zinc-400 mb-1">
              Max Fee (bps) — {((parseInt(form.maxFeeBps || '9', 10)) / 100).toFixed(2)}%
            </label>
            <input
              id="fl-maxfee"
              type="number"
              value={form.maxFeeBps}
              onChange={(e) => set('maxFeeBps', e.target.value)}
              min="0"
              max="100"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {writeError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={14} className="text-red-400 shrink-0" aria-hidden="true" />
            <p className="text-xs text-red-400">{(writeError as Error).message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !address || !amountWei}
          className="w-full py-2.5 rounded-lg bg-amber-500/20 text-amber-400 font-semibold text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {loading ? 'Executing…' : 'Execute Flash Loan'}
        </button>
      </form>
    </div>
  );
}
