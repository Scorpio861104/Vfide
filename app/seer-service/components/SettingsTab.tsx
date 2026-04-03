'use client';

const SETTINGS_GROUPS = [
  {
    title: 'Risk posture',
    items: ['Keep safe mode enabled for new wallets', 'Escalate governance actions above custom thresholds'],
  },
  {
    title: 'Notifications',
    items: ['Alert when appeals are opened', 'Notify when score deltas exceed tolerance'],
  },
];

export function SettingsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Operational Settings</h3>
        <p className="text-gray-400">These controls document the recommended production defaults for Seer-assisted flows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h4 className="text-white font-semibold mb-3">{group.title}</h4>
            <ul className="space-y-2 text-sm text-gray-300 list-disc pl-5">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
