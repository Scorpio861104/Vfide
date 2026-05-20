#!/usr/bin/env node
/**
 * verify-manual-parity.cjs
 *
 * Mainnet readiness gate: every constant from VFIDE_Complete_Manual_v1.0
 * (pages 14–15 "Critical thresholds at a glance") is grepped out of the
 * actual Solidity source and asserted to match the manual exactly.
 *
 * Pure-JS, no deps. Run:  node scripts/verify-manual-parity.cjs
 * Exits 0 on full parity, 1 on any mismatch.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "contracts");

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

// Canonicalise a numeric/duration literal as written in Solidity.
function canonical(s) {
  let t = String(s).trim();
  t = t.replace(/\buint(?:\d+)?\b/g, "");
  t = t.replace(/[()\s]/g, "");
  t = t.replace(/_/g, "");
  // duration units first
  t = t.replace(/(\d+)hours/gi, (_, n) => `${parseInt(n, 10) * 3600}`);
  t = t.replace(/(\d+)days/gi, (_, n) => `${parseInt(n, 10) * 86400}`);
  t = t.replace(/(\d+)minutes/gi, (_, n) => `${parseInt(n, 10) * 60}`);
  t = t.replace(/(\d+)seconds/gi, "$1");
  // ether
  t = t.replace(/(\d+)ether/gi, "$1*10**18");
  // 1e18 -> 1*10**18
  t = t.replace(/(\d+)e(\d+)/gi, "$1*10**$2");
  // collapse a*1*10**18 -> a*10**18
  t = t.replace(/\*1\*10\*\*/g, "*10**");
  return t;
}

function eq(a, b) {
  return canonical(a) === canonical(b);
}

