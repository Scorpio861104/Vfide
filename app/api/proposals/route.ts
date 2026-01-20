import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, checkOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

interface Proposal {
  id: number;
  proposer_id: number;
  title: string;
  description: string;
  status: string;
  votes_for: string;
  votes_against: string;
  created_at: string;
  updated_at: string;
  voting_ends_at: string;
  proposer_address?: string;
  proposer_username?: string;
  proposer_avatar?: string;
}

/**
 * GET /api/proposals?status=active&limit=50&offset=0
 * Get governance proposals
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const proposerId = searchParams.get('proposerId');

    let queryText = `
      SELECT 
        p.*,
        u.wallet_address as proposer_address,
        u.username as proposer_username,
        u.avatar_url as proposer_avatar
      FROM proposals p
      JOIN users u ON p.proposer_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramCount = 1;

    if (status) {
      queryText += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (proposerId) {
      queryText += ` AND u.wallet_address = $${paramCount}`;
      params.push(proposerId.toLowerCase());
      paramCount++;
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query<Proposal>(queryText, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM proposals p JOIN users u ON p.proposer_id = u.id WHERE 1=1';
    const countParams: (string | number)[] = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND p.status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (proposerId) {
      countQuery += ` AND u.wallet_address = $${countParamCount}`;
      countParams.push(proposerId.toLowerCase());
    }

    const countResult = await query<{ count: string }>(countQuery, countParams);

    return NextResponse.json({
      proposals: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Proposals GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proposals
 * Create a new proposal
 * 
 * Security:
 * - Requires authentication
 * - Rate limited
 * - Proposer must match authenticated user
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { proposerAddress, title, description, votingEndsAt } = body;

    if (!proposerAddress || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: proposerAddress, title, description' },
        { status: 400 }
      );
    }

    // Verify user is creating proposal for themselves
    if (!checkOwnership(authResult.user, proposerAddress)) {
      return NextResponse.json(
        { error: 'You can only create proposals for yourself' },
        { status: 403 }
      );
    }

    // Get proposer ID
    const proposerResult = await query(
      'SELECT id, is_council_member FROM users WHERE wallet_address = $1',
      [proposerAddress.toLowerCase()]
    );

    if (proposerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Proposer not found' },
        { status: 404 }
      );
    }

    const proposer = proposerResult.rows[0];

    // In production, verify proposer has sufficient tokens or is council member
    // For now, allow all proposals

    // Insert proposal
    const result = await query<Proposal>(
      `INSERT INTO proposals (proposer_id, title, description, status, votes_for, votes_against, voting_ends_at)
       VALUES ($1, $2, $3, 'active', '0', '0', $4)
       RETURNING *`,
      [
        proposer.id,
        title,
        description,
        votingEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Default 7 days
      ]
    );

    return NextResponse.json({
      success: true,
      proposal: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('[Proposals POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/proposals/:id
 * Get a specific proposal
 */
export async function GET_BY_ID(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query<Proposal>(
      `SELECT 
        p.*,
        u.wallet_address as proposer_address,
        u.username as proposer_username,
        u.avatar_url as proposer_avatar,
        (SELECT COUNT(*) FROM endorsements WHERE proposal_id = p.id) as endorsement_count
       FROM proposals p
       JOIN users u ON p.proposer_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      proposal: result.rows[0],
    });
  } catch (error) {
    console.error('[Proposal GET BY ID API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposal' },
      { status: 500 }
    );
  }
}
