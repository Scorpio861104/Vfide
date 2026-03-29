import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type PackageJson = {
  scripts?: Record<string, string>;
};

type BackupRestoreDrillRecord = {
  version: number;
  executedAt: string;
  targetRpoMinutes: number;
  targetRtoMinutes: number;
  measuredRpoMinutes: number;
  measuredRtoMinutes: number;
  result: 'pass' | 'fail';
  participants: string[];
  evidence: string[];
};

const root = process.cwd();
const runbookPath = 'docs/operations/BACKUP_RESTORE_DRILL_RUNBOOK.md';
const drillRecordPath = 'audit/backup-restore.latest.json';

const REQUIRED_RUNBOOK_HEADINGS = [
  '## Backup Scope and Frequency',
  '## Restore Drill Procedure',
  '## RPO and RTO Targets',
  '## Evidence Capture Checklist',
] as const;

const REQUIRED_COMMANDS = [
  'pg_dump',
  'pg_restore',
  'npm run -s db:init',
  'npm run -s migrate:status',
] as const;

function parsePackageJson(): PackageJson {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
}

function parseDrillRecord(): BackupRestoreDrillRecord {
  return JSON.parse(readFileSync(join(root, drillRecordPath), 'utf8')) as BackupRestoreDrillRecord;
}

function checkRunbook(findings: string[]): void {
  const fullPath = join(root, runbookPath);

  if (!existsSync(fullPath)) {
    findings.push(`Backup restore runbook is missing: ${runbookPath}`);
    return;
  }

  const source = readFileSync(fullPath, 'utf8');

  for (const heading of REQUIRED_RUNBOOK_HEADINGS) {
    if (!source.includes(heading)) {
      findings.push(`Backup restore runbook missing heading: ${heading}`);
    }
  }

  for (const command of REQUIRED_COMMANDS) {
    if (!source.includes(command)) {
      findings.push(`Backup restore runbook missing command snippet: ${command}`);
    }
  }
}

function checkScriptReferences(pkg: PackageJson, findings: string[]): void {
  const scripts = pkg.scripts ?? {};

  if (!scripts['db:init']) {
    findings.push('Backup restore runbook references missing npm script: db:init');
  }

  if (!scripts['migrate:status']) {
    findings.push('Backup restore runbook references missing npm script: migrate:status');
  }
}

function checkDrillRecord(findings: string[]): void {
  const fullPath = join(root, drillRecordPath);

  if (!existsSync(fullPath)) {
    findings.push(`Backup restore drill record is missing: ${drillRecordPath}`);
    return;
  }

  const record = parseDrillRecord();

  if (record.version !== 1) {
    findings.push(`Backup restore drill record version must be 1; received ${record.version}`);
  }

  if (!Number.isFinite(Date.parse(record.executedAt))) {
    findings.push('Backup restore drill record executedAt must be a valid ISO date string.');
  }

  if (!Number.isFinite(record.targetRpoMinutes) || record.targetRpoMinutes <= 0) {
    findings.push('Backup restore drill targetRpoMinutes must be > 0.');
  }

  if (!Number.isFinite(record.targetRtoMinutes) || record.targetRtoMinutes <= 0) {
    findings.push('Backup restore drill targetRtoMinutes must be > 0.');
  }

  if (!Number.isFinite(record.measuredRpoMinutes) || record.measuredRpoMinutes < 0) {
    findings.push('Backup restore drill measuredRpoMinutes must be >= 0.');
  }

  if (!Number.isFinite(record.measuredRtoMinutes) || record.measuredRtoMinutes < 0) {
    findings.push('Backup restore drill measuredRtoMinutes must be >= 0.');
  }

  if (record.measuredRpoMinutes > record.targetRpoMinutes) {
    findings.push(
      `Backup restore drill measuredRpoMinutes exceeds target (${record.targetRpoMinutes}m): ${record.measuredRpoMinutes}m`
    );
  }

  if (record.measuredRtoMinutes > record.targetRtoMinutes) {
    findings.push(
      `Backup restore drill measuredRtoMinutes exceeds target (${record.targetRtoMinutes}m): ${record.measuredRtoMinutes}m`
    );
  }

  if (record.result !== 'pass') {
    findings.push(`Backup restore drill result must be pass; received ${record.result}`);
  }

  if (!Array.isArray(record.participants) || record.participants.length < 3) {
    findings.push('Backup restore drill requires at least 3 participants.');
  }

  if (!Array.isArray(record.evidence) || record.evidence.length < 2) {
    findings.push('Backup restore drill requires at least 2 evidence references.');
  }
}

function main(): void {
  const findings: string[] = [];
  const pkg = parsePackageJson();

  checkRunbook(findings);
  checkScriptReferences(pkg, findings);
  checkDrillRecord(findings);

  if (findings.length > 0) {
    process.stderr.write('Backup restore readiness check failed:\n');
    for (const finding of findings) {
      process.stderr.write(`- ${finding}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('Backup restore readiness checks passed.\n');
}

main();
