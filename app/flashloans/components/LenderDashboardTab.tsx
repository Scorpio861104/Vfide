'use client';

/**
 * Flash Loans: lender's own dashboard.
 *
 * Reads the user's LenderInfo and exposes Deposit / Withdraw actions.
 * Deposit becomes the first action for non-registered users (they must
 * meet MIN_INITIAL_LENDER_DEPOSIT on their first deposit).
 *
 * Previously this tab showed mocked "active flash loans" from
 * /api/flashloans/lanes — a wrong mental model. Flash loans are
 * atomic single-tx events, not term loans with an active state.
 */

import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits, parseUnits, erc20Abi } from 'viem';
import { Loader2, Zap, AlertCircle, Wallet, TrendingUp, Activity, Plus, Download } from 'lucide-react';
import {
  useLenderInfo,
  useDeposit,
  useWithdrawLender,
  translateFlashLoanError,
} from '@/hooks/useFlashLoan';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { isConfiguredContractAddress } from '@/lib/contracts';

const VFIDE_DECIMALS = 18;

export function LenderDashboardTab() {
  const { address } = useAccount();
  const addrs = useContractAddresses();
  const configured = isConfiguredContractAddress(addrs.VFIDEFlashLoan);
  const vfideConfigured = isConfiguredContractAddress(addrs.VFIDEToken);

  const { info, isLoading, refetch } = useLenderInfo();
  const {
    deposit,
    isPending: depositPending,
    isConfirming: depositConfirming,
    isConfirmed: depositConfirmed,
  } = useDeposit();
  const {
    withdraw,
    isPending: withdrawPending,
    isConfirming: withdrawConfirming,
    isConfirmed: withdrawConfirmed,
  } = useWithdrawLender();

  const [depositInput, setDepositInput] = useState('');
  const [withdrawInput, setWithdrawInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refetch the lender position when a deposit or withdraw confirms.
  // Also clear the input that the user just acted on, so the form is
  // reset only AFTER the chain confirms, not before.
  useEffect(() => {
    if (depositConfirmed) {
      refetch();
      setDepositInput('');
    }
  }, [depositConfirmed, refetch]);
  useEffect(() => {
    if (withdrawConfirmed) {
      refetch();
      setWithdrawInput('');
    }
  }, [withdrawConfirmed, refetch]);

  // VFIDE balance check for deposit pre-flight (avoid confusing ERC20
  // transferFrom revert at the approve step if they\u2019d be paying
  // beyond their wallet balance).
  const { data: vfideBalanceRaw } = useReadContract({
    address: addrs.VFIDEToken,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && vfideConfigured },
  });
  const vfideBalance = (vfideBalanceRaw as bigint | undefined) ?? 0n;

  // Parse the deposit input so we can compute insufficient state.
  let depositWei = 0n;
  if (depositInput) {
    try {
      depositWei = parseUnits(depositInput, VFIDE_DECIMALS);
    } catch {
      depositWei = 0n;
    }
  }
  const insufficientForDeposit = depositWei > 0n && vfideBalance < depositWei;

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Zap size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">Connect your wallet to manage your lender position.</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={40} className="text-zinc-600 mb-4" aria-hidden="true" />
        <p className="text-zinc-400">VFIDEFlashLoan isn&rsquo;t deployed on this network yet.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  const handleDeposit = async () => {
    setError(null);
    if (!depositInput) return;
    if (insufficientForDeposit) {
      setError(`Insufficient VFIDE — you have ${formatUnits(vfideBalance, VFIDE_DECIMALS)}.`);
      return;
    }
    try {
      const amount = parseUnits(depositInput, VFIDE_DECIMALS);
      await deposit(amount);
      // Input clearing + refetch are driven by the depositConfirmed
      // useEffect above. Keeping the input populated until confirmation
      // gives the user something to look at while they wait.
    } catch (e: unknown) {
      setError(translateFlashLoanError(e));
    }
  };

  const handleWithdraw = async () => {
    setError(null);
    if (!withdrawInput) return;
    let amount: bigint;
    try {
      amount = parseUnits(withdrawInput, VFIDE_DECIMALS);
    } catch {
      setError('Withdraw amount is invalid.');
      return;
    }
    if (info && amount > info.balance) {
      setError(
        `Can't withdraw more than your lender balance (${formatUnits(info.balance, VFIDE_DECIMALS)} VFIDE).`,
      );
      return;
    }
    try {
      await withdraw(amount);
      // Same: withdrawConfirmed useEffect handles input clear + refetch.
    } catch (e: unknown) {
      setError(translateFlashLoanError(e));
    }
  };

  if (!info?.registered) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={16} className="text-cyan-400" aria-hidden="true" />
            <h3 className="text-white font-semibold">Become a Lender</h3>
          </div>
          <p className="text-zinc-300 text-sm mb-4">
            Deposit VFIDE to make it available for flash loans. You earn fees on every loan
            that borrows from your balance. You can withdraw anytime, as long as your funds
            aren&rsquo;t in the middle of a loan (which only lasts one transaction anyway).
          </p>
          <div className="flex gap-2">
            <input
              type="number"
            inputMode="decimal"
              min="0"
              step="any"
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              placeholder="Amount in VFIDE"
              aria-label="Initial deposit amount"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={handleDeposit}
              disabled={depositPending || depositConfirming || !depositInput}
              className="flex items-center gap-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 px-4 py-2 text-sm font-semibold text-cyan-400 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {depositPending || depositConfirming ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Plus size={14} aria-hidden="true" />
              )}
              {depositPending ? 'Submitting…' : depositConfirming ? 'Confirming…' : 'Deposit'}
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} aria-hidden="true" />
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Available balance',
      value: `${formatUnits(info.balance, VFIDE_DECIMALS)} VFIDE`,
      icon: <Wallet size={14} className="text-cyan-400" aria-hidden="true" />,
    },
    {
      label: 'Fee rate',
      value: `${(Number(info.feeBps) / 100).toFixed(2)}%`,
      icon: <Activity size={14} className="text-purple-400" aria-hidden="true" />,
    },
    {
      label: 'Total earned',
      value: `${formatUnits(info.totalEarned, VFIDE_DECIMALS)} VFIDE`,
      icon: <TrendingUp size={14} className="text-emerald-400" aria-hidden="true" />,
    },
    {
      label: 'Loans facilitated',
      value: info.loanCount.toString(),
      icon: <Zap size={14} className="text-amber-400" aria-hidden="true" />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              {s.icon}
              <p className="text-xs text-zinc-400">{s.label}</p>
            </div>
            <p className="text-lg font-bold text-white font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {info.paused && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          You&rsquo;ve paused your lender position. No loans will be routed to your balance.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Plus size={16} className="text-cyan-400" aria-hidden="true" />
            <h3 className="text-white font-semibold text-sm">Top up</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
            inputMode="decimal"
              min="0"
              step="any"
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              placeholder="Amount"
              aria-label="Top-up amount in VFIDE"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={handleDeposit}
              disabled={depositPending || depositConfirming || !depositInput}
              className="rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 px-3 py-2 text-sm font-semibold text-cyan-400 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {depositPending || depositConfirming ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : 'Add'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Download size={16} className="text-emerald-400" aria-hidden="true" />
            <h3 className="text-white font-semibold text-sm">Withdraw</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
            inputMode="decimal"
              min="0"
              step="any"
              value={withdrawInput}
              onChange={(e) => setWithdrawInput(e.target.value)}
              placeholder="Amount"
              aria-label="Withdraw amount in VFIDE"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={handleWithdraw}
              disabled={withdrawPending || withdrawConfirming || !withdrawInput}
              className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-2 text-sm font-semibold text-emerald-400 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {withdrawPending || withdrawConfirming ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : 'Pull'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
