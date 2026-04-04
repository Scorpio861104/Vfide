'use client';

import type { EscrowListItem } from './ActiveTab';

interface DisputesTabProps {
  escrows: EscrowListItem[];
  formatEscrowAmount: (amount: bigint) => string;
}

export function DisputesTab({ escrows, formatEscrowAmount }: DisputesTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
        <h2 className="text-xl font-bold text-white">Cases requiring intervention</h2>
        <p className="mt-2 text-sm text-gray-400">Escrows in this queue need mediation, proof review, or manual resolution.</p>
      </div>

      {escrows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-8 text-center text-gray-400">
          No disputed escrows right now.
        </div>
      ) : (
        <div className="space-y-3">
          {escrows.map((escrow) => (
            <div key={String(escrow.id)} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-white font-semibold">{escrow.orderId || `Escrow #${String(escrow.id)}`}</div>
                <div className="text-sm text-gray-300">Merchant {escrow.merchant}</div>
              </div>
              <div className="text-right text-sm text-gray-200">
                <div>{formatEscrowAmount(escrow.amount as bigint)} VFIDE</div>
                <div className="text-amber-200">Under review</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
