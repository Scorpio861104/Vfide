import Link from 'next/link';

export default function QuestsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 text-center">
        <div className="text-5xl mb-6">📋</div>
        <h1 className="text-2xl font-bold mb-3">Quests Not Available</h1>
        <p className="text-zinc-400 mb-6">
          Quests and daily challenges are not part of the VFIDE platform.
          VFIDE is a governance utility token — participation is through governance
          voting, ProofScore, and merchant activity.
        </p>
        <Link
          href="/governance"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
        >
          Go to Governance
        </Link>
      </div>
    </div>
  );
}
