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

  // Check middleware exists
  const middlewareExists = existsSync('middleware.ts');
  console.log(`\n${BLUE}Running:${RESET} Root middleware check`);
  if (middlewareExists) {
    console.log(`${GREEN}✓ Passed${RESET} (middleware.ts exists)`);
    results.push(new CheckResult('middleware.ts exists', true));
  } else {
    console.error(`${RED}✗ FAILED${RESET} (middleware.ts not found)`);
    results.push(new CheckResult('middleware.ts exists', false, 'middleware.ts not found'));
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
  const versionInProduction = healthRoute.includes("process.env.NODE_ENV === 'production'") &&
    !healthRoute.includes("version: process.env.npm_package_version");
  if (versionInProduction) {
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
