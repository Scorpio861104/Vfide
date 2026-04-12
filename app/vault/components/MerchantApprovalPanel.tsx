'use client';

import { useState } from 'react';
import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import { formatUnits, isAddress, maxUint256 } from 'viem';
import { useReadContract, useWriteContract } from 'wagmi';

import { GlassCard } from '@/components/ui/GlassCard';
import { useToast } from '@/components/ui/toast';
import { CARD_BOUND_VAULT_ABI, CONTRACT_ADDRESSES, ERC20ABI, isConfiguredContractAddress } from '@/lib/contracts';

type MerchantApprovalPanelProps = {
  cardBoundMode: boolean;
  vaultAddress: `0x${string}` | null | undefined;
};

export function MerchantApprovalPanel({ cardBoundMode, vaultAddress }: MerchantApprovalPanelProps) {
  const { showToast } = useToast();
  const { writeContractAsync } = useWriteContract();
  const [stablecoinAddress, setStablecoinAddress] = useState('');
  const [isApprovingVfide, setIsApprovingVfide] = useState(false);
  const [isApprovingStablecoin, setIsApprovingStablecoin] = useState(false);

  const merchantPortalAddress = CONTRACT_ADDRESSES.MerchantPortal;
  const merchantPortalReady = isConfiguredContractAddress(merchantPortalAddress);
  const stablecoinReady = isAddress(stablecoinAddress);

  const { data: vfideAllowance, refetch: refetchVfideAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: vaultAddress && merchantPortalReady ? [vaultAddress, merchantPortalAddress] : undefined,
    query: {
      enabled: cardBoundMode && !!vaultAddress && merchantPortalReady,
    },
  });

  const { data: stablecoinAllowance, refetch: refetchStablecoinAllowance } = useReadContract({
    address: stablecoinReady ? stablecoinAddress as `0x${string}` : undefined,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: vaultAddress && merchantPortalReady && stablecoinReady ? [vaultAddress, merchantPortalAddress] : undefined,
    query: {
      enabled: cardBoundMode && !!vaultAddress && merchantPortalReady && stablecoinReady,
    },
  });

  if (!cardBoundMode || !vaultAddress) {
    return null;
  }

  const currentVfideAllowance = typeof vfideAllowance === 'bigint' ? vfideAllowance : 0n;
  const currentStablecoinAllowance = typeof stablecoinAllowance === 'bigint' ? stablecoinAllowance : 0n;

  const handleApproveVfide = async () => {
    if (!merchantPortalReady) {
      showToast('MerchantPortal is not configured in this environment.', 'error');
      return;
    }

    setIsApprovingVfide(true);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'approveVFIDE',
        args: [merchantPortalAddress, maxUint256],
      });
      await refetchVfideAllowance();
      showToast('MerchantPortal was approved to pull VFIDE from this vault.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showToast(`VFIDE approval failed: ${message.slice(0, 60)}`, 'error');
    } finally {
      setIsApprovingVfide(false);
    }
  };

  const handleApproveStablecoin = async () => {
    if (!merchantPortalReady) {
      showToast('MerchantPortal is not configured in this environment.', 'error');
      return;
    }
    if (!stablecoinReady) {
      showToast('Enter a valid stablecoin token address.', 'error');
      return;
    }

    setIsApprovingStablecoin(true);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'approveERC20',
        args: [stablecoinAddress as `0x${string}`, merchantPortalAddress, maxUint256],
      });
      await refetchStablecoinAllowance();
      showToast('MerchantPortal was approved to pull the selected stablecoin.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Stablecoin approval failed: ${message.slice(0, 60)}`, 'error');
    } finally {
      setIsApprovingStablecoin(false);
    }
  };

  return (
    <section className="py-8 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <GlassCard className="p-6" hover={false}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/15 p-3">
                  <CreditCard className="text-emerald-400" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Merchant Payment Approvals</h2>
                  <p className="text-sm text-white/60">
                    CardBound vaults must opt in before MerchantPortal can settle direct merchant payments.
                  </p>
                </div>
              </div>
              <p className="text-sm text-white/50">
                Approve VFIDE for checkout, then approve any supported stablecoin token address you intend to use.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              <div>MerchantPortal spender</div>
              <div className="mt-1 break-all font-mono text-xs text-cyan-300">
                {merchantPortalReady ? merchantPortalAddress : 'Not configured'}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">VFIDE</h3>
                  <p className="mt-1 text-sm text-white/55">Required for merchant payments routed through the VFIDE checkout flow.</p>
                </div>
                {currentVfideAllowance > 0n ? <CheckCircle2 className="text-emerald-400" size={18} /> : null}
              </div>
              <p className="mt-4 text-sm text-white/70">
                Current allowance: {currentVfideAllowance > 0n ? formatUnits(currentVfideAllowance, 18) : '0'} VFIDE
              </p>
              <button
                type="button"
                onClick={handleApproveVfide}
                disabled={!merchantPortalReady || isApprovingVfide}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {isApprovingVfide ? <Loader2 className="animate-spin" size={16} /> : null}
                Approve VFIDE
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div>
                <h3 className="text-base font-semibold text-white">Stablecoin</h3>
                <p className="mt-1 text-sm text-white/55">Approve a supported ERC-20 stablecoin for MerchantPortal by token address.</p>
              </div>
              <input
                value={stablecoinAddress}
                onChange={(event) => setStablecoinAddress(event.target.value.trim())}
                placeholder="0x... stablecoin token address"
                className="mt-4 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
              />
              <p className="mt-3 text-sm text-white/70">
                Current allowance: {currentStablecoinAllowance > 0n ? currentStablecoinAllowance.toString() : '0'} base units
              </p>
              <button
                type="button"
                onClick={handleApproveStablecoin}
                disabled={!merchantPortalReady || !stablecoinReady || isApprovingStablecoin}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {isApprovingStablecoin ? <Loader2 className="animate-spin" size={16} /> : null}
                Approve Stablecoin
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}