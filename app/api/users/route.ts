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
import { logger } from '@/lib/logger';
import { z } from 'zod4';

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

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const upsertUserSchema = z.object({
  username: z.string().optional(),
  display_name: z.string().optional(),
  bio: z.string().optional(),
  avatar_url: z.string().optional(),
  email: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  twitter: z.string().optional(),
  github: z.string().optional(),
  wallet_address: z.string().optional(),
});

const ALLOWED_USER_FIELDS = [
  'id', 'wallet_address', 'username', 'display_name', 'bio', 'avatar_url',
  'proof_score', 'reputation_score', 'is_council_member', 'is_verified',
  'created_at', 'last_seen_at',
];

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ETH_ADDRESS_REGEX.test(value.trim());
}

// GET /api/users - Get all users
export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const startTime = Date.now();
  
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;
  if (!user?.address || !isAddressLike(user.address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use standardized pagination parsing
    const { page = 1, limit = 10 } = parsePaginationParams(request);
    const offset = (page - 1) * limit;
    const fields = parseFieldsParam(request);
    if (fields) {
      const invalidFields = fields.filter(f => !ALLOWED_USER_FIELDS.includes(f));
      if (invalidFields.length > 0) {
        return NextResponse.json(
          { error: 'Invalid fields requested' },
          { status: 400 }
        );
      }
    }
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    const selectUsersBase = `
      SELECT
        id, wallet_address, username, display_name, bio, avatar_url,
        proof_score, reputation_score, is_council_member, is_verified,
        created_at, last_seen_at
      FROM users
    `;
    let result;
    let countResult;

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
      
      const searchTerm = `%${search}%`;
      result = await query<User>(
        `${selectUsersBase}
         WHERE username ILIKE $1 OR display_name ILIKE $1 OR wallet_address ILIKE $1
         ORDER BY proof_score DESC LIMIT $2 OFFSET $3`,
        [searchTerm, limit, offset]
      );
      countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM users WHERE username ILIKE $1 OR display_name ILIKE $1 OR wallet_address ILIKE $1',
        [searchTerm]
      );
    } else {
      result = await query<User>(
        `${selectUsersBase} ORDER BY proof_score DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      countResult = await query<{ count: string }>('SELECT COUNT(*) FROM users');
    }
    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    
    // Apply field filtering if requested
    const filteredUsers = fields 
      ? result.rows.map((user) => filterFields(user as unknown as Record<string, unknown>, fields))
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
    logger.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
});

// POST /api/users - Create or update user
export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication (required - no test bypasses)
  if (!user?.address || !isAddressLike(user.address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof upsertUserSchema>;
  try {
    const rawBody = await request.json();
    const parsed = upsertUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Users POST] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const {
      username,
      display_name,
      bio,
      avatar_url,
      email,
      location,
      website,
      twitter,
      github,
    } = body;

    const usernameValue = typeof username === 'string' ? username : null;
    const displayNameValue = typeof display_name === 'string' ? display_name : null;
    const bioValue = typeof bio === 'string' ? bio : null;
    const avatarUrlValue = typeof avatar_url === 'string' ? avatar_url : null;
    const emailValue = typeof email === 'string' ? email : null;
    const locationValue = typeof location === 'string' ? location : null;
    const websiteValue = typeof website === 'string' ? website : null;
    const twitterValue = typeof twitter === 'string' ? twitter : null;
    const githubValue = typeof github === 'string' ? github : null;

    // Use authenticated user's address (not from request body)
    const requestWallet = typeof body.wallet_address === 'string'
      ? body.wallet_address
      : user.address;
    if (!requestWallet) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const wallet_address = normalizeAddress(requestWallet);
    if (!isAddressLike(wallet_address)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Verify user is updating their own profile
    if (wallet_address !== normalizeAddress(user.address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if user exists — select only id (existence check)
    const existingUser = await query<{ id: string }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [wallet_address]
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
             email = COALESCE($6, email),
             location = COALESCE($7, location),
             website = COALESCE($8, website),
             twitter = COALESCE($9, twitter),
             github = COALESCE($10, github),
             last_seen_at = NOW(),
             updated_at = NOW()
         WHERE wallet_address = $1
         RETURNING *`,
        [
          wallet_address,
          usernameValue,
          displayNameValue,
          bioValue,
          avatarUrlValue,
          emailValue,
          locationValue,
          websiteValue,
          twitterValue,
          githubValue,
        ]
      );
      user = updateResult.rows[0]!;
    } else {
      // Create new user
      const insertResult = await query<User>(
        `INSERT INTO users (wallet_address, username, display_name, bio, avatar_url, email, location, website, twitter, github)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          wallet_address,
          usernameValue,
          displayNameValue,
          bioValue,
          avatarUrlValue,
          emailValue,
          locationValue,
          websiteValue,
          twitterValue,
          githubValue,
        ]
      );
      user = insertResult.rows[0]!;
    }

    return NextResponse.json({ user });
  } catch (error: unknown) {
    logger.error('Error creating/updating user:', error);
    return NextResponse.json(
      { error: 'Failed to create or update user' },
      { status: 500 }
    );
  }
});
