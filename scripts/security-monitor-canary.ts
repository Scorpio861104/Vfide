export {};

type CanaryProbe = {
  id: string;
  method: 'GET';
  path: string;
  requiresAuth: boolean;
  expectedStatus: number;
  description: string;
};

type ProbeResult = {
  id: string;
  path: string;
  ok: boolean;
  status: number | null;
  durationMs: number;
  error?: string;
};

type CoverageEntry = {
  service: string;
  risk: string;
  probeIds: string[];
};

type CanaryReport = {
  generatedAt: string;
  baseUrl: string;
  probes: ProbeResult[];
  coverage: {
    entries: CoverageEntry[];
    uncoveredServices: string[];
    coverageComplete: boolean;
  };
  summary: {
    totalProbes: number;
    passedProbes: number;
    failedProbes: number;
  };
};

const DEFAULT_TIMEOUT_MS = 10_000;
const BASE_URL_ENV = 'SECURITY_MONITOR_BASE_URL';
const API_TOKEN_ENV = 'SECURITY_MONITOR_API_TOKEN';
const FAIL_ON_CANARY_ENV = 'SECURITY_MONITOR_FAIL_ON_CANARY';

const PROBES: CanaryProbe[] = [
  {
    id: 'health-check',
    method: 'GET',
    path: '/api/health',
    requiresAuth: false,
    expectedStatus: 200,
    description: 'Core app health endpoint',
  },
  {
    id: 'security-csp-report-get',
    method: 'GET',
    path: '/api/security/csp-report',
    requiresAuth: false,
    expectedStatus: 200,
    description: 'Security reporting endpoint availability',
  },
  {
    id: 'security-replay-metrics',
    method: 'GET',
    path: '/api/security/webhook-replay-metrics',
    requiresAuth: true,
    expectedStatus: 200,
    description: 'Replay metrics monitor endpoint',
  },
  {
    id: 'security-violations-get',
    method: 'GET',
    path: '/api/security/violations',
    requiresAuth: false,
    expectedStatus: 200,
    description: 'Security violations endpoint availability',
  },
];

const COVERAGE_MAP: CoverageEntry[] = [
  {
    service: 'api-availability',
    risk: 'R-062',
    probeIds: ['health-check'],
  },
  {
    service: 'security-signal-ingestion',
    risk: 'R-062',
    probeIds: ['security-csp-report-get', 'security-violations-get'],
  },
  {
    service: 'security-replay-monitoring',
    risk: 'R-062',
    probeIds: ['security-replay-metrics'],
  },
  {
    service: 'incident-metrics-query-path',
    risk: 'R-062',
    probeIds: ['security-replay-metrics'],
  },
];

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toAbsoluteUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function shouldFailOnCanary(): boolean {
  const configured = getEnv(FAIL_ON_CANARY_ENV);
  if (configured === 'false') return false;
  return true;
}

async function runProbe(baseUrl: string, token: string | undefined, probe: CanaryProbe): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (probe.requiresAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(toAbsoluteUrl(baseUrl, probe.path), {
      method: probe.method,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const ok = response.status === probe.expectedStatus;
    return {
      id: probe.id,
      path: probe.path,
      ok,
      status: response.status,
      durationMs: Date.now() - started,
      error: ok ? undefined : `unexpected_status:${response.status}`,
    };
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: probe.id,
      path: probe.path,
      ok: false,
      status: null,
      durationMs: Date.now() - started,
      error: message,
    };
  }
}

function buildCoverageSummary(probeResults: ProbeResult[]) {
  const probeIdSet = new Set(probeResults.map((result) => result.id));
  const uncoveredServices = COVERAGE_MAP
    .filter((entry) => entry.probeIds.length === 0 || entry.probeIds.some((id) => !probeIdSet.has(id)))
    .map((entry) => entry.service);

  return {
    entries: COVERAGE_MAP,
    uncoveredServices,
    coverageComplete: uncoveredServices.length === 0,
  };
}

async function main(): Promise<void> {
  const baseUrl = getEnv(BASE_URL_ENV) || getEnv('NEXT_PUBLIC_APP_URL');
  if (!baseUrl) {
    throw new Error('SECURITY_MONITOR_BASE_URL (or NEXT_PUBLIC_APP_URL) is required');
  }

  const token = getEnv(API_TOKEN_ENV);
  const outputPath = process.argv[2] || 'security-monitor-canary-report.json';

  const probeResults = await Promise.all(PROBES.map((probe) => runProbe(baseUrl, token, probe)));
  const passedProbes = probeResults.filter((result) => result.ok).length;
  const failedProbes = probeResults.length - passedProbes;
  const coverage = buildCoverageSummary(probeResults);

  const report: CanaryReport = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    probes: probeResults,
    coverage,
    summary: {
      totalProbes: probeResults.length,
      passedProbes,
      failedProbes,
    },
  };

  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (!coverage.coverageComplete) {
    throw new Error(`Coverage map incomplete: ${coverage.uncoveredServices.join(', ')}`);
  }

  if (shouldFailOnCanary() && failedProbes > 0) {
    throw new Error(`Synthetic canary failed: ${failedProbes}/${probeResults.length} probes failed`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
