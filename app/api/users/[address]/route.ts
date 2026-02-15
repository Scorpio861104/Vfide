import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth, checkOwnership } from '@/lib/auth/middleware';
import { processAvatarUpload } from '@/lib/storage/avatarStorage';
import { username as usernameValidator, safeTextMax, urlString, shortText } from '@/lib/auth/validation';
import { z } from 'zod';

// Extended update schema that includes all profile fields
const profileUpdateSchema = z.object({
  username: usernameValidator.optional(),
  display_name: shortText.optional(),
  email: z.string().email('Invalid email').max(254).optional().nullable(),
  bio: safeTextMax(500).optional(),
  avatar_url: urlString.optional(),
  location: shortText.optional(),
  website: urlString.optional(),
  twitter: z.string().max(50).regex(/^[a-zA-Z0-9_]*$/, 'Invalid Twitter handle').optional(),
  github: z.string().max(50).regex(/^[a-zA-Z0-9_-]*$/, 'Invalid GitHub username').optional(),
});

interface User {
  wallet_address: string;
  username: string;
  display_name: string | null;
  email: string | null;
  bio: string;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  twitter: string | null;
  github: string | null;
  proof_score: number;
  is_council_member: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  badge_count: number;
  friend_count: number;
  proposal_count: number;
  endorsement_count: number;
}

/**
 * GET /api/users/:address
 * Get user profile with stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  // Rate limiting for read operations
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const resolvedParams = await params;
    const address = resolvedParams?.address;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Invalid address parameter' },
        { status: 400 }
      );
    }

    // Get user by wallet_address or username — select explicit columns
    const userResult = await query<User>(
      `SELECT wallet_address, username, display_name, email, bio, avatar_url,
              location, website, twitter, github, proof_score, is_council_member,
              is_verified, created_at, updated_at
       FROM users
       WHERE wallet_address = $1 OR username = $1`,
      [address.toLowerCase()]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0]) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    const isOwner = checkOwnership(authResult.user, user.wallet_address);

    // Get user stats
    const statsResult = await query<UserStats>(
      `SELECT 
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badge_count,
        (SELECT COUNT(*)
         FROM friendships f
         WHERE (f.user_id = u.id OR f.friend_id = u.id)
           AND f.status = 'accepted') as friend_count,
        (SELECT COUNT(*) FROM proposals WHERE proposer_address = u.wallet_address) as proposal_count,
        (SELECT COUNT(*) FROM endorsements WHERE to_user_id = u.id) as endorsement_count
       FROM users u
       WHERE u.wallet_address = $1`,
      [user.wallet_address]
    );

    const stats = statsResult.rows[0] || {
      badge_count: 0,
      friend_count: 0,
      proposal_count: 0,
      endorsement_count: 0
    };

    const responseUser = {
      ...user,
      email: isOwner ? user.email : null,
      stats,
    };

    return NextResponse.json({ user: responseUser });
  } catch (error) {
    console.error('[User GET API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/:address
 * Update user profile
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  // Rate limiting for write operations
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const resolvedParams = await params;
    const address = resolvedParams?.address;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Invalid address parameter' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      username,
      display_name,
      email,
      bio,
      avatar_url,
      location,
      website,
      twitter,
      github,
    } = parsed.data;

    if (!checkOwnership(authResult.user, address)) {
      return NextResponse.json(
        { error: 'You can only update your own profile' },
        { status: 403 }
      );
    }

    // Update user in database — only return safe columns, not email
    const result = await query<User>(
      `UPDATE users
       SET username = COALESCE($2, username),
           display_name = COALESCE($3, display_name),
           email = COALESCE($4, email),
           bio = COALESCE($5, bio),
           avatar_url = COALESCE($6, avatar_url),
           location = COALESCE($7, location),
           website = COALESCE($8, website),
           twitter = COALESCE($9, twitter),
           github = COALESCE($10, github),
           updated_at = NOW()
       WHERE wallet_address = $1
       RETURNING wallet_address, username, display_name, bio, avatar_url, location, website, twitter, github, proof_score, is_council_member, is_verified, created_at, updated_at`,
      [
        address.toLowerCase(),
        username,
        display_name,
        email,
        bio,
        avatar_url,
        location,
        website,
        twitter,
        github,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('[User PUT API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/:address/avatar
 * Upload user avatar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  // Rate limiting for upload operations
  const rateLimitResponse = await withRateLimit(request, 'upload');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const resolvedParams = await params;
    const address = resolvedParams?.address;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Invalid address parameter' },
        { status: 400 }
      );
    }

    if (!checkOwnership(authResult.user, address)) {
      return NextResponse.json(
        { error: 'You can only update your own avatar' },
        { status: 403 }
      );
    }
    
    // Get form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    let avatarResult;
    try {
      avatarResult = await processAvatarUpload({ file, address });
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Failed to process avatar';
      const status = message.startsWith('Missing required environment variable') ? 500 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    
    // Update user avatar in database
    const result = await query<User>(
      `UPDATE users 
       SET avatar_url = $2, updated_at = NOW()
       WHERE wallet_address = $1
       RETURNING avatar_url`,
      [address.toLowerCase(), avatarResult.avatarUrl]
    );

    if (result.rows.length === 0 || !result.rows[0]) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      avatarUrl: result.rows[0].avatar_url,
      variants: avatarResult.variants,
    });
  } catch (error) {
    console.error('[Avatar Upload API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
