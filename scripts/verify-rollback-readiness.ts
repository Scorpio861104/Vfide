import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type PackageJson = {
  scripts?: Record<string, string>;
};

type RollbackDrillRecord = {
  version: number;
  executedAt: string;
  targetMaxRollbackMinutes: number;
  scenarios: Array<{
    name: string;
    rollbackCommand: string;
    result: 'pass' | 'fail';
    durationMinutes: number;
    evidence: string;
  }>;
};

const root = process.cwd();
const rollbackRunbookPath = 'docs/operations/ROLLBACK_DRILL_RUNBOOK.md';
const rollbackDrillRecordPath = 'audit/rollback-drill.latest.json';

const REQUIRED_RUNBOOK_HEADINGS = [
  '## Rollback Triggers',
  '## Rollback Command Matrix',
  '## Drill Execution',
  '## Post-Rollback Validation',
] as const;

const REQUIRED_COMMANDS = [
  'npm run -s contract:verify:governance-safety:local',
  'npm run -s contract:verify:merchant-payment-escrow:local',
  'npm run -s contract:verify:seer:watcher:local',
  'npm run -s test:security:all',
] as const;

function parsePackageJson(): PackageJson {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
}

function parseDrillRecord(): RollbackDrillRecord {
  return JSON.parse(readFileSync(join(root, rollbackDrillRecordPath), 'utf8')) as RollbackDrillRecord;
}

function npmScriptFromCommand(command: string): string | null {
  const match = command.match(/npm\s+run(?:\s+-s)?\s+([A-Za-z0-9:_\-.]+)/);
  return match?.[1] ?? null;
}

function checkRunbook(findings: string[]): void {
  const fullPath = join(root, rollbackRunbookPath);

  if (!existsSync(fullPath)) {
    findings.push(`Rollback runbook is missing: ${rollbackRunbookPath}`);
    return;
  }

  const source = readFileSync(fullPath, 'utf8');

  for (const heading of REQUIRED_RUNBOOK_HEADINGS) {
    if (!source.includes(heading)) {
      findings.push(`Rollback runbook missing heading: ${heading}`);
    }
  }

  for (const command of REQUIRED_COMMANDS) {
    if (!source.includes(command)) {
      findings.push(`Rollback runbook missing command: ${command}`);
    }
  }
}

function checkScriptReferences(pkg: PackageJson, findings: string[]): void {
  const scripts = pkg.scripts ?? {};

  for (const command of REQUIRED_COMMANDS) {
    const scriptName = npmScriptFromCommand(command);
    if (!scriptName) continue;

    if (!scripts[scriptName]) {
      findings.push(`Rollback command references missing npm script: ${scriptName}`);
    }
  }
}

function checkDrillRecord(findings: string[]): void {
  const fullPath = join(root, rollbackDrillRecordPath);

  if (!existsSync(fullPath)) {
    findings.push(`Rollback drill record is missing: ${rollbackDrillRecordPath}`);
    return;
  }

  const record = parseDrillRecord();

  if (record.version !== 1) {
    findings.push(`Rollback drill record version must be 1; received ${record.version}`);
  }

  if (!Number.isFinite(Date.parse(record.executedAt))) {
    findings.push('Rollback drill record executedAt must be a valid ISO date string.');
  }

  if (!Number.isFinite(record.targetMaxRollbackMinutes) || record.targetMaxRollbackMinutes <= 0) {
    findings.push('Rollback drill record targetMaxRollbackMinutes must be > 0.');
  }

  if (!Array.isArray(record.scenarios) || record.scenarios.length < 3) {
    findings.push('Rollback drill record requires at least 3 scenarios.');
    return;
  }

  for (const scenario of record.scenarios) {
    if (!scenario.name.trim()) {
      findings.push('Rollback drill scenario name cannot be empty.');
    }

    if (scenario.result !== 'pass') {
      findings.push(`Rollback drill scenario did not pass: ${scenario.name}`);
    }

    if (scenario.durationMinutes > record.targetMaxRollbackMinutes) {
      findings.push(
        `Rollback drill scenario exceeded target (${record.targetMaxRollbackMinutes}m): ${scenario.name}=${scenario.durationMinutes}m`
      );
    }

    if (!scenario.evidence.trim()) {
      findings.push(`Rollback drill scenario missing evidence path: ${scenario.name}`);
    }
  }
}

function main(): void {
  const findings: string[] = [];
  const pkg = parsePackageJson();

  checkRunbook(findings);
  checkScriptReferences(pkg, findings);
  checkDrillRecord(findings);

  if (findings.length > 0) {
    process.stderr.write('Rollback readiness check failed:\n');
    for (const finding of findings) {
      process.stderr.write(`- ${finding}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('Rollback readiness checks passed.\n');
}

main();
