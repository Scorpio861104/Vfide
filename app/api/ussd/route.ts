import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ALLOW_MOCK_USSD = process.env.ALLOW_MOCK_USSD === 'true';
const MAX_USSD_TEXT_LENGTH = 128;
const MERCHANT_CODE_REGEX = /^[A-Z0-9]{3,12}$/;

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
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  const isFormUrlEncoded = contentType.includes('application/x-www-form-urlencoded');
  const isMultipart = contentType.includes('multipart/form-data');

  if (!isFormUrlEncoded && !isMultipart) {
    throw new Error('Unsupported USSD content type');
  }

  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId')?.toString() || '';
    const phoneNumber = formData.get('phoneNumber')?.toString() || '';
    const text = formData.get('text')?.toString() || '';

    return { sessionId, phoneNumber, text };
  } catch {
    const rawBody = await request.clone().text().catch(() => '');
    const params = new URLSearchParams(rawBody);
    return {
      sessionId: params.get('sessionId') || '',
      phoneNumber: params.get('phoneNumber') || '',
      text: params.get('text') || '',
    };
  }
}

function hashPhone(phoneNumber: string): string {
  const salt = process.env.LOG_IP_HASH_SALT || 'vfide-local-log-salt';
  return createHash('sha256').update(`${salt}:${phoneNumber.trim()}`).digest('hex').slice(0, 16);
}

function buildMenu(text: string): string {
  const normalizedText = text.trim();
  const parts = normalizedText ? normalizedText.split('*') : [];
  const level = parts.length;
  const lastInput = parts[parts.length - 1] || '';

  if (normalizedText === '') {
    return 'CON Welcome to VFIDE\n1. Pay Merchant\n2. Check Balance\n3. My Trust Score\n4. Recent Transactions';
  }

  if (normalizedText === '1') {
    return 'CON Enter merchant code (e.g., SHOP001):';
  }

  if (parts[0] === '1' && level === 2) {
    const merchantCode = lastInput.toUpperCase();
    if (!MERCHANT_CODE_REGEX.test(merchantCode)) {
      return 'END Invalid merchant code format.';
    }
    return `CON Pay merchant ${merchantCode}\nEnter amount:`;
  }

  if (parts[0] === '1' && level === 3) {
    const merchantCode = parts[1]?.toUpperCase() || '';
    const amountValue = Number(parts[2]);
    if (!MERCHANT_CODE_REGEX.test(merchantCode)) {
      return 'END Invalid merchant code format.';
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 1_000_000) {
      return 'END Invalid payment amount.';
    }
    return `CON Pay ${amountValue} VFIDE to ${merchantCode}?\n1. Confirm\n2. Cancel`;
  }

  if (parts[0] === '1' && level === 4 && lastInput === '1') {
    return 'END VFIDE USSD payments are coming soon. No payment was submitted.';
  }

  if (parts[0] === '1' && level === 4 && lastInput === '2') {
    return 'END Payment cancelled.';
  }

  if (normalizedText === '2') {
    return 'END Balance: 0 VFIDE\nLink your wallet at vfide.io to see your balance.';
  }

  if (normalizedText === '3') {
    return 'END Trust Score: 5000 (Neutral)\nUse VFIDE to build your trust score.';
  }

  if (normalizedText === '4') {
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
    if (text.length > MAX_USSD_TEXT_LENGTH) {
      return new Response('END Request too long. Please try again.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    logger.info(`[USSD] Session ${sessionId} from phone_hash:${hashPhone(phoneNumber)} with input: ${text}`);

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
