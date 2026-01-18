import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';
import { validateQueryParams, schemas } from '@/lib/api-validation';
import { validateAddress } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { apiLogger } from '@/lib/logger.service';

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

/**
 * GET /api/endorsements?endorsedAddress=0x...&proposalId=123&limit=50&offset=0
 * Get endorsements
 * Enhanced with: validation, rate limiting, secure logging
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 60, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Validate pagination
    const paginationValidation = validateQueryParams(searchParams, schemas.pagination);
    if (!paginationValidation.valid) {
      return paginationValidation.errorResponse;
    }
    const { limit, offset } = paginationValidation.data;
    
    const endorsedAddress = searchParams.get('endorsedAddress');
    const endorserAddress = searchParams.get('endorserAddress');
    const proposalId = searchParams.get('proposalId');
    
    // Validate addresses if provided
    if (endorsedAddress) {
      const validation = validateAddress(endorsedAddress);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Invalid endorsed address: ${validation.error}` },
          { status: 400 }
        );
      }
    }
    if (endorserAddress) {
      const validation = validateAddress(endorserAddress);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Invalid endorser address: ${validation.error}` },
          { status: 400 }
        );
      }
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
    const countParams: any[] = [];
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

    return NextResponse.json({
      endorsements: result.rows,
      total: parseInt(countResult.rows[0]?.count || '0'),
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
  const client = await getClient();
  
  try {
    const body = await request.json();
    const { endorserAddress, endorsedAddress, proposalId, message } = body;

    if (!endorserAddress || !endorsedAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: endorserAddress, endorsedAddress' },
        { status: 400 }
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
 * Delete an endorsement
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endorsementId = searchParams.get('endorsementId');

    if (!endorsementId) {
      return NextResponse.json(
        { error: 'endorsementId is required' },
        { status: 400 }
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
