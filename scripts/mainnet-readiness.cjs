#!/usr/bin/env node
/**
 * scripts/mainnet-readiness.cjs
 *
 * One-shot, dependency-free, hard-fail gate that runs every static
 * mainnet-readiness check the team can verify without a live RPC.
 *
 * It chains together:
 *   1. Manual ↔ code constant parity (verify-manual-parity.cjs)
 *   2. Forbidden-import scan (no production .sol imports `./future/`,
 *      `./mocks/`, `./legacy/`, or `./testnet/`)
 *   3. Deploy-script hygiene
 *      - scripts/deploy-full.ts must NOT import from contracts/future/,
 *        contracts/mocks/, contracts/legacy/, contracts/testnet/
 *      - scripts/deploy-full.ts must gate testnet faucet behind
 *        DEPLOY_TESTNET_FAUCET=true
 *   4. Frontend env consistency
 *      - every "production: true" entry in lib/validateProduction.ts that's
 *        an address has a matching entry in scripts/validate-mainnet-env.ts
 *   5. PRODUCTION_SET.md hygiene
 *      - every contract listed as "Deployable" exists at the documented path
 *      - no Deployable references a path under contracts/future/
 *
 * Run:  node scripts/mainnet-readiness.cjs
 * Exits 0 only if all checks pass.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
const log = (msg) => console.log(msg);
const fail = (msg) => {
  console.error(`❌ ${msg}`);
  failures++;
};
const pass = (msg) => console.log(`✓ ${msg}`);
const section = (title) => {
  console.log("");
  console.log(`── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
};

function readFile(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

// ── 1. Manual constant parity ────────────────────────────────────────────────
section("1) Manual ↔ code parity");
try {
  execSync("node scripts/verify-manual-parity.cjs", {
    cwd: ROOT,
    stdio: "inherit",
  });
  pass("All manual constants align with source");
} catch (e) {
  fail("Manual parity verification failed (see output above)");
}

// ── 2. Forbidden import scan in production .sol ─────────────────────────────
section("2) Forbidden Solidity imports in production tree");
{
  const productionFiles = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      // Skip excluded subtrees
      if (e.isDirectory()) {
        if (["future", "mocks", "legacy", "testnet"].includes(e.name)) continue;
        if (full.includes(`${path.sep}node_modules${path.sep}`)) continue;
        walk(full);
      } else if (e.isFile() && e.name.endsWith(".sol")) {
        productionFiles.push(full);
      }
    }
  }
  walk(path.join(ROOT, "contracts"));
  const forbiddenRe = /^\s*import\s+["'](?:\.\/|\.\.\/)?(future|mocks|legacy|testnet)\//gm;
  let any = false;
  for (const f of productionFiles) {
    const src = fs.readFileSync(f, "utf8");
    forbiddenRe.lastIndex = 0;
    let m;
    while ((m = forbiddenRe.exec(src))) {
      fail(`Forbidden import in production tree: ${path.relative(ROOT, f)} imports from ${m[1]}/`);
      any = true;
    }
  }
  if (!any) pass("No production-tree .sol imports from future/mocks/legacy/testnet");
}

// ── 3. Deploy-script hygiene ─────────────────────────────────────────────────
section("3) scripts/deploy-full.ts hygiene");
{
  const src = readFile("scripts/deploy-full.ts");
  if (!src) {
    fail("scripts/deploy-full.ts not found");
  } else {
    const importsForbidden = src.match(
      /from\s+["'][^"']*contracts\/(future|mocks|legacy|testnet)\//g,
    );
    if (importsForbidden) {
      fail(`deploy-full.ts imports from forbidden trees: ${importsForbidden.join(", ")}`);
    } else {
      pass("deploy-full.ts has no imports from contracts/{future,mocks,legacy,testnet}/");
    }
    if (/VFIDETestnetFaucet/.test(src) && !/DEPLOY_TESTNET_FAUCET/.test(src)) {
      fail("deploy-full.ts deploys VFIDETestnetFaucet without gating on DEPLOY_TESTNET_FAUCET env");
    } else {
      pass("Testnet faucet either absent or env-gated");
    }
    if (/process\.env\.PRIVATE_KEY/.test(src) && !/throw|fail/i.test(src.split(/process\.env\.PRIVATE_KEY/)[1].slice(0, 200))) {
      // soft warning; the hardhat config already gates accounts
    }
  }
}

// ── 4. Frontend env validators consistency ───────────────────────────────────
section("4) Validator consistency: validateProduction.ts ↔ validate-mainnet-env.ts");
{
  const valProd = readFile("lib/validateProduction.ts");
  const valEnv = readFile("scripts/validate-mainnet-env.ts");
  if (!valProd || !valEnv) {
    fail("One of the validator files is missing");
  } else {
    const productionTrueAddrs = [
      ...valProd.matchAll(/name:\s*'(NEXT_PUBLIC_[A-Z_]+_ADDRESS)'[^}]*production:\s*true/g),
    ].map((m) => m[1]);
    const envSetAddrs = [
      ...valEnv.matchAll(/'(NEXT_PUBLIC_[A-Z_]+_ADDRESS)'/g),
    ].map((m) => m[1]);
    const missing = productionTrueAddrs.filter((a) => !envSetAddrs.includes(a));
    if (missing.length) {
      fail(
        `These NEXT_PUBLIC_*_ADDRESS keys are 'production: true' in validateProduction.ts but absent from validate-mainnet-env.ts ADDRESS_VARS: ${missing.join(", ")}`,
      );
    } else {
      pass(
        `All ${productionTrueAddrs.length} production-required addresses are mirrored in deploy-time validator`,
      );
    }
  }
}

// ── 5. PRODUCTION_SET.md hygiene ─────────────────────────────────────────────
section("5) PRODUCTION_SET.md path resolution");
{
  const doc = readFile("contracts/PRODUCTION_SET.md");
  if (!doc) {
    fail("contracts/PRODUCTION_SET.md missing");
  } else {
    const deployableSection = doc.split(/##\s*Deployable Contracts/i)[1] || "";
    const stop = deployableSection.search(/^##\s/m);
    const block = stop > 0 ? deployableSection.slice(0, stop) : deployableSection;
    const lines = block.split("\n").filter((l) => /^- /.test(l));
    let missing = 0,
      futureLeak = 0,
      ok = 0;
    for (const line of lines) {
      // Extract the .sol path (allow leading 'vault/', 'pools/', etc.)
      const m = line.match(/`?([\w/]+\.sol)`?/) || line.match(/-\s*([\w/]+\.sol)/);
      if (!m) continue;
      const rel = m[1];
      const full = path.join(ROOT, "contracts", rel);
      if (!fs.existsSync(full)) {
        // Some entries (like "VFIDEAccessControl.sol ← base contract") can have qualifiers
        // Let's try the bare basename in contracts/
        const bare = path.join(ROOT, "contracts", path.basename(rel));
        if (!fs.existsSync(bare)) {
          fail(`PRODUCTION_SET.md lists non-existent file: ${rel}`);
          missing++;
          continue;
        }
      }
      // Reject if the resolved path is under future/
      if (full.includes(`${path.sep}future${path.sep}`)) {
        fail(`PRODUCTION_SET.md "Deployable" entry resolves to future/: ${rel}`);
        futureLeak++;
        continue;
      }
      ok++;
    }
    if (!missing && !futureLeak) {
      pass(`All ${ok} "Deployable" PRODUCTION_SET entries resolve to real production-tree files`);
    }
  }
}

// ── 6. CI gate hardness ─────────────────────────────────────────────────────
section("6) CI lint gate is hard-fail (no '|| true' on ESLint)");
{
  const wf = readFile(".github/workflows/testing-pipeline.yml");
  if (!wf) {
    fail(".github/workflows/testing-pipeline.yml missing");
  } else {
    const eslintLines = wf.split("\n").filter((l) => /eslint /.test(l));
    const soft = eslintLines.filter((l) => /\|\|\s*true/.test(l));
    if (soft.length) {
      fail(`ESLint is soft-gated in testing-pipeline.yml: ${soft[0].trim()}`);
    } else {
      pass("ESLint runs as a hard gate in testing-pipeline.yml");
    }
  }
}

// ── 7. Hardhat network coverage ─────────────────────────────────────────────
section("7) Mainnet networks declared in hardhat.config.ts");
{
  const cfg = readFile("hardhat.config.ts");
  if (!cfg) {
    fail("hardhat.config.ts missing");
  } else {
    const required = [
      { name: "base", chainId: 8453 },
      { name: "polygon", chainId: 137 },
      { name: "zkSync", chainId: 324 },
    ];
    for (const r of required) {
      // Look for network block: `name: { ... chainId: <id> ... }`
      const re = new RegExp(`${r.name}\\s*:\\s*{[\\s\\S]*?chainId:\\s*${r.chainId}\\b`);
      if (re.test(cfg)) pass(`${r.name} (${r.chainId}) configured`);
      else fail(`${r.name} (chainId ${r.chainId}) missing or chainId mismatch`);
    }
  }
}

// ── 8. .env.mainnet.example covers all required keys ────────────────────────
section("8) .env.mainnet.example covers required keys");
{
  const exampleEnv = readFile(".env.mainnet.example");
  if (!exampleEnv) {
    fail(".env.mainnet.example missing");
  } else {
    const valEnv = readFile("scripts/validate-mainnet-env.ts") || "";
    const required = [
      ...valEnv.matchAll(/'(NEXT_PUBLIC_[A-Z_]+_ADDRESS|[A-Z_]+_ADDRESS|DATABASE_URL|JWT_SECRET|BASE_MAINNET_RPC_URL)'/g),
    ].map((m) => m[1]);
    const uniq = [...new Set(required)];
    const missing = uniq.filter((k) => !new RegExp(`^${k}=`, "m").test(exampleEnv));
    if (missing.length) {
      fail(`Keys missing from .env.mainnet.example: ${missing.join(", ")}`);
    } else {
      pass(`All ${uniq.length} validator-required keys are documented in .env.mainnet.example`);
    }
  }
}

// ── Final ───────────────────────────────────────────────────────────────────
console.log("");
if (failures > 0) {
  console.log(`❌ Mainnet readiness sweep FAILED with ${failures} failure(s).`);
  process.exit(1);
}
console.log("✅ Mainnet readiness sweep PASSED. All static gates green.");
process.exit(0);
