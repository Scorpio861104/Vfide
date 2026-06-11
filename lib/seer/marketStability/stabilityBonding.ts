/**
 * Stability Bonding (System 9) - voluntary, non-custodial.
 *
 * This is an opt-in commitment model that rewards stability without forcing transfer restrictions.
 * Participants can choose to lock their own VFIDE for a term (3, 6, 12, or 24 months) to receive
 * advisory ecosystem benefits. Tokens always unlock back to the same owner at maturity.
 *
 * Scope: this file implements benefits logic only. The enforced lock requires an on-chain bond
 * contract behind the audit gate. Benefits should only be granted for bonds verified on-chain.
 */

export type BondTerm = 3 | 6 | 12 | 24;

export interface BondCommitment {
  termMonths: BondTerm;
  amountVfide: number;
  verifiedOnChain: boolean;
  maturityAt: number;
}

export interface BondBenefits {
  feeMultiplier: number;
  lendingLimitBoost: number;
  visibilityBoost: number;
  builderBonus: number;
  summary: string[];
}

export const NO_BOND_BENEFITS: BondBenefits = {
  feeMultiplier: 1,
  lendingLimitBoost: 0,
  visibilityBoost: 0,
  builderBonus: 0,
  summary: [],
};

function termWeight(term: BondTerm): number {
  switch (term) {
    case 3:
      return 0.25;
    case 6:
      return 0.5;
    case 12:
      return 0.75;
    case 24:
      return 1;
  }
}

function sizeWeight(amountVfide: number): number {
  // Saturates near 5,000 VFIDE so benefits reward commitment, not raw wealth.
  return Math.max(0, Math.min(1, amountVfide / 5000));
}

export function computeBondBenefits(bond: BondCommitment | null, now: number): BondBenefits {
  if (!bond || !bond.verifiedOnChain || bond.maturityAt <= now) return NO_BOND_BENEFITS;

  const t = termWeight(bond.termMonths);
  const s = sizeWeight(bond.amountVfide);
  const strength = t * (0.5 + 0.5 * s);

  const feeMultiplier = Math.round((1 - strength * 0.3) * 100) / 100;
  const lendingLimitBoost = Math.round(strength * 0.25 * 100) / 100;
  const visibilityBoost = Math.round(strength * 0.3 * 100) / 100;
  const builderBonus = Math.round(strength * 1000);

  const summary = [
    `You committed ${bond.amountVfide.toLocaleString()} VFIDE for ${bond.termMonths} months.`,
    'You earn lower fees, stronger lending suggestions, better visibility, and builder recognition.',
    'Tokens unlock back to you at maturity. No third party can move them.',
  ];

  return { feeMultiplier, lendingLimitBoost, visibilityBoost, builderBonus, summary };
}

/**
 * Required on-chain interface (contract work):
 *
 * interface IStabilityBond {
 *   function bond(uint256 amount, uint8 termMonths) external;
 *   function withdraw(uint256 bondId) external;
 *   function bondsOf(address owner) external view returns (Bond[] memory);
 *   struct Bond { uint256 amount; uint64 maturityAt; bool withdrawn; }
 * }
 */
