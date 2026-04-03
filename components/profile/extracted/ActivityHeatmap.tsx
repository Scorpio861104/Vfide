'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ActivityHeatmap({ data }: { data: ActivityHeatmapDay[] }) {
  const weeks = useMemo(() => {
    const result: ActivityHeatmapDay[][] = [];
    let week: ActivityHeatmapDay[] = [];
    data.forEach((day, i) => {
      week.push(day);
      if ((i + 1) % 7 === 0) {
        result.push(week);
        week = [];
      }
    });
    if (week.length > 0) result.push(week);
    return result.slice(-52); // Last 52 weeks
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-zinc-900';
    if (count <= 2) return 'bg-green-900/50';
    if (count <= 5) return 'bg-green-700/70';
    if (count <= 8) return 'bg-green-500';
    return 'bg-green-400';
  };

  const totalContributions = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Activity Contributions</h3>
        <span className="text-xs text-zinc-400">{totalContributions} in the last year</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => (
                <motion.div
                  key={`${wi}-${di}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: (wi * 7 + di) * 0.001 }}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                  title={`${day.date.toLocaleDateString()}: ${day.count} activities`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-zinc-400">
        <span>Less</span>
        {[0, 2, 5, 8, 12].map(n => (
          <div key={n} className={`w-3 h-3 rounded-sm ${getColor(n)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
