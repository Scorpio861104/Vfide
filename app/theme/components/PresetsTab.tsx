'use client';

const PRESETS = [
  {
    name: 'Default Dark',
    detail: 'Balanced contrast for daily use across payments, social features, and dashboards.',
  },
  {
    name: 'High Contrast',
    detail: 'Sharper separation between text and background for accessibility-focused browsing.',
  },
  {
    name: 'Creator Neon',
    detail: 'Brighter accent treatment for demo sessions, screenshots, and marketing previews.',
  },
];

export function PresetsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Preset Themes</h3>
        <p className="text-gray-400">Start with a ready-made theme, then fine-tune details in the customizer tab.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PRESETS.map((preset) => (
          <div key={preset.name} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-3 flex gap-2">
              <span className="h-4 w-4 rounded-full bg-cyan-400" />
              <span className="h-4 w-4 rounded-full bg-indigo-500" />
              <span className="h-4 w-4 rounded-full bg-zinc-200" />
            </div>
            <h4 className="mb-2 font-semibold text-white">{preset.name}</h4>
            <p className="text-sm text-gray-400">{preset.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
