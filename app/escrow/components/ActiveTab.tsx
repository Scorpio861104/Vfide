'use client';

export type EscrowListItem = {
  id: string | number | bigint;
  orderId?: string;
  merchant?: string;
  amount: bigint | number;
  releaseTime: bigint | number;
};

interface ActiveTabProps {
  escrows: EscrowListItem[];
  formatEscrowAmount: (amount: bigint) => string;
  getTimeRemaining: (releaseTime: bigint) => string;
}

export function ActiveTab({ escrows, formatEscrowAmount, getTimeRemaining }: ActiveTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
        <h2 className="text-xl font-bold text-white">Escrows pending release</h2>
        <p className="mt-2 text-sm text-gray-400">Track orders awaiting merchant release, refund, or timeout resolution.</p>
      </div>

      {escrows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">No Escrows Found</h2>
          <p className="text-gray-400 mt-2">New escrow orders will appear here once they are created.</p>
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
                <div>{getTimeRemaining(escrow.releaseTime as bigint)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
