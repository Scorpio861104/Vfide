'use client';

interface HistoryItem {
  id: string;
  event: string;
  stage: string;
  detail: string;
}

interface ServerLaneHistory {
  id: string | number;
  stage?: string;
  evidence_note?: string;
}

interface HistoryTabProps {
  items: HistoryItem[];
  serverLanes: ServerLaneHistory[];
}

function formatOutcome(stage?: string) {
  switch (stage) {
    case 'resolved-lender':
      return 'Resolved to lender';
    case 'resolved-borrower':
      return 'Resolved to borrower';
    case 'drawn':
      return 'Borrower Drawn';
    default:
      return stage ? stage.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Draft';
  }
}

export function HistoryTab({ items, serverLanes }: HistoryTabProps) {
  const serverHistory = serverLanes.filter((lane) =>
    ['drawn', 'disputed', 'repaid', 'resolved-borrower', 'resolved-lender'].includes(String(lane.stage ?? ''))
  );

  if (items.length === 0 && serverHistory.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">Activity history</h2>
        <p className="text-gray-400">No lane activity has been recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
      <h2 className="mb-4 text-xl font-bold text-white">Activity history</h2>

      {serverHistory.length > 0 ? (
        <div className="mb-6 space-y-3">
          {serverHistory.map((lane) => (
            <div key={lane.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-white">Lane #{lane.id}</span>
                <span className="text-xs text-cyan-200">{formatOutcome(lane.stage)}</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">{lane.evidence_note || formatOutcome(lane.stage)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
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
      ) : null}
    </div>
  );
}
