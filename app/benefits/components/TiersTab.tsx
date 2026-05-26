'use client';

/**
 * TiersTab — ProofScore tier overview.
 *
 * Rewrote from a fabricated Bronze/Silver/Gold/Platinum/Diamond token-balance
 * tier system that has no on-chain backing.
 *
 * This version uses the canonical 7-tier ProofScore system from:
 *   - contracts/lib/ScoringConstants.sol (canonical thresholds)
 *   - lib/constants.ts (PROOF_SCORE_TIERS, PROOF_SCORE_PERMISSIONS)
 *   - contracts/ProofScoreBurnRouter.sol (fee curve: 0.25%–5%)
 *
 * The Benefits contract (future/VFIDEBenefits.sol) has not yet launched.
 * Perks listed here are illustrative of the designed benefit structure.
 *
 * Scale: 0–10,000 (Seer.getScore() internal scale)
 */

import { Sparkles, Shield, Info } from 'lucide-react';
import { SampleDataBanner } from '@/components/ui/SampleDataBanner';

// Canonical tiers — sourced from contracts/lib/ScoringConstants.sol
// and lib/constants.ts PROOF_SCORE_TIERS
const TIERS = [
  {
    name: 'Risky',
    min: 0,
    max: 3999,
    hex: '#fb7185',
    feeRange: '5.00%',
    canVote: false,
    canMerchant: false,
    canCouncil: false,
    perks: ['Protocol access', 'Fee curve active'],
  },
  {
    name: 'Low Trust',
    min: 4000,
    max: 4999,
    hex: '#fb923c',
    feeRange: '3.82%–5.00%',
    canVote: false,
    canMerchant: false,
    canCouncil: false,
    perks: ['Protocol access', 'Fee curve active'],
  },
  {
    name: 'Neutral',
    min: 5000,
    max: 5399,
    hex: '#fbbf24',
    feeRange: '3.34%–3.82%',
    canVote: false,
    canMerchant: false,
    canCouncil: false,
    perks: ['Protocol access', 'Score-linear burn fee', 'Score history builds'],
  },
  {
    name: 'Governance',
    min: 5400,
    max: 5599,
    hex: '#38bdf8',
    feeRange: '3.10%–3.34%',
    canVote: true,
    canMerchant: false,
    canCouncil: false,
    perks: ['DAO voting eligible', 'Can submit proposals', 'Score-weighted vote power'],
  },
  {
    name: 'Trusted',
    min: 5600,
    max: 6999,
    hex: '#34d399',
    feeRange: '1.44%–3.10%',
    canVote: true,
    canMerchant: true,
    canCouncil: false,
    perks: ['Merchant registration eligible', 'DAO voting', 'Endorsement rights', 'Lower burn fee'],
  },
  {
    name: 'Council',
    min: 7000,
    max: 7999,
    hex: '#22d3ee',
    feeRange: '0.25%–1.44%',
    canVote: true,
    canMerchant: true,
    canCouncil: true,
    perks: ['Council election eligible', 'Can endorse & mentor', 'Priority DAO weight', 'Near-minimum fee'],
  },
  {
    name: 'Elite',
    min: 8000,
    max: 10000,
    hex: '#a78bfa',
    feeRange: '0.25% (minimum)',
    canVote: true,
    canMerchant: true,
    canCouncil: true,
    perks: ['Minimum 0.25% burn fee', 'Full protocol access', 'All governance rights', 'Mentor-eligible'],
  },
];

function Cap({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${
        active
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-zinc-700 bg-zinc-900 text-zinc-600'
      }`}
    >
      {label}
    </span>
  );
}

export function TiersTab() {
  return (
    <div className="space-y-8">
      <SampleDataBanner
        label="The VFIDEBenefits contract is deferred to a future release. The perks listed here reflect the designed benefit structure — they are not yet enforced on-chain at V1."
      />

      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">ProofScore Tiers</h2>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Your ProofScore (0–10,000) determines your tier. Higher trust unlocks lower fees, governance access, and merchant eligibility — all enforced on-chain by the Seer contract.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className="rounded-xl border bg-zinc-900/60 p-5 flex flex-col gap-3"
            style={{ borderColor: `${tier.hex}40` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tier.hex }} />
                <span className="font-bold text-zinc-100" style={{ color: tier.hex }}>
                  {tier.name}
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {tier.min.toLocaleString()}–{tier.max.toLocaleString()}
              </span>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Burn fee</div>
              <div className="text-sm font-bold" style={{ color: tier.hex }}>{tier.feeRange}</div>
            </div>

            <div className="flex flex-wrap gap-1">
              <Cap label="Vote" active={tier.canVote} />
              <Cap label="Merchant" active={tier.canMerchant} />
              <Cap label="Council" active={tier.canCouncil} />
            </div>

            <ul className="space-y-1">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-xs text-zinc-400">
                  <Sparkles size={11} className="mt-0.5 shrink-0" style={{ color: tier.hex }} />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-cyan-400" />
          How tiers work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-zinc-400">
          <div>
            <h4 className="text-cyan-400 font-semibold mb-1">ProofScore (on-chain)</h4>
            <p>
              Your score is issued by DAO-approved Seer operators based on observed protocol activity.
              It lives entirely on-chain — no centralized scoring authority.
            </p>
          </div>
          <div>
            <h4 className="text-cyan-400 font-semibold mb-1">Fee curve</h4>
            <p>
              Burn fee is a linear function of score between 0.25% (≥8,000 Elite) and 5.00% (≤4,000 Risky).
              The fee applies to buyers, never merchants.
            </p>
          </div>
          <div>
            <h4 className="text-amber-400 font-semibold mb-1">Governance access</h4>
            <p>
              Governance voting requires score ≥5,400. Merchant registration requires ≥5,600.
              Council eligibility requires ≥7,000. These are enforced by the DAO and MerchantPortal contracts.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-700 bg-zinc-950/30 p-3 text-xs text-zinc-500">
          <Info size={13} className="mt-0.5 shrink-0 text-zinc-400" />
          <span>
            Score thresholds may be adjusted via DAO governance vote after mainnet launch.
            The values above reflect the initial deployment constants from{' '}
            <code className="font-mono text-zinc-400">contracts/lib/ScoringConstants.sol</code>.
          </span>
        </div>
      </div>
    </div>
  );
}
