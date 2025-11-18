#!/usr/bin/env node
/*
 Read coverage.json and enforce minimum thresholds for contracts (excluding mocks).
 Env overrides:
  - COVERAGE_MIN_LINES (default 70)
  - COVERAGE_MIN_BRANCHES (default 60)
*/
const fs = require('fs');
const path = require('path');

const MIN_LINES = Number(process.env.COVERAGE_MIN_LINES || 70);
const MIN_BRANCHES = Number(process.env.COVERAGE_MIN_BRANCHES || 60);

function readCoverage() {
  const p = path.join(process.cwd(), 'coverage.json');
  if (!fs.existsSync(p)) {
    console.error('coverage.json not found. Run `npm run coverage` first.');
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function percent(metric) {
  if (!metric || typeof metric.pct !== 'number') return 0;
  return metric.pct;
}

function isContractFile(fp) {
  if (!fp) return false;
  // focus on contracts-min; skip mocks
  return /contracts-min\/.+\.sol$/.test(fp) && !/mocks\//.test(fp);
}

function main() {
  const cov = readCoverage();
  let failures = [];

  for (const [file, data] of Object.entries(cov)) {
    if (file === 'total') continue;
    if (!isContractFile(file)) continue;
    const lp = percent(data.lines);
    const bp = percent(data.branches);
    if (lp < MIN_LINES || bp < MIN_BRANCHES) {
      failures.push({ file, lines: lp, branches: bp });
    }
  }

  if (failures.length === 0) {
    console.log(`[coverage-check] OK: all files meet >= lines:${MIN_LINES}% branches:${MIN_BRANCHES}%`);
    process.exit(0);
  } else {
    console.log(`[coverage-check] FAIL: below thresholds lines:${MIN_LINES}% branches:${MIN_BRANCHES}%`);
    for (const f of failures) {
      console.log(` - ${f.file}: lines=${f.lines}% branches=${f.branches}%`);
    }
    process.exit(1);
  }
}

main();
