'use client';

/**
 * VaultRecoveryPanel — guardian summary for the CardBound vault.
 *
 * Pre-cleanup, this component had a parallel Next-of-Kin (NoK) section
 * for legacy non-CardBound vaults. Since `isCardBoundVaultMode()` always
 * returns true and the wrapping branch was `!cardBoundMode`, the NoK
 * section was dead UI. Removed entirely along with its props, the
 * recovery hook's setNextOfKinAddress (which threw unconditionally),
 * and the matching state in useVaultOperations.
 *
 * Guardian setup itself happens in the Guardians dashboard (a separate
 * page), so this panel renders a summary + a link rather than its own
 * add-guardian form.
 */

import { GlassCard } from '@/components/ui/GlassCard';
import { Key } from 'lucide-react';

interface VaultRecoveryPanelProps {
  guardianCount: number;
  isUserGuardian: boolean | undefined;
}

export function VaultRecoveryPanel({ guardianCount, isUserGuardian }: VaultRecoveryPanelProps) {
  return (
    <section className="py-8 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <GlassCard className="p-6" hover={false}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Key className="text-accent" />
                CardBound Guardian Setup
              </h2>
              <p className="text-white/60 text-sm">
                CardBound vaults use guardian-backed wallet rotation and queue
                protections for recovery. Configure inheritance heirs in the panel below.
              </p>
            </div>
            <div className="px-4 py-2 bg-cyan-500/20 border border-accent/30 rounded-xl text-center">
              <div className="text-accent text-xs font-bold">CARD BOUND</div>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-xl mb-4">
            {guardianCount > 0 ? (
              <div className="text-center py-2">
                <span className="text-white">
                  {guardianCount} guardian{guardianCount !== 1 ? 's' : ''} configured
                </span>
                {isUserGuardian && (
                  <div className="text-accent mt-2 text-sm">✓ You are a guardian</div>
                )}
              </div>
            ) : (
              <div className="text-amber-400 text-sm text-center py-2">
                ⚠️ No guardians configured yet. Complete guardian setup to enable
                recovery and transfer protections.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-accent/30 bg-cyan-500/10 p-4 text-sm text-accent">
            Manage guardian setup and post-setup guardian changes from the{' '}
            <a href="/guardians" className="underline hover:text-accent">
              Guardians dashboard
            </a>
            , which supports CardBound timelocks and setup completion.
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
