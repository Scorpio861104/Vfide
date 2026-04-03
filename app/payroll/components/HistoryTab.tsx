'use client';

const HISTORY_GUIDE = [
  'Stream creation receipts',
  'Top-up and withdrawal events',
  'Pause, resume, and cancellation actions',
];

export function HistoryTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Payroll History</h3>
        <p className="text-gray-400">
          Review the audit trail for completed payroll actions once your first stream has been funded and settled.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <h4 className="mb-2 text-lg font-semibold text-white">No completed payroll runs yet</h4>
        <p className="mb-4 text-sm text-gray-400">
          When streams start running, this tab will collect the event history your finance or operations team needs for reconciliation.
        </p>
        <ul className="space-y-2 text-sm text-gray-300">
          {HISTORY_GUIDE.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
