'use client';

import { useMemo, useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { m } from 'framer-motion';
import { Shield, Zap, Lock, Clock, Info, Check } from 'lucide-react';
import { formatUnits, parseUnits } from 'viem';
import CardBoundVaultABI from '@/lib/abis/CardBoundVault.json';
import { useUserVault } from '@/hooks/useVaultHooks';

/**
 * Per-transfer / daily / large-transfer-threshold configurator.
 *
 * Recovery-time threat model: the daily limit is the OFF-RAMP CAP for a
 * compromised key. Anything at or above it goes into the 7-day queue, where
 * guardians can cancel.
 *
 * UX principles for the presets:
 *   - "Conservative" assumes you DO want most withdrawals to queue. Best
 *     fit for vaults that aren't used for daily spend.
 *   - "Balanced" is the default. Daily limit roughly = one realistic day
 *     of spend; per-transfer cap = a typical single tap.
 *   - "Permissive" is for users who use the vault as a hot wallet and accept
 *     more device-grab exposure.
 *
 * After the vault's guardian setup is complete, `setSpendLimits` proposes a
 * 7-day-delayed change rather than applying instantly. The UI surfaces that.
 */

interface SpendLimitPreset {
  id: 'conservative' | 'balanced' | 'permissive' | 'custom';
  label: string;
  description: string;
  maxPerTransferVfide: string;
  dailyTransferLimitVfide: string;
  /** Optional: large-transfer threshold override. If omitted, the contract
   *  keeps largeTransferThreshold = dailyTransferLimit (its default at construction). */
  largeTransferThresholdVfide?: string;
  icon: React.ReactNode;
  accent: string;
}

const PRESETS: SpendLimitPreset[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Most withdrawals queue. Best for store-of-value vaults.',
    maxPerTransferVfide: '50',
    dailyTransferLimitVfide: '200',
    icon: <Lock size={18} />,
    accent: 'border-accent text-accent bg-accent/10',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Everyday spend goes through, larger amounts queue.',
    maxPerTransferVfide: '100',
    dailyTransferLimitVfide: '1000',
    icon: <Shield size={18} />,
    accent: 'border-purple-500 text-purple-400 bg-purple-500/10',
  },
  {
    id: 'permissive',
    label: 'Permissive',
    description: 'Hot-wallet mode. Higher device-grab exposure.',
    maxPerTransferVfide: '1000',
    dailyTransferLimitVfide: '10000',
    icon: <Zap size={18} />,
    accent: 'border-amber-500 text-amber-400 bg-amber-500/10',
  },
];

interface SpendLimitsConfiguratorProps {
  /** Override vault address (otherwise read from useUserVault). */
  vaultAddress?: `0x${string}`;
  /** Called after a successful instant apply or proposal submission. */
  onComplete?: () => void;
  /** Render a compact card without the surrounding heading. */
  compact?: boolean;
}

