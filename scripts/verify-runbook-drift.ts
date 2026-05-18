import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type PackageJson = {
  scripts?: Record<string, string>;
};

type RunbookCheck = {
  path: string;
  requiredCommands: string[];
};

const root = process.cwd();

const RUNBOOK_CHECKS: RunbookCheck[] = [
  {
    path: 'LOCAL_VALIDATION_RUNBOOK.md',
    requiredCommands: [
      'npm run test:security:all',
      'npm run typecheck',
      'npm run lint',
      'npm run test:ci',
      'npm run test:stubs:generate',
      'npm run test:onchain:generated',
    ],
  },
  {
    path: 'docs/SEER_AUTONOMOUS_ACTIVATION_RUNBOOK.md',
    requiredCommands: [
      'npm run -s ops:seer:activation:plan',
      'npm run -s contract:verify:seer:watcher:local',
    ],
  },
];

function parsePackageJson(): PackageJson {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
}

function npmScriptFromCommand(command: string): string | null {
  const match = command.match(/npm\s+run(?:\s+-s)?\s+([A-Za-z0-9:_\-.]+)/);
  return match?.[1] ?? null;
}

function checkRunbookCommandPresence(findings: string[]): void {
  for (const runbook of RUNBOOK_CHECKS) {
    const fullPath = join(root, runbook.path);
    if (!existsSync(fullPath)) {
      findings.push(`Runbook file is missing: ${runbook.path}`);
      continue;
    }

    const source = readFileSync(fullPath, 'utf8');

    for (const command of runbook.requiredCommands) {
      if (!source.includes(command)) {
        findings.push(`Runbook ${runbook.path} is missing documented command: ${command}`);
      }
    }
  }
}

function checkNpmScriptsExist(pkg: PackageJson, findings: string[]): void {
  const scripts = pkg.scripts ?? {};

  for (const runbook of RUNBOOK_CHECKS) {
    for (const command of runbook.requiredCommands) {
      const scriptName = npmScriptFromCommand(command);
      if (!scriptName) continue;

      if (!scripts[scriptName]) {
        findings.push(`Runbook command references missing npm script '${scriptName}' from ${runbook.path}`);
      }
    }
  }
}

function main(): void {
  const findings: string[] = [];
  const pkg = parsePackageJson();

  checkRunbookCommandPresence(findings);
  checkNpmScriptsExist(pkg, findings);

  if (findings.length > 0) {
    process.stderr.write('Runbook drift check failed:\n');
    for (const finding of findings) {
      process.stderr.write(`- ${finding}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('Runbook drift checks passed.\n');
}

main();
