#!/usr/bin/env node

/**
 * Pre-Deployment Validation Gate
 * 
 * Runs all critical security, build, and integration checks before allowing deployment.
 * Orchestrates verification scripts and prevents deployment if validation fails.
 * 
 * Usage:
 *   npm run validate:deploy [--force-continue]
 * 
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more critical checks failed (deployment blocked)
 *   2 = warning (passed but with warnings)
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const BOLD = '\x1b[1m';

const args = process.argv.slice(2);
const FORCE_CONTINUE = args.includes('--force-continue');

/**
 * Validation check result
 */
class CheckResult {
  name: string;
  passed: boolean;
  output: string;
  warnings: string[];

  constructor(name: string, passed: boolean, output = '', warnings: string[] = []) {
    this.name = name;
    this.passed = passed;
    this.output = output;
    this.warnings = warnings;
  }

  isSuccess(): boolean {
    return this.passed && this.warnings.length === 0;
  }

  isCritical(): boolean {
    return !this.passed;
  }
}

/**
 * Run a shell command and capture output
 */
function runCommand(cmd: string, description: string, critical = true): CheckResult {
  console.log(`\n${BLUE}Running:${RESET} ${description}`);
  console.log(`${BLUE}$${RESET} ${cmd}`);

  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`${GREEN}✓ Passed${RESET}`);
    return new CheckResult(description, true, output);
  } catch (error: any) {
    const output = error.stdout || error.stderr || error.message;
    if (critical) {
      console.error(`${RED}✗ FAILED${RESET}`);
      console.error(output);
      return new CheckResult(description, false, output);
    } else {
      console.warn(`${YELLOW}⚠ Warning${RESET}`);
      return new CheckResult(description, true, output, [String(output)]);
    }
  }
}

/**
 * Main validation suite
 */
