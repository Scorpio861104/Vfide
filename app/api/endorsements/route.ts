import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { endorsementSchema } from '@/lib/auth/validation';

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

/**
 * GET /api/endorsements?endorsedAddress=0x...&proposalId=123&limit=50&offset=0
 * Get endorsements
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endorsedAddress = searchParams.get('endorsedAddress');
    const endorserAddress = searchParams.get('endorserAddress');
    const proposalId = searchParams.get('proposalId');
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10);

    const limit = Math.min(Math.max(rawLimit, 0), MAX_ENDORSEMENTS_LIMIT);
    const offset = Math.min(Math.max(rawOffset, 0), MAX_ENDORSEMENTS_OFFSET);

    // Validate parsed numbers
    if (isNaN(rawLimit) || isNaN(rawOffset)) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    let queryText = `
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
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramCount = 1;

    if (endorsedAddress) {
      queryText += ` AND endorsed.wallet_address = $${paramCount}`;
      params.push(endorsedAddress.toLowerCase());
      paramCount++;
    }

    if (endorserAddress) {
      queryText += ` AND endorser.wallet_address = $${paramCount}`;
      params.push(endorserAddress.toLowerCase());
      paramCount++;
    }

    if (proposalId) {
      queryText += ` AND e.proposal_id = $${paramCount}`;
      params.push(proposalId);
      paramCount++;
    }

    queryText += ` ORDER BY e.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query<Endorsement>(queryText, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as count 
      FROM endorsements e
      JOIN users endorser ON e.endorser_id = endorser.id
      JOIN users endorsed ON e.endorsed_id = endorsed.id
      WHERE 1=1
    `;
    const countParams: (string | number)[] = [];
    let countParamCount = 1;

    if (endorsedAddress) {
      countQuery += ` AND endorsed.wallet_address = $${countParamCount}`;
      countParams.push(endorsedAddress.toLowerCase());
      countParamCount++;
    }

    if (endorserAddress) {
      countQuery += ` AND endorser.wallet_address = $${countParamCount}`;
      countParams.push(endorserAddress.toLowerCase());
      countParamCount++;
    }

    if (proposalId) {
      countQuery += ` AND e.proposal_id = $${countParamCount}`;
      countParams.push(proposalId);
    }

    const countResult = await query<{ count: string }>(countQuery, countParams);

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
    console.error('[Endorsements GET API] Error:', error);
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
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object' },
      { status: 400 }
    );
  }

  const parsed = endorsementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const client = await getClient();
  
  try {
    const { fromAddress: endorserAddress, toAddress: endorsedAddress, message } = parsed.data as {
      fromAddress: string;
      toAddress: string;
      message: string;
    };
    const proposalId = null; // Optional field

    // Verify the endorser is the authenticated user
    if (authResult.user.address.toLowerCase() !== endorserAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only create endorsements from your own address' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    // Get user IDs
    const endorserResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [endorserAddress.toLowerCase()]
    );

    const endorsedResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [endorsedAddress.toLowerCase()]
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
    console.error('[Endorsements POST API] Error:', error);
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
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const endorsementId = searchParams.get('endorsementId');

    if (!endorsementId) {
      return NextResponse.json(
        { error: 'endorsementId is required' },
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
    if (!endorsement || endorsement.wallet_address.toLowerCase() !== authResult.user.address.toLowerCase()) {
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
    console.error('[Endorsements DELETE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete endorsement' },
      { status: 500 }
    );
  }
}
