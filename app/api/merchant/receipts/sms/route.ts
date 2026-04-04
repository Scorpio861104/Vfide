import { NextRequest, NextResponse } from 'next/server';
import { sendReceiptSMS } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    const merchantName = typeof body?.merchantName === 'string' ? body.merchantName.trim() : '';
    const amount = typeof body?.amount === 'string' || typeof body?.amount === 'number' ? String(body.amount).trim() : '';
    const currency = typeof body?.currency === 'string' ? body.currency.trim() : '';
    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : undefined;

    if (!to || !merchantName || !amount || !currency) {
      return NextResponse.json({ error: 'Required receipt fields are missing.' }, { status: 400 });
    }

    const result = await sendReceiptSMS(to, {
      merchantName,
      amount,
      currency,
      txHash,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Unable to send SMS receipt.', provider: result.provider },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      messageId: result.messageId,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected SMS receipt error.' },
      { status: 500 }
    );
  }
}
