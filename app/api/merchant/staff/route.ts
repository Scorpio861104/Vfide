import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { normalizeStaffPermissions, type StaffRole } from '@/lib/merchantStaff';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const STAFF_ROLES = ['admin', 'manager', 'cashier'] as const;
const STAFF_ACTIONS = ['sale', 'refund', 'product_edit', 'session_created', 'session_updated', 'session_revoked'] as const;

const permissionSchema = z.object({
  processSales: z.boolean().optional(),
  viewProducts: z.boolean().optional(),
  editProducts: z.boolean().optional(),
  issueRefunds: z.boolean().optional(),
  viewAnalytics: z.boolean().optional(),
  maxSaleAmount: z.coerce.number().min(0).max(1_000_000).optional(),
  dailySaleLimit: z.coerce.number().min(0).max(10_000_000).optional(),
});

const createStaffSchema = z.object({
  staffName: z.string().trim().min(1).max(120),
  walletAddress: z.string().trim().optional(),
  role: z.enum(STAFF_ROLES).default('cashier'),
  permissions: permissionSchema.optional(),
  expiresInHours: z.coerce.number().int().min(1).max(24 * 30).optional(),
});

const updateStaffSchema = z.object({
  id: z.string().trim().min(1),
  role: z.enum(STAFF_ROLES).optional(),
  permissions: permissionSchema.optional(),
  active: z.boolean().optional(),
});

const activitySchema = z.object({
  mode: z.literal('log'),
  staffToken: z.string().trim().min(12),
  action: z.enum(STAFF_ACTIONS),
  details: z.record(z.string(), z.unknown()).optional(),
});

function hashStaffToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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

