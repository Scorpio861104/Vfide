import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

interface Endorsement {
  id: number;
  endorser_id: number;
  endorsed_id: number;
  proposal_id: number | null;
  message: string;
  created_at: string;
  endorser_address?: string;
  endorser_username?: string;
  endorser_avatar?: string;
  endorsed_address?: string;
  endorsed_username?: string;
  endorsed_avatar?: string;
  proposal_title?: string;
}

const MAX_ENDORSEMENTS_LIMIT = 200;
const MAX_ENDORSEMENTS_OFFSET = 10000;
const MAX_ENDORSEMENT_MESSAGE_LENGTH = 1000;

const createEndorsementSchema = z.object({
  fromAddress: z.string().trim().refine((value) => isAddressLike(value), {
    message: 'Invalid fromAddress format',
  }),
  toAddress: z.string().trim().refine((value) => isAddressLike(value), {
    message: 'Invalid toAddress format',
  }),
  message: z.string().max(MAX_ENDORSEMENT_MESSAGE_LENGTH).optional(),
});

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return /^0x[a-fA-F0-9]{3,40}$/.test(value);
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseNonNegativeInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDatabaseUnavailableError(error: unknown): boolean {
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const asRecord = typeof current === 'object' ? current as Record<string, unknown> : null;
    const message = current instanceof Error
      ? current.message.toLowerCase()
      : String(current).toLowerCase();
    const code = typeof asRecord?.code === 'string' ? asRecord.code.toLowerCase() : '';

    if (
      code === 'econnrefused' ||
      code === '57p01' ||
      code === '42p01' ||
      code === '42703' ||
      message.includes('econnrefused') ||
      message.includes('database query failed') ||
      message.includes('connect') ||
      message.includes('connection terminated') ||
      message.includes('timeout expired') ||
      message.includes('does not exist')
    ) {
      return true;
    }

    const cause = asRecord?.cause;
    if (cause) stack.push(cause);

    const errors = asRecord?.errors;
    if (Array.isArray(errors)) {
      for (const nested of errors) stack.push(nested);
    }
  }

  return false;
}

