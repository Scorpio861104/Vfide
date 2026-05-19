'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
/**
 * CompletedTab — escrows in terminal states (RELEASED, REFUNDED, RESOLVED).
 *
 * Combined buyer + merchant view sorted by id (newest first). Terminal escrows
 * have no role-specific actions, so we don't split by role. The card itself
 * shows the counterparty from the viewer's perspective.
 */

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { useEscrowList } from '@/hooks/useEscrowList';
import { EscrowState, type CommerceEscrowRecord } from '@/hooks/useCommerceEscrow';
import { EscrowCard } from './EscrowCard';

const TERMINAL_STATES = new Set<EscrowState>([
  EscrowState.Released,
  EscrowState.Refunded,
  EscrowState.Resolved,
]);

export function CompletedTab() {
  const { address } = useAccount();
  const { escrows: buyerEscrows, isLoading: buyerLoading } = useEscrowList('buyer', address);
  const { escrows: merchantEscrows, isLoading: merchantLoading } = useEscrowList('merchant', address);

  // Combine + dedupe (same escrow can't have me as both buyer and merchant, but
  // defensive in case of self-deals). Sort by id descending — newest first.
  const combined = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ escrow: CommerceEscrowRecord; viewerRole: 'buyer' | 'merchant' }> = [];
    for (const e of buyerEscrows) {
      if (!TERMINAL_STATES.has(e.state)) continue;
      const key = e.id.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ escrow: e, viewerRole: 'buyer' });
    }
    for (const e of merchantEscrows) {
      if (!TERMINAL_STATES.has(e.state)) continue;
      const key = e.id.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ escrow: e, viewerRole: 'merchant' });
    }
    rows.sort((a, b) => Number(b.escrow.id - a.escrow.id));
    return rows;
  }, [buyerEscrows, merchantEscrows]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view completed escrows.</p>
        <div className="mt-6 flex justify-center">
          <VfideConnectButton size="md" />
        </div>
      </div>
    );
  }

  const loading = buyerLoading || merchantLoading;

  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={16} className="text-emerald-400" />
        <h3 className="text-white font-semibold text-sm">Completed escrows</h3>
        <span className="ml-auto text-xs text-gray-500">{combined.length}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="text-emerald-400 animate-spin" />
        </div>
      ) : combined.length === 0 ? (
        <p className="text-gray-500 text-xs py-8 text-center">No completed escrows yet.</p>
      ) : (
        <div className="space-y-3">
          {combined.map(({ escrow, viewerRole }) => (
            <EscrowCard key={escrow.id.toString()} escrow={escrow} viewerRole={viewerRole} />
          ))}
        </div>
      )}
    </div>
  );
}
