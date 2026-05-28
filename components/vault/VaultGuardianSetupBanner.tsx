'use client';

/**
 * VaultGuardianSetupBanner — dashboard surface for the 30-day guardian setup deadline.
 *
 * Mirrors VaultHub.GUARDIAN_SETUP_GRACE (30 days) and GUARDIAN_SETUP_WARNING (7 days).
 * Reads `guardianSetupTimeRemaining(vault) → (remaining, isExpired, isComplete)`
 * from VaultHub.sol and renders one of three states:
 *
 *   - Complete  → banner returns null (no clutter once setup is done).
 *   - Pending (> 7 days remaining)  → cyan informational banner with day countdown.
 *   - Warning  (≤ 7 days remaining) → orange urgent banner.
 *   - Expired                       → red critical banner. After expiry,
 *                                     `executeRecoveryRotation` reverts with
 *                                     VH_GuardianSetupRequired until the owner
 *                                     finalizes setup.
 *
 * The banner is intentionally surfaced on the main /vault page (not buried
 * inside /guardians) because the 30-day clock starts at vault creation —
 * users who never visit the guardians tab would otherwise lose recovery
 * silently. Click-through goes to /guardians where MyGuardiansTab handles
 * the actual add-guardians + completeGuardianSetup wiring.
 *
 * Refetches every 5 minutes so the day countdown stays fresh without
 * spamming the RPC. Returns null when:
 *   - VaultHub address is not configured for the active chain
 *   - Caller has no vault yet (handled by VaultContent wrapper)
 *   - guardianSetupComplete is true
 *   - The read is still pending (avoid flicker on first render)
 */

import Link from 'next/link';
import { ShieldAlert, ShieldCheck, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReadContract } from 'wagmi';
import type { Address } from 'viem';
import { CONTRACT_ADDRESSES, VAULT_HUB_ABI, isConfiguredContractAddress } from '@/lib/contracts';

const SECONDS_PER_DAY = 24 * 60 * 60;
const WARNING_WINDOW_SECONDS = 7 * SECONDS_PER_DAY;

export function VaultGuardianSetupBanner({ vaultAddress }: { vaultAddress: Address | undefined }) {
  const isVaultHubAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.VaultHub);

  const { data: rawTuple, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.VaultHub,
    abi: VAULT_HUB_ABI,
    functionName: 'guardianSetupTimeRemaining',
    args: vaultAddress ? [vaultAddress] : undefined,
    query: {
      enabled: isVaultHubAvailable && !!vaultAddress,
      // 5-minute refetch keeps the day countdown fresh without hammering the RPC.
      refetchInterval: 5 * 60 * 1000,
    },
  });

  // Don't render anything until the chain read resolves — prevents flicker
  // where the banner briefly renders the wrong state on first paint.
  if (!isVaultHubAvailable || !vaultAddress || isLoading || !rawTuple) return null;

  const tuple = rawTuple as readonly [bigint, boolean, boolean];
  const remainingSeconds = Number(tuple[0]);
  const isExpired = !!tuple[1];
  const isComplete = !!tuple[2];

  // Once setup is complete the banner stays out of the way — the dashboard
  // doesn't need to celebrate normal operation.
  if (isComplete) return null;

  // Warning window mirrors the contract's GUARDIAN_SETUP_WARNING (7 days).
  // VaultHub.emitGuardianSetupWarning uses the same threshold to emit
  // GuardianSetupExpiring for off-chain alerts.
  const inWarningWindow =
    !isExpired && remainingSeconds > 0 && remainingSeconds <= WARNING_WINDOW_SECONDS;

  const daysRemaining = remainingSeconds > 0 ? Math.ceil(remainingSeconds / SECONDS_PER_DAY) : 0;

  // Style + copy selection by state. Expired is the loudest because recovery
  // rotation is actually disabled in this state until setup is completed.
  let containerClass = '';
  let iconBg = '';
  let iconColor = '';
  let Icon = ShieldAlert;
  let title = '';
  let subtitle = '';

  if (isExpired) {
    containerClass = 'bg-gradient-to-br from-red-500/15 to-rose-500/10 border-red-500/40 hover:border-red-400/60';
    iconBg = 'bg-red-500/20';
    iconColor = 'text-red-300';
    Icon = ShieldAlert;
    title = 'Guardian setup grace period expired';
    subtitle = 'Guardian-mediated recovery is currently disabled. Complete setup to restore protection.';
  } else if (inWarningWindow) {
    containerClass = 'bg-gradient-to-br from-orange-500/15 to-amber-500/10 border-orange-500/40 hover:border-orange-400/60';
    iconBg = 'bg-orange-500/20';
    iconColor = 'text-orange-300';
    Icon = Clock;
    title = `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left to finalize guardian setup`;
    subtitle = 'After the deadline, guardian-mediated recovery rotations will be blocked until setup is completed.';
  } else {
    containerClass = 'bg-gradient-to-br from-accent/10 to-blue-500/5 border-accent/30 hover:border-cyan-400/50';
    iconBg = 'bg-cyan-500/20';
    iconColor = 'text-accent';
    Icon = ShieldCheck;
    title = 'Finalize your guardian setup';
    subtitle = `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining in the 30-day grace period. Add at least 2 guardians, then complete setup.`;
  }

  return (
    <section className="py-2 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href="/guardians"
            className={`block rounded-2xl p-4 border-2 transition-colors ${containerClass}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                  <Icon className={iconColor} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className={`text-xs mt-0.5 ${iconColor}/80`}>{subtitle}</p>
                </div>
              </div>
              <ChevronRight className={iconColor} size={20} />
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
