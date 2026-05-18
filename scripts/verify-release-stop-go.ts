import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type ReleaseCriteria = {
  version: number;
  minimumApprovers: number;
  requiredChecks: Array<{
    id: string;
    name: string;
    command: string;
    required: boolean;
    maxDurationMinutes: number;
  }>;
  requiredEvidenceFiles: string[];
};

type ReleaseSignoff = {
  criteriaVersion: number;
  evaluatedAt: string;
  decision: 'go' | 'stop';
  approvers: string[];
  checks: Array<{
    id: string;
    status: 'pass' | 'fail';
    evidence: string;
  }>;
};

const root = process.cwd();
const criteriaPath = 'audit/release-stop-go.criteria.json';
const signoffPath = 'audit/release-stop-go.signoff.json';

function parseCriteria(): ReleaseCriteria {
  return JSON.parse(readFileSync(join(root, criteriaPath), 'utf8')) as ReleaseCriteria;
}

function parseSignoff(): ReleaseSignoff {
  return JSON.parse(readFileSync(join(root, signoffPath), 'utf8')) as ReleaseSignoff;
}

function checkCriteria(criteria: ReleaseCriteria, findings: string[]): void {
  if (criteria.version !== 1) {
    findings.push(`Release criteria version must be 1; received ${criteria.version}`);
  }

  if (!Number.isInteger(criteria.minimumApprovers) || criteria.minimumApprovers < 1) {
    findings.push('Release criteria minimumApprovers must be an integer >= 1.');
  }

  if (!Array.isArray(criteria.requiredChecks) || criteria.requiredChecks.length < 4) {
    findings.push('Release criteria requires at least 4 measurable checks.');
    return;
  }

  const seen = new Set<string>();
  for (const check of criteria.requiredChecks) {
    if (!check.id || !check.name || !check.command) {
      findings.push('Release criteria checks must include id, name, and command.');
    }

    if (seen.has(check.id)) {
      findings.push(`Duplicate release criteria check id: ${check.id}`);
    }
    seen.add(check.id);

    if (check.required !== true) {
      findings.push(`Release criteria check must be required=true: ${check.id}`);
    }

    if (!Number.isFinite(check.maxDurationMinutes) || check.maxDurationMinutes <= 0) {
      findings.push(`Release criteria check maxDurationMinutes must be > 0: ${check.id}`);
    }
  }

  if (!Array.isArray(criteria.requiredEvidenceFiles) || criteria.requiredEvidenceFiles.length === 0) {
    findings.push('Release criteria requiredEvidenceFiles must contain at least one file path.');
  }
}

function checkSignoff(criteria: ReleaseCriteria, signoff: ReleaseSignoff, findings: string[]): void {
  if (signoff.criteriaVersion !== criteria.version) {
    findings.push(
      `Release signoff criteriaVersion mismatch (expected ${criteria.version}, received ${signoff.criteriaVersion})`
    );
  }

  if (!Number.isFinite(Date.parse(signoff.evaluatedAt))) {
    findings.push('Release signoff evaluatedAt must be a valid ISO date string.');
  }

  if (signoff.decision !== 'go' && signoff.decision !== 'stop') {
    findings.push(`Release signoff decision must be 'go' or 'stop'; received ${signoff.decision}`);
  }

  if (!Array.isArray(signoff.approvers) || signoff.approvers.length < criteria.minimumApprovers) {
    findings.push(
      `Release signoff must include at least ${criteria.minimumApprovers} approvers; received ${signoff.approvers.length}`
    );
  }

  const checkMap = new Map(signoff.checks.map((check) => [check.id, check]));
  for (const requiredCheck of criteria.requiredChecks) {
    const actual = checkMap.get(requiredCheck.id);
    if (!actual) {
      findings.push(`Release signoff missing required check result: ${requiredCheck.id}`);
      continue;
    }

    if (signoff.decision === 'go' && actual.status !== 'pass') {
      findings.push(`Release GO decision requires passing check ${requiredCheck.id}; found ${actual.status}`);
    }

    if (!actual.evidence.trim()) {
      findings.push(`Release signoff check missing evidence path: ${requiredCheck.id}`);
    }
  }
}

function checkEvidenceFiles(criteria: ReleaseCriteria, findings: string[]): void {
  for (const relativePath of criteria.requiredEvidenceFiles) {
    if (!existsSync(join(root, relativePath))) {
      findings.push(`Required release evidence file is missing: ${relativePath}`);
    }
  }
}

function main(): void {
  const findings: string[] = [];

  if (!existsSync(join(root, criteriaPath))) {
    findings.push(`Release criteria file is missing: ${criteriaPath}`);
  }

  if (!existsSync(join(root, signoffPath))) {
    findings.push(`Release signoff file is missing: ${signoffPath}`);
  }

  if (findings.length > 0) {
    process.stderr.write('Release stop/go check failed:\n');
    for (const finding of findings) {
      process.stderr.write(`- ${finding}\n`);
    }
    process.exit(1);
  }

  const criteria = parseCriteria();
  const signoff = parseSignoff();

  checkCriteria(criteria, findings);
  checkSignoff(criteria, signoff, findings);
  checkEvidenceFiles(criteria, findings);

  if (findings.length > 0) {
    process.stderr.write('Release stop/go check failed:\n');
    for (const finding of findings) {
      process.stderr.write(`- ${finding}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('Release stop/go checks passed.\n');
}

main();
