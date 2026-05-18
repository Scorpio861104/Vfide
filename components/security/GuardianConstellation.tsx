'use client';

/**
 * GuardianConstellation — a guardian network seen as stars + lines.
 *
 * Each star is a guardian. Lines connect them to a central node (the
 * Monument vertex). Visual encoding:
 *   - Edge brightness   ← how recently they took an on-chain action
 *                          (cancelled a queued item, etc.)
 *   - Star radius       ← how many actions they've taken (lifetime)
 *   - Star color        ← derived from their address hash, so they
 *                          stay visually identifiable across visits
 *
 * No spurious data: a guardian who has never acted shows up as a faint
 * star with a faint line — not invisible, just quiet. This is honest
 * — they're "still on the watchlist" — without inventing activity.
 *
 * Reduced motion: the twinkle and recency-fade animations don't run;
 * the constellation renders in its current state and stays put.
 *
 * Drop-in: takes a vaultAddress prop (defaults to the user's own vault).
 * Renders nothing if there are no guardians yet.
 */

import { useMemo } from 'react';
import { useGuardians } from '@/hooks/useGuardians';
import { useUserVault } from '@/hooks/useVaultHooks';
import { usePrefersReducedMotion } from '@/app/components/usePrefersReducedMotion';

interface GuardianConstellationProps {
  /** Override vault address. Defaults to the user's own vault. */
  vaultAddress?: `0x${string}`;
  /** Outer SVG size (square). Default 320. */
  size?: number;
}

const W = 320;

/** Stable color from address — golden-angle hue rotation keeps stars distinct. */
function hashColor(addr: string): string {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
  const hue = (h * 137.508) % 360; // golden angle
  return `hsl(${hue.toFixed(0)}, 70%, 65%)`;
}

/** Recency factor 0..1 — fresh actions are 1, stale or never are near 0. */
function recencyFactor(lastActionSec: bigint | null): number {
  if (lastActionSec === null) return 0.15; // never acted — faint baseline
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  if (nowSec <= lastActionSec) return 1.0;
  const ageSec = Number(nowSec - lastActionSec);
  // Half-life ~14 days: 1 day → ~0.95, 7 days → ~0.7, 30 days → ~0.23
  const halfLifeSec = 14 * 24 * 60 * 60;
  return Math.max(0.15, Math.pow(0.5, ageSec / halfLifeSec));
}

export function GuardianConstellation({ vaultAddress, size = W }: GuardianConstellationProps) {
  const { vaultAddress: userVault } = useUserVault();
  const effectiveVault = vaultAddress ?? (userVault as `0x${string}` | null) ?? undefined;
  const { guardians, isLoading, error } = useGuardians(effectiveVault);
  const reducedMotion = usePrefersReducedMotion();

  const center = size / 2;
  const ringRadius = size * 0.38;

  const stars = useMemo(() => {
    if (guardians.length === 0) return [];
    return guardians.map((g, i) => {
      const angle = (i / guardians.length) * 2 * Math.PI - Math.PI / 2;
      const x = center + ringRadius * Math.cos(angle);
      const y = center + ringRadius * Math.sin(angle);
      const recency = recencyFactor(g.lastActionAt);
      // 3..7 px radius, scaling on action count (capped).
      const radius = 3 + Math.min(4, Math.log2(1 + g.actionCount));
      return {
        ...g,
        x,
        y,
        radius,
        recency,
        color: hashColor(g.address),
      };
    });
  }, [guardians, center, ringRadius]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-xs"
        style={{ width: size, height: size }}
      >
        Reading guardian history…
      </div>
    );
  }

  if (error || guardians.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle cx={center} cy={center} r={4} fill="rgba(255,255,255,0.3)" />
        </svg>
        <div className="text-xs text-gray-500 mt-2 max-w-[200px]">
          {error
            ? 'Could not load guardian history.'
            : 'No guardians yet. Add at least two from My Guardians.'}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${guardians.length} guardian${guardians.length === 1 ? '' : 's'}`}
      >
        {/* Edges — drawn first so stars overlap them. */}
        {stars.map((s) => (
          <line
            key={`edge-${s.address}`}
            x1={center}
            y1={center}
            x2={s.x}
            y2={s.y}
            stroke={s.color}
            strokeWidth={1}
            strokeOpacity={0.15 + 0.5 * s.recency}
            strokeLinecap="round"
          />
        ))}

        {/* Central Monument vertex — small faceted star matching the brand. */}
        <g>
          <circle cx={center} cy={center} r={9} fill="rgba(255,255,255,0.06)" />
          <polygon
            points={`
              ${center},${center - 6}
              ${center + 5.2},${center - 3}
              ${center + 5.2},${center + 3}
              ${center},${center + 6}
              ${center - 5.2},${center + 3}
              ${center - 5.2},${center - 3}
            `}
            fill="rgba(255,255,255,0.85)"
            stroke="rgba(168,85,247,0.55)"
            strokeWidth={1}
          />
          {!reducedMotion && (
            <circle cx={center} cy={center} r={9} fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth={1}>
              <animate attributeName="r" values="9;16;9" dur="3.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0;0.55" dur="3.4s" repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* Stars (guardians). */}
        {stars.map((s) => (
          <g key={`star-${s.address}`}>
            {/* Faint halo when active. */}
            {s.recency > 0.4 && !reducedMotion && (
              <circle
                cx={s.x}
                cy={s.y}
                r={s.radius + 4}
                fill={s.color}
                opacity={0.05 + s.recency * 0.1}
              >
                <animate
                  attributeName="r"
                  values={`${s.radius + 2};${s.radius + 6};${s.radius + 2}`}
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx={s.x}
              cy={s.y}
              r={s.radius}
              fill={s.color}
              opacity={0.5 + 0.5 * s.recency}
            >
              <title>
                {s.address.slice(0, 6)}…{s.address.slice(-4)} — {s.actionCount} action
                {s.actionCount === 1 ? '' : 's'}
                {s.lastActionAt
                  ? `\nlast acted ${formatAgo(s.lastActionAt)}`
                  : '\nno on-chain actions yet'}
              </title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

function formatAgo(unixSec: bigint): string {
  const ageSec = Math.max(0, Math.floor(Date.now() / 1000) - Number(unixSec));
  if (ageSec < 60) return 'just now';
  if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
  if (ageSec < 86400) return `${Math.floor(ageSec / 3600)}h ago`;
  return `${Math.floor(ageSec / 86400)}d ago`;
}
