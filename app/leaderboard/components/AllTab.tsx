'use client';

interface LeaderboardTabProps {
  entries: Array<{ rank: number; address: `0x${string}`; score: number; tier: string; badges: number }>;
}

function Podium({ entries }: LeaderboardTabProps) {
  const topThree = entries.slice(0, 3);
  const labels = ['1st', '2nd', '3rd'];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {topThree.map((entry, index) => (
        <div key={entry.address} className="rounded-2xl border border-white/10 bg-white/3 p-5 text-center">
          <div className="mb-2 text-sm font-bold text-cyan-300">{labels[index]}</div>
          <div className="font-mono text-sm text-white">{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</div>
          <div className="mt-2 text-2xl font-bold text-white">{entry.score}</div>
          <div className="text-sm text-gray-400">{entry.tier}</div>
        </div>
      ))}
    </div>
  );
}

export function AllTab({ entries }: LeaderboardTabProps) {
  return <Podium entries={entries} />;
}
