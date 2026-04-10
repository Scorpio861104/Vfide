import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { ensureGroupVisualColumns } from '@/lib/dbPatches';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

interface GroupRow {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  creator_id: number;
  member_count: number;
  created_at: string;
  creator_address: string;
}

interface GroupMemberRow {
  group_id: number;
  user_address: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
}

const MAX_GROUPS_LIMIT = 200;
const MAX_GROUPS_OFFSET = 10000;

const createGroupRequestSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  memberAddresses: z.array(z.string().trim().refine((value) => isAddress(value), {
    message: 'Invalid member address format',
  })).optional(),
  icon: z.string().trim().optional(),
  color: z.string().trim().optional(),
});

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function mapGroupRowsToResponse(
  groupRows: GroupRow[],
  memberRows: GroupMemberRow[],
): Array<{
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  members: Array<{ address: string; role: 'admin' | 'moderator' | 'member'; joinedAt: number }>;
  createdBy: string;
  createdAt: number;
  lastActivity: number;
}> {
  const membersByGroupId = new Map<number, GroupMemberRow[]>();

  for (const row of memberRows) {
    const list = membersByGroupId.get(row.group_id) ?? [];
    list.push(row);
    membersByGroupId.set(row.group_id, list);
  }

  return groupRows.map((group) => {
    const members = (membersByGroupId.get(group.id) ?? []).map((member) => ({
      address: member.user_address,
      role: member.role,
      joinedAt: new Date(member.joined_at).getTime(),
    }));

    const createdAtMs = new Date(group.created_at).getTime();

    return {
      id: group.id,
      name: group.name,
      ...(group.description ? { description: group.description } : {}),
      ...(group.icon ? { icon: group.icon } : {}),
      ...(group.color ? { color: group.color } : {}),
      members,
      createdBy: group.creator_address,
      createdAt: createdAtMs,
      lastActivity: createdAtMs,
    };
  });
}

/**
 * GET /api/groups?limit=50&offset=0
 * Return groups for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';

  if (!authAddress || !isAddress(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureGroupVisualColumns();

    const searchParams = request.nextUrl.searchParams;
    const parsedLimit = parseStrictIntegerParam(searchParams.get('limit'));
    const parsedOffset = parseStrictIntegerParam(searchParams.get('offset'));

    if (
      (searchParams.get('limit') !== null && parsedLimit === null) ||
      (searchParams.get('offset') !== null && parsedOffset === null)
    ) {
      return NextResponse.json({ error: 'Invalid limit or offset parameter' }, { status: 400 });
    }

    const limit = Math.min(Math.max(parsedLimit ?? 50, 0), MAX_GROUPS_LIMIT);
    const offset = Math.min(Math.max(parsedOffset ?? 0, 0), MAX_GROUPS_OFFSET);

    const groupsResult = await query<GroupRow>(
      `SELECT
         g.id,
         g.name,
         g.description,
         g.icon,
         g.color,
         g.creator_id,
         g.member_count,
         g.created_at,
         creator.wallet_address as creator_address
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       JOIN users requester ON requester.id = gm.user_id
       JOIN users creator ON creator.id = g.creator_id
       WHERE requester.wallet_address = $1
       ORDER BY g.created_at DESC
       LIMIT $2 OFFSET $3`,
      [authAddress, limit, offset]
    );

    const groupIds = groupsResult.rows.map((row) => row.id);

    let memberRows: GroupMemberRow[] = [];
    if (groupIds.length > 0) {
      const membersResult = await query<GroupMemberRow>(
        `SELECT
           gm.group_id,
           u.wallet_address as user_address,
           gm.role,
           gm.joined_at
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = ANY($1::int[])
         ORDER BY gm.joined_at ASC`,
        [groupIds]
      );
      memberRows = membersResult.rows;
    }

    const groups = mapGroupRowsToResponse(groupsResult.rows, memberRows);

    return NextResponse.json({
      success: true,
      groups,
      total: groups.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('[Groups GET API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

/**
 * POST /api/groups
 * Create a DB-backed group and add initial members.
 */
export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';

  if (!authAddress || !isAddress(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof createGroupRequestSchema>;
  try {
    const rawBody = await request.json();
    const parsed = createGroupRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Groups POST] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { name, description, memberAddresses, icon, color } = body;
  const requestedMemberAddresses = memberAddresses ?? [];

  let client: Awaited<ReturnType<typeof getClient>> | null = null;

  try {
    await ensureGroupVisualColumns();

    client = await getClient();

    const creatorResult = await client.query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );

    if (creatorResult.rows.length === 0 || !creatorResult.rows[0]?.id) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const creatorId = creatorResult.rows[0].id;

    const dedupedMembers = Array.from(
      new Set(requestedMemberAddresses.map((member) => member.toLowerCase()).filter((member) => member !== authAddress))
    );

    let memberUserRows: Array<{ id: number; wallet_address: string }> = [];
    if (dedupedMembers.length > 0) {
      const membersLookup = await client.query<{ id: number; wallet_address: string }>(
        'SELECT id, wallet_address FROM users WHERE wallet_address = ANY($1::text[])',
        [dedupedMembers]
      );

      memberUserRows = membersLookup.rows;
      const foundAddresses = new Set(memberUserRows.map((row) => row.wallet_address.toLowerCase()));
      const missingAddresses = dedupedMembers.filter((addr) => !foundAddresses.has(addr));

      if (missingAddresses.length > 0) {
        return NextResponse.json(
          { error: 'Some members do not exist yet', missingAddresses },
          { status: 404 }
        );
      }
    }

    await client.query('BEGIN');

    const groupResult = await client.query<GroupRow>(
      `INSERT INTO groups (name, description, icon, color, creator_id, member_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, icon, color, creator_id, member_count, created_at, $7::text as creator_address`,
      [
        name,
        description ?? null,
        icon ?? null,
        color ?? null,
        creatorId,
        1 + memberUserRows.length,
        authAddress,
      ]
    );

    const createdGroup = groupResult.rows[0];
    if (!createdGroup?.id) {
      throw new Error('Failed to create group');
    }

    await client.query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', NOW())`,
      [createdGroup.id, creatorId]
    );

    for (const member of memberUserRows) {
      await client.query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', NOW())`,
        [createdGroup.id, member.id]
      );
    }

    const createdMembersResult = await client.query<GroupMemberRow>(
      `SELECT
         gm.group_id,
         u.wallet_address as user_address,
         gm.role,
         gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [createdGroup.id]
    );

    await client.query('COMMIT');

    const [group] = mapGroupRowsToResponse([createdGroup], createdMembersResult.rows);

    return NextResponse.json({
      success: true,
      group,
    }, { status: 201 });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    logger.error('[Groups POST API] Error:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}
