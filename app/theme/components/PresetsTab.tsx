'use client';

import { Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function PresetsTab() {
  const { presets, activePresetId, isDirty, applyPreset } = useTheme();

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-2">Preset Themes</h3>
        <p className="text-gray-400">
          Pick a preset to apply it instantly across the whole app. Fine-tune
          individual tokens in the <span className="text-white font-medium">Advanced</span> tab.
          {isDirty && (
            <span className="ml-2 text-amber-400 text-sm">
              · You have unsaved custom overrides active
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {presets.map((preset) => {
          const isActive = preset.id === activePresetId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              aria-pressed={isActive}
              aria-label={`Apply ${preset.name} theme`}
              className={[
                'relative rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isActive
                  ? 'border-accent/60 bg-accent/10 ring-1 ring-accent/30'
                  : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5',
              ].join(' ')}
            >
              {isActive && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                  <Check size={13} className="text-black" strokeWidth={3} />
                </span>
              )}
              <div className="mb-3 flex gap-2">
                {preset.swatches.map((color) => (
                  <span
                    key={color}
                    className="h-4 w-4 rounded-full ring-1 ring-white/10"
                    style={{ background: color }}
                  />
                ))}
              </div>
              <h4 className="mb-1.5 font-semibold text-white">{preset.name}</h4>
              <p className="text-sm text-gray-400 leading-snug">{preset.description}</p>
              {isActive && (
                <p className="mt-3 text-xs font-medium text-accent">Active</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
