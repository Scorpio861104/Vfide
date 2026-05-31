#!/usr/bin/env node
/**
 * verify-manual-parity.ts
 *
 * Mainnet readiness gate: every constant from VFIDE_Complete_Manual_v1.0
 * (pages 14–15 "Critical thresholds at a glance") is grepped out of the
 * actual Solidity source and asserted to match the manual exactly.
 *
 * Run:  npx ts-node scripts/verify-manual-parity.ts
 * Or:   node --loader ts-node/esm scripts/verify-manual-parity.ts
 *
 * Exits 0 on full parity, 1 on any mismatch. Designed to be a CI hard gate
 * on the release branch.
 */

import * as fs from "fs";
import * as path from "path";

type Check = {
  id: string;
  description: string;
  file: string;
  // A regex with one capture group containing the numeric/string value.
  pattern: RegExp;
  // The expected captured value AS WRITTEN IN SOURCE (so e.g. underscores
  // and `* 10**18` are normalized to a canonical form by `canonical()`).
  expected: string;
  // If true, this constant must NOT exist (negative assertion).
  negative?: boolean;
  // Tolerance: list of alternative source forms that also satisfy the manual.
  alternates?: string[];
};

const ROOT = path.resolve(__dirname, "..", "contracts");

function read(rel: string): string | null {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

// Normalise numeric literal strings:
//   "200_000_000 * 10**18"  -> "200000000*10**18"
//   "200000000e18"          -> "200000000*10**18"
//   "200000000 ether"       -> "200000000*10**18"
//   "10_000"                -> "10000"
function canonical(s: string): string {
  let t = s.trim();
  // Strip type-cast sugar
  t = t.replace(/\buint(?:\d+)?\b/g, "");
  t = t.replace(/[()\s]/g, "");
  t = t.replace(/_/g, "");
  // hours/days/minutes -> seconds (do BEFORE eN -> *10**N so we don't conflict)
  t = t.replace(/(\d+)hours/gi, (_, n) => `${parseInt(n) * 3600}`);
  t = t.replace(/(\d+)days/gi, (_, n) => `${parseInt(n) * 86400}`);
  t = t.replace(/(\d+)minutes/gi, (_, n) => `${parseInt(n) * 60}`);
  t = t.replace(/(\d+)seconds/gi, "$1");
  // ether -> *10**18
  t = t.replace(/(\d+)ether/gi, "$1*10**18");
  // 1e18 -> 1*10**18  (only standalone exponent form, NOT inside a multiplication)
  t = t.replace(/(\d+)e(\d+)/gi, "$1*10**$2");
  // Now collapse "<num>*10**18" forms
  // (a*10**18) and (a*1*10**18) are equivalent because 1* is no-op; normalise:
  t = t.replace(/\*1\*10\*\*/g, "*10**");
  // Strip leading/trailing whitespace once more (no-op after [\s])
  return t;
}

const checks: Check[] = [
  // -- VFIDEToken --
  {
    id: "MAX_SUPPLY",
    description: "Max supply 200,000,000 × 10^18",
    file: "VFIDEToken.sol",
    pattern: /MAX_SUPPLY\s*=\s*([^;]+);/,
    expected: "200000000*10**18",
    alternates: ["200_000_000 * 10**18", "200000000 ether", "200_000_000 ether"],
  },
  {
    id: "DEV_RESERVE_SUPPLY",
    description: "Dev reserve 50,000,000 × 10^18",
    file: "VFIDEToken.sol",
    pattern: /DEV_RESERVE_SUPPLY\s*=\s*([^;]+);/,
    expected: "50000000*10**18",
  },
  // -- ProofScoreBurnRouter --
  {
    id: "minTotalBps",
    description: "minTotalBps = 25",
    file: "ProofScoreBurnRouter.sol",
    pattern: /minTotalBps\s*=\s*(\d[\d_]*)/,
    expected: "25",
  },
  {
    id: "maxTotalBps",
    description: "maxTotalBps = 500",
    file: "ProofScoreBurnRouter.sol",
    pattern: /maxTotalBps\s*=\s*(\d[\d_]*)/,
    expected: "500",
  },
  {
    id: "microTxFeeCeilingBps",
    description: "microTxFeeCeilingBps = 100 (1%)",
    file: "ProofScoreBurnRouter.sol",
    pattern: /microTxFeeCeilingBps\s*=\s*(\d[\d_]*)/,
    expected: "100",
  },
  {
    id: "microTxMaxAmount",
    description: "microTxMaxAmount = 10 × 10^18",
    file: "ProofScoreBurnRouter.sol",
    pattern: /microTxMaxAmount\s*=\s*([^;]+);/,
    expected: "10*10**18",
    alternates: ["10 ether", "10e18"],
  },
  {
    id: "dailyBurnCap",
    description: "dailyBurnCap = 500,000 × 10^18",
    file: "ProofScoreBurnRouter.sol",
    pattern: /dailyBurnCap\s*=\s*([^;]+);/,
    expected: "500000*10**18",
  },
  {
    id: "minimumSupplyFloor",
    description: "minimumSupplyFloor = 50,000,000 × 10^18",
    file: "ProofScoreBurnRouter.sol",
    pattern: /minimumSupplyFloor\s*=\s*([^;]+);/,
    expected: "50000000*10**18",
  },
  {
    id: "BPS_SCALE",
    description: "BPS_SCALE constant = 10,000 (R78 fix)",
    file: "ProofScoreBurnRouter.sol",
    pattern: /BPS_SCALE\s*=\s*(\d[\d_]*)/,
    expected: "10000",
  },
  // -- Seer --
  {
    id: "NEUTRAL",
    description: "Seer NEUTRAL = 5,000",
    file: "Seer.sol",
    pattern: /\bNEUTRAL\b\s*=\s*(\d[\d_]*)/,
    expected: "5000",
  },
  {
    id: "MIN_SCORE",
    description: "Seer MIN_SCORE = 10",
    file: "Seer.sol",
    pattern: /\bMIN_SCORE\b\s*=\s*(\d[\d_]*)/,
    expected: "10",
  },
  {
    id: "MAX_SCORE",
    description: "Seer MAX_SCORE = 10,000",
    file: "Seer.sol",
    pattern: /\bMAX_SCORE\b\s*=\s*(\d[\d_]*)/,
    expected: "10000",
  },
  {
    id: "maxSingleReward",
    description: "Seer maxSingleReward = 100",
    file: "Seer.sol",
    pattern: /maxSingleReward\s*=\s*(\d[\d_]*)/,
    expected: "100",
  },
  {
    id: "maxDAOScoreChange",
    description: "Seer maxDAOScoreChange = 500 (post H-5)",
    file: "Seer.sol",
    pattern: /maxDAOScoreChange\s*=\s*(\d[\d_]*)/,
    expected: "500",
  },
  {
    id: "DAO_SCORE_COOLDOWN",
    description: "Seer DAO_SCORE_COOLDOWN = 4 hours",
    file: "Seer.sol",
    pattern: /DAO_SCORE_COOLDOWN\s*=\s*([^;]+);/,
    expected: `${4 * 3600}`,
    alternates: ["4 hours", "14400"],
  },
  // -- ScoringConstants --
  {
    id: "MIN_GOVERNANCE",
    description: "MIN_GOVERNANCE = 5,400",
    file: "lib/ScoringConstants.sol",
    pattern: /MIN_GOVERNANCE\s*=\s*(\d[\d_]*)/,
    expected: "5400",
  },
  {
    id: "MIN_MERCHANT",
    description: "MIN_MERCHANT = 5,600",
    file: "lib/ScoringConstants.sol",
    pattern: /MIN_MERCHANT\s*=\s*(\d[\d_]*)/,
    expected: "5600",
  },
  // -- CardBoundVault --
  {
    id: "MAX_GUARDIANS",
    description: "MAX_GUARDIANS = 20",
    file: "vault/CardBoundVault.sol",
    pattern: /MAX_GUARDIANS\s*=\s*(\d[\d_]*)/,
    expected: "20",
  },
  {
    id: "WITHDRAWAL_DELAY",
    description: "WITHDRAWAL_DELAY = 7 days",
    file: "vault/CardBoundVault.sol",
    pattern: /WITHDRAWAL_DELAY\s*=\s*([^;]+);/,
    expected: `${7 * 86400}`,
    alternates: ["7 days", "604800"],
  },
  {
    id: "SENSITIVE_ADMIN_DELAY",
    description: "SENSITIVE_ADMIN_DELAY = 7 days",
    file: "vault/CardBoundVault.sol",
    pattern: /SENSITIVE_ADMIN_DELAY\s*=\s*([^;]+);/,
    expected: `${7 * 86400}`,
    alternates: ["7 days", "604800"],
  },
  {
    id: "MIN_ROTATION_DELAY",
    description: "MIN_ROTATION_DELAY = 10 minutes",
    file: "vault/CardBoundVault.sol",
    pattern: /MIN_ROTATION_DELAY\s*=\s*([^;]+);/,
    expected: `${10 * 60}`,
    alternates: ["10 minutes", "600"],
  },
  {
    id: "MAX_ROTATION_DELAY",
    description: "MAX_ROTATION_DELAY = 7 days",
    file: "vault/CardBoundVault.sol",
    pattern: /MAX_ROTATION_DELAY\s*=\s*([^;]+);/,
    expected: `${7 * 86400}`,
    alternates: ["7 days", "604800"],
  },
  // -- VaultRecoveryClaim --
  {
    id: "GUARDIAN_VOTE_WINDOW",
    description: "GUARDIAN_VOTE_WINDOW = 14 days",
    file: "VaultRecoveryClaim.sol",
    pattern: /GUARDIAN_VOTE_WINDOW\s*=\s*([^;]+);/,
    expected: `${14 * 86400}`,
    alternates: ["14 days", "1209600"],
  },
  {
    id: "CHALLENGE_PERIOD",
    description: "CHALLENGE_PERIOD = 7 days",
    file: "VaultRecoveryClaim.sol",
    pattern: /\bCHALLENGE_PERIOD\b\s*=\s*([^;]+);/,
    expected: `${7 * 86400}`,
    alternates: ["7 days", "604800"],
  },
  {
    id: "ACTIVE_VAULT_CHALLENGE_PERIOD",
    description: "ACTIVE_VAULT_CHALLENGE_PERIOD = 14 days",
    file: "VaultRecoveryClaim.sol",
    pattern: /ACTIVE_VAULT_CHALLENGE_PERIOD\s*=\s*([^;]+);/,
    expected: `${14 * 86400}`,
    alternates: ["14 days", "1209600"],
  },
  // -- FraudRegistry --
  {
    id: "ESCROW_DURATION",
    description: "ESCROW_DURATION (FraudRegistry) = 30 days",
    file: "FraudRegistry.sol",
    pattern: /ESCROW_DURATION\s*=\s*([^;]+);/,
    expected: `${30 * 86400}`,
    alternates: ["30 days", "2592000"],
  },
  // -- DAO --
  {
    id: "DAO_votingPeriod",
    description: "DAO votingPeriod default = 7 days",
    file: "DAO.sol",
    pattern: /votingPeriod\s*=\s*([^;]+);/,
    expected: `${7 * 86400}`,
    alternates: ["7 days", "604800"],
  },
  {
    id: "DAO_votingDelay",
    description: "DAO votingDelay default = 1 day",
    file: "DAO.sol",
    pattern: /votingDelay\s*=\s*([^;]+);/,
    expected: `${1 * 86400}`,
    alternates: ["1 days", "86400"],
  },
  {
    id: "DAO_MAX_PROPOSALS",
    description: "DAO MAX_PROPOSALS = 200",
    file: "DAO.sol",
    pattern: /MAX_PROPOSALS\s*=\s*(\d[\d_]*)/,
    expected: "200",
  },
  {
    id: "DAO_QUEUE_EXPIRY",
    description: "DAO QUEUE_EXPIRY = 30 days",
    file: "DAO.sol",
    pattern: /QUEUE_EXPIRY\s*=\s*([^;]+);/,
    expected: `${30 * 86400}`,
    alternates: ["30 days", "2592000"],
  },
  {
    id: "EMERGENCY_RESCUE_DELAY",
    description: "EMERGENCY_RESCUE_DELAY = 14 days",
    file: "DAO.sol",
    pattern: /EMERGENCY_RESCUE_DELAY\s*=\s*([^;]+);/,
    expected: `${14 * 86400}`,
    alternates: ["14 days", "1209600"],
  },
];

let passes = 0;
let fails = 0;
const failures: string[] = [];

for (const c of checks) {
  const src = read(c.file);
  if (src == null) {
    fails++;
    failures.push(`[MISSING-FILE] ${c.id}: contracts/${c.file} not found`);
    continue;
  }

  const m = src.match(c.pattern);
  if (!m || m[1] === undefined) {
    fails++;
    failures.push(`[NO-MATCH] ${c.id}: pattern not found in ${c.file}`);
    continue;
  }

  const matched: string = m[1];
  const found = canonical(matched);
  const expected = canonical(c.expected);
  const altsCanonical = (c.alternates ?? []).map(canonical);

  if (found === expected || altsCanonical.includes(found)) {
    passes++;
    process.stdout.write(`✓ ${c.id}\n`);
  } else {
    fails++;
    failures.push(
      `[MISMATCH] ${c.id}: expected canonical=${expected} (raw=${c.expected})  got canonical=${found} (raw=${matched.trim()})  in ${c.file}`,
    );
  }
}

console.log("");
console.log(`Manual ↔ code parity: ${passes} passed, ${fails} failed (of ${checks.length}).`);
if (fails > 0) {
  console.log("");
  console.log("FAILURES:");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("All manual constants are aligned with the deployed source. ✅");
process.exit(0);
