import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;

const beneficiarySchema = z.object({
  label: z.string().trim().max(80).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(6).max(32).optional(),
  network: z.enum(['mpesa', 'mtn_momo', 'gcash', 'bank', 'wallet']),
  accountNumber: z.string().trim().max(64).optional(),
  walletAddress: z.string().trim().optional().refine((value) => !value || ADDRESS_LIKE_REGEX.test(value), {
    message: 'Invalid wallet address',
  }),
  country: z.string().trim().length(2),
  relationship: z.string().trim().min(1).max(40).optional(),
});

async function getAuthAddress(request: NextRequest): Promise<string | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const address = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';

  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return address;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const result = await query(
      `SELECT id, owner_address, label, network, wallet_address, country, created_at
         FROM remittance_beneficiaries
        WHERE owner_address = $1
        ORDER BY created_at DESC`,
      [authAddress]
    );

    return NextResponse.json({ success: true, beneficiaries: result.rows });
  } catch (error) {
    logger.error('[Remittance Beneficiaries GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch beneficiaries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = beneficiarySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid beneficiary payload' }, { status: 400 });
    }

    const { label, network, walletAddress, country } = parsedBody.data;
    const redactedName = 'redacted';
    const redactedPhone = 'redacted';
    const redactedRelationship = 'unspecified';
    const result = await query(
      `INSERT INTO remittance_beneficiaries
         (owner_address, label, name, phone, network, account_number, wallet_address, country, relationship)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, owner_address, label, network, wallet_address, country, created_at`,
      [authAddress, label ?? null, redactedName, redactedPhone, network, null, walletAddress ?? null, country.toUpperCase(), redactedRelationship]
    );

    return NextResponse.json({ success: true, beneficiary: result.rows[0] });
  } catch (error) {
    logger.error('[Remittance Beneficiaries POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create beneficiary' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  const { searchParams } = new URL(request.url);
  const id = Number.parseInt(searchParams.get('id') || '', 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Valid beneficiary id required' }, { status: 400 });
  }

  try {
    const result = await query(
      'DELETE FROM remittance_beneficiaries WHERE id = $1 AND owner_address = $2',
      [id, authAddress]
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Beneficiary not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Remittance Beneficiaries DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete beneficiary' }, { status: 500 });
  }
}
