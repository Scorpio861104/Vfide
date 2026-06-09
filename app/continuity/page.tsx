'use client';

export const dynamic = 'force-dynamic';

/**
 * /continuity — Continuity Command Center (V26).
 *
 * Single entry point for the continuity institution. Subordinates the existing
 * tools (/guardians, /vault/recover, /inheritance/*, /security-center) into one
 * understanding surface: what is protected, what can be recovered, what
 * survives you, what is unfinished, what risks remain.
 */

import { useContinuityStatus, type ContinuityReadiness } from '@/hooks/useContinuityStatus';
import { PageHeader } from '@/components/ui/PageHeader';
import { Footer } from '@/components/layout/Footer';
import { Heart } from 'lucide-react';
import { ContinuitySectionCard } from '@/components/continuity/ContinuitySectionCard';
import { ContinuityTimeline } from '@/components/continuity/ContinuityTimeline';
import {
  FamilyContinuityPanel,
  BusinessContinuityPanel,
  ContinuityRelationships,
} from '@/components/continuity/ContinuityPanels';
import { useLocale } from '@/lib/locale/LocaleProvider';

const READINESS: Record<ContinuityReadiness, { label: string; cls: string; dot: string; line: string }> = {
  protected: {
    label: 'Protected',
    cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    dot: 'bg-emerald-400',
    line: 'Guardians, recovery, and inheritance are all configured.',
  },
  partial: {
    label: 'Partial',
    cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    dot: 'bg-amber-400',
    line: 'Some protections are configured. Finish the rest to be fully protected.',
  },
  incomplete: {
    label: 'Incomplete',
    cls: 'border-red-400/30 bg-red-400/10 text-red-300',
    dot: 'bg-red-400',
    line: 'Your vault has little or no continuity protection yet.',
  },
  unknown: {
    label: 'Unknown',
    cls: 'border-white/10 bg-white/5 text-zinc-300',
    dot: 'bg-zinc-500',
    line: 'Connect your wallet to assess your continuity.',
  },
};

export default function ContinuityPage() {
  const { locale } = useLocale();
  void locale;

  const c = useContinuityStatus();
  const r = READINESS[c.readiness];

  const ReadinessHeader = (
    <div className="glass-card-premium ui-card-sheen flex w-full flex-col gap-3 rounded-2xl p-4 md:w-auto md:min-w-[18rem]">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">Continuity readiness</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${r.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} aria-hidden="true" />
          {r.label}
        </span>
      </div>
      <p className="text-sm text-zinc-400">{r.line}</p>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < c.configuredCount ? 'bg-pink-400' : 'bg-white/10'}`} />
        ))}
      </div>
      <span className="sr-only">{c.configuredCount} of 3 protections configured.</span>
    </div>
  );

  return (
    <div className="ui-page-shell relative min-h-screen overflow-hidden md:pt-[3.5rem]">
      {/* Ambient orbs - continuity pink sub-brand */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/3 h-[600px] w-[600px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -right-24 h-[500px] w-[500px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
      </div>
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

      <div className="ui-container-breathing relative z-10 py-10">
        <PageHeader
          eyebrow={<><Heart size={12} /> Continuity Institution</>}
          title="Continuity"
          subtitle="What is protected, what can be recovered, and what survives you - in one place."
          action={ReadinessHeader}
        />

        {/* Pillars: guardians / recovery / inheritance / security / memorial */}
        <section aria-label="Continuity pillars" className="mb-8">
          <h2 className="sr-only">Continuity pillars</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.sections.map((section) => (
              <ContinuitySectionCard key={section.id} section={section} />
            ))}
          </div>
        </section>

        <div className="mb-8">
          <ContinuityTimeline current={c.currentStage} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FamilyContinuityPanel />
          <BusinessContinuityPanel />
        </div>

        <ContinuityRelationships />
      </div>

      <Footer />
    </div>
  );
}
