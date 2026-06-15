'use client';

/**
 * PlaybooksPanel (Platform Transformation, Wave 5).
 *
 * Renders operational journeys with REAL derived progress. Each step shows an honest state — done, to-do, coming, or
 * (when a signal cannot confirm it) a neutral dot — and the journey shows how far along you are. A "partial" badge
 * appears when a journey includes a not-yet-built step, so nothing implies a journey can be fully completed when it
 * cannot. RecommendedPlaybook surfaces the single most relevant journey for the Command Center.
 */
import Link from 'next/link';
import { Surface, DomainBadge } from '@/components/headquarters/HQTheme';
import { useSeerInputs } from '@/hooks/useSeerInputs';
import { playbooksForDomain, getPlaybook, type ResolvedPlaybook } from '@/lib/playbooks/model';
import { playbookProgress, recommendedPlaybook, type StepState } from '@/lib/playbooks/progress';
import { DOMAIN_COLOR } from '@/lib/design/hqTokens';
import type { DomainId } from '@/lib/headquarters/model';
import type { SeerInputs } from '@/lib/seer/headquartersObservations';
import { CheckCircle2, Circle, CircleDashed, Clock, ArrowRight } from 'lucide-react';

const STEP_VIS: Record<StepState, { icon: typeof Circle; color: string }> = {
  done: { icon: CheckCircle2, color: '#5FA17F' },
  todo: { icon: Circle, color: 'var(--hq-ink-faint)' },
  unknown: { icon: CircleDashed, color: 'var(--hq-ink-faint)' },
  coming: { icon: Clock, color: 'var(--hq-ink-faint)' },
};

function PlaybookBlock({ playbook, inputs }: { playbook: ResolvedPlaybook; inputs: SeerInputs }) {
  const progress = playbookProgress(playbook.id, inputs);
  if (!progress) return null;
  const c = DOMAIN_COLOR[playbook.domain];
  const firstActionable = progress.steps.find((s) => s.state === 'todo' || s.state === 'unknown');
  const firstStep = playbook.steps.find((s) => s.capability.id === firstActionable?.capabilityId) ?? playbook.steps[0];

  return (
    <Surface tone={playbook.domain}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <DomainBadge domain={playbook.domain}>{playbook.title}</DomainBadge>
          <p className="mt-2 text-sm" style={{ color: 'var(--hq-ink-soft)' }}>{playbook.goal}</p>
        </div>
        {playbook.availability === 'partial' && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ background: 'var(--hq-gold-wash)', color: 'var(--hq-ink-soft)', border: '1px solid var(--hq-edge)' }}>
            Partly available
          </span>
        )}
      </div>

      {/* progress */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--hq-stone)' }}>
          <div className="h-full rounded-full" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: c.accent }} />
        </div>
        <span className="text-xs" style={{ color: 'var(--hq-ink-faint)' }}>{progress.done}/{progress.total}</span>
      </div>

      {/* steps */}
      <ol className="mt-4 space-y-2">
        {progress.steps.map((s) => {
          const vis = STEP_VIS[s.state];
          const Icon = vis.icon;
          const step = playbook.steps.find((x) => x.capability.id === s.capabilityId)!;
          const Row = (
            <span className="flex items-center gap-2.5 text-sm" style={{ color: s.state === 'done' ? 'var(--hq-ink-soft)' : 'var(--hq-ink)' }}>
              <Icon size={15} style={{ color: vis.color }} />
              <span style={{ textDecoration: s.state === 'done' ? 'line-through' : 'none' }}>{s.action}</span>
              {s.state === 'coming' && <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>coming</span>}
            </span>
          );
          return (
            <li key={s.capabilityId}>
              {s.state === 'coming' ? Row : <Link href={step.href} className="transition-opacity hover:opacity-80">{Row}</Link>}
            </li>
          );
        })}
      </ol>

      {firstStep && firstActionable && (
        <Link href={firstStep.href} className="mt-5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: c.wash, color: c.soft, border: '1px solid var(--hq-edge)' }}>
          {progress.done === 0 ? 'Start' : 'Continue'} <ArrowRight size={14} />
        </Link>
      )}
    </Surface>
  );
}

export function PlaybooksPanel({ domain }: { domain: DomainId }) {
  const inputs = useSeerInputs();
  const playbooks = playbooksForDomain(domain);
  if (playbooks.length === 0) return null;
  return <div className="space-y-3">{playbooks.map((p) => <PlaybookBlock key={p.id} playbook={p} inputs={inputs} />)}</div>;
}

export function RecommendedPlaybook() {
  const inputs = useSeerInputs();
  const id = recommendedPlaybook(inputs);
  const playbook = id ? getPlaybook(id) : undefined;
  if (!playbook) return null;
  return <PlaybookBlock playbook={playbook} inputs={inputs} />;
}
