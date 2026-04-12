'use client';

export default function StealthPage() {
  return (
    <div className="container mx-auto px-4 py-8 pt-20 pb-24 md:pb-8">
      <h1 className="text-3xl font-bold text-white mb-4">Stealth Address</h1>
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-w-3xl">
        <p className="text-white font-semibold mb-2">Coming Soon</p>
        <p className="text-gray-300 text-sm">
          Stealth payments are temporarily disabled until full EIP-5564 secp256k1 support is finalized.
          This page is intentionally non-interactive to prevent failed actions.
        </p>
      </div>
    </div>
  );
}
