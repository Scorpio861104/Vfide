import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { pollEvents } from '@/lib/indexer/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('[Indexer API] CRON_SECRET is required');
    return false;
  }

  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(request.headers.get('authorization') ?? '');

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET not configured' },
      { status: 503 }
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pollEvents();
    return NextResponse.json({
      success: true,
      indexed: result.indexed,
      toBlock: result.toBlock,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Indexer API] Poll failed:', error);
    return NextResponse.json(
      { success: false, error: 'Indexer poll failed' },
      { status: 500 }
    );
  }
}
