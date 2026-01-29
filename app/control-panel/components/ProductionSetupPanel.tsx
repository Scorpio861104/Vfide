'use client';

export function ProductionSetupPanel() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-4">⚡ Quick Production Setup</h2>
      <p className="text-slate-400 mb-6">One-click production deployment with recommended safe defaults.</p>
      <div className="space-y-4">
        <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p className="text-white font-bold">✓ Production Setup Options</p>
          <p className="text-slate-300 text-sm mt-2">Choose between safe defaults or full-featured setup with auto-swap.</p>
        </div>
      </div>
    </div>
  );
}
