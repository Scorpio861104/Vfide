import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ALLOW_MOCK_USSD = process.env.ALLOW_MOCK_USSD === 'true';

function isTrustedGateway(request: NextRequest): boolean {
  const configuredToken = process.env.USSD_GATEWAY_TOKEN;
  if (!configuredToken) {
    return process.env.NODE_ENV !== 'production';
  }

  const presentedToken = request.headers.get('x-ussd-gateway-token') || '';
  if (!presentedToken) return false;

  const configuredBuffer = Buffer.from(configuredToken);
  const presentedBuffer = Buffer.from(presentedToken);
  if (configuredBuffer.length !== presentedBuffer.length) return false;

  return timingSafeEqual(configuredBuffer, presentedBuffer);
}

async function readUSSDFields(request: NextRequest): Promise<{ sessionId: string; phoneNumber: string; text: string }> {
  const rawBody = await request.clone().text().catch(() => '');
  const fromMultipart = (field: string) => rawBody.match(new RegExp(`name="${field}"\\r?\\n\\r?\\n([^\\r\\n]*)`))?.[1] || '';
  const params = new URLSearchParams(rawBody);

  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId')?.toString() || params.get('sessionId') || fromMultipart('sessionId');
    const phoneNumber = formData.get('phoneNumber')?.toString() || params.get('phoneNumber') || fromMultipart('phoneNumber');
    const text = formData.get('text')?.toString() || params.get('text') || fromMultipart('text');

    return { sessionId, phoneNumber, text };
  } catch {
    return {
      sessionId: params.get('sessionId') || fromMultipart('sessionId'),
      phoneNumber: params.get('phoneNumber') || fromMultipart('phoneNumber'),
      text: params.get('text') || fromMultipart('text'),
    };
  }
}

function buildMenu(text: string): string {
  const parts = text ? text.split('*') : [];
  const level = parts.length;
  const lastInput = parts[parts.length - 1] || '';

  if (text === '') {
    return 'CON Welcome to VFIDE\n1. Pay Merchant\n2. Check Balance\n3. My Trust Score\n4. Recent Transactions';
  }

  if (text === '1') {
    return 'CON Enter merchant code (e.g., SHOP001):';
  }

  if (parts[0] === '1' && level === 2) {
    return `CON Pay merchant ${lastInput}\nEnter amount:`;
  }

  if (parts[0] === '1' && level === 3) {
    return `CON Pay ${parts[2]} VFIDE to ${parts[1]}?\n1. Confirm\n2. Cancel`;
  }

  if (parts[0] === '1' && level === 4 && lastInput === '1') {
    return 'END VFIDE USSD payments are coming soon. No payment was submitted.';
  }

  if (parts[0] === '1' && level === 4 && lastInput === '2') {
    return 'END Payment cancelled.';
  }

  if (text === '2') {
    return 'END Balance: 0 VFIDE\nLink your wallet at vfide.io to see your balance.';
  }

  if (text === '3') {
    return 'END Trust Score: 5000 (Neutral)\nUse VFIDE to build your trust score.';
  }

  if (text === '4') {
    return 'END No recent transactions.\nStart using VFIDE at vfide.io';
  }

  return 'END Invalid option. Please try again.';
}

export async function POST(request: NextRequest) {
  if (!isTrustedGateway(request)) {
    return new Response('END Unauthorized gateway.', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  if (!ALLOW_MOCK_USSD) {
    return new Response('END USSD mock is disabled in this environment.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    const { sessionId, phoneNumber, text } = await readUSSDFields(request);

    logger.info(`[USSD] Session ${sessionId} from ${phoneNumber.slice(0, 7)}*** with input: ${text}`);

    const responseText = buildMenu(text);
    return new Response(responseText, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    logger.error('[USSD] Error:', error);
    return new Response('END An error occurred. Please try again.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
