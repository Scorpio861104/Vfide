'use client';

export type PriceAlertItem = {
  id: string;
  symbol: string;
  target: string;
  note: string;
  status: 'Active' | 'Triggered';
};

interface ActiveTabProps {
  alerts: PriceAlertItem[];
  onTrigger: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ActiveTab({ alerts, onTrigger, onRemove }: ActiveTabProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 p-10 text-center">
        <h3 className="text-xl font-bold text-white">No active alerts</h3>
        <p className="mt-2 text-gray-400">Create a price alert to start monitoring market moves.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-white font-semibold">{alert.symbol}</div>
              <div className="text-sm text-gray-400">Target {alert.target} · {alert.note}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">{alert.status}</span>
              <button
                type="button"
                onClick={() => onTrigger(alert.id)}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200"
              >
                Trigger now
              </button>
              <button
                type="button"
                onClick={() => onRemove(alert.id)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-200"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
