import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type DualApprovalPolicy = {
  version: number;
  minimumDistinctApprovers: number;
  requiredRoles: string[];
  operationTypes: string[];
};

type OperationSignoff = {
  policyVersion: number;
  operationId: string;
  operationType: string;
  decision: 'proceed' | 'abort';
  approvals: Array<{
    approver: string;
    role: string;
    approvedAt: string;
    evidence: string;
  }>;
};

const root = process.cwd();
const policyDocPath = 'docs/operations/CRITICAL_OPERATION_DUAL_APPROVAL_POLICY.md';
const policyDataPath = 'audit/critical-operation-policy.json';
const signoffPath = 'audit/critical-operation-signoff.latest.json';

const REQUIRED_DOC_HEADINGS = [
  '## Operations Requiring Dual Approval',
  '## Required Approval Roles',
  '## Evidence Requirements',
  '## Execution Checklist',
] as const;

function parsePolicy(): DualApprovalPolicy {
  return JSON.parse(readFileSync(join(root, policyDataPath), 'utf8')) as DualApprovalPolicy;
}

function parseSignoff(): OperationSignoff {
  return JSON.parse(readFileSync(join(root, signoffPath), 'utf8')) as OperationSignoff;
}

function checkFiles(findings: string[]): void {
  for (const path of [policyDocPath, policyDataPath, signoffPath]) {
    if (!existsSync(join(root, path))) {
      findings.push(`Dual-approval control file missing: ${path}`);
    }
  }
}

function checkPolicyDoc(findings: string[]): void {
  const doc = readFileSync(join(root, policyDocPath), 'utf8');

  for (const heading of REQUIRED_DOC_HEADINGS) {
    if (!doc.includes(heading)) {
      findings.push(`Dual-approval policy doc missing heading: ${heading}`);
    }
  }
}

function checkPolicyData(policy: DualApprovalPolicy, findings: string[]): void {
  if (policy.version !== 1) {
    findings.push(`Dual-approval policy version must be 1; received ${policy.version}`);
  }

  if (!Number.isInteger(policy.minimumDistinctApprovers) || policy.minimumDistinctApprovers < 2) {
    findings.push('Dual-approval policy minimumDistinctApprovers must be an integer >= 2.');
  }

  if (!Array.isArray(policy.requiredRoles) || policy.requiredRoles.length < 2) {
    findings.push('Dual-approval policy requires at least 2 requiredRoles.');
  }

  if (!Array.isArray(policy.operationTypes) || policy.operationTypes.length === 0) {
    findings.push('Dual-approval policy operationTypes cannot be empty.');
  }
}

function checkSignoff(policy: DualApprovalPolicy, signoff: OperationSignoff, findings: string[]): void {
  if (signoff.policyVersion !== policy.version) {
    findings.push(
      `Dual-approval signoff policyVersion mismatch (expected ${policy.version}, received ${signoff.policyVersion})`
    );
  }

  if (!signoff.operationId.trim()) {
    findings.push('Dual-approval signoff operationId cannot be empty.');
  }

  if (!policy.operationTypes.includes(signoff.operationType)) {
    findings.push(`Dual-approval signoff operationType not covered by policy: ${signoff.operationType}`);
  }

  if (signoff.decision !== 'proceed' && signoff.decision !== 'abort') {
    findings.push(`Dual-approval signoff decision must be proceed|abort; received ${signoff.decision}`);
  }

  if (!Array.isArray(signoff.approvals) || signoff.approvals.length < policy.minimumDistinctApprovers) {
    findings.push(
      `Dual-approval signoff must include at least ${policy.minimumDistinctApprovers} approvals; received ${signoff.approvals.length}`
    );
    return;
  }

  const uniqueApprovers = new Set(signoff.approvals.map((approval) => approval.approver.toLowerCase()));
  if (uniqueApprovers.size < policy.minimumDistinctApprovers) {
    findings.push(
      `Dual-approval signoff must include ${policy.minimumDistinctApprovers} distinct approvers; received ${uniqueApprovers.size}`
    );
  }

  const rolesPresent = new Set<string>();
  for (const approval of signoff.approvals) {
    if (!approval.approver.trim()) {
      findings.push('Dual-approval signoff approver cannot be empty.');
    }

    if (!approval.role.trim()) {
      findings.push('Dual-approval signoff role cannot be empty.');
    } else {
      rolesPresent.add(approval.role);
    }

    if (!Number.isFinite(Date.parse(approval.approvedAt))) {
      findings.push(`Dual-approval signoff approvedAt must be valid ISO date: ${approval.approver}`);
    }

    if (!approval.evidence.trim()) {
      findings.push(`Dual-approval signoff evidence cannot be empty: ${approval.approver}`);
    }
  }

  for (const requiredRole of policy.requiredRoles) {
    if (!rolesPresent.has(requiredRole)) {
      findings.push(`Dual-approval signoff missing required role: ${requiredRole}`);
    }
  }
}

function main(): void {
  const findings: string[] = [];

  checkFiles(findings);
  if (findings.length > 0) {
    process.stderr.write('Dual-approval policy check failed:\n');
    for (const finding of findings) {
      process.stderr.write(`- ${finding}\n`);
    }
    process.exit(1);
  }

  checkPolicyDoc(findings);
  const policy = parsePolicy();
  const signoff = parseSignoff();

  checkPolicyData(policy, findings);
  checkSignoff(policy, signoff, findings);

  if (findings.length > 0) {
    process.stderr.write('Dual-approval policy check failed:\n');
    for (const finding of findings) {
      process.stderr.write(`- ${finding}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('Dual-approval policy checks passed.\n');
}

main();
