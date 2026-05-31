'use client';

export const dynamic = 'force-dynamic';

/**
 * /vault/safety/window — challenge period preference setting.
 *
 * The veto window is the time the owner has to challenge an incoming
 * recovery claim before it executes. Longer windows are safer (more time
 * to notice and respond) but slow legitimate recoveries when the owner
 * has genuinely lost their device. The owner picks the trade-off that
 * matches their situation.
 *
 * Contract behavior (CardBoundVault.setChallengePeriodPreference):
 *   - Accepts uint64 seconds in [MIN_CHALLENGE_PERIOD, MAX_CHALLENGE_PERIOD]
 *     = [3 days, 30 days], OR 0 for "use protocol default"
 *   - onlyAdmin gate (the owner's own wallet)
 *   - Reverts: CBV_ChallengePeriodTooShort, CBV_ChallengePeriodTooLong
 *   - SECURITY NOTE: setting takes effect for FUTURE claims only — never
 *     mutates an active claim. The active claim has its window snapshotted
 *     at initiation, so this setter cannot be weaponized by an attacker
 *     who has temporarily compromised admin.
 *
 * Closes M-CBV-01 (continuing) from VFIDE_CBV_FRONTEND_AUDIT.md — challenge
 * period preference had no UI. Owners could only view it (in VaultSafetyPanel)
 * but not change it.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { ArrowLeft, Clock, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/GlassCard';
import { useVaultHub } from '@/hooks/useVaultHub';
import { ACTIVE_VAULT_ABI } from '@/lib/contracts';
import { useLocale } from '@/lib/locale/LocaleProvider';

const SECONDS_PER_DAY = 86_400;
const MIN_DAYS = 3;
const MAX_DAYS = 30;

// Preset options. Numeric value = days; 0 = "use protocol default."
const PRESETS = [
  {
    days: 0,
    label: 'Use protocol default',
    sub: '7 days — recommended for most users',
    description:
      'Lets the protocol choose. Currently 7 days, but the team can adjust this in future versions based on real-world data.',
  },
  {
    days: 3,
    label: '3 days (minimum)',
    sub: 'Fast recovery, less time to react',
    description:
      'Recovery completes quickly if you lose your phone — but you only get 3 days to notice and challenge a malicious claim.',
  },
  {
    days: 7,
    label: '7 days',
    sub: 'Balanced — same as default',
    description:
      'A week to notice and challenge. Reasonable for most users with active phones and email habits.',
  },
  {
    days: 14,
    label: '14 days',
    sub: 'Cautious — extra time to respond',
    description:
      'Two weeks before any recovery completes. Good if you travel, take breaks from devices, or want extra confidence.',
  },
  {
    days: 30,
    label: '30 days (maximum)',
    sub: 'Maximum safety, slowest legitimate recovery',
    description:
      'Best for high-value vaults you can monitor closely. If you actually lose your phone, recovery will take a full month.',
  },
] as const;

function formatDays(seconds: bigint | number): string {
  const s = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  if (s === 0) return 'Using protocol default';
  const days = Math.floor(s / SECONDS_PER_DAY);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export default function ChallengeWindowPage() {
  const { locale } = useLocale();
  void locale;

  const { vaultAddress, hasVault } = useVaultHub();
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Selected preset, OR a custom day count if user typed one in.
  // null = nothing selected yet (initial state on page load).
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState<string>('');
  const [useCustom, setUseCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Read current preference from chain
  const { data: currentRaw, refetch: refetchCurrent } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'challengePeriodPreferenceView',
    query: { enabled: !!vaultAddress },
  });

  // Read admin (only admin can set preference)
  const { data: adminAddrRaw } = useReadContract({
    address: vaultAddress,
    abi: ACTIVE_VAULT_ABI,
    functionName: 'admin',
    query: { enabled: !!vaultAddress },
  });

  const currentSeconds = (currentRaw as bigint | undefined) ?? 0n;
  const currentDays = Number(currentSeconds) / SECONDS_PER_DAY;
  const isAdmin =
    !!connectedAddress &&
    !!adminAddrRaw &&
    connectedAddress.toLowerCase() === (adminAddrRaw as string).toLowerCase();

  // Pre-select the current preset on load
  useEffect(() => {
    if (currentRaw !== undefined && selectedDays === null) {
      const days = Number(currentSeconds) / SECONDS_PER_DAY;
      const matchingPreset = PRESETS.find((p) => p.days === days);
      if (matchingPreset) {
        setSelectedDays(matchingPreset.days);
      } else if (days > 0) {
        // Current value doesn't match a preset — it's a custom value
        setUseCustom(true);
        setCustomDays(String(days));
      }
    }
  }, [currentRaw, currentSeconds, selectedDays]);

  // Validate custom day input
  const customDaysNum = parseInt(customDays, 10);
  const customIsValid =
    !useCustom || (!isNaN(customDaysNum) && customDaysNum >= MIN_DAYS && customDaysNum <= MAX_DAYS);
  const finalDays = useCustom ? customDaysNum : selectedDays;
  const finalSeconds = finalDays === null || isNaN(finalDays) ? null : finalDays * SECONDS_PER_DAY;
  const hasUnsavedChange = finalSeconds !== null && BigInt(finalSeconds) !== currentSeconds;
  const canSubmit = isAdmin && hasUnsavedChange && customIsValid && !isWritePending;

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!vaultAddress) {
      setError('No vault detected on this wallet.');
      return;
    }
    if (finalSeconds === null) {
      setError('Pick a preset or enter a custom value first.');
      return;
    }
    if (!customIsValid) {
      setError(`Custom value must be between ${MIN_DAYS} and ${MAX_DAYS} days.`);
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: ACTIVE_VAULT_ABI,
        functionName: 'setChallengePeriodPreference',
        args: [BigInt(finalSeconds)],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setSuccess(
        finalDays === 0
          ? 'Preference set to protocol default.'
          : `Preference set to ${finalDays} day${finalDays === 1 ? '' : 's'}.`
      );
      await refetchCurrent();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.details || e?.message || 'Failed to update preference';
      setError(msg);
    }
  };

  return (
    <>
      <div className="min-h-screen md:pt-[3.5rem] text-white">
        <div className="container mx-auto max-w-3xl px-4 pb-16">
          <Link
            href="/vault/safety"
            className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent"
          >
            <ArrowLeft size={16} /> Back to safety overview
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
              <Clock className="text-accent" size={28} />
              Your veto window
            </h1>
            <p className="text-gray-400 leading-relaxed">
              When someone starts a recovery on your vault — either you from a new device, or a
              trustee on your behalf — there is a waiting period before the recovery completes.
              During this window, you can cancel the recovery from your existing wallet. This page
              lets you customize how long that window is.
            </p>
          </div>

          {/* Current state */}
          <GlassCard hover={false} className="mb-6 p-5">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 text-accent shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-sm text-gray-400">Current preference</p>
                <p className="text-xl font-bold text-white mt-1">{formatDays(currentSeconds)}</p>
                {currentDays > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Active recoveries use the value snapshotted at initiation. Changes here apply
                    to future claims only.
                  </p>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Tradeoff explainer */}
          <GlassCard hover={false} gradient="cyan" className="mb-6 p-5">
            <h3 className="text-sm font-bold text-accent mb-2">How to choose</h3>
            <ul className="text-sm text-gray-300 space-y-2 leading-relaxed">
              <li>
                <strong className="text-white">Shorter window (3 days):</strong> Faster real
                recoveries. Less time to react if something suspicious happens.
              </li>
              <li>
                <strong className="text-white">Longer window (14-30 days):</strong> More safety
                margin. Real recoveries take longer when you actually lose your phone.
              </li>
              <li>
                <strong className="text-white">Note:</strong> The protocol automatically extends
                the window to 14 days for vaults that were recently active — so even a &quot;3 days&quot;
                preference becomes a 14-day window if your vault is active when recovery starts.
                This means short preferences are mostly relevant for vaults you haven&apos;t touched in
                a while.
              </li>
            </ul>
          </GlassCard>

          {/* Presets */}
          <div className="space-y-3 mb-6">
            {PRESETS.map((preset) => {
              const isSelected = !useCustom && selectedDays === preset.days;
              return (
                <button
                  key={preset.days}
                  onClick={() => {
                    setUseCustom(false);
                    setSelectedDays(preset.days);
                    setError(null);
                    setSuccess(null);
                  }}
                  disabled={!isAdmin}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-accent bg-accent/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{preset.label}</span>
                        {isSelected && <CheckCircle2 className="text-accent" size={16} />}
                      </div>
                      <p className="text-xs text-accent mb-1">{preset.sub}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{preset.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Custom input */}
            <button
              onClick={() => {
                setUseCustom(true);
                setSelectedDays(null);
                setError(null);
                setSuccess(null);
              }}
              disabled={!isAdmin}
              className={`w-full text-left p-4 rounded-xl border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                useCustom ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white">Custom value</span>
                {useCustom && <CheckCircle2 className="text-accent" size={16} />}
              </div>
              <p className="text-xs text-accent mb-2">Any value between {MIN_DAYS} and {MAX_DAYS} days</p>
              {useCustom && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    min={MIN_DAYS}
                    max={MAX_DAYS}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder={`${MIN_DAYS}–${MAX_DAYS}`}
                    disabled={isWritePending}
                    className="w-32 px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 disabled:opacity-50"
                  />
                  <span className="ml-3 text-sm text-gray-400">days</span>
                  {!customIsValid && customDays && (
                    <p className="text-xs text-red-400 mt-2">
                      Must be a whole number between {MIN_DAYS} and {MAX_DAYS}.
                    </p>
                  )}
                </div>
              )}
            </button>
          </div>

          {!isAdmin && hasVault && (
            <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-300">
                  Only the vault admin can change this preference. Your connected wallet is not the
                  admin of this vault.
                </p>
              </div>
            </div>
          )}

          {!hasVault && (
            <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-300">No vault found on this wallet.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-300">{success}</p>
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={() => void handleSave()}
            disabled={!canSubmit}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-accent to-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWritePending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Save preference
              </>
            )}
          </button>

          {hasUnsavedChange && customIsValid && (
            <p className="text-xs text-gray-500 mt-3">
              You will change from <span className="text-white font-semibold">{formatDays(currentSeconds)}</span> to{' '}
              <span className="text-accent font-semibold">{formatDays((finalSeconds ?? 0))}</span>.
            </p>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
