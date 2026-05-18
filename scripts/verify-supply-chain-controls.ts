import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const root = process.cwd();
const pkgPath = join(root, 'package.json');
const patchesDir = join(root, 'patches');
const patchPolicyPath = join(patchesDir, 'patch-policy.json');

type PatchMode = 'active' | 'archived';

type PatchPolicyManifest = {
  version: number;
  patches: Record<string, { mode: PatchMode; reason?: string }>;
};

const CRITICAL_RUNTIME_PACKAGES = [
  'next',
  'react',
  'react-dom',
  'wagmi',
  'viem',
  '@tanstack/react-query',
  '@rainbow-me/rainbowkit',
  '@sentry/nextjs',
  'web-vitals',
  'pg',
  'jsonwebtoken',
] as const;

const LIFECYCLE_SCRIPT_KEYS = [
  'preinstall',
  'install',
  'postinstall',
  'prepare',
  'prepublish',
  'prepublishOnly',
  'prepack',
  'postpack',
  'prebuild',
  'postbuild',
] as const;

const DANGEROUS_LIFECYCLE_PATTERNS: RegExp[] = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bnc\b/i,
  /\bnetcat\b/i,
  /\bpython\s+-c\b/i,
  /\bnode\s+-e\b/i,
  /\bbash\s+-c\b/i,
  /\bpowershell\b/i,
  /\bnpm\s+install\b/i,
  /\bpnpm\s+add\b/i,
  /\byarn\s+add\b/i,
];

function parsePackageJson(): PackageJson {
  return JSON.parse(readFileSync(pkgPath, 'utf8')) as PackageJson;
}

function parsePatchPolicy(): PatchPolicyManifest {
  return JSON.parse(readFileSync(patchPolicyPath, 'utf8')) as PatchPolicyManifest;
}

function isExactVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version);
}

function checkPinnedCriticalRuntimePackages(pkg: PackageJson): string[] {
  const deps = pkg.dependencies ?? {};
  const findings: string[] = [];

  for (const packageName of CRITICAL_RUNTIME_PACKAGES) {
    const version = deps[packageName];
    if (!version) {
      findings.push(`Missing critical runtime package in dependencies: ${packageName}`);
      continue;
    }

    if (!isExactVersion(version)) {
      findings.push(`Critical runtime package is not pinned exactly: ${packageName}@${version}`);
    }
  }

  return findings;
}

function checkLifecycleScripts(pkg: PackageJson): string[] {
  const scripts = pkg.scripts ?? {};
  const findings: string[] = [];

  for (const key of LIFECYCLE_SCRIPT_KEYS) {
    const command = scripts[key];
    if (!command) continue;

    for (const pattern of DANGEROUS_LIFECYCLE_PATTERNS) {
      if (pattern.test(command)) {
        findings.push(`Lifecycle script ${key} contains restricted pattern ${pattern}: ${command}`);
      }
    }
  }

  return findings;
}

function checkPatchFreshness(): string[] {
  const findings: string[] = [];
  const policy = parsePatchPolicy();
  const patchFiles = readdirSync(patchesDir)
    .filter((name) => name.endsWith('.diff') || name.endsWith('.patch'))
    .sort();

  for (const patchFile of patchFiles) {
    const policyEntry = policy.patches[patchFile];
    if (!policyEntry) {
      findings.push(`Patch policy missing entry for ${patchFile}`);
      continue;
    }

    if (policyEntry.mode === 'archived') {
      continue;
    }

    const fullPath = join(patchesDir, patchFile);

    const result = spawnSync('git', ['apply', '--check', fullPath], {
      cwd: root,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      const stderr = result.stderr?.trim();
      const stdout = result.stdout?.trim();
      findings.push(
        `Patch apply check failed for ${patchFile}${stderr ? `: ${stderr}` : stdout ? `: ${stdout}` : ''}`
      );
    }
  }

  return findings;
}

function main(): void {
  const pkg = parsePackageJson();

  const findings = [
    ...checkPinnedCriticalRuntimePackages(pkg),
    ...checkLifecycleScripts(pkg),
    ...checkPatchFreshness(),
  ];

  if (findings.length > 0) {
    process.stderr.write('Supply-chain control check failed:\n');
    for (const finding of findings) {
      process.stderr.write(`- ${finding}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('Supply-chain control checks passed.\n');
}

main();
