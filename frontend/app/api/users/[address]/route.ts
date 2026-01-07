import { NextRequest, NextResponse } from 'next/server';

// In-memory user profiles (use database in production)
const usersStore = new Map<string, any>();

/**
 * GET /api/users/:address
 * Get user profile
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

    const user = usersStore.get(address.toLowerCase());

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
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

    // Get existing user or create new
    const existingUser = usersStore.get(address.toLowerCase()) || {
      address: address.toLowerCase(),
      createdAt: Date.now(),
    };

    // Update user data
    const updatedUser = {
      ...existingUser,
      ...body,
      address: address.toLowerCase(), // Prevent address override
      updatedAt: Date.now(),
    };

    usersStore.set(address.toLowerCase(), updatedUser);

    return NextResponse.json({
      success: true,
      user: updatedUser,
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

    // For now, just store metadata
    const user = usersStore.get(address.toLowerCase()) || { address: address.toLowerCase() };
    user.avatar = `https://placeholder.com/avatars/${address.toLowerCase()}.jpg`;
    user.updatedAt = Date.now();
    usersStore.set(address.toLowerCase(), user);

    return NextResponse.json({
      success: true,
      avatarUrl: user.avatar,
    });
  } catch (error) {
    console.error('[Avatar Upload API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
