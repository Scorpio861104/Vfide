#!/usr/bin/env node
/**
 * contract-constants-drift.cjs
 *
 * Guards against the single most common defect in this codebase: human-facing
 * numbers (fees, score thresholds, the fee split, timing) hardcoded in UI copy
 * that drift from the on-chain contract values.
 *
 * It flags lines that talk about a fee split / score threshold / known timing
 * value but use a number that doesn't match the canonical contract constant.
 * Triage required — a hit is a candidate, not a proof.
 *
 * Canonical sources:
 *   contracts/lib/ScoringConstants.sol, contracts/ProofScoreBurnRouter.sol,
 *   contracts/FeeDistributor.sol, contracts/VaultRecoveryClaim.sol,
 *   contracts/vault/CardBoundVaultInheritanceManager.sol, FEE_MODEL_CANONICAL.md
 */
const fs = require('fs');
const path = require('path');

// ---- Canonical values ----
const CANON = {
  scaleMax: 10000,
  neutral: 5000,
  // Score thresholds that may legitimately appear next to governance/merchant/etc.
  scoreThresholds: new Set([5000, 5400, 5600, 6000, 7000, 8000, 4000]),
  scoreLabels: {
    governance: 5400, merchant: 5600, trusted: 5600, council: 7000,
    elite: 8000, neutral: 5000, tier2: 6000,
  },
  // End-to-end fee split (% of every fee). The recurring stale set is 35/20/15/20/10.
  split: { burn: 40, sanctum: 10, 'dao payroll': 25, payroll: 25, merchant: 15, headhunter: 10, referral: 10 },
  staleSplit: new Set([35, 3500]), // 35% / 3500bps burn = old design
  // Fee curve endpoints
  feeMaxPct: 5, feeMinPct: 0.25, feeNeutralPct: 3.81,
  // Known stale literals seen drifting
  staleLiterals: [
    { re: /\b0\.0075\b/, why: 'hardcoded 0.75% fee (real fee is ProofScore-based 0.25%-5%)' },
    { re: /\b0\.255\s*%/, why: 'mis-stated fee floor (should be 0.25%)' },
    { re: /\b57\.5\s*%/, why: 'garbled burn figure (burn is 40%)' },
    { re: /burnBps\s*=?\s*3500\b/i, why: 'stale burn split 3500bps (now 40%)' },
  ],
};

const ROOTS = ['app', 'components'];
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name) && !/\.(test|spec|stories)\./.test(e.name)) files.push(p);
  }
}
ROOTS.forEach((r) => { try { walk(r); } catch { /* root absent */ } });

const findings = [];
const add = (f, ln, sev, msg, text) =>
  findings.push({ f, ln, sev, msg, text: text.trim().slice(0, 110) });

const SPLIT_CTX = /\b(burn|sanctum|headhunter|referral pool|dao payroll|merchant pool|fee split|feedistributor)\b/i;
const SCORE_CTX = /\b(proofscore|min[_ ]?governance|min[_ ]?merchant|governance|council|elite|trusted|to vote|to propose|merchant.{0,10}(score|require))\b/i;

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const ln = i + 1;

    // 1. Known stale literals (high confidence)
    for (const { re, why } of CANON.staleLiterals) {
      if (re.test(line)) add(f, ln, 'HIGH', why, line);
    }

    // 2. Fee-split lines using the stale 35 / 3500
    if (SPLIT_CTX.test(line)) {
      const nums = [...line.matchAll(/\b(\d{1,4})\s*%/g)].map(m => +m[1]);
      const bps = [...line.matchAll(/\b(\d{3,4})\s*bps\b/gi)].map(m => +m[1]);
      if (nums.includes(35) || bps.includes(3500))
        add(f, ln, 'HIGH', 'stale fee-split value 35% / 3500bps (canonical burn is 40%)', line);
      // sanctum paired with 20% is the old split
      if (/sanctum/i.test(line) && (nums.includes(20) || bps.includes(2000)))
        add(f, ln, 'MED', 'stale Sanctum split 20%/2000bps (canonical is 10%)', line);
    }

    // 3. Score thresholds: a governance/merchant claim with a 4-digit score not in canon set.
    //    Skip color-gradient cutoffs (scoreColor = s >= N ? '#hex' : ...) — those are
    //    visual band choices, not eligibility/fee claims — and skip digits that are the
    //    fractional part of a percentage (e.g. 3.8125%).
    const isColorBand = /scoreColor|#[0-9a-fA-F]{3,6}|hex\b/.test(line);
    if (SCORE_CTX.test(line) && !isColorBand) {
      const scores = [...line.matchAll(/(?<![.\d])(\d{4})\b/g)].map(m => +m[1])
        .filter(n => n >= 4000 && n <= 9999);
      for (const n of scores) {
        if (!CANON.scoreThresholds.has(n))
          add(f, ln, 'MED', `score threshold ${n} not a canonical value (5000/5400/5600/6000/7000/8000)`, line);
      }
      // governance claim must use 5400; merchant must use 5600
      if (/\b(to vote|to propose|min[_ ]?governance|governance threshold)\b/i.test(line)
          && scores.length && !scores.includes(5400))
        add(f, ln, 'MED', 'governance-eligibility claim not using 5400', line);
    }
  });
}

const order = { HIGH: 0, MED: 1 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.f.localeCompare(b.f) || a.ln - b.ln);

console.log(`Scanned ${files.length} files.\n`);
if (!findings.length) {
  console.log('No fee/score/split constant drift detected. ✔');
} else {
  for (const x of findings) console.log(`[${x.sev}] ${x.f}:${x.ln}  ${x.msg}\n        ${x.text}`);
  const high = findings.filter(x => x.sev === 'HIGH').length;
  console.log(`\nTOTAL: ${findings.length}  (high=${high}, med=${findings.length - high})`);
}
