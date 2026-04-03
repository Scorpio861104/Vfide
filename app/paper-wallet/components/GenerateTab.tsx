'use client';

export function GenerateTab() {
  return (
    <div className="space-y-6">
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-3">Important Security Information</h2>
        <p className="text-gray-300 text-sm leading-relaxed">
          Generate your paper wallet offline when possible, store backups securely, and never share your private key or recovery phrase.
        </p>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Select Wallet Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <div className="text-white font-semibold">Standard Paper Wallet</div>
            <p className="text-gray-400 text-sm mt-1">Single-address cold storage backup for long-term safekeeping.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-white font-semibold">Recovery Phrase Backup</div>
            <p className="text-gray-400 text-sm mt-1">Printable recovery phrase format with offline verification steps.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
