'use client';

/**
 * VaultSafetyPanel — visible safety status for the user's vault.
 *
 * Lives on the main vault page. Reads the user's actual on-chain state
 * (guardians, trustees, threshold, challenge period, inheritance config)
 * and explains it in plain language with explicit "what this means for you"
 * descriptions.
 *
 * Design principles:
 *   - Plain language, no jargon. "If you lose your phone..." not "if your
 *     EOA's private key is compromised..."
 *   - The user's actual state, not abstract features. Show "you have 2
 *     guardians" not "guardians can be configured."
 *   - Gaps are visible. Missing inheritance shows as "✗ not set up" with a
 *     one-tap fix button.
 *   - Each item is tappable for deeper explanation — friendly summary first,
 *     mechanism second.
 *   - Warnings, not blocks. The user is in charge; we explain consequences
 *     and let them decide.
 *
 * Used on: /vault, optionally embedded in /merchant for merchants who want
 * the safety summary alongside their business tools.
 */

import { useState } from 'react';
import { useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { Shield, AlertCircle, Check, ChevronRight, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

// ─────────────────────────────────────────────────────────────────
// Vault ABI — we only need the views to read safety state
// ─────────────────────────────────────────────────────────────────
const VAULT_SAFETY_ABI = [
  { name: 'guardianCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'guardianThreshold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'trusteeCountView', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'challengePeriodPreferenceView', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
] as const;

interface Props {
  vaultAddress: Address;
  /** Compact mode — single-line summary instead of full panel. Used in merchant hub. */
  compact?: boolean;
}

interface SafetyItem {
  /** Stable id for keying + tap handling */
  id: string;
  /** Plain-language title — what this feature does */
  title: string;
  /** One-sentence status of the user's current state */
  summary: string;
  /** Longer explanation shown when the item is expanded */
  explanation: string;
  /** ok = configured well; warn = configured but risky; missing = not configured */
  status: 'ok' | 'warn' | 'missing';
  /** Optional CTA shown for missing or warning items */
  cta?: { label: string; href: string };
}

const SECONDS_PER_DAY = 24 * 60 * 60;

function describeChallengePeriod(seconds: bigint): string {
  if (seconds === 0n) return 'using the protocol default (7 days, or 14 if your vault has been active recently)';
  const days = Number(seconds) / SECONDS_PER_DAY;
  if (days <= 3) return `${days} days (the minimum — short windows are risky if you ever travel)`;
  if (days < 7) return `${days} days (shorter than recommended)`;
  if (days <= 10) return `${days} days (recommended range)`;
  return `${days} days (extra cautious — recovery will take a while)`;
}

export function VaultSafetyPanel({ vaultAddress, compact = false }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: safetyData, isLoading } = useReadContracts({
    contracts: [
      { address: vaultAddress, abi: VAULT_SAFETY_ABI, functionName: 'guardianCount' },
      { address: vaultAddress, abi: VAULT_SAFETY_ABI, functionName: 'guardianThreshold' },
      { address: vaultAddress, abi: VAULT_SAFETY_ABI, functionName: 'trusteeCountView' },
      { address: vaultAddress, abi: VAULT_SAFETY_ABI, functionName: 'challengePeriodPreferenceView' },
    ],
    query: { enabled: Boolean(vaultAddress) },
  });

  if (isLoading || !safetyData) {
    return (
      <GlassCard hover={false} className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Shield size={16} className="animate-pulse" /> Loading your vault&apos;s safety state…
        </div>
      </GlassCard>
    );
  }

  const guardianCount = Number(safetyData[0]?.result ?? 0);
  const guardianThreshold = Number(safetyData[1]?.result ?? 0);
  const trusteeCount = Number(safetyData[2]?.result ?? 0);
  const challengePeriod = (safetyData[3]?.result as bigint) ?? 0n;

  // ─────────────────────────────────────────────────────────────────
  // Build the safety items the user actually has, with the plain-language
  // explanations that make each one understandable.
  // ─────────────────────────────────────────────────────────────────
  const items: SafetyItem[] = [];

  // 1. Guardians — the core social-recovery primitive
  if (guardianCount === 0) {
    items.push({
      id: 'guardians',
      title: 'Recovery guardians',
      summary: 'Not set up — if you lose your phone, your vault is permanently unrecoverable',
      explanation:
        "Guardians are people you trust who can help you get back into your vault if you lose your phone. They can't touch your money — they just confirm it's really you. Without at least one guardian, there's no way to recover your vault if your phone is lost, stolen, or broken.",
      status: 'missing',
      cta: { label: 'Add guardians', href: '/vault/guardians' },
    });
  } else if (guardianCount === 1) {
    items.push({
      id: 'guardians',
      title: 'Recovery guardians',
      summary: `1 guardian (recommended: 3 or more so any one can be unavailable)`,
      explanation:
        "You have 1 guardian. This means your only path to recovery depends entirely on that one person being available, reachable, and willing to help when you need them. If they're traveling, sick, or unreachable, you can't recover. We recommend at least 3 guardians so your recovery still works even if some are unavailable.",
      status: 'warn',
      cta: { label: 'Add more guardians', href: '/vault/guardians' },
    });
  } else {
    items.push({
      id: 'guardians',
      title: 'Recovery guardians',
      summary: `${guardianCount} guardians, need ${guardianThreshold} to approve recovery`,
      explanation:
        `You have ${guardianCount} guardians and need ${guardianThreshold} of them to approve any recovery attempt. This means even if one guardian is unavailable or compromised, your vault is still safe and recoverable. Guardians can only approve recovery — they can never move your money, see your transactions, or touch the vault.`,
      status: 'ok',
    });
  }

  // 2. Trustees — the new R-8 surface
  if (trusteeCount === 0 && guardianCount > 0) {
    items.push({
      id: 'trustees',
      title: 'Recovery starters (trustees)',
      summary: 'No trustees set — a recovery can be started by anyone, not just you (your guardians must still approve, and you get a veto window to cancel)',
      explanation:
        "Trustees are guardians you've granted a special power: the ability to START a recovery if you've lost your phone and can't start one yourself. You haven't designated any. Because no trustees are configured, the recovery process can currently be started by anyone with your recovery details — not only you. That alone can't take your vault: your guardians still have to approve, and you have a veto window to cancel a recovery you didn't request. But designating 1-2 trustees restricts who can start a recovery to just those trusted people, closing off recovery attempts by anyone else.",
      status: 'warn',
      cta: { label: 'Designate a trustee', href: '/vault/guardians' },
    });
  } else if (trusteeCount > 0) {
    items.push({
      id: 'trustees',
      title: 'Recovery starters (trustees)',
      summary: `${trusteeCount} trustee${trusteeCount > 1 ? 's' : ''} can start recovery if you can't`,
      explanation:
        `You've designated ${trusteeCount} of your guardians as trustees. This means if you lose your phone and can't access VFIDE, ${trusteeCount > 1 ? 'any of them' : 'they'} can start the recovery process for you. You then have a window (your "veto period") during which you can cancel if you didn't actually request recovery. The other guardians still need to approve before recovery completes.`,
      status: 'ok',
    });
  }

  // 3. Challenge period
  items.push({
    id: 'challenge',
    title: 'Veto window',
    summary: `If a recovery starts, you have ${describeChallengePeriod(challengePeriod)} to cancel it`,
    explanation:
      'When someone starts a recovery on your vault — either you from a new device, or a trustee on your behalf — there is a waiting period before the recovery actually completes. During this window, you can call "challenge" from your existing wallet to cancel the recovery. This is your last line of defense against a rogue trustee or someone tricking you into recovery. Longer windows are safer (you have more time to notice and respond) but slow down legitimate recoveries when you actually lost your phone.',
    status: challengePeriod === 0n || challengePeriod >= BigInt(7 * SECONDS_PER_DAY) ? 'ok' : 'warn',
    cta: { label: 'Change your veto window', href: '/vault/safety/window' },
  });

  // 4. Vault stays operational during recovery (informational item, always present)
  items.push({
    id: 'operational',
    title: 'Business continuity',
    summary: 'Your vault stays fully open for payments while a recovery is in progress',
    explanation:
      "If someone starts a recovery on your vault, your day-to-day business doesn't pause. Inbound payments still arrive. You can still send outbound transactions from your existing wallet. Only the ownership transfer itself is delayed by the veto window. This means recovery never costs you a week of revenue — which would be worse than losing the vault for many small merchants.",
    status: 'ok',
  });

  // 5. Non-custodial reminder (always present, informational)
  items.push({
    id: 'noncustodial',
    title: "VFIDE doesn't hold your money",
    summary: 'The vault is yours alone — no VFIDE admin, no DAO, no third party can move your funds. The only way back into a lost vault is guardian-approved recovery.',
    explanation:
      "VFIDE is non-custodial. There is no admin key that can move your money, freeze your account, or reverse your transactions. Recovery is the only path back into a vault you've lost access to, and it requires your guardians to approve. The trade-off is real: if you lose your phone AND have no guardians, your vault is permanently inaccessible. The protection: no centralized party can ever take what you've earned.",
    status: 'ok',
  });

  if (compact) {
    const missingCount = items.filter((i) => i.status === 'missing').length;
    const warnCount = items.filter((i) => i.status === 'warn').length;
    const status = missingCount > 0 ? 'missing' : warnCount > 0 ? 'warn' : 'ok';
    return (
      <a
        href="/vault/safety"
        className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
      >
        <Shield
          size={14}
          className={
            status === 'missing' ? 'text-red-400' : status === 'warn' ? 'text-amber-400' : 'text-emerald-400'
          }
        />
        <span className={status === 'missing' ? 'text-red-300' : status === 'warn' ? 'text-amber-300' : 'text-gray-300'}>
          {status === 'missing'
            ? `${missingCount} safety gap${missingCount > 1 ? 's' : ''} — set them up`
            : status === 'warn'
              ? `${warnCount} safety warning${warnCount > 1 ? 's' : ''}`
              : 'Vault fully protected'}
        </span>
        <ChevronRight size={12} className="text-gray-500" />
      </a>
    );
  }

  return (
    <GlassCard hover={false} className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="text-accent" size={20} />
        <h2 className="text-lg font-bold text-white">Your vault&apos;s safety</h2>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isExpanded = expanded === item.id;
          return (
            <div key={item.id} className="glass-surface p-3">
              <button
                onClick={() => setExpanded(isExpanded ? null : item.id)}
                className="w-full text-left flex items-start gap-3"
              >
                <div className="mt-0.5 shrink-0">
                  {item.status === 'ok' && <Check className="text-emerald-400" size={16} />}
                  {item.status === 'warn' && <AlertCircle className="text-amber-400" size={16} />}
                  {item.status === 'missing' && <AlertCircle className="text-red-400" size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.summary}</div>
                  {isExpanded && (
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      {item.explanation}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={14}
                  className={`mt-1 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>
              {isExpanded && item.cta && (
                <a
                  href={item.cta.href}
                  className="mt-3 ml-7 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent"
                >
                  {item.cta.label}
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <a
        href="/vault/safety"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-accent transition-colors"
      >
        Learn more about how your vault is protected
        <ChevronRight size={11} />
      </a>
    </GlassCard>
  );
}