function serializeStaffRow(row: Record<string, unknown>, sessionToken?: string, origin?: string) {
  const createdAt = row.created_at ? new Date(String(row.created_at)).getTime() : Date.now();
  const expiresAt = row.expires_at ? new Date(String(row.expires_at)).getTime() : Date.now() + 12 * 60 * 60 * 1000;
  const role = (row.role as StaffRole | undefined) ?? 'cashier';
  const session = {
    id: String(row.id),
    merchantAddress: String(row.merchant_address ?? ''),
    staffName: String(row.staff_name ?? ''),
    walletAddress: (row.wallet_address as string | null | undefined) ?? null,
    role,
    permissions: normalizeStaffPermissions((row.permissions as Record<string, unknown> | undefined) ?? {}, role),
    createdAt,
    expiresAt,
    active: Boolean(row.active ?? true),
    sessionToken,
  };

  return {
    ...session,
    staff_name: session.staffName,
    merchant_address: session.merchantAddress,
    wallet_address: session.walletAddress,
    posLink: sessionToken && origin ? `${origin}/pos?staffToken=${encodeURIComponent(sessionToken)}` : undefined,
  };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');
  const view = searchParams.get('view');

  try {
    if (token) {
      const result = await query(
        `SELECT id, merchant_address, wallet_address, staff_name, role, permissions, active, created_at, expires_at
           FROM merchant_staff
          WHERE session_token_hash = $1
            AND active = true
            AND revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at > NOW())
          LIMIT 1`,
        [hashStaffToken(token)]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Staff session not found or expired' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        session: serializeStaffRow(result.rows[0] as Record<string, unknown>, token, origin),
      });
    }

    const authAddress = await getAuthAddress(request);
    if (authAddress instanceof NextResponse) return authAddress;

    if (view === 'activity') {
      const result = await query(
        `SELECT l.id, l.staff_id, l.action, l.details, l.created_at, s.staff_name, s.role
           FROM staff_activity_log l
           JOIN merchant_staff s ON s.id = l.staff_id
          WHERE s.merchant_address = $1
          ORDER BY l.created_at DESC
          LIMIT 50`,
        [authAddress]
      );

      return NextResponse.json({ success: true, activity: result.rows });
    }

    const result = await query(
      `SELECT id, merchant_address, wallet_address, staff_name, role, permissions, active, created_at, expires_at, revoked_at
         FROM merchant_staff
        WHERE merchant_address = $1
        ORDER BY created_at DESC`,
      [authAddress]
    );

    return NextResponse.json({
      success: true,
      staff: result.rows.map((row) => serializeStaffRow(row as Record<string, unknown>, undefined, origin)),
    });
  } catch (error) {
    logger.error('[Merchant Staff GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const rawBody = await request.json();
    const activityBody = activitySchema.safeParse(rawBody);

    if (activityBody.success) {
      const { staffToken, action, details } = activityBody.data;
      const result = await query(
        `WITH matched AS (
           SELECT id FROM merchant_staff
            WHERE session_token_hash = $1
              AND active = true
              AND revoked_at IS NULL
              AND (expires_at IS NULL OR expires_at > NOW())
         ), inserted AS (
           INSERT INTO staff_activity_log (staff_id, action, details)
           SELECT id, $2, $3::jsonb FROM matched
           RETURNING id, staff_id, action, details, created_at
         )
         SELECT * FROM inserted`,
        [hashStaffToken(staffToken), action, JSON.stringify(details ?? {})]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Staff session not found or expired' }, { status: 403 });
      }

      return NextResponse.json({ success: true, activity: result.rows[0] });
    }

    const authAddress = await getAuthAddress(request);
    if (authAddress instanceof NextResponse) return authAddress;

    const parsedBody = createStaffSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid staff payload' }, { status: 400 });
    }

    const { staffName, walletAddress, role, permissions, expiresInHours } = parsedBody.data;
    const normalizedWallet = walletAddress?.trim() ? walletAddress.trim().toLowerCase() : null;
    if (normalizedWallet && !ADDRESS_LIKE_REGEX.test(normalizedWallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const finalPermissions = normalizeStaffPermissions(permissions, role);
    const sessionId = `staff_${randomBytes(8).toString('hex')}`;
    const sessionToken = randomBytes(24).toString('hex');
    const sessionTokenHash = hashStaffToken(sessionToken);

    const result = await query(
      `WITH inserted AS (
         INSERT INTO merchant_staff (
           id,
           merchant_address,
           staff_name,
           wallet_address,
           role,
           session_token_hash,
           permissions,
           expires_at,
           active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW() + (($8::text || ' hours')::interval), true)
         RETURNING id, merchant_address, wallet_address, staff_name, role, permissions, active, created_at, expires_at
       ), logged AS (
         INSERT INTO staff_activity_log (staff_id, action, details)
         SELECT id, 'session_created', jsonb_build_object('role', $5, 'walletAddress', $4) FROM inserted
       )
       SELECT * FROM inserted`,
      [
        sessionId,
        authAddress,
        staffName,
        normalizedWallet,
        role,
        sessionTokenHash,
        JSON.stringify(finalPermissions),
        String(expiresInHours ?? 12),
      ]
    );

    const session = serializeStaffRow(result.rows[0] as Record<string, unknown>, sessionToken, new URL(request.url).origin);

    return NextResponse.json({
      success: true,
      session,
      sessionToken,
      posLink: session.posLink,
    });
  } catch (error) {
    logger.error('[Merchant Staff POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create staff session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = updateStaffSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid staff update payload' }, { status: 400 });
    }

    const { id, role, permissions, active } = parsedBody.data;
    const resolvedRole = role ?? 'cashier';
    const finalPermissions = permissions ? normalizeStaffPermissions(permissions, resolvedRole) : null;

    const result = await query(
      `WITH updated AS (
         UPDATE merchant_staff
            SET role = COALESCE($3, role),
                permissions = COALESCE($4::jsonb, permissions),
                active = COALESCE($5, active)
          WHERE id = $1 AND merchant_address = $2
          RETURNING id, merchant_address, wallet_address, staff_name, role, permissions, active, created_at, expires_at, revoked_at
       ), logged AS (
         INSERT INTO staff_activity_log (staff_id, action, details)
         SELECT id, 'session_updated', jsonb_build_object('role', role, 'active', active) FROM updated
       )
       SELECT * FROM updated`,
      [id, authAddress, role ?? null, finalPermissions ? JSON.stringify(finalPermissions) : null, active ?? null]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Staff session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      staff: serializeStaffRow(result.rows[0] as Record<string, unknown>, undefined, new URL(request.url).origin),
    });
  } catch (error) {
    logger.error('[Merchant Staff PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update staff session' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('id') || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Staff session id required' }, { status: 400 });
  }

  try {
    const result = await query(
      `WITH updated AS (
         UPDATE merchant_staff
            SET active = false,
                revoked_at = NOW()
          WHERE id = $1 AND merchant_address = $2
          RETURNING id
       ), logged AS (
         INSERT INTO staff_activity_log (staff_id, action, details)
         SELECT id, 'session_revoked', jsonb_build_object('revokedBy', $2) FROM updated
       )
       SELECT id FROM updated`,
      [id, authAddress]
    );

    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Staff session not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Merchant Staff DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to revoke staff session' }, { status: 500 });
  }
}
