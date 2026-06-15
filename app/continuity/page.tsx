'use client';

export const dynamic = 'force-dynamic';

/**
 * /continuity — Continuity Command Center (Wave 31).
 *
 * Operational, institutional continuity experience. "Ownership That Survives You."
 * Composes the existing continuity read-model (useContinuityStatus) into:
 *   1. a monumental hero with five readiness metrics
 *   2. a status command grid (Guardian Lock / Recovery / Trusted Contacts / Inheritance / Vault)
 *   3. Life Event Planning — continuity for real-world situations
 *   4. a visual Recovery Simulator — disruption -> restored access
 *   5. the existing continuity timeline + cross-institution relationships
 *
 * All metrics/states are derived from real continuity state — never fabricated. Subordinates the
 * existing tools (/guardians, /vault/recover, /inheritance/*, /security-center) into one surface.
 */

import { useContinuityStatus } from '@/hooks/useContinuityStatus';
import { Footer } from '@/components/layout/Footer';
import { ContinuityCommandHero } from '@/components/continuity/ContinuityCommandHero';
import { ContinuityStatusGrid } from '@/components/continuity/ContinuityStatusGrid';
import { LifeEventPlanning, RecoverySimulator } from '@/components/continuity/LifeEventPlanning';
import { ContinuityTimeline } from '@/components/continuity/ContinuityTimeline';
import { ContinuityRelationships } from '@/components/continuity/ContinuityPanels';
import { ContinuityKnowledge } from '@/components/education/InstitutionKnowledge';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function ContinuityPage() {
  const { locale } = useLocale();
  void locale;

  const c = useContinuityStatus();

  return (
    <div className="ui-page-shell relative min-h-screen overflow-hidden md:pt-[3.5rem]">
      {/* Ambient field — restrained, single soft focal glow (reduced decorative density) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-48 left-1/4 h-[680px] w-[680px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <ContinuityCommandHero c={c} />
        <ContinuityStatusGrid c={c} />
        <LifeEventPlanning />
        <RecoverySimulator />

        {/* Embedded education — learn continuity in place */}
        <ContinuityKnowledge />

        {/* Existing continuity surfaces — the lifecycle timeline + how continuity connects */}
        <section className="mb-16" aria-label="Continuity lifecycle">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Continuity Lifecycle</h2>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">The path a vault can travel</p>
          </div>
          <ContinuityTimeline current={c.currentStage} />
        </section>

        <ContinuityRelationships />
      </div>

      <Footer />
    </div>
  );
}