const checks = [
  // --- VFIDEToken ---
  { id: "MAX_SUPPLY", file: "VFIDEToken.sol",
    pat: /MAX_SUPPLY\s*=\s*([^;]+);/,
    expects: ["200000000*10**18", "200_000_000e18", "200_000_000 * 10**18", "200000000 ether"] },
  { id: "DEV_RESERVE_SUPPLY", file: "VFIDEToken.sol",
    pat: /DEV_RESERVE_SUPPLY\s*=\s*([^;]+);/,
    expects: ["50000000*10**18", "50_000_000e18", "50_000_000 * 10**18"] },

  // --- ProofScoreBurnRouter ---
  { id: "minTotalBps", file: "ProofScoreBurnRouter.sol",
    pat: /minTotalBps\s*=\s*(\d[\d_]*)/, expects: ["25"] },
  { id: "maxTotalBps", file: "ProofScoreBurnRouter.sol",
    pat: /maxTotalBps\s*=\s*(\d[\d_]*)/, expects: ["500"] },
  { id: "microTxFeeCeilingBps", file: "ProofScoreBurnRouter.sol",
    pat: /microTxFeeCeilingBps\s*=\s*(\d[\d_]*)/, expects: ["100"] },
  { id: "microTxMaxAmount", file: "ProofScoreBurnRouter.sol",
    pat: /microTxMaxAmount\s*=\s*([^;]+);/,
    expects: ["10*10**18", "10 * 1e18", "10e18", "10 ether"] },
  { id: "dailyBurnCap", file: "ProofScoreBurnRouter.sol",
    pat: /dailyBurnCap\s*=\s*([^;]+?);/,
    expects: ["500000*10**18", "500_000 * 1e18", "500_000e18"] },
  { id: "minimumSupplyFloor", file: "ProofScoreBurnRouter.sol",
    pat: /minimumSupplyFloor\s*=\s*([^;]+?);/,
    expects: ["50000000*10**18", "50_000_000 * 1e18", "50_000_000e18"] },
  { id: "BPS_SCALE", file: "ProofScoreBurnRouter.sol",
    pat: /BPS_SCALE\s*=\s*(\d[\d_]*)/, expects: ["10000", "10_000"] },

  // --- Seer ---
  { id: "Seer.NEUTRAL", file: "Seer.sol",
    pat: /\bNEUTRAL\s*=\s*(\d[\d_]*)/, expects: ["5000"] },
  { id: "Seer.MIN_SCORE", file: "Seer.sol",
    pat: /\bMIN_SCORE\s*=\s*(\d[\d_]*)/, expects: ["10"] },
  { id: "Seer.MAX_SCORE", file: "Seer.sol",
    pat: /\bMAX_SCORE\s*=\s*(\d[\d_]*)/, expects: ["10000", "10_000"] },
  { id: "Seer.maxSingleReward", file: "Seer.sol",
    pat: /maxSingleReward\s*=\s*(\d[\d_]*)/, expects: ["100"] },
  { id: "Seer.maxDAOScoreChange", file: "Seer.sol",
    pat: /maxDAOScoreChange\s*=\s*(\d[\d_]*)/, expects: ["500"] },
  { id: "Seer.DAO_SCORE_COOLDOWN", file: "Seer.sol",
    pat: /DAO_SCORE_COOLDOWN\s*=\s*([^;]+);/,
    expects: ["4 hours", "14400"] },

  // --- ScoringConstants ---
  { id: "MIN_GOVERNANCE", file: "lib/ScoringConstants.sol",
    pat: /MIN_GOVERNANCE\s*=\s*(\d[\d_]*)/, expects: ["5400"] },
  { id: "MIN_MERCHANT", file: "lib/ScoringConstants.sol",
    pat: /MIN_MERCHANT\s*=\s*(\d[\d_]*)/, expects: ["5600"] },

  // --- CardBoundVault ---
  { id: "MAX_GUARDIANS", file: "vault/CardBoundVault.sol",
    pat: /MAX_GUARDIANS\s*=\s*(\d[\d_]*)/, expects: ["20"] },
  { id: "WITHDRAWAL_DELAY", file: "vault/CardBoundVault.sol",
    pat: /WITHDRAWAL_DELAY\s*=\s*([^;]+);/,
    expects: ["7 days", "604800"] },
  { id: "SENSITIVE_ADMIN_DELAY", file: "vault/CardBoundVault.sol",
    pat: /SENSITIVE_ADMIN_DELAY\s*=\s*([^;]+);/,
    expects: ["7 days", "604800"] },
  { id: "MIN_ROTATION_DELAY", file: "vault/CardBoundVault.sol",
    pat: /MIN_ROTATION_DELAY\s*=\s*([^;]+);/,
    expects: ["10 minutes", "600"] },
  { id: "MAX_ROTATION_DELAY", file: "vault/CardBoundVault.sol",
    pat: /MAX_ROTATION_DELAY\s*=\s*([^;]+);/,
    expects: ["7 days", "604800"] },

  // --- VaultRecoveryClaim ---
  { id: "GUARDIAN_VOTE_WINDOW", file: "VaultRecoveryClaim.sol",
    pat: /GUARDIAN_VOTE_WINDOW\s*=\s*([^;]+);/,
    expects: ["14 days", "1209600"] },
  { id: "CHALLENGE_PERIOD", file: "VaultRecoveryClaim.sol",
    // Use a leading word boundary that excludes ACTIVE_VAULT_CHALLENGE_PERIOD
    pat: /(?<![_A-Z])CHALLENGE_PERIOD\s*=\s*([^;]+);/,
    expects: ["7 days", "604800"] },
  { id: "ACTIVE_VAULT_CHALLENGE_PERIOD", file: "VaultRecoveryClaim.sol",
    pat: /ACTIVE_VAULT_CHALLENGE_PERIOD\s*=\s*([^;]+);/,
    expects: ["14 days", "1209600"] },

  // --- FraudRegistry ---
  { id: "ESCROW_DURATION", file: "FraudRegistry.sol",
    pat: /ESCROW_DURATION\s*=\s*([^;]+);/,
    expects: ["30 days", "2592000"] },

  // --- DAO ---
  { id: "DAO.votingPeriod", file: "DAO.sol",
    pat: /\bvotingPeriod\s*=\s*([^;]+);/,
    expects: ["7 days", "604800"] },
  { id: "DAO.votingDelay", file: "DAO.sol",
    pat: /\bvotingDelay\s*=\s*([^;]+);/,
    expects: ["1 days", "86400"] },
  { id: "DAO.MAX_PROPOSALS", file: "DAO.sol",
    pat: /MAX_PROPOSALS\s*=\s*(\d[\d_]*)/, expects: ["200"] },
  { id: "DAO.QUEUE_EXPIRY", file: "DAO.sol",
    pat: /QUEUE_EXPIRY\s*=\s*([^;]+);/,
    expects: ["30 days", "2592000"] },
  { id: "DAO.EMERGENCY_RESCUE_DELAY", file: "DAO.sol",
    pat: /EMERGENCY_RESCUE_DELAY\s*=\s*([^;]+);/,
    expects: ["14 days", "1209600"] },
];

let passes = 0, fails = 0;
const failures = [];

for (const c of checks) {
  const src = read(c.file);
  if (src == null) {
    fails++;
    failures.push(`[MISSING-FILE] ${c.id}: contracts/${c.file} not found`);
    continue;
  }
  const m = src.match(c.pat);
  if (!m) {
    fails++;
    failures.push(`[NO-MATCH] ${c.id}: pattern not found in ${c.file}`);
    continue;
  }
  const found = m[1];
  const ok = c.expects.some((e) => eq(e, found));
  if (ok) {
    passes++;
    console.log(`✓ ${c.id.padEnd(34)}  ${c.file}  =  ${found.trim()}`);
  } else {
    fails++;
    failures.push(`[MISMATCH] ${c.id}: got "${found.trim()}" (canonical=${canonical(found)}); expected one of ${JSON.stringify(c.expects)} (canonical=${JSON.stringify(c.expects.map(canonical))}) in ${c.file}`);
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
