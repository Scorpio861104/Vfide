// User API - REAL Database Implementation
// NO MOCKS - All data from PostgreSQL

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { 
  parsePaginationParams, 
  createPaginatedResponse,
  addCacheHeaders,
  filterFields,
  parseFieldsParam,
} from '@/lib/optimization/apiOptimization';
import { trackApiCallSimple } from '@/lib/optimization/monitoring';

interface User {
  id: string;
  wallet_address: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  proof_score: number;
  reputation_score: number;
  is_council_member: boolean;
  is_verified: boolean;
  created_at: Date;
  last_seen_at: Date | null;
}

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    // Use standardized pagination parsing
    const { page = 1, limit = 10 } = parsePaginationParams(request);
    const offset = (page - 1) * limit;
    const fields = parseFieldsParam(request);
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    let queryText = `
      SELECT 
        id, wallet_address, username, display_name, bio, avatar_url,
        proof_score, reputation_score, is_council_member, is_verified,
        created_at, last_seen_at
      FROM users
    `;
    const params: (string | number)[] = [];

    if (search) {
      // Validate search parameter length
      if (search.length > 100) {
        return NextResponse.json(
          { error: 'Search query too long' },
          { status: 400 }
        );
      }
      
      // Validate search - allow alphanumeric, underscore, space, or valid Ethereum address
      const isValidTextSearch = /^[a-zA-Z0-9_\s]+$/.test(search);
      const isValidEthAddress = /^0x[a-fA-F0-9]{40}$/i.test(search); // Case-insensitive for checksummed addresses
      
      if (!isValidTextSearch && !isValidEthAddress) {
        return NextResponse.json(
          { error: 'Invalid search query format' },
          { status: 400 }
        );
      }
      
      queryText += ` WHERE username ILIKE $1 OR display_name ILIKE $1 OR wallet_address ILIKE $1`;
      params.push(`%${search}%`);
      queryText += ` ORDER BY proof_score DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    } else {
      queryText += ` ORDER BY proof_score DESC LIMIT $1 OFFSET $2`;
      params.push(limit, offset);
    }

    const result = await query<User>(queryText, params);
    
    // Get total count for pagination
    const countQuery = search 
      ? 'SELECT COUNT(*) FROM users WHERE username ILIKE $1 OR display_name ILIKE $1 OR wallet_address ILIKE $1'
      : 'SELECT COUNT(*) FROM users';
    const countResult = await query<{ count: string }>(countQuery, search ? [`%${search}%`] : []);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    
    // Apply field filtering if requested
    const filteredUsers = fields 
      ? result.rows.map((user: Record<string, unknown>) => filterFields(user, fields))
      : result.rows;
    
    // Create standardized paginated response
    const paginatedData = createPaginatedResponse(filteredUsers as Array<Record<string, unknown>>, total, page, limit);
    
    // Track API call for monitoring
    trackApiCallSimple('/api/users', 'GET', 200, Date.now() - startTime);
    
    // Add cache headers for performance
    const response = NextResponse.json(paginatedData);
    return addCacheHeaders(response, { maxAge: 30, sMaxAge: 60, staleWhileRevalidate: 120 });
  } catch (error: unknown) {
    trackApiCallSimple('/api/users', 'GET', 500, Date.now() - startTime);
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create or update user
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  try {
    const body = await request.json();
    const { wallet_address, username, display_name, bio, avatar_url } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await query<User>(
      'SELECT * FROM users WHERE wallet_address = $1',
      [wallet_address.toLowerCase()]
    );

    let user: User;

    if (existingUser.rows.length > 0) {
      // Update existing user
      const updateResult = await query<User>(
        `UPDATE users 
         SET username = COALESCE($2, username),
             display_name = COALESCE($3, display_name),
             bio = COALESCE($4, bio),
             avatar_url = COALESCE($5, avatar_url),
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE wallet_address = $1
         RETURNING *`,
        [wallet_address.toLowerCase(), username, display_name, bio, avatar_url]
      );
      user = updateResult.rows[0]!;
    } else {
      // Create new user
      const insertResult = await query<User>(
        `INSERT INTO users (wallet_address, username, display_name, bio, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [wallet_address.toLowerCase(), username, display_name, bio, avatar_url]
      );
      user = insertResult.rows[0]!;
    }

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('Error creating/updating user:', error);
    return NextResponse.json(
      { error: 'Failed to create/update user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
