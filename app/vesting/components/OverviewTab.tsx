interface OverviewTabProps {
  vestingStatus?: readonly [bigint, bigint, bigint, bigint, number, bigint, boolean];
}

export function OverviewTab({ vestingStatus }: OverviewTabProps) {
  const total = vestingStatus?.[0] ?? 0n;
  const claimed = vestingStatus?.[2] ?? 0n;
  const claimable = vestingStatus?.[3] ?? 0n;

  return (
    <div className="analytics-card p-6">
      <h2 className="text-xl font-bold text-white mb-4">Vesting Progress</h2>
      <p className="text-sm text-white/60 mb-4">Current Milestone</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-white/50 mb-1">Total allocation</div>
          <div className="text-lg font-semibold text-white">{total.toString()}</div>
        </div>
        <div>
          <div className="text-xs text-white/50 mb-1">Claimed</div>
          <div className="text-lg font-semibold text-emerald-400">{claimed.toString()}</div>
        </div>
        <div>
          <div className="text-xs text-white/50 mb-1">Claimable</div>
          <div className="text-lg font-semibold text-cyan-400">{claimable.toString()}</div>
        </div>
      </div>
    </div>
  );
}
