'use client';

interface HistoryItem {
  id: string;
  event: string;
  stage: string;
  detail: string;
}

interface HistoryTabProps {
  items: HistoryItem[];
}

export function HistoryTab({ items }: HistoryTabProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
      <h2 className="mb-4 text-xl font-bold text-white">Activity history</h2>
      {items.length === 0 ? (
        <p className="text-gray-400">No lane activity has been recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-white">{item.event}</span>
                <span className="text-xs text-cyan-200">{item.stage}</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
