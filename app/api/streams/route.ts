import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const DEFAULT_ALLOWED_STREAM_TOKENS = ['VFIDE', 'USDC', 'USDT', 'DAI', 'ETH', 'WETH'];

function getAllowedStreamTokens(): Set<string> {
  const configured = (process.env.STREAM_ALLOWED_TOKENS || '')
    .split(',')
    .map((token) => token.trim().toUpperCase())
    .filter((token) => token.length > 0);

  const tokens = configured.length > 0 ? configured : DEFAULT_ALLOWED_STREAM_TOKENS;
  return new Set(tokens);
}

const createStreamSchema = z.object({
  senderAddress: z.string().trim().regex(ADDRESS_REGEX),
  recipientAddress: z.string().trim().regex(ADDRESS_REGEX),
  token: z.string().trim().toUpperCase().refine((value) => getAllowedStreamTokens().has(value), {
    message: 'Unsupported token symbol',
  }),
  totalAmount: z.number().positive(),
  ratePerSecond: z.number().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
}).superRefine((value, ctx) => {
  const startMs = Date.parse(value.startTime);
  const endMs = Date.parse(value.endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return;
  }

  if (endMs <= startMs) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endTime'],
      message: 'endTime must be after startTime',
    });
    return;
  }

  const durationSeconds = (endMs - startMs) / 1000;
  const expectedTotal = value.ratePerSecond * durationSeconds;
  const tolerance = Math.max(0.000001, expectedTotal * 0.01); // 1%

  if (Math.abs(value.totalAmount - expectedTotal) > tolerance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['totalAmount'],
      message: 'totalAmount must approximately equal ratePerSecond × duration',
    });
  }

  const oneHourAgo = Date.now() - 3600_000;
  if (startMs < oneHourAgo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startTime'],
      message: 'startTime cannot be more than 1 hour in the past',
    });
  }
});

type StreamRow = {
  id: number;
  sender_address: string;
  recipient_address: string;
  token: string;
  total_amount: string;
  rate_per_second: string;
  start_time: string;
  end_time: string;
  withdrawn: string;
  is_paused: boolean;
  status: string;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const address = request.nextUrl.searchParams.get('address');
  const role = request.nextUrl.searchParams.get('role') ?? 'sender'; // 'sender' | 'recipient' | 'all'

  if (!address || !ADDRESS_REGEX.test(address)) {
    return NextResponse.json({ error: 'Valid address query parameter is required' }, { status: 400 });
  }

  const normalized = address.trim().toLowerCase();
  const authResult = await requireOwnership(request, normalized);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    let rows: StreamRow[];
    if (role === 'sender') {
      const result = await query<StreamRow>(
        'SELECT * FROM streams WHERE sender_address = $1 ORDER BY created_at DESC LIMIT 100',
        [normalized]
      );
      rows = result.rows;
    } else if (role === 'recipient') {
      const result = await query<StreamRow>(
        'SELECT * FROM streams WHERE recipient_address = $1 ORDER BY created_at DESC LIMIT 100',
        [normalized]
      );
      rows = result.rows;
    } else {
      const result = await query<StreamRow>(
        'SELECT * FROM streams WHERE sender_address = $1 OR recipient_address = $1 ORDER BY created_at DESC LIMIT 100',
        [normalized]
      );
      rows = result.rows;
    }

    return NextResponse.json({ streams: rows, total: rows.length });
  } catch (err) {
    console.error('streams GET error', err);
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createStreamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { senderAddress, recipientAddress, token, totalAmount, ratePerSecond, startTime, endTime } = parsed.data;
  const normalized = senderAddress.trim().toLowerCase();

  const authResult = await requireOwnership(request, normalized);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const result = await query<StreamRow>(
      `INSERT INTO streams (sender_address, recipient_address, token, total_amount, rate_per_second, start_time, end_time, withdrawn, is_paused, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, false, 'preview')
       RETURNING *`,
      [normalized, recipientAddress.trim().toLowerCase(), token, totalAmount, ratePerSecond, startTime, endTime]
    );

    return NextResponse.json({ stream: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('streams POST error', err);
    return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 });
  }
}
