'use client';

interface CreateTabProps {
  merchantAddress: string;
  amount: string;
  orderId: string;
  onMerchantAddressChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onOrderIdChange: (value: string) => void;
  onCreate: () => void;
}

export function CreateTab({
  merchantAddress,
  amount,
  orderId,
  onMerchantAddressChange,
  onAmountChange,
  onOrderIdChange,
  onCreate,
}: CreateTabProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
      <h2 className="text-xl font-bold text-white">Create Escrow</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          value={merchantAddress}
          onChange={(event) => onMerchantAddressChange(event.target.value)}
          placeholder="0x..."
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
        />
        <input
          type="number"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="1000"
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
        />
        <input
          type="text"
          value={orderId}
          onChange={(event) => onOrderIdChange(event.target.value)}
          placeholder="ORD-2026-0001"
          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
        />
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 font-semibold"
      >
        Create Escrow
      </button>
    </div>
  );
}
