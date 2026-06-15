/**
 * Vault Health scoring engine (Wave 85 — Ownership/Vault institution campaign).
 *
 * Extracted from the inline component logic so the scoring is independently testable (every commerce
 * institution has a tested engine; the Vault institution now does too). Pure and deterministic: given the
 * vault's real on-chain signals (guardian count, transfer limits, operational state) plus the owner's
 * ProofScore, it returns a 0–100 safety score across four dimensions, each with concrete recommendations.
 *
 * This scores SAFETY POSTURE (is the vault protected and set up well?) — it never affects custody or funds.
 * It reads only protective configuration, never wallet size or holdings.
 */

export interface VaultHealthInputs {
  /** Number of guardians configured on the vault. */
  guardianCount: number;
  /** Effective per-transfer / daily limit (>0 means limits are configured). */
  transferLimit: number;
  /** Whether the vault is operational (not paused). */
  isOperational: boolean;
  /** Whether the owner has a vault deployed. */
  hasVault: boolean;
  /** Owner ProofScore (0–10000). */
  proofScore: number;
}

export interface VaultHealthDimension {
  label: 'Security' | 'Recovery' | 'Trust' | 'Setup';
  score: number;
  maxScore: number;
  recommendations: string[];
}

export interface VaultHealthResult {
  /** Total 0–100. */
  total: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Needs Work' | 'At Risk';
  dimensions: VaultHealthDimension[];
}

/** Coerce a possibly-NaN/undefined numeric to a safe non-negative integer. */
function safeCount(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function computeVaultHealth(inputs: VaultHealthInputs): VaultHealthResult {
  const gc = safeCount(inputs.guardianCount);
  const transferLimit = safeCount(inputs.transferLimit);
  const proofScore = Number.isFinite(inputs.proofScore) ? inputs.proofScore : 0;
  const isOperational = inputs.isOperational;
  const hasVault = inputs.hasVault;

  // Security dimension (0–25)
  const securityRecs: string[] = [];
  let securityScore = 0;
  if (gc >= 3) securityScore += 15;
  else if (gc >= 1) { securityScore += 8; securityRecs.push('Add more guardians (3+ recommended)'); }
  else securityRecs.push('Add guardians to protect your vault');
  if (transferLimit > 0) securityScore += 10;
  else securityRecs.push('Set transfer limits to reduce large unauthorized transaction risk');

  // Recovery dimension (0–25)
  const recoveryRecs: string[] = [];
  let recoveryScore = 0;
  if (gc >= 2) recoveryScore += 20;
  else if (gc >= 1) { recoveryScore += 10; recoveryRecs.push('Add a second guardian for recovery redundancy'); }
  else recoveryRecs.push('Guardians are required for vault recovery');
  if (gc >= 3) recoveryScore += 5;

  // Trust dimension (0–25)
  const trustRecs: string[] = [];
  let trustScore = 0;
  if (proofScore >= 7000) trustScore = 25;
  else if (proofScore >= 5000) { trustScore = 18; trustRecs.push('Reach 7,000 for Elite trust benefits'); }
  else if (proofScore >= 3000) { trustScore = 12; trustRecs.push('Grow your ProofScore for better rates'); }
  else { trustScore = 5; trustRecs.push('Build your ProofScore to unlock benefits'); }

  // Setup dimension (0–25)
  const setupRecs: string[] = [];
  let setupScore = 0;
  if (hasVault) setupScore += 15;
  else setupRecs.push('Create a vault to get started');
  if (transferLimit > 0) setupScore += 5;
  if (isOperational) setupScore += 5;

  const dimensions: VaultHealthDimension[] = [
    { label: 'Security', score: securityScore, maxScore: 25, recommendations: securityRecs },
    { label: 'Recovery', score: recoveryScore, maxScore: 25, recommendations: recoveryRecs },
    { label: 'Trust', score: trustScore, maxScore: 25, recommendations: trustRecs },
    { label: 'Setup', score: setupScore, maxScore: 25, recommendations: setupRecs },
  ];

  const total = securityScore + recoveryScore + trustScore + setupScore;
  const grade: VaultHealthResult['grade'] =
    total >= 85 ? 'Excellent' : total >= 70 ? 'Good' : total >= 50 ? 'Fair' : total >= 30 ? 'Needs Work' : 'At Risk';

  return { total, grade, dimensions };
}
