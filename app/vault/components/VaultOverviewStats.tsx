'use client';

/**
 * VaultOverviewStats
 *
 * Pre-cleanup, this panel showed:
 *   - "≈ $0 USD" with a hardcoded `usdValue = '0.00'` from
 *     useVaultOperations (no price feed wired). Users could read this
 *     as "my vault is worth nothing" or "VFIDE is at $0".
 *   - "ACTIVE • All systems secure" as static text regardless of
 *     actual vault state (it doesn't subscribe to quarantine/pause).
 *   - "Guardians: N/5" with an arbitrary /5 max the contract doesn't
 *     enforce, plus "3+ guardians unlock recovery mode" which doesn't
 *     match the on-chain threshold logic.
 *
 * Now: USD row is gone (until a price feed exists), status row was
 * dropped because it duplicated VaultSecuritySection (which DOES
 * reflect real pause/quarantine state), and guardian count is shown
 * without a fake denominator. If/when these are wired to real data
 * the cards can come back.
 */

import { GlassCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { containerVariants, itemVariants } from '@/lib/motion-presets';
import { m } from 'framer-motion';
import { DollarSign, Users } from 'lucide-react';
import { safeParseFloat } from '@/lib/validation';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { pickLocaleCopy, VAULT_OVERVIEW_TRANSLATIONS } from '@/lib/i18n';

interface VaultOverviewStatsProps {
  vaultBalance: string;
  isLoadingBalance: boolean;
  guardianCount: number | undefined;
}

export function VaultOverviewStats({ vaultBalance, isLoadingBalance, guardianCount }: VaultOverviewStatsProps) {
  const { locale } = useLocale();
  const copy = pickLocaleCopy(VAULT_OVERVIEW_TRANSLATIONS, locale);

  return (
    <section className="py-8 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <m.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Balance */}
          <m.div variants={itemVariants}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">{copy.totalBalance}</span>
                <div className="p-2 rounded-xl bg-accent/20">
                  <DollarSign className="text-accent" size={18} />
                </div>
              </div>
              {isLoadingBalance ? (
                <>
                  <Skeleton height={40} className="w-48 mb-1 bg-white/10" />
                  <Skeleton height={16} className="w-32 bg-white/5" />
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-white mb-1">
                    {safeParseFloat(vaultBalance, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE
                  </div>
                  <div className="text-xs text-white/40 mt-2">{copy.updatedRealtime}</div>
                </>
              )}
            </GlassCard>
          </m.div>

          {/* Guardians */}
          <m.div variants={itemVariants}>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm">{copy.guardians}</span>
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <Users className="text-purple-400" size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {guardianCount !== undefined ? guardianCount : '…'}
              </div>
              <div className="text-white/40 text-sm">
                {guardianCount && guardianCount >= 2
                  ? copy.rotationEnabled
                  : copy.rotationDisabled}
              </div>
              <div className="text-xs text-white/40 mt-2">
                CardBound wallet rotation needs at least 2 guardians
              </div>
            </GlassCard>
          </m.div>
        </m.div>
      </div>
    </section>
  );
}
