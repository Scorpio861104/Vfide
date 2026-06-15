/**
 * Stability Bonding (System 9) — VOLUNTARY, non-custodial.
 *
 * This is the non-custodial answer to "reward stability." A participant may CHOOSE to lock their own
 * VFIDE for a term (3 / 6 / 12 / 24 months) in exchange for ecosystem benefits. It is opt-in, the
 * tokens release back to the same participant at term end, and no one else can ever touch them. This
 * is the carrot that Systems 3 & 4 (forced cooldowns / transfer fees) try to achieve with a stick —
 * except bonding never restricts anyone who didn't choose it, so it doesn't violate the constitution's
 * "assets remain participant controlled / no ownership freezes."
 *
 * SCOPE (honest): the BENEFITS LOGIC below is pure and ready to wire. The actual enforced LOCK requires
 * an on-chain bond contract (a user deposits, it releases only back to them at maturity) — that does
 * not exist yet and is contract work behind the audit gate. The interface that contract must satisfy
 * is specified at the bottom. Until it exists, no bond can be created, so this engine should not grant
 * benefits off self-reported bonds (a bond must be verifiable on-chain).
 */

export type BondTerm = 3 | 6 | 12 | 24; // months

export interface BondCommitment {
  /** Months committed. */
  termMonths: BondTerm;
  /** Amount locked, in whole VFIDE. */
  amountVfide: number;
  /** True only if verified against the on-chain bond contract (never trust client claims). */
  verifiedOnChain: boolean;
  /** Unix ms when the bond matures (tokens become withdrawable by the owner). */
  maturityAt: number;
}

export interface BondBenefits {
  /** Multiplier on the participant's discretionary fee posture (<1 = cheaper). 1 = no benefit. */
  feeMultiplier: number;
  /** Additive boost to suggested lending limit fraction (0..). */
  lendingLimitBoost: number;
  /** Additive boost to marketplace visibility multiplier (0..). */
  visibilityBoost: number;
  /** Additive Builder Record bonus points (contribution recognition for committing). */
  builderBonus: number;
  /** Plain-language summary of what the bond earns. */
  summary: string[];
}

/** No benefits — for the (default) case of no verified bond. */
export const NO_BOND_BENEFITS: BondBenefits = {
  feeMultiplier: 1,
  lendingLimitBoost: 0,
  visibilityBoost: 0,
  builderBonus: 0,
  summary: [],
};

/** Term weight 0..1 (longer commitment → more benefit). */
function termWeight(term: BondTerm): number {
  switch (term) {
    case 3: return 0.25;
    case 6: return 0.5;
    case 12: return 0.75;
    case 24: return 1;
  }
}

/** Size weight 0..1, saturating — so benefits reward commitment, not raw wealth (caps quickly). */
function sizeWeight(amountVfide: number): number {
  // Saturates near 5,000 VFIDE so a whale and a committed saver get similar *rates* of benefit.
  return Math.max(0, Math.min(1, amountVfide / 5000));
}

export function computeBondBenefits(bond: BondCommitment | null, now: number): BondBenefits {
  if (!bond || !bond.verifiedOnChain || bond.maturityAt <= now) return NO_BOND_BENEFITS;

  const t = termWeight(bond.termMonths);
  const s = sizeWeight(bond.amountVfide);
  const strength = t * (0.5 + 0.5 * s); // term dominates; size modulates within a capped band

  const feeMultiplier = Math.round((1 - strength * 0.3) * 100) / 100; // up to −30% fee posture
  const lendingLimitBoost = Math.round(strength * 0.25 * 100) / 100; // up to +25% suggested limit
  const visibilityBoost = Math.round(strength * 0.3 * 100) / 100; // up to +0.3 visibility
  const builderBonus = Math.round(strength * 1000); // up to +1000 Builder Record points

  const summary = [
    `You've voluntarily committed ${bond.amountVfide.toLocaleString()} VFIDE for ${bond.termMonths} months.`,
    `In return: lower fees, better lending terms, more marketplace visibility, and Builder recognition.`,
    `Your tokens unlock back to you at the end — no one else can ever touch them, and you were never required to do this.`,
  ];

  return { feeMultiplier, lendingLimitBoost, visibilityBoost, builderBonus, summary };
}

/**
 * Required on-chain interface for the enforced lock (contract work, behind the audit gate).
 * The off-chain layer verifies a bond by reading these — it never trusts a self-reported bond.
 *
 *   interface IStabilityBond {
 *     // User locks their OWN tokens; releases only back to them at maturity. Non-custodial.
 *     function bond(uint256 amount, uint8 termMonths) external;        // 3 | 6 | 12 | 24
 *     function withdraw(uint256 bondId) external;                      // only after maturity, only owner
 *     function bondsOf(address owner) external view returns (Bond[] memory);
 *     struct Bond { uint256 amount; uint64 maturityAt; bool withdrawn; }
 *   }
 *
 * Critically: NO function lets any third party (DAO included) move or seize a bonded balance — same
 * invariant as the rest of VFIDE. Early withdrawal can be disallowed (you chose the term) WITHOUT
 * becoming custodial, because the restriction is one the participant opted into, not one imposed on a
 * non-consenting holder.
 */
