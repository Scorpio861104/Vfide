import { NextRequest, NextResponse } from 'next/server';
import {
  createUpstashWebhookReplayStoreFromEnv,
  verifyAndGuardWebhookReplay,
} from '@/lib/security/webhookConsumerGuard';
import { PostgresWebhookReplayTelemetry } from '@/lib/security/webhookReplayTelemetry';
import { getRequestCorrelationContext } from '@/lib/security/requestContext';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { z } from 'zod4';

const WEBHOOK_SECRET_ENV = 'SECURITY_ALERT_WEBHOOK_SECRET';
const webhookRequestSchema = z.object({
  signatureHeader: z.string().trim().min(1),
  timestampHeader: z.string().trim().regex(/^\d+$/),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const secret = process.env[WEBHOOK_SECRET_ENV]?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 });
  }

  const body = await request.text();
  const parsedHeaders = webhookRequestSchema.safeParse({
    signatureHeader: request.headers.get('x-vfide-alert-signature'),
    timestampHeader: request.headers.get('x-vfide-alert-timestamp'),
  });
  if (!parsedHeaders.success) {
    return NextResponse.json({ error: 'Invalid webhook headers' }, { status: 400 });
  }

  const { signatureHeader, timestampHeader } = parsedHeaders.data;
  const correlation = getRequestCorrelationContext(request.headers);

  const replayStore = createUpstashWebhookReplayStoreFromEnv();
  const telemetry = new PostgresWebhookReplayTelemetry();
  const verification = await verifyAndGuardWebhookReplay({
    body,
    signatureHeader,
    timestampHeader,
    secret,
    replayStore,
    telemetry,
    source: `${correlation.ipSource}:${correlation.ipHash}`,
    maxSkewSeconds: 300,
    replayTtlSeconds: 900,
  });

  if (!verification.valid) {
    return NextResponse.json({ error: verification.reason || 'Unauthorized webhook' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, replayKey: verification.replayKey });
}
