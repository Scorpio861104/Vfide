'use client';

const ACTIVE_STEPS = [
  'Submitted appeals are queued for policy or evidence review.',
  'You may be asked for transaction context, timestamps, or supporting notes.',
  'A final decision updates the resolution tab and the appeal status hook.',
];

export function ActiveTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Active Appeals</h3>
        <p className="text-gray-400">Track what happens after an appeal is submitted and before a final resolution is posted.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <ul className="space-y-2 text-sm text-gray-300">
          {ACTIVE_STEPS.map((step) => (
            <li key={step}>• {step}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
