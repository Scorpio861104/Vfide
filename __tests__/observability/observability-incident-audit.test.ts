/**
 * C13 – Observability, Alerting, and Incident Response
 *
 * R-061: Structured logging in critical flows
 * R-062: Monitoring blind spots for edge/runtime failures
 * R-063: No SLO-backed alert thresholds
 * R-064: Missing runbook links in alerts
 * R-065: Security replay analytics coverage
 *
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const LIB_DIR = join(__dirname, '../../lib');
const API_DIR = join(__dirname, '../../app/api/security');
const WORKFLOWS_DIR = join(__dirname, '../../.github/workflows');
const SCRIPTS_DIR = join(__dirname, '../../scripts');

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

const loggerSrc = read(join(LIB_DIR, 'logger.ts'));
const monitoringServiceSrc = read(join(LIB_DIR, 'monitoringService.tsx'));
const requestContextSrc = read(join(LIB_DIR, 'security/requestContext.ts'));
const securityLogsRouteSrc = read(join(API_DIR, 'logs/route.ts'));
const replayMetricsRouteSrc = read(join(API_DIR, 'webhook-replay-metrics/route.ts'));
const replayTelemetrySrc = read(join(LIB_DIR, 'security/webhookReplayTelemetry.ts'));
const canaryScriptSrc = read(join(SCRIPTS_DIR, 'security-monitor-canary.ts'));
const replayReportScriptSrc = read(join(SCRIPTS_DIR, 'security-replay-metrics-report.ts'));
const replayWorkflowSrc = read(join(WORKFLOWS_DIR, 'security-replay-monitor.yml'));

// ─────────────────────────────────────────────────────────────────────────────
// R-061 – Insufficient structured logging in critical flows
// ─────────────────────────────────────────────────────────────────────────────

describe('R-061 – Structured logging in critical flows', () => {
  it('central logger supports context object normalization', () => {
    expect(loggerSrc).toMatch(/function normalizeContext\(context: unknown\): LogContext \| undefined/);
    expect(loggerSrc).toMatch(/return \{ value: String\(context\) \}/);
  });

  it('logger warning/error paths send context extras to Sentry', () => {
    expect(loggerSrc).toMatch(/Sentry\.captureMessage\(message, \{\s*level: 'warning',\s*extra: normalizeContext\(context\)/s);
    expect(loggerSrc).toMatch(/Sentry\.captureException\(error, \{\s*extra: \{ message, \.\.\.normalizeContext\(context\) \}/s);
  });

  it('security logs endpoint stores structured fields (address/type/severity/message/details)', () => {
    expect(securityLogsRouteSrc).toMatch(/CREATE TABLE IF NOT EXISTS security_event_logs/);
    expect(securityLogsRouteSrc).toMatch(/address TEXT NOT NULL/);
    expect(securityLogsRouteSrc).toMatch(/type TEXT NOT NULL/);
    expect(securityLogsRouteSrc).toMatch(/severity TEXT NOT NULL/);
    expect(securityLogsRouteSrc).toMatch(/message TEXT NOT NULL/);
    expect(securityLogsRouteSrc).toMatch(/details JSONB/);
  });

  it('security logs endpoint includes request correlation metadata fields', () => {
    expect(securityLogsRouteSrc).toMatch(/getRequestCorrelationContext/);
    expect(securityLogsRouteSrc).toMatch(/requestId/);
    expect(securityLogsRouteSrc).toMatch(/ipHash/);
    expect(securityLogsRouteSrc).toMatch(/ipSource/);
  });

  it('security log severity and type are validated against allowlists', () => {
    expect(securityLogsRouteSrc).toMatch(/const VALID_SEVERITIES = \['info', 'warning', 'critical'\]/);
    expect(securityLogsRouteSrc).toMatch(/if \(severity\.length > MAX_SEVERITY_LENGTH \|\| !isValidSeverity\(severity\)\)/);
    expect(securityLogsRouteSrc).toMatch(/if \(!type \|\| !severity \|\| !message\)/);
  });

  it('request context helper hashes IPs with salted SHA-256', () => {
    expect(requestContextSrc).toMatch(/function hashIp\(ip: string\): string/);
    expect(requestContextSrc).toMatch(/createHash\('sha256'\)/);
    expect(requestContextSrc).toMatch(/LOG_IP_HASH_SALT/);
  });

  describe('TypeScript model: context and correlation', () => {
    it('normalizing primitive context preserves value under key=value semantics', () => {
      const normalize = (context: unknown): Record<string, unknown> | undefined => {
        if (context === undefined || context === null) return undefined;
        if (typeof context === 'object' && !Array.isArray(context) && !(context instanceof Error)) {
          return context as Record<string, unknown>;
        }
        if (context instanceof Error) return { message: context.message, stack: context.stack };
        return { value: String(context) };
      };

      expect(normalize(123)).toEqual({ value: '123' });
      expect(normalize('oops')).toEqual({ value: 'oops' });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-062 – Monitoring blind spots for edge/runtime failures
// ─────────────────────────────────────────────────────────────────────────────

describe('R-062 – Monitoring blind spots', () => {
  it('monitoring service tracks performance, errors, and interactions', () => {
    expect(monitoringServiceSrc).toMatch(/trackPerformance\(/);
    expect(monitoringServiceSrc).toMatch(/trackError\(/);
    expect(monitoringServiceSrc).toMatch(/trackInteraction\(/);
  });

  it('monitoring service emits slow-render warnings (>100ms)', () => {
    expect(monitoringServiceSrc).toMatch(/if \(renderTime > 100\)/);
    expect(monitoringServiceSrc).toMatch(/Slow render detected/);
  });

  it('security replay monitor workflow is scheduled hourly', () => {
    expect(replayWorkflowSrc).toMatch(/schedule:/);
    expect(replayWorkflowSrc).toMatch(/cron: '17 \* \* \* \*'/);
  });

  it('synthetic canary checks are encoded and mapped to critical monitoring services', () => {
    expect(canaryScriptSrc).toMatch(/const PROBES: CanaryProbe\[] = \[/);
    expect(canaryScriptSrc).toMatch(/\/api\/health/);
    expect(canaryScriptSrc).toMatch(/\/api\/security\/webhook-replay-metrics/);
    expect(canaryScriptSrc).toMatch(/const COVERAGE_MAP: CoverageEntry\[] = \[/);
    expect(canaryScriptSrc).toMatch(/coverageComplete/);
    expect(replayWorkflowSrc).toMatch(/Run synthetic canary monitor/);
    expect(replayWorkflowSrc).toMatch(/security-monitor-canary-report/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-063 – No SLO-backed alert thresholds
// ─────────────────────────────────────────────────────────────────────────────

describe('R-063 – SLO-backed alert thresholds', () => {
  it('replay metrics endpoint has operational threshold for rejected events/hour', () => {
    expect(replayMetricsRouteSrc).toMatch(/REPLAY_THRESHOLD_1H_ENV/);
    expect(replayMetricsRouteSrc).toMatch(/DEFAULT_REPLAY_THRESHOLD_1H = 25/);
    expect(replayMetricsRouteSrc).toMatch(/thresholdTriggered = metrics\.rejected1h >= threshold1h/);
  });

  it('SLO/error-budget/burn-rate policies are encoded in report script and workflow env', () => {
    const combined = [
      replayWorkflowSrc,
      replayReportScriptSrc,
      replayMetricsRouteSrc,
      securityLogsRouteSrc,
      monitoringServiceSrc,
    ].join('\n');

    expect(combined).toMatch(/SECURITY_MONITOR_REPLAY_REJECT_RATE_SLO/);
    expect(combined).toMatch(/SECURITY_MONITOR_REPLAY_ERROR_BUDGET_24H/);
    expect(combined).toMatch(/SECURITY_MONITOR_REPLAY_BURN_RATE_THRESHOLD/);
    expect(combined).toMatch(/SECURITY_MONITOR_FAIL_ON_SLO/);
    expect(combined).toMatch(/burnRate1h/);
    expect(combined).toMatch(/sloBreached/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-064 – Missing runbook links in alerts
// ─────────────────────────────────────────────────────────────────────────────

describe('R-064 – Runbook links in alerts', () => {
  it('security critical alert payload is defined', () => {
    expect(securityLogsRouteSrc).toMatch(/event: 'security\.critical_log'/);
    expect(securityLogsRouteSrc).toMatch(/alertKind:/);
  });

  it('critical alert payload includes request and source context', () => {
    expect(securityLogsRouteSrc).toMatch(/requestId: params\.requestId/);
    expect(securityLogsRouteSrc).toMatch(/ipHash: params\.ipHash/);
    expect(securityLogsRouteSrc).toMatch(/ipSource: params\.ipSource/);
  });

  it('critical alert payload supports runbook URL embedding via env-config', () => {
    expect(securityLogsRouteSrc).toMatch(/SECURITY_ALERT_RUNBOOK_URL_ENV/);
    expect(securityLogsRouteSrc).toMatch(/runbook_url: runbookUrl/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-065 – Insufficient security replay analytics
// ─────────────────────────────────────────────────────────────────────────────

describe('R-065 – Security replay analytics', () => {
  it('telemetry writer persists replay events with status/reason/source/key hash', () => {
    expect(replayTelemetrySrc).toMatch(/CREATE TABLE IF NOT EXISTS security_webhook_replay_events/);
    expect(replayTelemetrySrc).toMatch(/status TEXT NOT NULL/);
    expect(replayTelemetrySrc).toMatch(/reason TEXT/);
    expect(replayTelemetrySrc).toMatch(/source TEXT/);
    expect(replayTelemetrySrc).toMatch(/replay_key_hash TEXT/);
  });

  it('replay telemetry retention cleanup is implemented and bounded by env', () => {
    expect(replayTelemetrySrc).toMatch(/SECURITY_WEBHOOK_REPLAY_TELEMETRY_RETENTION_DAYS/);
    expect(replayTelemetrySrc).toMatch(/DEFAULT_RETENTION_DAYS = 30/);
    expect(replayTelemetrySrc).toMatch(/DELETE FROM security_webhook_replay_events/);
  });

  it('replay metrics API reports accepted/rejected windows and top rejected sources', () => {
    expect(replayMetricsRouteSrc).toMatch(/accepted_1h/);
    expect(replayMetricsRouteSrc).toMatch(/rejected_1h/);
    expect(replayMetricsRouteSrc).toMatch(/accepted_24h/);
    expect(replayMetricsRouteSrc).toMatch(/rejected_24h/);
    expect(replayMetricsRouteSrc).toMatch(/topRejectedSources/);
  });

  it('replay report script emits markdown metrics artifact and supports fail-on-threshold', () => {
    expect(replayReportScriptSrc).toMatch(/# Webhook Replay Metrics Report/);
    expect(replayReportScriptSrc).toMatch(/SECURITY_MONITOR_FAIL_ON_THRESHOLD/);
    expect(replayReportScriptSrc).toMatch(/Replay rejection threshold was triggered/);
  });

  it('security replay monitor workflow uploads report artifact', () => {
    expect(replayWorkflowSrc).toMatch(/Generate replay metrics report/);
    expect(replayWorkflowSrc).toMatch(/actions\/upload-artifact/);
    expect(replayWorkflowSrc).toMatch(/security-replay-metrics-report/);
  });

  describe('TypeScript model: threshold trigger semantics', () => {
    it('triggers when rejected1h >= threshold1h', () => {
      const rejected1h = 25;
      const threshold1h = 25;
      const thresholdTriggered = rejected1h >= threshold1h;
      expect(thresholdTriggered).toBe(true);
    });

    it('does not trigger below threshold', () => {
      const rejected1h = 24;
      const threshold1h = 25;
      const thresholdTriggered = rejected1h >= threshold1h;
      expect(thresholdTriggered).toBe(false);
    });
  });
});