export function SpendLimitsConfigurator({
  vaultAddress: overrideVault,
  onComplete,
  compact = false,
}: SpendLimitsConfiguratorProps) {
  const { address } = useAccount();
  const { vaultAddress: userVault } = useUserVault();
  const vaultAddress = overrideVault ?? (userVault as `0x${string}` | undefined);

  const [selectedPreset, setSelectedPreset] = useState<SpendLimitPreset['id']>('balanced');
  const [customMaxPerTransfer, setCustomMaxPerTransfer] = useState('100');
  const [customDailyLimit, setCustomDailyLimit] = useState('1000');
  const [customLargeThreshold, setCustomLargeThreshold] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'idle' | 'success' | 'error'; message?: string }>({
    kind: 'idle',
  });

  // Read current limits
  const { data: currentMaxPerTransfer } = useReadContract({
    address: vaultAddress,
    abi: CardBoundVaultABI,
    functionName: 'maxPerTransfer',
    query: { enabled: !!vaultAddress },
  });
  const { data: currentDailyLimit } = useReadContract({
    address: vaultAddress,
    abi: CardBoundVaultABI,
    functionName: 'dailyTransferLimit',
    query: { enabled: !!vaultAddress },
  });
  const { data: currentLargeThreshold } = useReadContract({
    address: vaultAddress,
    abi: CardBoundVaultABI,
    functionName: 'largeTransferThreshold',
    query: { enabled: !!vaultAddress },
  });

  // We use vault's guardianSetupComplete-equivalent via vaultHub call;
  // a simpler heuristic: if guardianThreshold > 0 AND any guardians, treat
  // it as configured. For now we surface BOTH potential outcomes in the UI
  // (instant apply vs 7-day proposal) so the user isn't surprised either way.

  const { writeContractAsync } = useWriteContract();

  const activeValues = useMemo(() => {
    if (selectedPreset === 'custom') {
      return {
        maxPerTransfer: customMaxPerTransfer,
        dailyLimit: customDailyLimit,
        largeThreshold: customLargeThreshold,
      };
    }
    const preset = PRESETS.find((p) => p.id === selectedPreset)!;
    return {
      maxPerTransfer: preset.maxPerTransferVfide,
      dailyLimit: preset.dailyTransferLimitVfide,
      largeThreshold: preset.largeTransferThresholdVfide ?? '',
    };
  }, [selectedPreset, customMaxPerTransfer, customDailyLimit, customLargeThreshold]);

  // Validation
  const validationError = useMemo(() => {
    try {
      const maxVal = parseUnits(activeValues.maxPerTransfer || '0', 18);
      const d = parseUnits(activeValues.dailyLimit || '0', 18);
      if (maxVal === 0n) return 'Max per transfer must be greater than 0.';
      if (d === 0n) return 'Daily limit must be greater than 0.';
      if (maxVal > d) return 'Max per transfer cannot exceed daily limit.';
      if (activeValues.largeThreshold) {
        const l = parseUnits(activeValues.largeThreshold, 18);
        if (l === 0n) return 'Large-transfer threshold must be greater than 0.';
      }
      return null;
    } catch {
      return 'Amounts must be numeric (e.g. 100 or 100.5).';
    }
  }, [activeValues]);

  const handleApply = async () => {
    if (!vaultAddress || validationError) return;
    setBusy(true);
    setStatus({ kind: 'idle' });
    try {
      const maxWei = parseUnits(activeValues.maxPerTransfer, 18);
      const dailyWei = parseUnits(activeValues.dailyLimit, 18);

      await writeContractAsync({
        address: vaultAddress,
        abi: CardBoundVaultABI,
        functionName: 'setSpendLimits',
        args: [maxWei, dailyWei],
      });

      // Optional: override largeTransferThreshold if user provided one.
      if (activeValues.largeThreshold) {
        const lWei = parseUnits(activeValues.largeThreshold, 18);
        await writeContractAsync({
          address: vaultAddress,
          abi: CardBoundVaultABI,
          functionName: 'setLargeTransferThreshold',
          args: [lWei],
        });
      }

      setStatus({
        kind: 'success',
        message:
          'Spend limits saved. If your guardian setup is complete, the change enters a 7-day timelock and will apply automatically after that.',
      });
      onComplete?.();
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to save limits.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (!address) {
    return (
      <div className="text-center py-8 text-gray-400">Connect your wallet to configure spend limits.</div>
    );
  }
  if (!vaultAddress) {
    return (
      <div className="text-center py-8 text-gray-400">
        No vault detected. Create your vault first, then configure limits here.
      </div>
    );
  }

  const Wrapper = compact ? 'div' : m.div;
  const wrapperProps = compact
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  return (
    <Wrapper
      {...wrapperProps}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl p-6 space-y-5"
    >
      {!compact && (
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent" />
            Spend Limits
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Caps below trigger the vault&apos;s withdrawal-queue protection. Anything
            at or above the daily limit goes into a 7-day queue your guardians
            can cancel.
          </p>
        </div>
      )}

      {/* Current values */}
      {(currentMaxPerTransfer !== undefined ||
        currentDailyLimit !== undefined ||
        currentLargeThreshold !== undefined) && (
        <div className="rounded-lg bg-gray-900/60 border border-gray-800 p-3 text-xs space-y-1">
          <div className="text-gray-400">Current settings on chain:</div>
          <div className="text-white">
            Max per transfer:{' '}
            <span className="font-mono">
              {currentMaxPerTransfer !== undefined
                ? `${formatUnits(currentMaxPerTransfer as bigint, 18)} VFIDE`
                : '—'}
            </span>
          </div>
          <div className="text-white">
            Daily limit:{' '}
            <span className="font-mono">
              {currentDailyLimit !== undefined
                ? `${formatUnits(currentDailyLimit as bigint, 18)} VFIDE`
                : '—'}
            </span>
          </div>
          <div className="text-white">
            Queue threshold:{' '}
            <span className="font-mono">
              {currentLargeThreshold !== undefined
                ? `${formatUnits(currentLargeThreshold as bigint, 18)} VFIDE`
                : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Preset cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PRESETS.map((preset) => {
          const active = selectedPreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedPreset(preset.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                active
                  ? preset.accent
                  : 'border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {preset.icon}
                <span className="font-bold">{preset.label}</span>
                {active && <Check size={14} className="ml-auto" />}
              </div>
              <div className="text-xs">{preset.description}</div>
              <div className="text-xs mt-2 font-mono opacity-80">
                {preset.maxPerTransferVfide} / {preset.dailyTransferLimitVfide} VFIDE
              </div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSelectedPreset('custom')}
          className={`text-left p-4 rounded-xl border transition-all md:col-span-3 ${
            selectedPreset === 'custom'
              ? 'border-pink-500 text-pink-400 bg-pink-500/10'
              : 'border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Info size={16} />
            <span className="font-bold">Custom</span>
            {selectedPreset === 'custom' && <Check size={14} className="ml-auto" />}
          </div>
          <div className="text-xs">Pick your own values below.</div>
        </button>
      </div>

      {/* Custom inputs (always visible — user can fine-tune even from a preset) */}
      {selectedPreset === 'custom' && (
        <div className="space-y-3 rounded-lg border border-pink-500/30 bg-gray-900/40 p-4">
          <Field
            label="Max per transfer (VFIDE)"
            value={customMaxPerTransfer}
            onChange={setCustomMaxPerTransfer}
            hint="Single transaction cap. Stays under this = no queue."
          />
          <Field
            label="Daily limit (VFIDE)"
            value={customDailyLimit}
            onChange={setCustomDailyLimit}
            hint="Cumulative 24h cap. Withdrawals at/above this auto-queue 7 days."
          />
          <Field
            label="Queue threshold (VFIDE, optional)"
            value={customLargeThreshold}
            onChange={setCustomLargeThreshold}
            hint="Leave blank to use the daily limit. Lower = more aggressive queueing."
          />
        </div>
      )}

      {/* Help block */}
      <div className="rounded-lg bg-accent/10 border border-accent/30 p-3 text-xs text-accent flex gap-2">
        <Clock size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          <strong>How the queue works:</strong> a withdrawal at or above your
          queue threshold doesn&apos;t execute immediately — it sits in a 7-day
          queue. Any guardian (or you) can cancel it during that window. This is
          your safety net if your wallet is compromised. Smaller thresholds =
          more protection, more queued transactions you&apos;ll review.
        </span>
      </div>

      {/* Error / success */}
      {validationError && (
        <div className="text-sm text-red-400">{validationError}</div>
      )}
      {status.kind === 'success' && (
        <div className="text-sm text-green-400">{status.message}</div>
      )}
      {status.kind === 'error' && (
        <div className="text-sm text-red-400">{status.message}</div>
      )}

      <button
        type="button"
        onClick={handleApply}
        disabled={busy || !!validationError}
        className="w-full py-3 rounded-lg bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        {busy ? 'Submitting…' : 'Save limits'}
      </button>
    </Wrapper>
  );
}

function Field({
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
    <div>
      <label className="block text-xs font-medium text-white mb-1">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-white"
      />
      <div className="text-[10px] text-gray-500 mt-1">{hint}</div>
    </div>
  );
}
