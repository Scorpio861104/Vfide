'use client';

import { useTheme } from '@/hooks/useTheme';

export function PreviewTab() {
  const { effectiveTokens, activePreset } = useTheme();

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-1">Live Preview</h3>
        <p className="text-gray-400">
          All samples below use your currently active theme tokens in real time.
          Active preset: <span className="text-white font-medium">{activePreset.name}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">

        {/* Typography */}
        <div className="rounded-2xl border p-5"
          style={{
            background: effectiveTokens.cardBg,
            borderColor: effectiveTokens.cardBorder,
            borderRadius: effectiveTokens.borderRadius,
            fontSize: `calc(1rem * ${effectiveTokens.fontScale})`,
          }}>
          <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: effectiveTokens.accent }}>
            Heading sample
          </p>
          <h4 className="text-2xl font-bold text-white mt-1">Payments at a glance</h4>
          <p className="mt-2 text-sm text-gray-400">
            Preview how core marketing and dashboard typography renders in your selected theme.
          </p>
        </div>

        {/* Buttons */}
        <div className="rounded-2xl border p-5"
          style={{
            background: effectiveTokens.cardBg,
            borderColor: effectiveTokens.cardBorder,
            borderRadius: effectiveTokens.borderRadius,
          }}>
          <p className="mb-3 text-sm font-semibold text-white">Action sample</p>
          <div className="flex flex-wrap gap-3">
            {/* button-ok: decorative theme-preview swatch; intentionally inert */}
            <button
              type="button"
              className="px-4 py-2 font-semibold text-sm transition-opacity hover:opacity-90"
              style={{
                background: effectiveTokens.accent,
                color: effectiveTokens.accentFg,
                borderRadius: effectiveTokens.borderRadius,
              }}
            >
              Primary
            </button>
            <button
              type="button"
              className="px-4 py-2 font-semibold text-sm text-white border transition-opacity hover:opacity-80"
              style={{
                background: effectiveTokens.cardBg,
                borderColor: effectiveTokens.cardBorder,
                borderRadius: effectiveTokens.borderRadius,
              }}
            >
              Secondary
            </button>
            <button
              type="button"
              className="px-4 py-2 font-semibold text-sm transition-opacity hover:opacity-90"
              style={{
                background: effectiveTokens.accentSecondary,
                color: '#ffffff',
                borderRadius: effectiveTokens.borderRadius,
              }}
            >
              Accent 2
            </button>
          </div>
        </div>

        {/* Card + badge */}
        <div className="rounded-2xl border p-5"
          style={{
            background: effectiveTokens.cardBg,
            borderColor: effectiveTokens.cardBorder,
            borderRadius: effectiveTokens.borderRadius,
          }}>
          <p className="mb-3 text-sm font-semibold text-white">Card + badge sample</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: effectiveTokens.accent, color: effectiveTokens.accentFg }}>
              VF
            </div>
            <div>
              <p className="text-white text-sm font-medium">VFIDE Wallet</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: effectiveTokens.accent + '22', color: effectiveTokens.accent }}>
                Connected
              </span>
            </div>
          </div>
        </div>

        {/* Token values */}
        <div className="rounded-2xl border p-5"
          style={{
            background: effectiveTokens.cardBg,
            borderColor: effectiveTokens.cardBorder,
            borderRadius: effectiveTokens.borderRadius,
          }}>
          <p className="mb-3 text-sm font-semibold text-white">Active token values</p>
          <dl className="space-y-1.5 text-xs font-mono">
            {(Object.entries(effectiveTokens) as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <dt className="text-gray-500 shrink-0 w-36">{k}</dt>
                <dd className="text-gray-200 truncate">{v}</dd>
                {v.startsWith('#') && (
                  <span className="ml-auto w-4 h-4 rounded-sm ring-1 ring-white/10 shrink-0"
                    style={{ background: v }} />
                )}
              </div>
            ))}
          </dl>
        </div>

      </div>
    </div>
  );
}
