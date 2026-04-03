'use client';

const MEMBER_QUEUE = [
  'Council roster validation for the upcoming term',
  'Moderator availability confirmations',
  'Compensation acknowledgment follow-ups',
];

export function MembersTab() {
  return (
    <div className="space-y-4">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Member Operations</h3>
        <p className="text-gray-400">Review service eligibility, term continuity, and open coordination items.</p>
      </div>
      {MEMBER_QUEUE.map((item) => (
        <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-200">
          {item}
        </div>
      ))}
    </div>
  );
}
