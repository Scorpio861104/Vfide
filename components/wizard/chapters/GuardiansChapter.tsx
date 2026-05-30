'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAddress } from 'viem';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { Plus, ShieldCheck } from 'lucide-react';

import { useVaultHub } from '@/hooks/useVaultHub';
import { useVaultRecovery } from '@/hooks/useVaultRecovery';
import { CARD_BOUND_VAULT_ABI } from '@/lib/contracts';
import { ChapterShell } from '../ChapterShell';

interface GuardiansChapterProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Add guardian addresses to the vault. Guardians are needed for
 * non-custodial wallet rotation; the protocol requires ≥2 + at least
 * one independent (not the owner). This chapter focuses on collecting
 * the addresses; threshold-setting + finalize are the next chapter.
 *
 * The guardian list can be read from the vault via guardian-getter
 * functions, but useVaultRecovery exposes only guardianCount and a
 * mutator (setGuardian/addGuardian). We display the current count and
 * track adds done in-session for the friendly recap. The on-chain
 * source of truth is the count, not our local list.
 */
export function GuardiansChapter({ onComplete, onSkip }: GuardiansChapterProps) {
  const { address: owner } = useAccount();
  const { vaultAddress, hasVault } = useVaultHub();
  const publicClient = usePublicClient();
  const {
    guardianCount,
    isWritePending,
    addGuardian,
  } = useVaultRecovery(vaultAddress);

  // Reload guardianCount after a successful add by re-reading the vault.
  const { data: liveGuardianCount, refetch: refetchCount } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'guardianCount',
    query: { enabled: !!vaultAddress },
  });

  const currentCount = useMemo(() => {
    if (typeof liveGuardianCount === 'bigint') return Number(liveGuardianCount);
    return guardianCount ?? 0;
  }, [liveGuardianCount, guardianCount]);

  const [inputAddress, setInputAddress] = useState('');
  const [recentAdds, setRecentAdds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Keep recentAdds in sync if user re-opens the wizard (count may have
  // jumped without us knowing each address).
  useEffect(() => {
    setError(null);
  }, [currentCount]);

  const handleAdd = useCallback(async () => {
    setError(null);
    const trimmed = inputAddress.trim() as `0x${string}`;
    if (!isAddress(trimmed)) {
      setError('Enter a valid 0x… address.');
      return;
    }
    if (owner && trimmed.toLowerCase() === owner.toLowerCase()) {
      setError(
        'A guardian must be independent from the owner wallet. Use a different address — a hardware wallet, a friend, or another account you control.',
      );
      return;
    }
    if (recentAdds.includes(trimmed.toLowerCase())) {
      setError('You already added that guardian in this session.');
      return;
    }

    setIsAdding(true);
    try {
      await addGuardian(trimmed);
      // addGuardian uses writeContractAsync but doesn't await the receipt;
      // wait here so the count refreshes accurately.
      if (publicClient) {
        // Best-effort small wait — receipts are awaited inside the hook for
        // most paths, but adding a short poll lets the read settle.
        await new Promise((r) => setTimeout(r, 800));
      }
      await refetchCount();
      setRecentAdds((prev) => [...prev, trimmed.toLowerCase()]);
      setInputAddress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add guardian');
    } finally {
      setIsAdding(false);
    }
  }, [inputAddress, owner, recentAdds, addGuardian, publicClient, refetchCount]);

  if (!hasVault) {
    return (
      <ChapterShell
        chapter="guardians"
        description="Guardians live on your vault. Create your vault first."
        onPrimary={onSkip}
        onSkip={onSkip}
        primaryLabel="Continue"
        notice={{ tone: 'info', text: 'Create your vault first, then return to add guardians.' }}
      >
        <p className="text-sm text-white/60">
          You can revisit this chapter from the Guardians page or by re-opening the wizard.
        </p>
      </ChapterShell>
    );
  }

  const canContinue = currentCount >= 2;

  return (
    <ChapterShell
      chapter="guardians"
      description="Choose trusted guardians. Think of them like emergency contacts for your digital assets who can support account recovery if access is ever lost."
      onPrimary={onComplete}
      onSkip={onSkip}
      isWorking={isAdding || isWritePending}
      primaryLabel={canContinue ? 'Continue' : 'Continue anyway'}
      notice={
        error
          ? { tone: 'error', text: error }
          : canContinue
            ? null
            : {
                tone: 'info',
                text:
                  'You can continue with fewer than 2 guardians, but wallet rotation requires 2+ to finalize in the next chapter.',
              }
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <ShieldCheck className="text-purple-300" size={20} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {currentCount} guardian{currentCount === 1 ? '' : 's'} configured
            </p>
            <p className="text-xs text-white/60">
              {currentCount === 0
                ? 'No guardians yet. Add the first one below.'
                : currentCount === 1
                  ? 'One more needed before you can finalize guardian setup.'
                  : 'You have enough guardians to finalize in the next chapter.'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Add a guardian address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-sm text-white outline-none focus:border-purple-400"
              disabled={isAdding || isWritePending}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!inputAddress.trim() || isAdding || isWritePending}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-purple-500/20 px-4 py-2 text-sm font-semibold text-purple-200 hover:bg-purple-500/30 disabled:opacity-50"
            >
              <Plus size={14} aria-hidden /> Add guardian
            </button>
          </div>
          <p className="text-xs text-white/40">
            You can add guardians now or later. Each add is one wallet-signed transaction.
          </p>
        </div>

        {recentAdds.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/70">
              Added this session
            </p>
            <ul className="space-y-1">
              {recentAdds.map((addr) => (
                <li
                  key={addr}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                >
                  <ShieldCheck className="text-emerald-300 flex-shrink-0" size={14} aria-hidden />
                  <span className="break-all font-mono text-white/80">{addr}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-white/40">
              Removal isn&rsquo;t available in the wizard — manage guardians from the Guardians page after setup.
            </p>
          </div>
        )}
      </div>
    </ChapterShell>
  );
}
