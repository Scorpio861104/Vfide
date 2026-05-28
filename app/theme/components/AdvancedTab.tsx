'use client';

import { RotateCcw, Save } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeTokens } from '@/hooks/useTheme';

interface TokenFieldProps {
  label: string;
  tokenKey: keyof ThemeTokens;
  description: string;
  type: 'color' | 'text' | 'select';
  options?: { label: string; value: string }[];
  effectiveTokens: ThemeTokens;
  customTokens: Partial<ThemeTokens>;
  onChange: (key: keyof ThemeTokens, value: string) => void;
}

function TokenField({ label, tokenKey, description, type, options, effectiveTokens, customTokens, onChange }: TokenFieldProps) {
  const value = effectiveTokens[tokenKey];
  const isOverridden = tokenKey in customTokens;

  return (
    <div className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-white">{label}</p>
          {isOverridden && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">custom</span>
          )}
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="shrink-0">
        {type === 'color' && (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.startsWith('#') ? value : '#06b6d4'}
              onChange={(e) => onChange(tokenKey, e.target.value)}
              className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
              aria-label={`Color picker for ${label}`}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(tokenKey, e.target.value)}
              className="w-28 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
              aria-label={`Hex value for ${label}`}
            />
          </div>
        )}
        {type === 'select' && options && (
          <select
            value={value}
            onChange={(e) => onChange(tokenKey, e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label={`Select ${label}`}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
        {type === 'text' && (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(tokenKey, e.target.value)}
            className="w-36 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label={`Text value for ${label}`}
          />
        )}
      </div>
    </div>
  );
}

export function AdvancedTab() {
  const { effectiveTokens, customTokens, isDirty, updateCustomToken, resetToPreset, activePreset } = useTheme();

  const handleChange = (key: keyof ThemeTokens, value: string) => {
    updateCustomToken(key, value as ThemeTokens[typeof key]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Advanced Customiser</h3>
          <p className="text-gray-400 text-sm">
            Override individual design tokens on top of the
            <span className="text-white font-medium ml-1">{activePreset.name}</span> preset.
            Changes apply instantly across the whole app.
          </p>
        </div>
        {isDirty && (
          <button
            type="button"
            onClick={resetToPreset}
            className="flex items-center gap-2 shrink-0 px-3 py-2 text-sm text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded-xl hover:bg-amber-500/20 transition-colors"
            aria-label="Reset custom overrides to preset defaults"
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Colour tokens</p>

        <TokenField
          label="Accent" tokenKey="accent" type="color"
          description="Primary brand colour used on buttons, highlights, and active states."
          effectiveTokens={effectiveTokens} customTokens={customTokens} onChange={handleChange}
        />
        <TokenField
          label="Accent foreground" tokenKey="accentFg" type="color"
          description="Text/icon colour placed on top of the accent background — ensure WCAG AA contrast."
          effectiveTokens={effectiveTokens} customTokens={customTokens} onChange={handleChange}
        />
        <TokenField
          label="Secondary accent" tokenKey="accentSecondary" type="color"
          description="Used for secondary buttons, badges, and decorative gradients."
          effectiveTokens={effectiveTokens} customTokens={customTokens} onChange={handleChange}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Layout tokens</p>

        <TokenField
          label="Border radius" tokenKey="borderRadius" type="select"
          description="Controls the corner rounding of glass cards and panel sections across the app."
          options={[
            { label: 'Small (0.5 rem)', value: '0.5rem' },
            { label: 'Medium (0.75 rem)', value: '0.75rem' },
            { label: 'Large (1 rem)', value: '1rem' },
            { label: 'Extra large (1.25 rem)', value: '1.25rem' },
          ]}
          effectiveTokens={effectiveTokens} customTokens={customTokens} onChange={handleChange}
        />
        <TokenField
          label="Font scale" tokenKey="fontScale" type="select"
          description="Multiplies base font sizes in the Preview tab. For system-level font scaling, use your browser's zoom (Ctrl/⌘ +)."
          options={[
            { label: 'Small (0.95×)', value: '0.95' },
            { label: 'Normal (1×)', value: '1' },
            { label: 'Large (1.05×)', value: '1.05' },
            { label: 'Extra large (1.1×)', value: '1.1' },
          ]}
          effectiveTokens={effectiveTokens} customTokens={customTokens} onChange={handleChange}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Surface tokens</p>

        <TokenField
          label="Card background" tokenKey="cardBg" type="text"
          description="CSS colour / rgba() for glass-card backgrounds."
          effectiveTokens={effectiveTokens} customTokens={customTokens} onChange={handleChange}
        />
        <TokenField
          label="Card border" tokenKey="cardBorder" type="text"
          description="CSS colour / rgba() for card border strokes."
          effectiveTokens={effectiveTokens} customTokens={customTokens} onChange={handleChange}
        />
      </div>

      {isDirty && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 flex items-center gap-3">
          <Save size={16} className="text-accent shrink-0" />
          <p className="text-sm text-accent">
            Your custom overrides are saved automatically to this device. They persist across page reloads.
            Switch to a different preset to discard them.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-white/5 bg-white/2 p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Accessibility guardrails</p>
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Keep accent contrast ratio &ge; 4.5:1 against the zinc-950 background for WCAG AA compliance.</li>
          <li>• Test themes in both desktop and mobile layouts before rolling them out broadly.</li>
          <li>• The <span className="text-white">High Contrast</span> preset meets WCAG AAA — use it as a baseline for accessibility testing.</li>
        </ul>
      </div>
    </div>
  );
}
