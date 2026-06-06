interface ScheduleItem {
  month: number;
  percentage: number;
  unlockTime: number | bigint;
  unlocked: boolean;
}

interface ScheduleTabProps {
  schedule?: readonly ScheduleItem[];
}

export function ScheduleTab({ schedule }: ScheduleTabProps) {
  const rows = schedule ?? [];

  return (
    <div className="analytics-card p-6">
      <h2 className="text-xl font-bold text-white mb-4">Vesting Schedule</h2>
      {rows.length === 0 ? (
        <p className="text-white/60 text-sm">No schedule data available.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={`${row.month}-${String(row.unlockTime)}`} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
              <span className="text-sm text-white">Month {row.month}</span>
              <span className="text-sm text-white/70">{row.percentage}%</span>
              <span className={`text-xs font-semibold ${row.unlocked ? 'text-emerald-400' : 'text-amber-300'}`}>
                {row.unlocked ? 'UNLOCKED' : 'LOCKED'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
