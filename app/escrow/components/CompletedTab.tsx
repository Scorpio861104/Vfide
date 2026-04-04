'use client';

import type { EscrowListItem } from './ActiveTab';

interface CompletedTabProps {
  escrows: EscrowListItem[];
  formatEscrowAmount: (amount: bigint) => string;
}

export function CompletedTab({ escrows, formatEscrowAmount }: CompletedTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
        <h2 className="text-xl font-bold text-white">Completed settlement history</h2>
        <p className="mt-2 text-sm text-gray-400">Review escrows that were successfully released, refunded, or otherwise finalized.</p>
      </div>

      {escrows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-8 text-center text-gray-400">
          No completed escrows yet.
        </div>
      ) : (
        <div className="space-y-3">
          {escrows.map((escrow) => (
            <div key={String(escrow.id)} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-white font-semibold">{escrow.orderId || `Escrow #${String(escrow.id)}`}</div>
                <div className="text-sm text-gray-400">Merchant {escrow.merchant}</div>
              </div>
              <div className="text-right text-sm text-gray-300">
                <div>{formatEscrowAmount(escrow.amount as bigint)} VFIDE</div>
                <div className="text-emerald-300">Settled</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
