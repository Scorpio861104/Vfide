import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { normalizeStaffPermissions, type StaffRole } from '@/lib/merchantStaff';
import { authorizeStaffAction, type StaffActionKind, type StaffPermissions } from '@/lib/commerce/staffAuthEngine';

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

// Phase 3: server-side authorization gate. Decides whether a staff action is allowed BEFORE it happens,
// enforcing role permissions + per-transaction cap + cumulative daily limit. On an allowed sale it records the
// sale so the daily tally stays accurate (single round-trip from the POS).
const authorizeSchema = z.object({
  mode: z.literal('authorize'),
  staffToken: z.string().trim().min(12),
  kind: z.enum(['sale', 'refund', 'product_edit', 'view_analytics']),
  amount: z.coerce.number().min(0).optional(),
  record: z.boolean().optional(), // if true and allowed, log the action (maintains daily total)
});

function hashStaffToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';

  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return null;
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

async function getHandler(request: NextRequest, user: JWTPayload) {
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

    const authAddress = getAuthAddress(user);
    if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

async function postHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const rawBody = await request.json();

    // Phase 3: authorization gate (server-side enforcement of staff limits).
    const authBody = authorizeSchema.safeParse(rawBody);
    if (authBody.success) {
      const { staffToken, kind, amount, record } = authBody.data;
      const staff = (await query<{ id: string; role: StaffRole; permissions: Record<string, unknown>; active: boolean; expires_at: string | null }>(
        `SELECT id, role, permissions, active, expires_at FROM merchant_staff
          WHERE session_token_hash = $1 AND revoked_at IS NULL`,
        [hashStaffToken(staffToken)],
      )).rows[0];
      if (!staff) return NextResponse.json({ error: 'Staff session not found' }, { status: 404 });

      const permissions = normalizeStaffPermissions(staff.permissions ?? {}, staff.role) as StaffPermissions;
      // today's cumulative sale total for this staff (UTC day) from the activity log
      const totalRow = (await query<{ total: string | null }>(
        `SELECT COALESCE(SUM((details->>'amount')::numeric), 0) AS total
           FROM staff_activity_log
          WHERE staff_id = $1 AND action = 'sale' AND created_at >= date_trunc('day', NOW())`,
        [staff.id],
      )).rows[0];
      const todaysSaleTotal = Number(totalRow?.total ?? 0);

      const decision = authorizeStaffAction(
        { active: staff.active, expiresAtMs: staff.expires_at ? new Date(staff.expires_at).getTime() : null, nowMs: Date.now(), permissions, todaysSaleTotal },
        kind as StaffActionKind,
        amount ?? 0,
      );

      if (!decision.ok) {
        return NextResponse.json({ allowed: false, reason: decision.reason, todaysSaleTotal }, { status: 403 });
      }
      // record an allowed sale/refund so the daily tally + audit trail stay accurate
      if (record && (kind === 'sale' || kind === 'refund')) {
        await query(
          `INSERT INTO staff_activity_log (staff_id, action, details) VALUES ($1, $2, $3::jsonb)`,
          [staff.id, kind, JSON.stringify({ amount: amount ?? 0 })],
        );
      }
      return NextResponse.json({ allowed: true, newDailyTotal: decision.newDailyTotal ?? todaysSaleTotal });
    }

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

    const authAddress = getAuthAddress(user);
    if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

async function patchHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

async function deleteHandler(request: NextRequest, user: JWTPayload) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
