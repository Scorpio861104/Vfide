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

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toAbsoluteUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function asMarkdownReport(url: string, payload: ReplayMetricsPayload): string {
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
    '',
    '## Metrics',
    '',
    `- accepted1h: ${payload.metrics.accepted1h}`,
    `- rejected1h: ${payload.metrics.rejected1h}`,
    `- accepted24h: ${payload.metrics.accepted24h}`,
    `- rejected24h: ${payload.metrics.rejected24h}`,
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
  const report = asMarkdownReport(url, payload);

  const { writeFile } = await import('node:fs/promises');
  await writeFile(reportPath, report, 'utf8');

  process.stdout.write(`${report}\n`);

  const failOnThreshold = getEnv('SECURITY_MONITOR_FAIL_ON_THRESHOLD') === 'true';
  if (failOnThreshold && payload.thresholdTriggered) {
    throw new Error('Replay rejection threshold was triggered');
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
