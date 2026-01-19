import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAvatarUrl } from '@/lib/constants';

interface User {
  wallet_address: string;
  username: string;
  email: string;
  bio: string;
  avatar_url: string;
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
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Get user by wallet_address or username
    const userResult = await query<User>(
      `SELECT * FROM users 
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

    // Get user stats
    const statsResult = await query<UserStats>(
      `SELECT 
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badge_count,
        (SELECT COUNT(*) FROM friendships WHERE (user_id = u.id OR friend_id = u.id) AND status = 'accepted') as friend_count,
        (SELECT COUNT(*) FROM proposals WHERE proposer_id = u.id) as proposal_count,
        (SELECT COUNT(*) FROM endorsements WHERE endorser_id = u.id) as endorsement_count
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

    return NextResponse.json({ 
      user: {
        ...user,
        stats
      }
    });
  } catch (error) {
    console.error('[User GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
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
  const resolvedParams = await params;
  try {
    const { address } = resolvedParams;
    const body = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const { username, email, bio, avatar_url } = body;

    // Update user in database
    const result = await query<User>(
      `UPDATE users 
       SET username = COALESCE($2, username),
           email = COALESCE($3, email),
           bio = COALESCE($4, bio),
           avatar_url = COALESCE($5, avatar_url),
           updated_at = NOW()
       WHERE wallet_address = $1
       RETURNING *`,
      [address.toLowerCase(), username, email, bio, avatar_url]
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
      { error: 'Failed to update user' },
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
  const resolvedParams = await params;
  try {
    const { address } = resolvedParams;
    
    // Get form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // In production:
    // 1. Upload to S3/Cloudinary/IPFS
    // 2. Process image (resize, optimize)
    // 3. Update user profile with image URL

    // For now, generate a placeholder URL using DiceBear
    const avatarUrl = getAvatarUrl(address);
    
    // Update user avatar in database
    const result = await query<User>(
      `UPDATE users 
       SET avatar_url = $2, updated_at = NOW()
       WHERE wallet_address = $1
       RETURNING avatar_url`,
      [address.toLowerCase(), avatarUrl]
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
    });
  } catch (error) {
    console.error('[Avatar Upload API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
