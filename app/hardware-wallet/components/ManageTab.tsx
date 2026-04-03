'use client';

const MANAGEMENT_TASKS = [
  'Review firmware versions before important transfers or governance actions.',
  'Label frequently used accounts so merchant, vault, and personal flows stay separated.',
  'Reconfirm addresses on-device for every high-value withdrawal or payout batch.',
];

export function ManageTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Ongoing Management</h3>
        <p className="text-gray-400">Once connected, use this checklist to keep the device ready for day-to-day signing.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {MANAGEMENT_TASKS.map((task, index) => (
          <div key={task} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="mb-2 text-sm font-semibold text-cyan-300">Task {index + 1}</p>
            <p className="text-sm text-gray-400">{task}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
