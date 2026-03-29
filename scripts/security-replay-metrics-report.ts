type ReplayMetricsPayload = {
  success: boolean;
  accessMode?: 'machine-token' | 'user-auth';
  threshold1h: number;
  thresholdTriggered: boolean;
  metrics: {
    accepted1h: number;
    rejected1h: number;
    accepted24h: number;
    rejected24h: number;
  };
  topRejectedSources: Array<{ source: string; rejectedCount: number }>;
  error?: string;
};

type SloEvaluation = {
  rejectRate1h: number;
  rejectRate24h: number;
  rejectRateTarget: number;
  errorBudget24h: number;
  consumedBudget24h: number;
  budgetConsumptionRatio24h: number;
  burnRate1h: number;
  burnRateThreshold: number;
  sloBreached: boolean;
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toAbsoluteUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function parseNumber(name: string, fallback: number): number {
  const value = getEnv(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${name}: ${value}`);
  }
  return parsed;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function evaluateSlo(payload: ReplayMetricsPayload): SloEvaluation {
  const rejectRateTarget = parseNumber('SECURITY_MONITOR_REPLAY_REJECT_RATE_SLO', 0.05);
  const errorBudget24h = parseNumber('SECURITY_MONITOR_REPLAY_ERROR_BUDGET_24H', 500);
  const burnRateThreshold = parseNumber('SECURITY_MONITOR_REPLAY_BURN_RATE_THRESHOLD', 2);

  const total1h = payload.metrics.accepted1h + payload.metrics.rejected1h;
  const total24h = payload.metrics.accepted24h + payload.metrics.rejected24h;

  const rejectRate1h = ratio(payload.metrics.rejected1h, total1h);
  const rejectRate24h = ratio(payload.metrics.rejected24h, total24h);
  const consumedBudget24h = payload.metrics.rejected24h;
  const budgetConsumptionRatio24h = ratio(consumedBudget24h, errorBudget24h);

  const hourlyBudget = errorBudget24h / 24;
  const burnRate1h = ratio(payload.metrics.rejected1h, hourlyBudget);

  const sloBreached =
    rejectRate1h > rejectRateTarget ||
    consumedBudget24h > errorBudget24h ||
    burnRate1h > burnRateThreshold;

  return {
    rejectRate1h,
    rejectRate24h,
    rejectRateTarget,
    errorBudget24h,
    consumedBudget24h,
    budgetConsumptionRatio24h,
    burnRate1h,
    burnRateThreshold,
    sloBreached,
  };
}

function asMarkdownReport(url: string, payload: ReplayMetricsPayload, slo: SloEvaluation): string {
  const generatedAt = new Date().toISOString();
  const topSources = payload.topRejectedSources.length > 0
    ? payload.topRejectedSources
      .map((entry, index) => `${index + 1}. ${entry.source} -> ${entry.rejectedCount}`)
      .join('\n')
    : 'None';

  return [
    '# Webhook Replay Metrics Report',
    '',
    `- generatedAt: ${generatedAt}`,
    `- endpoint: ${url}`,
    `- accessMode: ${payload.accessMode || 'unknown'}`,
    `- threshold1h: ${payload.threshold1h}`,
    `- thresholdTriggered: ${payload.thresholdTriggered}`,
    `- rejectRateTarget: ${slo.rejectRateTarget}`,
    `- errorBudget24h: ${slo.errorBudget24h}`,
    `- burnRateThreshold: ${slo.burnRateThreshold}`,
    `- sloBreached: ${slo.sloBreached}`,
    '',
    '## Metrics',
    '',
    `- accepted1h: ${payload.metrics.accepted1h}`,
    `- rejected1h: ${payload.metrics.rejected1h}`,
    `- accepted24h: ${payload.metrics.accepted24h}`,
    `- rejected24h: ${payload.metrics.rejected24h}`,
    '',
    '## SLO Evaluation',
    '',
    `- rejectRate1h: ${slo.rejectRate1h.toFixed(6)}`,
    `- rejectRate24h: ${slo.rejectRate24h.toFixed(6)}`,
    `- consumedBudget24h: ${slo.consumedBudget24h}`,
    `- budgetConsumptionRatio24h: ${slo.budgetConsumptionRatio24h.toFixed(6)}`,
    `- burnRate1h: ${slo.burnRate1h.toFixed(6)}`,
    '',
    '## Top Rejected Sources (24h)',
    '',
    topSources,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const baseUrl = getEnv('SECURITY_MONITOR_BASE_URL') || getEnv('NEXT_PUBLIC_APP_URL');
  if (!baseUrl) {
    throw new Error('SECURITY_MONITOR_BASE_URL (or NEXT_PUBLIC_APP_URL) is required');
  }

  const token = getEnv('SECURITY_MONITOR_API_TOKEN');
  const url = toAbsoluteUrl(baseUrl, '/api/security/webhook-replay-metrics');

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  const payload = await response.json() as ReplayMetricsPayload;

  if (!response.ok || !payload.success) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    throw new Error(`Failed to fetch replay metrics: ${message}`);
  }

  const reportPath = process.argv[2] || 'security-replay-metrics-report.md';
  const slo = evaluateSlo(payload);
  const report = asMarkdownReport(url, payload, slo);

  const { writeFile } = await import('node:fs/promises');
  await writeFile(reportPath, report, 'utf8');

  process.stdout.write(`${report}\n`);

  const failOnThreshold = getEnv('SECURITY_MONITOR_FAIL_ON_THRESHOLD') === 'true';
  if (failOnThreshold && payload.thresholdTriggered) {
    throw new Error('Replay rejection threshold was triggered');
  }

  const failOnSlo = getEnv('SECURITY_MONITOR_FAIL_ON_SLO') !== 'false';
  if (failOnSlo && slo.sloBreached) {
    throw new Error('Replay SLO or burn-rate policy breached');
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