/**
 * GET /api/endorsements?endorsedAddress=0x...&proposalId=123&limit=50&offset=0
 * Get endorsements
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'api');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const rawEndorsedAddress = searchParams.get('endorsedAddress');
    const rawEndorserAddress = searchParams.get('endorserAddress');
    const rawProposalId = searchParams.get('proposalId');
    const rawLimit = searchParams.get('limit');
    const rawOffset = searchParams.get('offset');
    const parsedLimit = rawLimit !== null ? parseNonNegativeInteger(rawLimit) : 50;
    const parsedOffset = rawOffset !== null ? parseNonNegativeInteger(rawOffset) : 0;

    if (parsedLimit === null || parsedOffset === null) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    const limit = Math.min(parsedLimit, MAX_ENDORSEMENTS_LIMIT);
    const offset = Math.min(parsedOffset, MAX_ENDORSEMENTS_OFFSET);

    const endorsedAddress =
      typeof rawEndorsedAddress === 'string' && rawEndorsedAddress.trim().length > 0
        ? normalizeAddress(rawEndorsedAddress)
        : null;
    const endorserAddress =
      typeof rawEndorserAddress === 'string' && rawEndorserAddress.trim().length > 0
        ? normalizeAddress(rawEndorserAddress)
        : null;

    if ((endorsedAddress && !isAddressLike(endorsedAddress)) || (endorserAddress && !isAddressLike(endorserAddress))) {
      return NextResponse.json(
        { error: 'Invalid address filter' },
        { status: 400 }
      );
    }

    const proposalId =
      typeof rawProposalId === 'string' && rawProposalId.trim().length > 0
        ? parsePositiveInteger(rawProposalId.trim())
        : null;

    if (rawProposalId && proposalId === null) {
      return NextResponse.json(
        { error: 'Invalid proposalId parameter' },
        { status: 400 }
      );
    }

    const selectBase = `
      SELECT
        e.*,
        endorser.wallet_address as endorser_address,
        endorser.username as endorser_username,
        endorser.avatar_url as endorser_avatar,
        endorsed.wallet_address as endorsed_address,
        endorsed.username as endorsed_username,
        endorsed.avatar_url as endorsed_avatar,
        p.title as proposal_title
      FROM endorsements e
      JOIN users endorser ON e.endorser_id = endorser.id
      JOIN users endorsed ON e.endorsed_id = endorsed.id
      LEFT JOIN proposals p ON e.proposal_id = p.id
    `;

    const countBase = `
      SELECT COUNT(*) as count
      FROM endorsements e
      JOIN users endorser ON e.endorser_id = endorser.id
      JOIN users endorsed ON e.endorsed_id = endorsed.id
    `;

    const hasEndorsed = Boolean(endorsedAddress);
    const hasEndorser = Boolean(endorserAddress);
    const hasProposal = proposalId !== null;
    const filterKey = `${hasEndorsed ? '1' : '0'}${hasEndorser ? '1' : '0'}${hasProposal ? '1' : '0'}`;

    let result;
    let countResult;

    switch (filterKey) {
      case '111':
        result = await query<Endorsement>(
          `${selectBase} WHERE endorsed.wallet_address = $1 AND endorser.wallet_address = $2 AND e.proposal_id = $3 ORDER BY e.created_at DESC LIMIT $4 OFFSET $5`,
          [endorsedAddress!, endorserAddress!, proposalId!, limit, offset]
        );
        countResult = await query<{ count: string }>(
          `${countBase} WHERE endorsed.wallet_address = $1 AND endorser.wallet_address = $2 AND e.proposal_id = $3`,
          [endorsedAddress!, endorserAddress!, proposalId!]
        );
        break;
      case '110':
        result = await query<Endorsement>(
          `${selectBase} WHERE endorsed.wallet_address = $1 AND endorser.wallet_address = $2 ORDER BY e.created_at DESC LIMIT $3 OFFSET $4`,
          [endorsedAddress!, endorserAddress!, limit, offset]
        );
        countResult = await query<{ count: string }>(
          `${countBase} WHERE endorsed.wallet_address = $1 AND endorser.wallet_address = $2`,
          [endorsedAddress!, endorserAddress!]
        );
        break;
      case '101':
        result = await query<Endorsement>(
          `${selectBase} WHERE endorsed.wallet_address = $1 AND e.proposal_id = $2 ORDER BY e.created_at DESC LIMIT $3 OFFSET $4`,
          [endorsedAddress!, proposalId!, limit, offset]
        );
        countResult = await query<{ count: string }>(
          `${countBase} WHERE endorsed.wallet_address = $1 AND e.proposal_id = $2`,
          [endorsedAddress!, proposalId!]
        );
        break;
      case '100':
        result = await query<Endorsement>(
          `${selectBase} WHERE endorsed.wallet_address = $1 ORDER BY e.created_at DESC LIMIT $2 OFFSET $3`,
          [endorsedAddress!, limit, offset]
        );
        countResult = await query<{ count: string }>(
          `${countBase} WHERE endorsed.wallet_address = $1`,
          [endorsedAddress!]
        );
        break;
      case '011':
        result = await query<Endorsement>(
          `${selectBase} WHERE endorser.wallet_address = $1 AND e.proposal_id = $2 ORDER BY e.created_at DESC LIMIT $3 OFFSET $4`,
          [endorserAddress!, proposalId!, limit, offset]
        );
        countResult = await query<{ count: string }>(
          `${countBase} WHERE endorser.wallet_address = $1 AND e.proposal_id = $2`,
          [endorserAddress!, proposalId!]
        );
        break;
      case '010':
        result = await query<Endorsement>(
          `${selectBase} WHERE endorser.wallet_address = $1 ORDER BY e.created_at DESC LIMIT $2 OFFSET $3`,
          [endorserAddress!, limit, offset]
        );
        countResult = await query<{ count: string }>(
          `${countBase} WHERE endorser.wallet_address = $1`,
          [endorserAddress!]
        );
        break;
      case '001':
        result = await query<Endorsement>(
          `${selectBase} WHERE e.proposal_id = $1 ORDER BY e.created_at DESC LIMIT $2 OFFSET $3`,
          [proposalId!, limit, offset]
        );
        countResult = await query<{ count: string }>(
          `${countBase} WHERE e.proposal_id = $1`,
          [proposalId!]
        );
        break;
      default:
        result = await query<Endorsement>(
          `${selectBase} ORDER BY e.created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        countResult = await query<{ count: string }>(countBase);
        break;
    }

    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);
    if (isNaN(totalCount)) {
      throw new Error('Failed to get endorsement count');
    }

    return NextResponse.json({
      endorsements: result.rows,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('[Endorsements GET API] Error:', error);

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({
        endorsements: [],
        total: 0,
        limit: 50,
        offset: 0,
        degraded: true,
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch endorsements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/endorsements
 * Create a new endorsement
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof createEndorsementSchema>;
  try {
    const rawBody = await request.json();
    if (!isRecord(rawBody)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const parsed = createEndorsementSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Endorsements POST] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const client = await getClient();
  
  try {
    const { fromAddress: rawEndorserAddress, toAddress: rawEndorsedAddress, message } = body;

    const endorserAddress = normalizeAddress(rawEndorserAddress);
    const endorsedAddress = normalizeAddress(rawEndorsedAddress);
    const proposalId = null; // Optional field

    if (!isAddressLike(endorserAddress) || !isAddressLike(endorsedAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    if (endorserAddress === endorsedAddress) {
      return NextResponse.json(
        { error: 'You cannot endorse yourself' },
        { status: 400 }
      );
    }

    if (typeof message === 'string' && message.length > MAX_ENDORSEMENT_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Endorsement message exceeds ${MAX_ENDORSEMENT_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Verify the endorser is the authenticated user
    if (authAddress !== endorserAddress) {
      return NextResponse.json(
        { error: 'You can only create endorsements from your own address' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    // Get user IDs
    const endorserResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [endorserAddress]
    );

    const endorsedResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [endorsedAddress]
    );

    if (endorserResult.rows.length === 0 || endorsedResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const endorserId = endorserResult.rows[0].id;
    const endorsedId = endorsedResult.rows[0].id;

    // Check if endorsement already exists
    const existingResult = await client.query(
      `SELECT * FROM endorsements 
       WHERE endorser_id = $1 AND endorsed_id = $2 AND ($3::integer IS NULL OR proposal_id = $3)`,
      [endorserId, endorsedId, proposalId || null]
    );

    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Endorsement already exists' },
        { status: 400 }
      );
    }

    // Create endorsement
    const endorsementResult = await client.query(
      `INSERT INTO endorsements (endorser_id, endorsed_id, proposal_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [endorserId, endorsedId, proposalId || null, message || '']
    );

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'endorsement', 'New Endorsement', $2, $3)`,
      [
        endorsedId,
        `${endorserAddress} endorsed you`,
        JSON.stringify({ 
          endorsementId: endorsementResult.rows[0].id, 
          endorserAddress,
          proposalId 
        })
      ]
    );

    // Create activity
    await client.query(
      `INSERT INTO activities (user_id, activity_type, title, description)
       VALUES ($1, 'endorsement', 'Endorsed a user', $2)`,
      [endorserId, `Endorsed ${endorsedAddress}`]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      endorsement: endorsementResult.rows[0],
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('[Endorsements POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create endorsement' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/endorsements?endorsementId=123
 * Delete an endorsement (only the endorser can delete)
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const rawEndorsementId = searchParams.get('endorsementId');

    if (!rawEndorsementId) {
      return NextResponse.json(
        { error: 'endorsementId is required' },
        { status: 400 }
      );
    }

    const endorsementId = parsePositiveInteger(rawEndorsementId);
    if (endorsementId === null) {
      return NextResponse.json(
        { error: 'Invalid endorsementId' },
        { status: 400 }
      );
    }

    // Verify ownership - only the endorser can delete their endorsement
    const endorsementCheck = await query(
      `SELECT e.endorser_id, u.wallet_address 
       FROM endorsements e 
       JOIN users u ON e.endorser_id = u.id 
       WHERE e.id = $1`,
      [endorsementId]
    );

    if (endorsementCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Endorsement not found' },
        { status: 404 }
      );
    }

    const endorsement = endorsementCheck.rows[0];
    if (!endorsement || normalizeAddress(endorsement.wallet_address) !== authAddress) {
      return NextResponse.json(
        { error: 'You can only delete your own endorsements' },
        { status: 403 }
      );
    }

    const result = await query(
      'DELETE FROM endorsements WHERE id = $1',
      [endorsementId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Endorsement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Endorsement deleted',
    });
  } catch (error) {
    logger.error('[Endorsements DELETE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete endorsement' },
      { status: 500 }
    );
  }
}
