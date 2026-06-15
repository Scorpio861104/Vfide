/**
 * Family / Institutional Continuity — executable logic model (Backend Completion Campaign 11, Wave E).
 *
 * Certifies the INDIVIDUAL + MULTI-HEIR continuity that IS built (CardBoundVaultInheritanceManager.sol) and maps,
 * honestly, the INSTITUTIONAL dimension that is NOT — the largest completeness gaps in VFIDE.
 *
 * BUILT (certified): a single owner can leave assets to MULTIPLE heirs with PRE-COMMITTED shares.
 *   • Config: proposeInheritanceConfig(heirGuardians[], heirCommitments[]) — arrays must match length, no zero
 *     commitments; two-step (propose → confirm/cancel) with a 30-day config cooldown.
 *   • Commit-reveal shares: each heir's basisPoints are bound inside a domain-separated commitment
 *     (keccak256("VFIDE_INHERITANCE_V1", ...)); a heir cannot claim a share other than the committed one.
 *   • Total shares cap at TOTAL_BASIS_POINTS (10000); claimed hashes prevent double-claims.
 *   • Windows: VETO 30d (owner can return) → CLAIM 90d → finalize-floor 14d → MEMORIAL 365d.
 *   • R-3: the DAO guardian can VETO but cannot INITIATE a claim (anti-seizure). Inheritance transfers ASSETS to
 *     heirs — no third party ever takes custody.
 *
 * NOT BUILT (completeness gaps — require product/design intent, NOT auto-buildable):
 *   • FC-1 joint/couple vaults + spousal survivorship (vault is single-owner; couples = two separate vaults).
 *   • FC-2 business/corporate vault + organizational succession (a business relies on an individual's vault).
 *   • FC-3 trust structures + a distinct estate-executor role (inheritance is a one-time guardian-gated payout,
 *     not ongoing trustee management or staged distribution).
 *   • FC-4 multi-generation cascade (Chain of Return is PLANNED/no-code; each generation configures its own).
 *
 * NOT the compiled contract; on-chain stage-2 (bytecode) + service e2e are the deployment confirmations.
 */
import { createHash } from 'node:crypto';

export type R = { ok: true } | { ok: false; reason: string };
const OK: R = { ok: true };
const E = (reason: string): R => ({ ok: false, reason });

// ── Windows (days) ───────────────────────────────────────────────────────────
export const VETO_PERIOD_DAYS = 30;
export const CLAIM_WINDOW_DAYS = 90;
export const CLAIM_FINALIZE_FLOOR_DAYS = 14;
export const MEMORIAL_PERIOD_DAYS = 365;
export const CONFIG_COOLDOWN_DAYS = 30;
export const TOTAL_BASIS_POINTS = 10000;
export const INHERITANCE_DOMAIN = 'VFIDE_INHERITANCE_V1';

// ── Multi-heir commitment (commit-reveal) ────────────────────────────────────
/** Models the on-chain domain-separated commitment binding the heir + their basisPoints + secret. */
export function heirCommitment(heir: string, basisPoints: number, secret: string): string {
  return createHash('sha256').update(`${INHERITANCE_DOMAIN}|${heir}|${basisPoints}|${secret}`).digest('hex');
}
/** A claim verifies only if the revealed (secret, basisPoints) reproduces the stored commitment. */
export function verifyHeirClaim(heir: string, basisPoints: number, secret: string, storedCommitment: string): boolean {
  return heirCommitment(heir, basisPoints, secret) === storedCommitment;
}

// ── Inheritance config validity ──────────────────────────────────────────────
export function configValid(heirGuardians: string[], heirCommitments: string[]): R {
  if (heirGuardians.length !== heirCommitments.length) return E('INH_InvalidCommitment'); // count must match
  if (heirGuardians.length === 0) return E('INH_NoHeirs');
  if (heirCommitments.some((c) => c === '' || /^0x?0*$/.test(c))) return E('INH_InvalidCommitment'); // no zero commitment
  return OK;
}
/** Heir shares (basisPoints) must not exceed 100% in total. */
export function sharesWithinCap(basisPointsList: number[]): boolean {
  return basisPointsList.reduce((a, b) => a + b, 0) <= TOTAL_BASIS_POINTS;
}

// ── Claim window state machine ───────────────────────────────────────────────
export type InhState = 'NONE' | 'VETO' | 'CLAIM' | 'FINALIZED' | 'MEMORIAL';
/** Only a NON-DAO guardian can initiate; the DAO can veto but never initiate (R-3). */
export function canInitiateClaim(caller: 'guardian' | 'dao' | 'stranger'): boolean { return caller === 'guardian'; }
export function daoCanVeto(): boolean { return true; }
export function daoCanInitiate(): boolean { return false; }
/** During the VETO period a live owner can return and cancel the claim. */
export function ownerCanVetoDuring(state: InhState, daysSinceInitiate: number): boolean {
  return state === 'VETO' && daysSinceInitiate <= VETO_PERIOD_DAYS;
}
/** Heirs may claim only after the veto period elapses and within the claim window. */
export function claimAllowed(daysSinceInitiate: number): R {
  if (daysSinceInitiate < VETO_PERIOD_DAYS) return E('veto period not elapsed');
  if (daysSinceInitiate > VETO_PERIOD_DAYS + CLAIM_WINDOW_DAYS) return E('claim window closed');
  return OK;
}
/** Distribution can finalize only after the finalize floor. */
export function finalizeAllowed(daysSinceClaimStart: number): boolean { return daysSinceClaimStart >= CLAIM_FINALIZE_FLOOR_DAYS; }

// ── Double-claim prevention ──────────────────────────────────────────────────
export function claimRejectedIfAlreadyClaimed(claimedHashes: Set<string>, hash: string): boolean { return claimedHashes.has(hash); }

// ── Non-custodial inheritance ────────────────────────────────────────────────
/** Inheritance transfers assets to the heirs themselves; no third party ever takes custody. */
export function inheritanceGivesThirdPartyCustody(): boolean { return false; }

// ── INSTITUTIONAL DIMENSION — what is NOT built (honest gaps) ────────────────
/** FC-1: no joint/couple vault or spousal survivorship — the vault is single-owner. */
export function jointVaultExists(): boolean { return false; }
export function spousalSurvivorshipExists(): boolean { return false; }
/** A couple is served by the multi-heir path (each names the other as an heir) — but not instant survivorship. */
export function coupleServedByMultiHeirWorkaround(): boolean { return true; }
export function survivingSpouseSkipsClaimFlow(): boolean { return false; } // they still go through veto/claim

/** FC-2: no business/corporate vault or organizational succession. */
export function corporateVaultExists(): boolean { return false; }
export function organizationalSuccessionExists(): boolean { return false; }
/** A business relies on an individual's personal vault → assets route through personal inheritance, not corporate. */
export function businessAssetsRouteThroughPersonalInheritance(): boolean { return true; }

/** FC-3: no trust structure or distinct estate-executor role. */
export function trustStructureExists(): boolean { return false; }
export function estateExecutorRoleExists(): boolean { return false; }
export function stagedOrConditionalDistributionExists(): boolean { return false; } // e.g., "hold for a minor until 18"

/** FC-4: no automatic multi-generation cascade (Chain of Return is PLANNED/no-code). */
export function multiGenerationCascadeExists(): boolean { return false; }
export function chainOfReturnBuilt(): boolean { return false; }
/** Each generation configures its own inheritance independently. */
export function eachGenerationConfiguresOwn(): boolean { return true; }
