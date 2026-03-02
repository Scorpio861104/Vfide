import Link from 'next/link';

export default function HeadhunterPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 text-center">
        <div className="text-5xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold mb-3">Referral Program Not Available</h1>
        <p className="text-zinc-400 mb-6">
          The headhunter referral program is not available. VFIDE does not offer
          referral bonuses or token rewards for bringing in other users, as this
          would conflict with Howey Test compliance.
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
