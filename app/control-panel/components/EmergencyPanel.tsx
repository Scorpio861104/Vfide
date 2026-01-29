'use client';

export function EmergencyPanel() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-4">🚨 Emergency Controls</h2>
      <p className="text-slate-400 mb-6">Emergency pause/resume and circuit breaker controls.</p>
      <div className="space-y-4">
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-white font-bold">⚠️ Use with extreme caution</p>
          <p className="text-slate-300 text-sm mt-2">Emergency controls can pause the entire protocol.</p>
        </div>
      </div>
    </div>
  );
}
