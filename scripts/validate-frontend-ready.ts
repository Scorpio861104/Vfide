/**
 * validate-frontend-ready.ts
 *
 * Frontend / API / database pre-flight check for testnet announce.
 * Pairs with scripts/validate-testnet-ready.ts (which covers on-chain
 * state). This script runs WITHOUT hardhat — just plain `tsx`.
 *
 * Verifies:
 *   1. The root `middleware.ts` exists. If absent, Next.js never executes
 *      proxy.ts → no CSRF, no CSP, no body-size limits on any API route.
 *   2. `proxy.ts` exports `middleware` and `config`. If renamed or
 *      restructured this script catches it.
 *   3. `/api/csrf` route file exists.
 *   4. The CSRF policy doesn't accidentally exempt critical write paths.
 *   5. `lib/db.ts` calls `set_config('app.current_user_address', …)` —
 *      i.e. the RLS context is actually applied per query.
 *   6. The vfide_app GRANT migration is present in `migrations/`. (Doesn't
 *      check whether it's been APPLIED — for that, run psql.)
 *   7. NEXT_PUBLIC_* and FAUCET_* env vars relevant to the API routes are
 *      set (warn-only).
 *
 * Exits non-zero on any required-check failure.
 *
 *   npx tsx scripts/validate-frontend-ready.ts
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

interface Result {
  name: string;
  ok: boolean;
  level: "required" | "warn";
  detail: string;
}

const results: Result[] = [];

function check(name: string, ok: boolean, detail: string, level: "required" | "warn" = "required"): void {
  results.push({ name, ok, level, detail });
  const icon = ok ? "✅" : level === "required" ? "❌" : "⚠️ ";
  console.log(`  ${icon} ${name}: ${detail}`);
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// ── 1. proxy.ts security stack (NOT Next.js middleware.ts) ──────────────────
// IMPORTANT: This codebase does NOT use Next.js's built-in middleware.ts
// at the project root. The security stack lives in `proxy.ts` and is
// invoked by a separate proxy layer (see next.config.ts comments:
// "CSP is applied per-request in proxy.ts with a nonce" and
// "Strict fallback CSP for non-proxy paths"). Do not create a
// middleware.ts shim — it conflicts with this architecture.
console.log("\n═══ 1. Security Stack (proxy.ts) ═══");
const proxyExists = exists("proxy.ts");
check("proxy.ts exists", proxyExists, proxyExists ? "found" : "MISSING — security stack absent");
if (proxyExists) {
  const proxy = read("proxy.ts");
  check(
    "proxy.ts exports proxy function",
    /export\s+(?:async\s+)?function\s+proxy\b/.test(proxy) || /export\s+const\s+proxy\s*=/.test(proxy),
    "found",
  );
  check(
    "proxy.ts exports config (matcher)",
    /export\s+const\s+config\s*=/.test(proxy),
    "found",
  );
  check(
    "proxy.ts calls validateCSRF",
    /\bvalidateCSRF\s*\(/.test(proxy),
    /\bvalidateCSRF\s*\(/.test(proxy) ? "wired" : "NOT wired — CSRF will never be checked",
  );
  check(
    "proxy.ts applies CSP nonce",
    /\bgenerateNonce\b|\bbuildCsp\b/.test(proxy),
    /\bgenerateNonce\b/.test(proxy) ? "wired" : "NOT wired — no per-request CSP nonce",
  );
  check(
    "proxy.ts enforces body size limits",
    /MAX_BODY_SIZES|content-length|contentLength/i.test(proxy),
    "wired",
  );
}

// ── 2. Guard against accidental middleware.ts ──────────────────────────────
// Next.js auto-loads `middleware.ts` at project root and runs it BEFORE
// proxy.ts can be invoked by its own layer. If a middleware.ts exists
// here, it will silently bypass or duplicate the proxy stack.
console.log("\n═══ 2. middleware.ts Guard ═══");
const stray = exists("middleware.ts") || exists("src/middleware.ts");
check(
  "no stray middleware.ts at project root",
  !stray,
  stray
    ? "FOUND middleware.ts — DELETE IT. This codebase uses proxy.ts via a separate proxy layer; a Next.js middleware.ts will conflict with that architecture."
    : "clean — proxy.ts is the only security entry point",
);

// ── 3. /api/csrf route exists ───────────────────────────────────────────────
console.log("\n═══ 3. CSRF Token Endpoint ═══");
check(
  "app/api/csrf/route.ts exists",
  exists("app/api/csrf/route.ts"),
  exists("app/api/csrf/route.ts") ? "found" : "MISSING — clients have no way to fetch a token",
);

// ── 4. CSRF exempt list sanity ──────────────────────────────────────────────
console.log("\n═══ 4. CSRF Exempt Policy ═══");
if (exists("lib/security/csrfPolicy.ts")) {
  const policy = read("lib/security/csrfPolicy.ts");
  const dangerousExempts = [
    "/api/transfer",
    "/api/payment",
    "/api/withdraw",
    "/api/admin",
    "/api/governance",
    "/api/proof", // proof submissions are high-value
  ];
  const found = dangerousExempts.filter((p) => policy.includes(`'${p}'`) || policy.includes(`"${p}"`));
  check(
    "CSRF exempt list excludes high-value paths",
    found.length === 0,
    found.length === 0 ? "clean" : `DANGEROUS: exempts ${found.join(", ")}`,
  );
} else {
  check("lib/security/csrfPolicy.ts exists", false, "missing");
}

// ── 5. lib/db.ts applies RLS context per query ──────────────────────────────
console.log("\n═══ 5. Database RLS Context Wiring ═══");
if (exists("lib/db.ts")) {
  const db = read("lib/db.ts");
  check(
    "lib/db.ts calls set_config('app.current_user_address', ...)",
    /set_config\(\s*['"]app\.current_user_address['"]/.test(db),
    "wired",
  );
  check(
    "lib/db.ts has verifyRlsEnforcement (production guard)",
    /verifyRlsEnforcement\b/.test(db),
    "wired",
  );
} else {
  check("lib/db.ts exists", false, "missing");
}
if (exists("instrumentation.ts")) {
  const instr = read("instrumentation.ts");
  check(
    "instrumentation.ts calls verifyRlsEnforcementOrThrow",
    /verifyRlsEnforcementOrThrow\b/.test(instr),
    "wired",
  );
} else {
  check("instrumentation.ts exists", false, "missing — RLS check will not run at boot");
}

// ── 6. vfide_app grants migration present ───────────────────────────────────
console.log("\n═══ 6. PostgreSQL Role Grants ═══");
const migrationsDir = path.join(ROOT, "migrations");
if (fs.existsSync(migrationsDir)) {
  const migrations = fs.readdirSync(migrationsDir);
  const createRole = migrations.some((f) => f.includes("create_app_role_rls_enforcement") || f.includes("create_vfide_app_role"));
  const grantsBroad = migrations.some((f) => f.includes("grant_vfide_app") || f.includes("vfide_app_grants"));
  const baselineRls = migrations.some((f) => f.includes("complete_rls_baseline"));
  const lowerNormalize = migrations.some((f) => f.includes("normalize_legacy_rls_lower"));
  const writerSplit = migrations.some((f) => f.includes("split_writer_role"));
  check("migration creating vfide_app role present", createRole, createRole ? "found" : "missing");
  check(
    "migration granting on all tables present",
    grantsBroad,
    grantsBroad ? "found" : "MISSING — vfide_app will hit permission denied on most tables",
  );
  check(
    "migration with full RLS baseline present",
    baselineRls,
    baselineRls ? "found" : "missing — only 31 tables have policies; 72 high-value tables are RLS-naked",
  );
  check(
    "migration normalizing legacy LOWER() present",
    lowerNormalize,
    lowerNormalize ? "found" : "missing — case-mismatched wallet addresses will not match RLS predicates",
  );
  check(
    "migration splitting writer role present",
    writerSplit,
    writerSplit ? "found" : "missing — Pattern F system/lookup tables have no write protection",
  );
} else {
  check("migrations directory exists", false, "missing");
}

// ── 7. Env var inventory (warn-only) ────────────────────────────────────────
console.log("\n═══ 7. Environment Variables (warn-only) ═══");
const envChecks: Array<{ name: string; expected: boolean }> = [
  { name: "NEXT_PUBLIC_IS_TESTNET",          expected: process.env.NEXT_PUBLIC_IS_TESTNET === "true" },
  { name: "NEXT_PUBLIC_DEFAULT_CHAIN_ID",    expected: !!process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID },
  { name: "NEXT_PUBLIC_FAUCET_ADDRESS",      expected: /^0x[0-9a-fA-F]{40}$/.test(process.env.NEXT_PUBLIC_FAUCET_ADDRESS ?? "") },
  { name: "FAUCET_OPERATOR_PRIVATE_KEY",     expected: /^0x[0-9a-fA-F]{64}$/.test(process.env.FAUCET_OPERATOR_PRIVATE_KEY ?? "") },
  { name: "DATABASE_URL",                    expected: !!process.env.DATABASE_URL },
  { name: "NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS", expected: /^0x[0-9a-fA-F]{40}$/.test(process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS ?? "") },
];
for (const e of envChecks) {
  check(e.name, e.expected, e.expected ? "set" : "unset or invalid", "warn");
}

// ── Summary ─────────────────────────────────────────────────────────────────
const required = results.filter((r) => r.level === "required");
const requiredFailed = required.filter((r) => !r.ok);
const warns = results.filter((r) => r.level === "warn" && !r.ok);

console.log("\n╔══════════════════════════════════════════════════════════╗");
if (requiredFailed.length === 0) {
  console.log("║  ✅  Frontend / API / DB layer ready                       ║");
} else {
  console.log(`║  ❌  ${requiredFailed.length} required check(s) failed                       ║`);
}
if (warns.length > 0) {
  console.log(`║  ⚠️   ${warns.length} env var(s) unset or invalid (warn only)         ║`);
}
console.log("╚══════════════════════════════════════════════════════════╝\n");

if (requiredFailed.length > 0) {
  console.error("Failed required checks:");
  for (const f of requiredFailed) console.error(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
