import Link from 'next/link';

export default function AchievementsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 text-center">
        <div className="text-5xl mb-6">🏅</div>
        <h1 className="text-2xl font-bold mb-3">Achievements Not Available</h1>
        <p className="text-zinc-400 mb-6">
          XP-based achievements are not part of the VFIDE platform.
          Build your reputation through ProofScore — earned by governance participation,
          vault usage, endorsements, and on-chain activity.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium transition-colors"
        >
          View ProofScore
        </Link>
      </div>
    </div>
  );
}
