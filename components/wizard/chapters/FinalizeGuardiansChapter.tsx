'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

import { useVaultHub } from '@/hooks/useVaultHub';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { CARD_BOUND_VAULT_ABI, VAULT_HUB_ABI } from '@/lib/contracts';
import { ChapterShell } from '../ChapterShell';

interface FinalizeGuardiansChapterProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Finalize guardian setup by:
 *   1. Setting guardianThreshold (via CardBoundVault.setGuardianThreshold,
 *      bootstrap-only) — minimum 2.
 *   2. Calling VaultHub.completeGuardianSetup to lock in the configuration.
 *
 * After step 2, the vault enters the post-bootstrap regime where guardian
 * changes go through propose/apply timelocks. The user can skip — they can
 * finalize later from the Guardians page.
 */
export function FinalizeGuardiansChapter({
  onComplete,
  onSkip,
}: FinalizeGuardiansChapterProps) {
  const { vaultAddress, hasVault } = useVaultHub();
  const CONTRACT_ADDRESSES = useContractAddresses();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const { data: guardianCountRaw, refetch: refetchCount } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: !!vaultAddress },
  });
  const { data: thresholdRaw, refetch: refetchThreshold } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianThreshold',
    query: { enabled: !!vaultAddress },
  });
  const { data: setupCompleteRaw, refetch: refetchSetupComplete } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'guardianSetupComplete',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: { enabled: !!vaultAddress && !!CONTRACT_ADDRESSES.VaultHub },
  });

  const guardianCount = useMemo(
    () => (typeof guardianCountRaw === 'bigint' ? Number(guardianCountRaw) : 0),
    [guardianCountRaw],
  );
  const currentThreshold = useMemo(
    () => (typeof thresholdRaw === 'bigint' ? Number(thresholdRaw) : 0),
    [thresholdRaw],
  );
  const alreadyComplete = Boolean(setupCompleteRaw);

  const defaultThreshold = guardianCount >= 3 ? 2 : Math.max(guardianCount, 2);
  const [thresholdInput, setThresholdInput] = useState<number>(
    currentThreshold >= 2 ? currentThreshold : defaultThreshold,
  );

  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFinalize = guardianCount >= 2 && thresholdInput >= 2 && !alreadyComplete;

  const handleFinalize = useCallback(async () => {
    if (!vaultAddress || !CONTRACT_ADDRESSES.VaultHub) return;
    setError(null);
    setIsWorking(true);
    try {
      // Step 1: set threshold if it differs (bootstrap-only on the vault).
      if (currentThreshold !== thresholdInput) {
        if (thresholdInput < 2 || thresholdInput > guardianCount) {
          throw new Error(
            `Threshold must be between 2 and ${guardianCount}. Add more guardians or pick a lower threshold.`,
          );
        }
        const thresholdHash = await writeContractAsync({
          address: vaultAddress,
          abi: CARD_BOUND_VAULT_ABI,
          functionName: 'setGuardianThreshold',
          args: [thresholdInput],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: thresholdHash });
        }
        await refetchThreshold();
      }

      // Step 2: complete guardian setup on the hub.
      const completeHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.VaultHub,
        abi: VAULT_HUB_ABI,
        functionName: 'completeGuardianSetup',
        args: [vaultAddress],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: completeHash });
      }
      await refetchSetupComplete();
      await refetchCount();
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to finalize guardian setup';
      if (message.includes('rejected') || message.includes('denied')) {
        setError('Transaction cancelled.');
      } else {
        setError(message);
      }
    } finally {
      setIsWorking(false);
    }
  }, [
    vaultAddress,
    CONTRACT_ADDRESSES.VaultHub,
    currentThreshold,
    thresholdInput,
    guardianCount,
    writeContractAsync,
    publicClient,
    refetchThreshold,
    refetchSetupComplete,
    refetchCount,
    onComplete,
  ]);

  if (!hasVault) {
    return (
      <ChapterShell
        chapter="finalizeGuardians"
        description="Finalize-guardians runs on your vault. Create your vault first."
        onPrimary={onSkip}
        onSkip={onSkip}
        primaryLabel="Continue"
        notice={{ tone: 'info', text: 'Create your vault first, then return to finalize.' }}
      >
        <p className="text-sm text-white/60">
          You can revisit this chapter from the Guardians page or by re-opening the wizard.
        </p>
      </ChapterShell>
    );
  }

  if (alreadyComplete) {
    return (
      <ChapterShell
        chapter="finalizeGuardians"
        description="Guardian setup is already finalized for this vault."
        onPrimary={onComplete}
        primaryLabel="Continue"
      >
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 size={18} aria-hidden />
          <span className="text-sm font-semibold">Locked in — {guardianCount} guardians, threshold {currentThreshold}</span>
        </div>
        <p className="mt-2 text-xs text-white/60">
          Future guardian changes go through propose/apply timelocks for safety.
        </p>
      </ChapterShell>
    );
  }

  return (
    <ChapterShell
      chapter="finalizeGuardians"
      description="Activate recovery protection. Planning ahead now reduces the risk of permanent loss if your wallet is compromised or access is lost."
      onPrimary={handleFinalize}
      onSkip={onSkip}
      isWorking={isWorking}
      primaryDisabled={!canFinalize}
      primaryLabel="Enable Recovery Features"
      notice={
        error
          ? { tone: 'error', text: error }
          : guardianCount < 2
            ? {
                tone: 'info',
                text: 'You need at least 2 guardians to finalize. Add more in the previous chapter.',
              }
            : null
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Guardians on vault" value={guardianCount} />
          <Stat label="Current threshold" value={currentThreshold || '—'} />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Approval threshold
          </label>
          <p className="mb-2 mt-1 text-xs text-white/60">
            How many guardian signatures are required to approve a wallet rotation. Minimum 2;
            most users pick 2 of 2 or 2 of 3.
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: Math.max(guardianCount - 1, 0) }, (_, i) => i + 2).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setThresholdInput(n)}
                disabled={isWorking}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                  thresholdInput === n
                    ? 'border-purple-400 bg-purple-500/30 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                } disabled:opacity-50`}
              >
                {n} of {guardianCount}
              </button>
            ))}
            {guardianCount < 2 && (
              <span className="text-xs text-white/40">Need 2+ guardians to pick a threshold.</span>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-100">
          <AlertTriangle className="mt-0.5 flex-shrink-0 text-amber-300" size={14} aria-hidden />
          Recovery works best with independent guardians. Add trusted family, close friends, or partners
          who can reliably support emergency approvals.
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck size={14} aria-hidden />
          Two transactions: set threshold (if it changed) and complete setup on the hub.
        </div>
      </div>
    </ChapterShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-xs uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
