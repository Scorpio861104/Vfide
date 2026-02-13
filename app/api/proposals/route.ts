import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, checkOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, createProposalSchema } from '@/lib/auth/validation';

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
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const proposerId = searchParams.get('proposerId');

    // Parse and validate limit with upper bound
    const MAX_PROPOSALS_LIMIT = 100;
    const limit = limitParam 
      ? Math.min(Math.max(1, parseInt(limitParam, 10)), MAX_PROPOSALS_LIMIT)
      : 50;
    
    // Parse and validate offset
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;

    // Validate parsed numbers
    if (isNaN(limit) || isNaN(offset)) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const VALID_STATUSES = ['active', 'pending', 'passed', 'rejected', 'executed'];
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

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

    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);
    if (isNaN(totalCount)) {
      throw new Error('Failed to get proposal count');
    }

    return NextResponse.json({
      proposals: result.rows,
      total: totalCount,
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
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const validation = await validateBody(request, createProposalSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { proposerAddress, title, description, endsAt } = validation.data;

    // Verify user is creating proposal for themselves
    if (!checkOwnership(authResult.user, proposerAddress)) {
      return NextResponse.json(
        { error: 'You can only create proposals for yourself' },
        { status: 403 }
      );
    }

    // Get proposer ID
    const proposerResult = await query(
      'SELECT id, is_council_member, proof_score FROM users WHERE wallet_address = $1',
      [proposerAddress.toLowerCase()]
    );

    if (proposerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Proposer not found' },
        { status: 404 }
      );
    }

    const proposer = proposerResult.rows[0];
    if (!proposer) {
      return NextResponse.json(
        { error: 'Proposer not found' },
        { status: 404 }
      );
    }

    // Check eligibility: must be council member or have sufficient proof score
    const proofScore = Number(proposer.proof_score ?? 0);
    const canPropose = proposer.is_council_member || proofScore >= 50;

    if (!canPropose) {
      return NextResponse.json(
        { error: 'Insufficient governance eligibility to propose' },
        { status: 403 }
      );
    }

    // Insert proposal
    const result = await query<Proposal>(
      `INSERT INTO proposals (proposer_id, title, description, status, votes_for, votes_against, voting_ends_at)
       VALUES ($1, $2, $3, 'active', '0', '0', $4)
       RETURNING *`,
      [
        proposer?.id,
        title,
        description,
        endsAt?.toISOString() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Default 7 days
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
