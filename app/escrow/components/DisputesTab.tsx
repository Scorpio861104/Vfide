'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
/**
 * DisputesTab — escrows currently in DISPUTED state, awaiting DAO resolution.
 *
 * Read-only view. The merchant has the additional option to refund directly
 * even after dispute (contract allows refund from FUNDED or DISPUTED state),
 * which is exposed via EscrowCard's role-aware actions.
 *
 * The DAO resolve action lives in a future Phase 4 admin surface — not here.
 */

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Lock, Loader2, AlertTriangle, Scale } from 'lucide-react';
import { useEscrowList } from '@/hooks/useEscrowList';
import { useCommerceEscrow, EscrowState, type CommerceEscrowRecord } from '@/hooks/useCommerceEscrow';
import { EscrowCard } from './EscrowCard';

export function DisputesTab() {
  const { address } = useAccount();
  const {
    escrows: buyerEscrows,
    isLoading: buyerLoading,
    refetch: refetchBuyer,
  } = useEscrowList('buyer', address);
  const {
    escrows: merchantEscrows,
    isLoading: merchantLoading,
    refetch: refetchMerchant,
  } = useEscrowList('merchant', address);
  const { refund, isWritePending } = useCommerceEscrow();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const disputed = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ escrow: CommerceEscrowRecord; viewerRole: 'buyer' | 'merchant' }> = [];
    for (const e of buyerEscrows) {
      if (e.state !== EscrowState.Disputed) continue;
      const key = e.id.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ escrow: e, viewerRole: 'buyer' });
    }
    for (const e of merchantEscrows) {
      if (e.state !== EscrowState.Disputed) continue;
      const key = e.id.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ escrow: e, viewerRole: 'merchant' });
    }
    rows.sort((a, b) => Number(b.escrow.id - a.escrow.id));
    return rows;
  }, [buyerEscrows, merchantEscrows]);

  const handleRefund = async (id: bigint) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await refund(id);
      setActionMessage(`Escrow #${id} refunded to buyer.`);
      await Promise.all([refetchBuyer(), refetchMerchant()]);
    } catch (e: any) {
      setActionError(e?.shortMessage || e?.message || 'Refund failed.');
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view disputed escrows.</p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const loading = buyerLoading || merchantLoading;

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}
      {actionMessage && !actionError && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
          {actionMessage}
        </div>
      )}

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={16} className="text-amber-400" />
          <h3 className="text-white font-semibold text-sm">Disputed escrows</h3>
          <span className="ml-auto text-xs text-gray-500">{disputed.length}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-amber-400 animate-spin" />
          </div>
        ) : disputed.length === 0 ? (
          <p className="text-gray-500 text-xs py-8 text-center">No disputes — good news.</p>
        ) : (
          <>
            <p className="text-xs text-amber-200/70 mb-3">
              Disputed escrows are held until the DAO resolves them, or until the merchant elects
              to refund the buyer directly.
            </p>
            <div className="space-y-3">
              {disputed.map(({ escrow, viewerRole }) => (
                <EscrowCard
                  key={escrow.id.toString()}
                  escrow={escrow}
                  viewerRole={viewerRole}
                  isWritePending={isWritePending}
                  onRefund={viewerRole === 'merchant' ? handleRefund : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
