'use client';

const SWAP_NOTES = [
  'Double-check the asset pair and network before confirming a swap.',
  'Use smaller test amounts when interacting with a new wallet or token route.',
  'Keep enough gas on hand so the swap and any approval transaction can both complete.',
];

export function SwapTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Swap Guidance</h3>
        <p className="text-gray-400">Use this tab to prepare wallet-to-wallet swaps once you already hold crypto in a connected account.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <ul className="space-y-2 text-sm text-gray-300">
          {SWAP_NOTES.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
