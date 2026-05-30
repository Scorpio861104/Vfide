'use client';

import { useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle2, ShieldAlert, Wallet, Loader2 } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';

import { useVaultHub } from '@/hooks/useVaultHub';
import { ChapterShell } from '../ChapterShell';

interface CreateVaultChapterProps {
  onComplete: () => void;
}

/**
 * Required chapter. Calls VaultHub.ensureVault via useVaultHub.createVault.
 * No skip button — required chapters render the shell without onSkip.
 */
export function CreateVaultChapter({ onComplete }: CreateVaultChapterProps) {
  const { isConnected, address } = useAccount();
  const {
    hasVault,
    vaultAddress,
    isLoadingVault,
    isCreatingVault,
    createVault,
    isOnCorrectChain,
    expectedChainName,
    vaultHubConfigured,
    refetchVault,
  } = useVaultHub();

  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    setError(null);
    try {
      await createVault();
      // VaultHub.ensureVault is idempotent — re-running for an existing
      // vault is a no-op. Refetch so hasVault flips to true.
      await refetchVault();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault');
    }
  }, [createVault, refetchVault]);

  const onPrimary = hasVault ? onComplete : handleCreate;

  if (!isConnected) {
    return (
      <ChapterShell
        chapter="createVault"
        description="A wallet is your digital keychain. Connect it to create a VFIDE vault with stronger safeguards than a standard wallet-only setup."
        onPrimary={() => {/* no-op until connected */}}
        primaryDisabled
        notice={{ tone: 'info', text: 'Connect your wallet to create a vault.' }}
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Wallet className="text-cyan-300" size={32} aria-hidden />
          <p className="text-sm text-white/70">
            Your wallet belongs to you. VFIDE never takes custody of your assets.
          </p>
          <VfideConnectButton size="md" />
        </div>
      </ChapterShell>
    );
  }

  if (!vaultHubConfigured) {
    return (
      <ChapterShell
        chapter="createVault"
        description="The VaultHub contract isn't configured for this environment."
        onPrimary={onComplete}
        primaryDisabled
        notice={{
          tone: 'error',
          text:
            'VaultHub is not configured in this build. Set NEXT_PUBLIC_VAULT_HUB_ADDRESS and reload to enable vault creation.',
        }}
      >
        <p className="text-sm text-white/60">
          You can skip the wizard for now and revisit it once the environment is set up.
        </p>
      </ChapterShell>
    );
  }

  if (!isOnCorrectChain) {
    return (
      <ChapterShell
        chapter="createVault"
        description={`Switch your wallet to ${expectedChainName ?? 'the configured network'} to create your vault.`}
        onPrimary={onPrimary}
        primaryDisabled
        notice={{
          tone: 'error',
          text: `Connected to the wrong network. Switch to ${expectedChainName ?? 'the configured network'} in your wallet to continue.`,
        }}
      >
        <div className="flex justify-center py-2">
          <ConnectButton.Custom>
            {({ openChainModal, mounted }) => (
              <button
                type="button"
                onClick={openChainModal}
                disabled={!mounted}
                className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
              >
                Switch network
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </ChapterShell>
    );
  }

  if (isLoadingVault) {
    return (
      <ChapterShell
        chapter="createVault"
        description="Looking up whether your wallet already has a vault…"
        onPrimary={onPrimary}
        primaryDisabled
      >
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="animate-spin text-cyan-300" size={18} aria-hidden />
          Checking VaultHub for an existing vault…
        </div>
      </ChapterShell>
    );
  }

  if (hasVault) {
    return (
      <ChapterShell
        chapter="createVault"
        description="Your wallet already has a CardBound vault. You're ready to continue."
        onPrimary={onComplete}
        primaryLabel="Continue"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 size={18} aria-hidden />
            <span className="text-sm font-semibold">Vault active</span>
          </div>
          <p className="break-all font-mono text-xs text-white/60">{vaultAddress}</p>
          <p className="text-xs text-white/50">
            Wallet: <span className="font-mono">{address}</span>
          </p>
        </div>
      </ChapterShell>
    );
  }

  return (
    <ChapterShell
      chapter="createVault"
      description="Meet your vault. It is where protection begins: additional controls, recovery support, guardian workflows, and long-term storage protections."
      onPrimary={handleCreate}
      isWorking={isCreatingVault}
      primaryLabel={isCreatingVault ? 'Creating vault…' : 'Create My Vault'}
      notice={error ? { tone: 'error', text: error } : null}
    >
      <ul className="space-y-2 text-sm text-white/80">
        <li className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 flex-shrink-0 text-cyan-300" size={16} aria-hidden />
          You stay in control. The vault is owned by your wallet — VFIDE cannot freeze, seize, or recover it without you.
        </li>
        <li className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 flex-shrink-0 text-cyan-300" size={16} aria-hidden />
          Vault creation uses <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">VaultHub.ensureVault()</code> and is idempotent, so retries stay safe.
        </li>
        <li className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 flex-shrink-0 text-cyan-300" size={16} aria-hidden />
          One transaction, paid by you. Your wallet will prompt for the signature.
        </li>
      </ul>
    </ChapterShell>
  );
}
