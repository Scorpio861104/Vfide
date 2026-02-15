import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin } from '@/lib/auth/middleware';
import { isAddress, keccak256, toBytes } from 'viem';

const COLUMN_MAP: Record<string, string> = {
  recoveryId: 'recovery_id_hash',
  email: 'email_hash',
  username: 'username_hash',
};

interface VaultIdentityRow {
  vault_address: string;
}

function normalizeInput(method: string, value: string): string {
  if (method === 'username') return value.trim().toLowerCase();
  if (method === 'email') return value.trim().toLowerCase();
  return value.trim();
}

function hashInput(value: string): string {
  return keccak256(toBytes(value));
}

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method');
    const value = searchParams.get('value');

    if (!method || !value) {
      return NextResponse.json({ success: false, error: 'method and value required' }, { status: 400 });
    }

    const column = COLUMN_MAP[method];
    if (!column) {
      return NextResponse.json({ success: false, error: 'Unsupported method' }, { status: 400 });
    }

    const normalized = normalizeInput(method, value);

    if (method === 'recoveryId' && normalized.length < 6) {
      return NextResponse.json({ success: false, error: 'Recovery ID too short' }, { status: 400 });
    }

    if (method === 'email' && !normalized.includes('@')) {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    if (method === 'username' && normalized.length < 3) {
      return NextResponse.json({ success: false, error: 'Username too short' }, { status: 400 });
    }

    const hash = hashInput(normalized);

    const result = await query<VaultIdentityRow>(
      `SELECT vault_address FROM vault_identities WHERE ${column} = $1 LIMIT 1`,
      [hash]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 404 });
    }

    const vaultAddress = result.rows[0]?.vault_address;
    if (!vaultAddress || !isAddress(vaultAddress)) {
      return NextResponse.json({ success: false, error: 'Lookup failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, vault: vaultAddress });
  } catch (error) {
    console.error('[Vault Recovery Lookup] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
