'use client';

/**
 * ActiveTab — escrows currently in non-terminal states (OPEN, FUNDED, DISPUTED).
 *
 * Loads two independent lists in parallel:
 *   1. Where the connected wallet is the BUYER
 *   2. Where the connected wallet is the MERCHANT
 *
 * Each list shows a card per escrow with state-aware action buttons. The Phase 3d
 * Turn 2 event-emission contract change means enumeration is O(this user's
 * escrows), not O(protocol-wide).
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Lock, Loader2, AlertCircle, ShoppingBag, Store } from 'lucide-react';
import { useEscrowList } from '@/hooks/useEscrowList';
import { useCommerceEscrow, EscrowState, type CommerceEscrowRecord } from '@/hooks/useCommerceEscrow';
import { EscrowCard } from './EscrowCard';

const ACTIVE_STATES = new Set<EscrowState>([EscrowState.Open, EscrowState.Funded, EscrowState.Disputed]);

export function ActiveTab() {
  const { address } = useAccount();
  const {
    escrows: buyerEscrows,
    isLoading: buyerLoading,
    error: buyerError,
    refetch: refetchBuyer,
  } = useEscrowList('buyer', address);
  const {
    escrows: merchantEscrows,
    isLoading: merchantLoading,
    error: merchantError,
    refetch: refetchMerchant,
  } = useEscrowList('merchant', address);
  const { release, refund, dispute, isWritePending } = useCommerceEscrow();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filterActive = (list: CommerceEscrowRecord[]) => list.filter((e) => ACTIVE_STATES.has(e.state));
  const activeBuyer = filterActive(buyerEscrows);
  const activeMerchant = filterActive(merchantEscrows);

  const handleRelease = async (id: bigint) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await release(id);
      setActionMessage(`Escrow #${id} released to merchant.`);
      await refetchBuyer();
    } catch (e: any) {
      setActionError(e?.shortMessage || e?.message || 'Release failed.');
    }
  };

  const handleRefund = async (id: bigint) => {
    setActionError(null);
    setActionMessage(null);
    try {
      await refund(id);
      setActionMessage(`Escrow #${id} refunded to buyer.`);
      await refetchMerchant();
    } catch (e: any) {
      setActionError(e?.shortMessage || e?.message || 'Refund failed.');
    }
  };

  const handleDispute = async (id: bigint) => {
    setActionError(null);
    setActionMessage(null);
    // Minimal MVP: prompt-based reason capture. The detail page (future) will offer richer input.
    const reason = prompt('Briefly describe the dispute (visible on-chain):') ?? '';
    if (reason.trim().length === 0) return;
    try {
      await dispute({ escrowId: id, reason });
      setActionMessage(`Dispute opened on escrow #${id}. DAO will review.`);
      await Promise.all([refetchBuyer(), refetchMerchant()]);
    } catch (e: any) {
      setActionError(e?.shortMessage || e?.message || 'Dispute failed.');
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view active escrows.</p>
      </div>
    );
  }

  const isLoadingAny = buyerLoading || merchantLoading;
  const combinedListError = buyerError || merchantError;

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}
      {actionMessage && !actionError && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
          {actionMessage}
        </div>
      )}
      {combinedListError && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span>Couldn't load some escrows: {combinedListError}</span>
        </div>
      )}

      {/* As buyer */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">As buyer</h3>
          <span className="ml-auto text-xs text-gray-500">{activeBuyer.length}</span>
        </div>
        {buyerLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : activeBuyer.length === 0 ? (
          <p className="text-gray-500 text-xs py-4 text-center">No active escrows as buyer.</p>
        ) : (
          <div className="space-y-3">
            {activeBuyer.map((e) => (
              <EscrowCard
                key={e.id.toString()}
                escrow={e}
                viewerRole="buyer"
                isWritePending={isWritePending}
                onRelease={handleRelease}
                onDispute={handleDispute}
              />
            ))}
          </div>
        )}
      </div>

      {/* As merchant */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Store size={16} className="text-purple-400" />
          <h3 className="text-white font-semibold text-sm">As merchant</h3>
          <span className="ml-auto text-xs text-gray-500">{activeMerchant.length}</span>
        </div>
        {merchantLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-purple-400 animate-spin" />
          </div>
        ) : activeMerchant.length === 0 ? (
          <p className="text-gray-500 text-xs py-4 text-center">No active escrows as merchant.</p>
        ) : (
          <div className="space-y-3">
            {activeMerchant.map((e) => (
              <EscrowCard
                key={e.id.toString()}
                escrow={e}
                viewerRole="merchant"
                isWritePending={isWritePending}
                onRefund={handleRefund}
                onDispute={handleDispute}
              />
            ))}
          </div>
        )}
      </div>

      {!isLoadingAny && activeBuyer.length === 0 && activeMerchant.length === 0 && (
        <p className="text-gray-600 text-xs text-center pt-2">
          No active escrows. Use the <span className="text-cyan-400">Create</span> tab to start one.
        </p>
      )}
    </div>
  );
}
