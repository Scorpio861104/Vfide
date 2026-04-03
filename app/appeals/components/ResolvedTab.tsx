'use client';

const RESOLUTION_OUTCOMES = [
  'Approved appeals restore access or clear the flagged event when evidence supports the request.',
  'Denied appeals preserve the original restriction and include a written explanation when available.',
  'All outcomes should be captured for auditability and future policy tuning.',
];

export function ResolvedTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Resolved Appeals</h3>
        <p className="text-gray-400">Once a case is closed, the final reasoning and outcome should be reflected here for review.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <ul className="space-y-2 text-sm text-gray-300">
          {RESOLUTION_OUTCOMES.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
