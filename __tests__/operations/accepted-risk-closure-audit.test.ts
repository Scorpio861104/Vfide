/**
 * Accepted-risk closure controls
 *
 * R-040: Backup restore readiness automation
 * R-076: Dual-approval policy automation
 *
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf-8');
}

describe('Accepted-risk closure controls', () => {
  const packageJson = JSON.parse(read('package.json')) as {
    scripts?: Record<string, string>;
  };

  const releaseGateWorkflow = read('.github/workflows/release-gate.yml');
  const backupScript = read('scripts/verify-backup-restore-readiness.ts');
  const dualApprovalScript = read('scripts/verify-dual-approval-policy.ts');

  const backupRunbook = read('docs/operations/BACKUP_RESTORE_DRILL_RUNBOOK.md');
  const dualApprovalPolicyDoc = read('docs/operations/CRITICAL_OPERATION_DUAL_APPROVAL_POLICY.md');

  const backupRecord = JSON.parse(read('audit/backup-restore.latest.json')) as {
    version: number;
    result: string;
    participants: string[];
  };

  const dualApprovalPolicy = JSON.parse(read('audit/critical-operation-policy.json')) as {
    version: number;
    minimumDistinctApprovers: number;
    requiredRoles: string[];
  };

  const dualApprovalSignoff = JSON.parse(read('audit/critical-operation-signoff.latest.json')) as {
    policyVersion: number;
    decision: string;
    approvals: Array<{ approver: string; role: string }>;
  };

  it('wires backup restore readiness checks into scripts and CI gate', () => {
    expect(packageJson.scripts?.['ops:backup:restore:readiness']).toBe('tsx scripts/verify-backup-restore-readiness.ts');
    expect(backupScript).toMatch(/Backup restore readiness check failed/);
    expect(releaseGateWorkflow).toMatch(/name: Backup restore readiness gate/);
    expect(releaseGateWorkflow).toMatch(/npm run -s ops:backup:restore:readiness/);
  });

  it('wires dual-approval checks into scripts and CI gate', () => {
    expect(packageJson.scripts?.['ops:dual-approval']).toBe('tsx scripts/verify-dual-approval-policy.ts');
    expect(dualApprovalScript).toMatch(/Dual-approval policy check failed/);
    expect(releaseGateWorkflow).toMatch(/name: Dual-approval policy gate/);
    expect(releaseGateWorkflow).toMatch(/npm run -s ops:dual-approval/);
  });

  it('stores structured backup restore drill evidence with pass result', () => {
    expect(backupRunbook).toContain('## Restore Drill Procedure');
    expect(backupRunbook).toContain('pg_restore');
    expect(backupRecord.version).toBe(1);
    expect(backupRecord.result).toBe('pass');
    expect(backupRecord.participants.length).toBeGreaterThanOrEqual(3);
  });

  it('stores structured dual-approval evidence with distinct approvers', () => {
    expect(dualApprovalPolicyDoc).toContain('## Required Approval Roles');
    expect(dualApprovalPolicy.version).toBe(1);
    expect(dualApprovalPolicy.minimumDistinctApprovers).toBeGreaterThanOrEqual(2);
    expect(dualApprovalPolicy.requiredRoles).toEqual(expect.arrayContaining(['operator', 'reviewer']));

    expect(dualApprovalSignoff.policyVersion).toBe(dualApprovalPolicy.version);
    expect(['proceed', 'abort']).toContain(dualApprovalSignoff.decision);
    expect(dualApprovalSignoff.approvals.length).toBeGreaterThanOrEqual(dualApprovalPolicy.minimumDistinctApprovers);

    const uniqueApprovers = new Set(dualApprovalSignoff.approvals.map((approval) => approval.approver.toLowerCase()));
    expect(uniqueApprovers.size).toBeGreaterThanOrEqual(dualApprovalPolicy.minimumDistinctApprovers);
  });
});
