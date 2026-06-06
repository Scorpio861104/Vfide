interface ClaimTabProps {
  isConnected: boolean;
  isBeneficiary: boolean;
  claimable: bigint;
  claimsPaused: boolean;
  onClaim: () => Promise<void>;
  isClaiming: boolean;
  claimError: string | null;
  claimSuccess: string | null;
}

export function ClaimTab({
  isConnected,
  isBeneficiary,
  claimable,
  claimsPaused,
  onClaim,
  isClaiming,
  claimError,
  claimSuccess,
}: ClaimTabProps) {
  const canClaim = isConnected && isBeneficiary && !claimsPaused && claimable > 0n && !isClaiming;

  return (
    <div className="analytics-card p-6">
      <h2 className="text-xl font-bold text-white mb-4">Claim</h2>
      <p className="text-sm text-white/70 mb-2">Available to Claim</p>
      <p className="text-sm text-white/70 mb-4">Claimable amount: {claimable.toString()}</p>

      <button
        type="button"
        onClick={() => { void onClaim(); }}
        disabled={!canClaim}
        className="px-4 py-2 rounded-lg bg-cyan-500 text-zinc-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isClaiming ? 'Claiming...' : 'Claim vested tokens'}
      </button>

      {claimError && <p className="text-sm text-red-400 mt-3">{claimError}</p>}
      {claimSuccess && <p className="text-sm text-emerald-400 mt-3">{claimSuccess}</p>}
    </div>
  );
}
