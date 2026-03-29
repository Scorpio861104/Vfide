/**
 * C16 – Governance Process and Human Operations
 *
 * R-077: Runbook drift from actual scripts
 * R-078: Incomplete rollback procedures
 * R-079: Unclear release stop/go criteria
 * R-080: Incident communication protocol gaps
 *
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf-8');
}

describe('C16 – Governance Process and Human Operations', () => {
  const packageJsonRaw = read('package.json');
  const packageJson = JSON.parse(packageJsonRaw) as {
    scripts?: Record<string, string>;
  };

  const releaseGateWorkflowSrc = read('.github/workflows/release-gate.yml');
  const runbookDriftScriptSrc = read('scripts/verify-runbook-drift.ts');
  const rollbackReadinessScriptSrc = read('scripts/verify-rollback-readiness.ts');
  const releaseStopGoScriptSrc = read('scripts/verify-release-stop-go.ts');

  const localValidationRunbookSrc = read('LOCAL_VALIDATION_RUNBOOK.md');
  const seerActivationRunbookSrc = read('docs/SEER_AUTONOMOUS_ACTIVATION_RUNBOOK.md');

  const rollbackRunbookSrc = read('docs/operations/ROLLBACK_DRILL_RUNBOOK.md');
  const rollbackDrillRecordRaw = read('audit/rollback-drill.latest.json');

  const releaseCriteriaRaw = read('audit/release-stop-go.criteria.json');
  const releaseSignoffRaw = read('audit/release-stop-go.signoff.json');

  const incidentProtocolSrc = read('docs/operations/INCIDENT_COMMUNICATION_PROTOCOL.md');
  const incidentTabletopRaw = read('audit/incident-communication-tabletop.latest.json');

  describe('R-077 – Runbook drift automation', () => {
    it('defines runbook drift verification script and npm lane', () => {
      expect(runbookDriftScriptSrc).toMatch(/RUNBOOK_CHECKS/);
      expect(runbookDriftScriptSrc).toMatch(/Runbook drift check failed/);
      expect(packageJson.scripts?.['ops:runbook:drift']).toBe('tsx scripts/verify-runbook-drift.ts');
    });

    it('pins required command snippets in operational runbooks', () => {
      expect(localValidationRunbookSrc).toContain('npm run test:security:all');
      expect(localValidationRunbookSrc).toContain('npm run test:ci');
      expect(seerActivationRunbookSrc).toContain('npm run -s ops:seer:activation:plan');
      expect(seerActivationRunbookSrc).toContain('npm run -s contract:verify:seer:watcher:local');
    });
  });

  describe('R-078 – Rollback procedure completeness', () => {
    it('provides rollback runbook and readiness verifier', () => {
      expect(rollbackRunbookSrc).toContain('## Rollback Command Matrix');
      expect(rollbackRunbookSrc).toContain('npm run -s contract:verify:governance-safety:local');
      expect(rollbackReadinessScriptSrc).toMatch(/rollback-drill\.latest\.json/);
      expect(packageJson.scripts?.['ops:rollback:readiness']).toBe('tsx scripts/verify-rollback-readiness.ts');
    });

    it('tracks a structured rollback drill artifact', () => {
      const record = JSON.parse(rollbackDrillRecordRaw) as {
        version: number;
        targetMaxRollbackMinutes: number;
        scenarios: Array<{ result: string }>;
      };

      expect(record.version).toBe(1);
      expect(record.targetMaxRollbackMinutes).toBeGreaterThan(0);
      expect(record.scenarios.length).toBeGreaterThanOrEqual(3);
      expect(record.scenarios.every((scenario) => scenario.result === 'pass')).toBe(true);
    });
  });

  describe('R-079 – Release stop/go criteria', () => {
    it('defines measurable criteria and signoff artifact checks', () => {
      const criteria = JSON.parse(releaseCriteriaRaw) as {
        version: number;
        minimumApprovers: number;
        requiredChecks: Array<{ id: string; required: boolean }>;
      };
      const signoff = JSON.parse(releaseSignoffRaw) as {
        criteriaVersion: number;
        decision: string;
        approvers: string[];
      };

      expect(criteria.version).toBe(1);
      expect(criteria.minimumApprovers).toBeGreaterThanOrEqual(2);
      expect(criteria.requiredChecks.length).toBeGreaterThanOrEqual(4);
      expect(criteria.requiredChecks.every((check) => check.required)).toBe(true);

      expect(signoff.criteriaVersion).toBe(criteria.version);
      expect(['go', 'stop']).toContain(signoff.decision);
      expect(signoff.approvers.length).toBeGreaterThanOrEqual(criteria.minimumApprovers);
    });

    it('enforces stop/go lane in scripts and release workflow', () => {
      expect(releaseStopGoScriptSrc).toMatch(/Release stop\/go check failed/);
      expect(packageJson.scripts?.['ops:release:stop-go']).toBe('tsx scripts/verify-release-stop-go.ts');
      expect(releaseGateWorkflowSrc).toMatch(/name: Release stop\/go criteria gate/);
      expect(releaseGateWorkflowSrc).toMatch(/npm run -s ops:release:stop-go/);
    });
  });

  describe('R-080 – Incident communication protocol', () => {
    it('defines severity matrix, escalation tree, and message templates', () => {
      expect(incidentProtocolSrc).toContain('## Severity Matrix');
      expect(incidentProtocolSrc).toContain('## Escalation Tree');
      expect(incidentProtocolSrc).toContain('## Required Message Templates');
      expect(incidentProtocolSrc).toContain('## Tabletop Exercise Cadence');
    });

    it('tracks tabletop communication exercise artifact', () => {
      const tabletop = JSON.parse(incidentTabletopRaw) as {
        version: number;
        participants: string[];
        actionItems: string[];
      };

      expect(tabletop.version).toBe(1);
      expect(tabletop.participants.length).toBeGreaterThanOrEqual(3);
      expect(tabletop.actionItems.length).toBeGreaterThan(0);
    });
  });
});