async function runValidationSuite(): Promise<void> {
  console.log(`\n${BOLD}${BLUE}╔════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${BLUE}║  VFIDE Pre-Deployment Validation Gate                  ║${RESET}`);
  console.log(`${BOLD}${BLUE}╚════════════════════════════════════════════════════════╝${RESET}\n`);

  const results: CheckResult[] = [];
  let hasWarnings = false;

  // ──────────────────────────────────────────────────────────────────────────
  // TIER 1: Build & Compile Checks (Critical)
  // ──────────────────────────────────────────────────────────────────────────

  console.log(`\n${BOLD}${BLUE}TIER 1: Build & Compile Checks${RESET}`);
  console.log('─'.repeat(60));

  results.push(runCommand(
    'npm run -s typecheck',
    'TypeScript type checking',
    true
  ));

  results.push(runCommand(
    'npm run contract:verify:frontend-abi-parity',
    'Frontend ABI parity verification',
    true
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // TIER 2: Security Checks (Critical)
  // ──────────────────────────────────────────────────────────────────────────

  console.log(`\n${BOLD}${BLUE}TIER 2: Security & Infrastructure Checks${RESET}`);
  console.log('─'.repeat(60));

  // Check proxy/middleware security layer exists and stays aligned
  const proxyExists = existsSync('proxy.ts');
  const middlewareExists = existsSync('middleware.ts');
  console.log(`\n${BLUE}Running:${RESET} Root middleware check`);
  if (proxyExists || middlewareExists) {
    const proxySource = proxyExists ? readFileSync('proxy.ts', 'utf8') : '';
    const middlewareSource = middlewareExists ? readFileSync('middleware.ts', 'utf8') : '';
    const middlewareDelegatesToProxy = !middlewareExists || middlewareSource.includes("export { proxy as middleware, config } from './proxy'");
    const cspHandledInProxy = !proxyExists || proxySource.includes('Content-Security-Policy');

    if (middlewareDelegatesToProxy && cspHandledInProxy) {
      console.log(`${GREEN}✓ Passed${RESET} (proxy.ts is the CSP/CSRF source of truth)`);
      results.push(new CheckResult('proxy security layer aligned', true));
    } else {
      console.error(`${RED}✗ FAILED${RESET} (proxy/middleware security layer is misaligned)`);
      results.push(new CheckResult('proxy security layer aligned', false, 'proxy.ts and middleware.ts are not aligned'));
    }
  } else {
    console.error(`${RED}✗ FAILED${RESET} (proxy.ts and middleware.ts not found)`);
    results.push(new CheckResult('proxy security layer aligned', false, 'proxy.ts and middleware.ts not found'));
  }

  // Check Next.js image config is restricted to explicit hosts
  console.log(`\n${BLUE}Running:${RESET} Next image domain restriction check`);
  const nextConfig = readFileSync('next.config.ts', 'utf8');
  const hasRestrictedImageConfig = nextConfig.includes('remotePatterns') && !nextConfig.includes('images: { domains: ["*"]');
  if (hasRestrictedImageConfig) {
    console.log(`${GREEN}✓ Passed${RESET} (next/image remote hosts are explicitly allowlisted)`);
    results.push(new CheckResult('next image domains restricted', true));
  } else {
    console.error(`${RED}✗ FAILED${RESET} (next/image remote host restrictions missing)`);
    results.push(new CheckResult('next image domains restricted', false, 'next.config.ts is missing restricted remotePatterns'));
  }

  // Check DB RLS context wiring is active
  console.log(`\n${BLUE}Running:${RESET} DB session context / RLS check`);
  const dbSource = readFileSync('lib/db.ts', 'utf8');
  const hasRlsSessionContext = dbSource.includes("set_config('app.current_user_address'") && dbSource.includes('RESET app.current_user_address');
  if (hasRlsSessionContext) {
    console.log(`${GREEN}✓ Passed${RESET} (database session user context is wired for RLS)`);
    results.push(new CheckResult('db RLS session context wired', true));
  } else {
    console.error(`${RED}✗ FAILED${RESET} (database session user context wiring missing)`);
    results.push(new CheckResult('db RLS session context wired', false, 'lib/db.ts is missing session context setup/reset'));
  }

  // Check dead getAuthHeaders usage is gone
  console.log(`\n${BLUE}Running:${RESET} Dead getAuthHeaders usage check`);
  const authHeaderReferences = [
    'app',
    'components',
    'lib',
  ]
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => {
      try {
        const output = execSync(`grep -R \"getAuthHeaders\" ${dir} --include='*.ts' --include='*.tsx' || true`, { encoding: 'utf8' });
        return output.split('\n').filter(Boolean);
      } catch {
        return [];
      }
    });

  if (authHeaderReferences.length === 0) {
    console.log(`${GREEN}✓ Passed${RESET} (no dead getAuthHeaders references remain)`);
    results.push(new CheckResult('dead getAuthHeaders usage removed', true));
  } else {
    console.error(`${RED}✗ FAILED${RESET} (dead getAuthHeaders references found)`);
    results.push(new CheckResult('dead getAuthHeaders usage removed', false, authHeaderReferences.join('\n')));
  }

  // Check .dockerignore exists
  const dockerignoreExists = existsSync('.dockerignore');
  console.log(`\n${BLUE}Running:${RESET} Docker build context hardening`);
  if (dockerignoreExists) {
    console.log(`${GREEN}✓ Passed${RESET} (.dockerignore exists)`);
    results.push(new CheckResult('.dockerignore exists', true));
  } else {
    console.error(`${RED}✗ FAILED${RESET} (.dockerignore not found)`);
    results.push(new CheckResult('.dockerignore exists', false, '.dockerignore not found'));
  }

  // Check health endpoint is not leaking version
  console.log(`\n${BLUE}Running:${RESET} Health endpoint security check`);
  const healthRoute = readFileSync('app/api/health/route.ts', 'utf8');
  const productionBranchMatch = healthRoute.match(/if \(process\.env\.NODE_ENV === 'production'\) \{([\s\S]*?)\n  \}/);
  const productionBranch = productionBranchMatch?.[1] ?? '';
  const productionPayloadHidesVersion = productionBranch.includes('ok: envHealthy') &&
    productionBranch.includes('status') &&
    !productionBranch.includes('version');
  if (productionPayloadHidesVersion) {
    console.log(`${GREEN}✓ Passed${RESET} (version not leaked in production)`);
    results.push(new CheckResult('health endpoint secure', true));
  } else {
    console.warn(`${YELLOW}⚠ Warning${RESET} (health endpoint may leak version)`);
    hasWarnings = true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TIER 3: Test & Coverage (Recommended)
  // ──────────────────────────────────────────────────────────────────────────

  console.log(`\n${BOLD}${BLUE}TIER 3: Test & Coverage (Recommended)${RESET}`);
  console.log('─'.repeat(60));

  results.push(runCommand(
    'npm test -- --listTests 2>&1 | wc -l',
    'Test suite inventory',
    false // Non-critical
  ));

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────

  console.log(`\n${BOLD}${BLUE}╔════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${BLUE}║  Validation Summary                                    ║${RESET}`);
  console.log(`${BOLD}${BLUE}╚════════════════════════════════════════════════════════╝${RESET}\n`);

  const criticalFails = results.filter(r => r.isCritical());
  const passed = results.filter(r => r.passed);
  const withWarnings = results.filter(r => r.warnings.length > 0);

  console.log(`Total Checks:    ${results.length}`);
  console.log(`${GREEN}Passed:${RESET}          ${passed.length}`);
  if (criticalFails.length > 0) {
    console.log(`${RED}Failed:${RESET}          ${criticalFails.length}`);
  }
  if (withWarnings.length > 0) {
    console.log(`${YELLOW}Warnings:${RESET}        ${withWarnings.length}`);
  }

  if (criticalFails.length > 0) {
    console.log(`\n${RED}${BOLD}❌ DEPLOYMENT BLOCKED - Critical checks failed:${RESET}`);
    criticalFails.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name}`);
    });
    process.exit(1);
  }

  if (hasWarnings && !FORCE_CONTINUE) {
    console.log(`\n${YELLOW}${BOLD}⚠️  Deployment has warnings${RESET}`);
    console.log('Review the warnings above, or use --force-continue to override.');
    process.exit(2);
  }

  console.log(`\n${GREEN}${BOLD}✅ All critical checks passed. Deployment approved.${RESET}\n`);
  process.exit(0);
}

// Run validation
runValidationSuite().catch(err => {
  console.error(`${RED}Unexpected error:${RESET}`, err);
  process.exit(1);
});
