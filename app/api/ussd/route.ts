import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

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
    return `END Payment of ${parts[2]} VFIDE to ${parts[1]} submitted.\nYou will receive an SMS confirmation.`;
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
