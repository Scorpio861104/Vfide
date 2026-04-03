'use client';

interface WeekTabProps {
  entries: Array<{ rank: number; address: `0x${string}`; score: number; tier: string; badges: number }>;
}

export function WeekTab({ entries }: WeekTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-5 text-white">Weekly highlights and fastest score momentum.</div>
      {entries.slice(0, 3).map((entry, index) => (
        <div key={entry.address} className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <div className="font-semibold text-cyan-300">{index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'}</div>
          <div className="text-white">{entry.score} pts • {entry.tier}</div>
        </div>
      ))}
    </div>
  );
}
