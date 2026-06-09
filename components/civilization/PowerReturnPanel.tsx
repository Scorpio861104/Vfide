'use client';

/**
 * PowerReturnPanel — V30 Part 2. A calm, reusable statement of what control
 * VFIDE returns to the participant. Two modes:
 *   - multi (default): the six outcomes as a grid (dashboard / overview).
 *   - single (`institution` prop): one outcome as a banner on an institution page.
 *
 * Presentation only — copy keyed to existing institutions in the model.
 */

import { INSTITUTIONS, type InstitutionId } from '@/lib/civilization/model';

const POWER_RETURNED: Record<InstitutionId, string> = {
  ownership: 'You control your assets. No one can freeze or seize them — not even VFIDE.',
  trust: 'You carry your own trust record. It is earned and yours, never granted or revoked at will.',
  commerce: 'You can participate in commerce without traditional gatekeepers, and keep what you earn.',
  opportunity: 'The opportunities your participation unlocks are yours to act on.',
  continuity: 'What you build can survive disruption — and survive you.',
  capability: 'You decide what to learn, and when. Capability here is yours to keep, not a credential we grant.',
  stewardship: 'You can help protect the system, as a participant — not a subject.',
};

const CITIZEN_FACING: InstitutionId[] = ['ownership', 'trust', 'commerce', 'continuity', 'capability', 'stewardship'];

function PowerReturnBanner({ id }: { id: InstitutionId }) {
  const inst = INSTITUTIONS[id];
  const Icon = inst.icon;
  return (
    <div className="glass-card-premium flex items-start gap-4 p-5">
      <span
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border"
        style={{ borderColor: `${inst.color}33`, background: `${inst.color}1a` }}
      >
        <Icon size={20} style={{ color: inst.color }} aria-hidden="true" />
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">What you control</p>
        <p className="mt-0.5 text-base leading-relaxed text-zinc-200">{POWER_RETURNED[id]}</p>
      </div>
    </div>
  );
}

interface PowerReturnPanelProps {
  institution?: InstitutionId;
  title?: string;
}

export function PowerReturnPanel({ institution, title = 'What VFIDE returns to you' }: PowerReturnPanelProps) {
  if (institution) return <PowerReturnBanner id={institution} />;

  return (
    <section aria-label="What VFIDE returns to you" className="glass-card-premium p-6 sm:p-8">
      <h2 className="mb-1 text-xl font-bold text-white">{title}</h2>
      <p className="mb-6 text-sm text-zinc-400">VFIDE serves you. It does not rank you, approve you, or own you.</p>
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {CITIZEN_FACING.map((id) => {
          const inst = INSTITUTIONS[id];
          const Icon = inst.icon;
          return (
            <div key={id} className="flex items-start gap-3">
              <Icon size={18} className="mt-0.5 flex-shrink-0" style={{ color: inst.color }} aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-white">{inst.label}</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{POWER_RETURNED[id]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}