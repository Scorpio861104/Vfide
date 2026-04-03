'use client';

const PIPELINE = [
  'Treasury budget adjustment awaiting reviewer sign-off',
  'Merchant incentive policy draft in community comment period',
  'Security parameter refresh queued for the next governance slot',
];

export function ProposalsTab() {
  return (
    <div className="space-y-4">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Proposal Pipeline</h3>
        <p className="text-gray-400">Track what is drafting, under review, or ready for a vote.</p>
      </div>
      {PIPELINE.map((item) => (
        <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-200">
          {item}
        </div>
      ))}
    </div>
  );
}
