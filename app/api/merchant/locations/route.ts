import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function normalizeAddress(value: string | null): string | null {
  const address = value?.trim().toLowerCase() || '';
  return ADDRESS_REGEX.test(address) ? address : null;
}

function serializeLocation(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    address: row.address ? String(row.address) : null,
    city: row.city ? String(row.city) : null,
    country: row.country ? String(row.country) : null,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    active: row.active !== false,
  };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const merchant = normalizeAddress(request.nextUrl.searchParams.get('merchant'));
  if (!merchant) {
    return NextResponse.json({ error: 'merchant required' }, { status: 400 });
  }

  const authResult = await requireOwnership(request, merchant);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const result = await query(
      `SELECT id, name, address, city, country, lat, lng, active
         FROM merchant_locations
        WHERE merchant_address = $1
        ORDER BY name ASC`,
      [merchant],
    );

    return NextResponse.json({
      locations: result.rows.map((row) => serializeLocation(row as Record<string, unknown>)),
    });
  } catch (error) {
    logger.error('[Merchant Locations GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const merchantAddress = normalizeAddress(typeof body?.merchantAddress === 'string' ? body.merchantAddress : null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    const city = typeof body?.city === 'string' ? body.city.trim() : '';
    const country = typeof body?.country === 'string' ? body.country.trim() : '';
    const lat = body?.lat == null ? null : Number(body.lat);
    const lng = body?.lng == null ? null : Number(body.lng);

    if (!merchantAddress || !name) {
      return NextResponse.json({ error: 'merchantAddress and name required' }, { status: 400 });
    }

    const authResult = await requireOwnership(request, merchantAddress);
    if (authResult instanceof NextResponse) return authResult;

    const result = await query(
      `INSERT INTO merchant_locations (
         merchant_address, name, address, city, country, lat, lng
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, address, city, country, lat, lng, active`,
      [
        merchantAddress,
        name,
        address || null,
        city || null,
        country || null,
        Number.isFinite(lat ?? NaN) ? lat : null,
        Number.isFinite(lng ?? NaN) ? lng : null,
      ],
    );

    return NextResponse.json({
      success: true,
      location: serializeLocation(result.rows[0] as Record<string, unknown>),
    });
  } catch (error) {
    logger.error('[Merchant Locations POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
