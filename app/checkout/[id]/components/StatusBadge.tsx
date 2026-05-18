'use client';

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    processing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    refunded: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const style = colors[status] || colors.pending;
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold border capitalize ${style}`}>
      {status}
    </span>
  );
}
