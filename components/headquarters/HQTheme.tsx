'use client';

/**
 * Headquarters theme + primitives (Platform Transformation, Wave 1).
 *
 * HQRoot applies the visual doctrine as CSS variables on a scoped wrapper (so the legacy components are untouched)
 * and establishes the charcoal ground. The primitives — Surface, DomainBadge, StatusDot — are the sculpted building
 * blocks: depth and quiet jewel-tone accents instead of card spam.
 */
import type { CSSProperties, ReactNode } from 'react';
import { hqCssVariables, DOMAIN_COLOR, type DomainId } from '@/lib/design/hqTokens';
import type { CapabilityStatus } from '@/lib/headquarters/model';

export function HQRoot({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="hq-root min-h-screen"
      style={{
        ...(hqCssVariables() as CSSProperties),
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(199,168,103,0.05), transparent 60%), var(--hq-obsidian)',
        color: 'var(--hq-ink)',
        fontFamily: 'var(--font-inter, ui-sans-serif, system-ui, sans-serif)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A sculpted surface: raised stone over the charcoal ground, hairline edge, soft inner depth. */
export function Surface({
  children, tone, className = '', style, padded = true,
}: {
  children: ReactNode; tone?: DomainId; className?: string; style?: CSSProperties; padded?: boolean;
}) {
  const accent = tone ? DOMAIN_COLOR[tone] : null;
  return (
    <div
      className={`relative rounded-2xl ${padded ? 'p-6' : ''} ${className}`}
      style={{
        background: accent
          ? `linear-gradient(180deg, ${accent.wash}, transparent 70%), var(--hq-graphite)`
          : 'var(--hq-graphite)',
        border: '1px solid var(--hq-edge)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02), 0 1px 2px rgba(0,0,0,0.4)',
        ...style,
      }}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute left-0 top-6 bottom-6 w-[2px] rounded-full"
          style={{ background: accent.accent, opacity: 0.7 }}
        />
      )}
      {children}
    </div>
  );
}

/** A quiet domain marker — the jewel tone as identity, never decoration. */
export function DomainBadge({ domain, children }: { domain: DomainId; children?: ReactNode }) {
  const c = DOMAIN_COLOR[domain];
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: c.soft }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.accent }} />
      {children}
    </span>
  );
}

const STATUS_META: Record<CapabilityStatus, { label: string; color: string }> = {
  live: { label: 'Ready', color: '#5FA17F' },
  partial: { label: 'In progress', color: '#CF9356' },
  coming: { label: 'Coming', color: '#6F6C62' },
};

/** Honest availability indicator (Veritas Law): Ready / In progress / Coming. */
export function StatusDot({ status, showLabel = false }: { status: CapabilityStatus; showLabel?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {showLabel && <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>{m.label}</span>}
    </span>
  );
}
