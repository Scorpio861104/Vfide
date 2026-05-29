/**
 * /api/analytics/metrics
 * POST — ingest a client-side performance / usage metric event.
 * GET  — return aggregated metrics (admin use).
 *
 * Testnet: events are accepted and discarded (no-op store).
 * Production: pipe to your observability stack (Datadog, Grafana, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_request: NextRequest) {
  // Accept and silently drop telemetry on testnet.
  return NextResponse.json({ success: true });
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    events: [],
    summary: { totalEvents: 0, period: '24h' },
  });
}
