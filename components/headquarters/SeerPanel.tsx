'use client';

/**
 * SeerPanel (Platform Transformation, Wave 3).
 *
 * Surfaces the Seer's deterministic observations. Pass a `domain` to scope it to one headquarters (plus the
 * cross-cutting observations that touch it), or omit it for the Command Center's whole-picture briefing. Severity
 * drives a quiet visual treatment — concern is amber, good is emerald, the rest are calm — never alarmist.
 */
import Link from 'next/link';
import { Surface, DomainBadge } from '@/components/headquarters/HQTheme';
import { useSeerInputs } from '@/hooks/useSeerInputs';
import { deriveObservations, observationsForDomain, type SeerObservation, type Severity } from '@/lib/seer/headquartersObservations';
import type { DomainId } from '@/lib/headquarters/model';
import { Eye, AlertTriangle, Lightbulb, TrendingUp, GraduationCap, Link2, ArrowUpRight } from 'lucide-react';

const SEVERITY_COLOR: Record<Severity, string> = {
  concern: '#CF9356',  // amber — attention, not alarm
  watch: '#C7A867',    // gold — worth doing
  info: 'var(--hq-ink-soft)',
  good: '#5FA17F',     // emerald — settled
};

const KIND_ICON = {
  explain: Eye, teach: GraduationCap, warn: AlertTriangle, opportunity: TrendingUp, recommend: Lightbulb, connect: Link2,
} as const;

export function SeerPanel({ domain, limit = 4 }: { domain?: DomainId; limit?: number }) {
  const inputs = useSeerInputs();
  const observations = (domain ? observationsForDomain(inputs, domain) : deriveObservations(inputs)).slice(0, limit);

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <DomainBadge domain={domain ?? 'ownership'}>The Seer</DomainBadge>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>Explains · never decides</span>
      </div>
      <div className="mt-4 space-y-3">
        {observations.map((o) => <ObservationRow key={o.id} o={o} />)}
      </div>
    </Surface>
  );
}

function ObservationRow({ o }: { o: SeerObservation }) {
  const Icon = KIND_ICON[o.kind];
  const color = SEVERITY_COLOR[o.severity];
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0" style={{ color }}><Icon size={15} /></span>
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>{o.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>{o.detail}</p>
        {o.action && (
          <Link href={o.action.href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80" style={{ color }}>
            {o.action.label} <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
