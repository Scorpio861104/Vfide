'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { CheckCircle2, Info } from 'lucide-react';

import { useVaultHub } from '@/hooks/useVaultHub';
import { CARD_BOUND_VAULT_ABI } from '@/lib/contracts';
import { safeParseFloat } from '@/lib/validation';
import { ChapterShell } from '../ChapterShell';

interface SpendLimitsChapterProps {
  onComplete: () => void;
  onSkip: () => void;
}

const DEFAULT_PER_TRANSFER = '100';
const DEFAULT_PER_DAY = '500';
const DEFAULT_LARGE_THRESHOLD = '50';

/**
 * Sets per-transfer, per-day, and large-transfer threshold limits on the
 * CardBoundVault. Two separate writes:
 *
 *   - setSpendLimits(perTransfer, perDay)
 *   - setLargeTransferThreshold(threshold)
 *
 * We fire them sequentially and wait for both confirmations before marking
 * the chapter done, so the user sees the on-chain values match what they
 * entered before they move on. The wizard can also skip this chapter; the
 * on-chain defaults of 0 mean "no limit" which is permissive but valid.
 */
export function SpendLimitsChapter({ onComplete, onSkip }: SpendLimitsChapterProps) {
  const { vaultAddress, hasVault } = useVaultHub();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const { data: currentMaxPerTransfer } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'maxPerTransfer',
    query: { enabled: !!vaultAddress },
  });
  const { data: currentDailyLimit } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'dailyTransferLimit',
    query: { enabled: !!vaultAddress },
  });
  const { data: currentLargeThreshold } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'largeTransferThreshold',
    query: { enabled: !!vaultAddress },
  });

  const currentMaxFormatted = useMemo(
    () => (currentMaxPerTransfer ? formatUnits(currentMaxPerTransfer as bigint, 18) : '0'),
    [currentMaxPerTransfer],
  );
  const currentDailyFormatted = useMemo(
    () => (currentDailyLimit ? formatUnits(currentDailyLimit as bigint, 18) : '0'),
    [currentDailyLimit],
  );
  const currentLargeFormatted = useMemo(
    () => (currentLargeThreshold ? formatUnits(currentLargeThreshold as bigint, 18) : '0'),
    [currentLargeThreshold],
  );

  const [perTransfer, setPerTransfer] = useState(DEFAULT_PER_TRANSFER);
  const [perDay, setPerDay] = useState(DEFAULT_PER_DAY);
  const [largeThreshold, setLargeThreshold] = useState(DEFAULT_LARGE_THRESHOLD);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useDefaults = useCallback(() => {
    setPerTransfer(DEFAULT_PER_TRANSFER);
    setPerDay(DEFAULT_PER_DAY);
    setLargeThreshold(DEFAULT_LARGE_THRESHOLD);
  }, []);

  const handleApply = useCallback(async () => {
    if (!vaultAddress) {
      setError('Vault address unavailable. Re-open the wizard once your vault is created.');
      return;
    }

    const perTransferNum = safeParseFloat(perTransfer, 0);
    const perDayNum = safeParseFloat(perDay, 0);
    const largeThresholdNum = safeParseFloat(largeThreshold, -1);

    if (perTransferNum <= 0 || perDayNum <= 0) {
      setError('Per-transfer and per-day limits must be greater than zero.');
      return;
    }
    if (perTransferNum > perDayNum) {
      setError('Per-transfer limit can\u2019t exceed the daily limit.');
      return;
    }
    if (largeThresholdNum < 0) {
      setError('Large-transfer threshold must be zero or positive.');
      return;
    }

    setIsWorking(true);
    setError(null);
    try {
      const limitsHash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'setSpendLimits',
        args: [parseUnits(perTransfer, 18), parseUnits(perDay, 18)],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: limitsHash });
      }

      const thresholdHash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'setLargeTransferThreshold',
        args: [parseUnits(largeThreshold || '0', 18)],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: thresholdHash });
      }

      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply spend limits';
      if (message.includes('rejected') || message.includes('denied')) {
        setError('Transaction cancelled.');
      } else {
        setError(message);
      }
    } finally {
      setIsWorking(false);
    }
  }, [vaultAddress, perTransfer, perDay, largeThreshold, writeContractAsync, publicClient, onComplete]);

  if (!hasVault) {
    return (
      <ChapterShell
        chapter="spendLimits"
        description="Spend limits attach to your vault contract — create your vault first."
        onPrimary={onSkip}
        onSkip={onSkip}
        primaryLabel="Continue"
        notice={{ tone: 'info', text: 'Create your vault first; you can return to this chapter afterwards.' }}
      >
        <p className="text-sm text-white/60">
          You can revisit this step from the Vault page or by re-opening the wizard.
        </p>
      </ChapterShell>
    );
  }

  return (
    <ChapterShell
      chapter="spendLimits"
      description="Cap how much can leave your vault in one transfer and in 24 hours. Anything above the large-transfer threshold enters a timelocked queue you can cancel."
      onPrimary={handleApply}
      onSkip={onSkip}
      isWorking={isWorking}
      primaryLabel="Apply limits"
      notice={error ? { tone: 'error', text: error } : null}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <LimitField
            label="Per transfer (VFIDE)"
            value={perTransfer}
            onChange={setPerTransfer}
            hint={`On-chain now: ${currentMaxFormatted}`}
          />
          <LimitField
            label="Per day (VFIDE)"
            value={perDay}
            onChange={setPerDay}
            hint={`On-chain now: ${currentDailyFormatted}`}
          />
          <LimitField
            label="Large-transfer threshold (VFIDE)"
            value={largeThreshold}
            onChange={setLargeThreshold}
            hint={`On-chain now: ${currentLargeFormatted}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={useDefaults}
            disabled={isWorking}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            <CheckCircle2 size={14} aria-hidden />
            Use sensible defaults
          </button>
          <span className="text-white/40">
            Defaults: {DEFAULT_PER_TRANSFER}/{DEFAULT_PER_DAY} VFIDE, queue at {DEFAULT_LARGE_THRESHOLD}.
          </span>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/70">
          <Info className="mt-0.5 flex-shrink-0 text-cyan-300" size={14} aria-hidden />
          Setting any value to 0 means &ldquo;no limit&rdquo; on-chain. That&rsquo;s permissive — better to keep
          tight caps that match your real spending. You can change these later from the Vault page.
        </div>
      </div>
    </ChapterShell>
  );
}

function LimitField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-white/60">
      <span className="font-semibold uppercase tracking-wider text-white/70">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-accent"
      />
      <span className="text-white/40">{hint}</span>
    </label>
  );
}
