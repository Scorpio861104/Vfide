'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { CheckCircle2, CreditCard, Info } from 'lucide-react';

import { useVaultHub } from '@/hooks/useVaultHub';
import { useContractAddresses } from '@/hooks/useContractAddresses';
import { CARD_BOUND_VAULT_ABI, ERC20ABI, isConfiguredContractAddress } from '@/lib/contracts';
import { ChapterShell } from '../ChapterShell';

interface MerchantApprovalChapterProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Optional chapter: approve MerchantPortal to pull VFIDE from the vault.
 * Only needed for users who plan to pay merchants directly from their vault
 * (i.e. via MerchantPortal.payWithIntent). The approval amount equals the
 * vault's daily transfer limit — capped to a sensible ceiling.
 *
 * Stablecoin approval is intentionally not included here — it requires the
 * token address and is better managed from the Vault page where the stablecoin
 * registry is wired up.
 */
export function MerchantApprovalChapter({ onComplete, onSkip }: MerchantApprovalChapterProps) {
  const { vaultAddress, hasVault } = useVaultHub();
  const CONTRACT_ADDRESSES = useContractAddresses();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const merchantPortalAddress = CONTRACT_ADDRESSES.MerchantPortal;
  const merchantPortalReady = isConfiguredContractAddress(merchantPortalAddress);

  const { data: dailyTransferLimit } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'dailyTransferLimit',
    query: { enabled: !!vaultAddress },
  });

  const { data: vfideAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: ERC20ABI,
    functionName: 'allowance',
    args:
      vaultAddress && merchantPortalReady
        ? [vaultAddress, merchantPortalAddress]
        : undefined,
    query: {
      enabled:
        !!vaultAddress
        && merchantPortalReady
        && isConfiguredContractAddress(CONTRACT_ADDRESSES.VFIDEToken),
    },
  });

  const approvalAmount = useMemo(
    () => (typeof dailyTransferLimit === 'bigint' ? dailyTransferLimit : 0n),
    [dailyTransferLimit],
  );

  const currentAllowanceFormatted = useMemo(() => {
    if (typeof vfideAllowance !== 'bigint') return '0';
    return formatUnits(vfideAllowance, 18);
  }, [vfideAllowance]);

  const approvalAmountFormatted = useMemo(
    () => (approvalAmount > 0n ? formatUnits(approvalAmount, 18) : '0'),
    [approvalAmount],
  );

  const alreadyApproved = typeof vfideAllowance === 'bigint' && vfideAllowance > 0n;

  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = useCallback(async () => {
    if (!vaultAddress || !merchantPortalReady || approvalAmount === 0n) {
      setError('Cannot approve yet — your daily transfer limit must be set first.');
      return;
    }
    setError(null);
    setIsWorking(true);
    try {
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'approveVFIDE',
        args: [merchantPortalAddress, approvalAmount],
      });
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      await refetchAllowance();
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve MerchantPortal';
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
    merchantPortalReady,
    approvalAmount,
    writeContractAsync,
    merchantPortalAddress,
    publicClient,
    refetchAllowance,
    onComplete,
  ]);

  if (!hasVault) {
    return (
      <ChapterShell
        chapter="merchantApproval"
        description="Approvals live on your vault. Create your vault first."
        onPrimary={onSkip}
        onSkip={onSkip}
        primaryLabel="Continue"
        notice={{ tone: 'info', text: 'Create your vault first, then return if you plan to pay merchants directly.' }}
      >
        <p className="text-sm text-white/60">
          You can revisit this chapter from the Vault page or by re-opening the wizard.
        </p>
      </ChapterShell>
    );
  }

  if (!merchantPortalReady) {
    return (
      <ChapterShell
        chapter="merchantApproval"
        description="MerchantPortal isn't configured in this environment."
        onPrimary={onSkip}
        onSkip={onSkip}
        primaryLabel="Continue"
        notice={{
          tone: 'info',
          text:
            'MerchantPortal is not configured here. Skip this step — you can approve later from the Vault page when the contract is deployed.',
        }}
      >
        <p className="text-sm text-white/60">
          Approving lets you pay merchants directly from your vault rather than from your wallet.
        </p>
      </ChapterShell>
    );
  }

  if (alreadyApproved) {
    return (
      <ChapterShell
        chapter="merchantApproval"
        description="MerchantPortal already has an allowance from this vault."
        onPrimary={onComplete}
        primaryLabel="Continue"
      >
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 size={18} aria-hidden />
          <span className="text-sm font-semibold">
            Approved: {currentAllowanceFormatted} VFIDE
          </span>
        </div>
        <p className="mt-2 text-xs text-white/60">
          You can revoke or change this allowance from the Vault page at any time.
        </p>
      </ChapterShell>
    );
  }

  return (
    <ChapterShell
      chapter="merchantApproval"
      description="If you plan to pay merchants directly from your vault (instead of from your wallet), MerchantPortal needs permission to pull VFIDE up to your daily limit."
      onPrimary={handleApprove}
      onSkip={onSkip}
      isWorking={isWorking}
      primaryLabel="Approve MerchantPortal"
      primaryDisabled={approvalAmount === 0n}
      notice={
        error
          ? { tone: 'error', text: error }
          : approvalAmount === 0n
            ? {
                tone: 'info',
                text:
                  'Your daily transfer limit is still 0 — set spend limits first or skip this step.',
              }
            : null
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <CreditCard className="text-amber-300 flex-shrink-0" size={20} aria-hidden />
          <div className="text-sm text-white/80">
            <p className="font-semibold text-white">Approval scope</p>
            <p className="mt-1 text-white/70">
              Up to <strong>{approvalAmountFormatted} VFIDE</strong> per pull, never more than your
              daily transfer limit. The allowance is renewable from the Vault page.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/70">
          <Info className="mt-0.5 flex-shrink-0 text-cyan-300" size={14} aria-hidden />
          You don&rsquo;t need this if you intend to pay merchants from your wallet (the default
          checkout flow). Skip if unsure — you can come back later.
        </div>
      </div>
    </ChapterShell>
  );
}
