import { NextRequest, NextResponse } from 'next/server';

// In-memory gamification storage (use database in production)
const gamificationStore = new Map<string, any>();
const leaderboardCache = { data: [] as any[], lastUpdate: 0 };

/**
 * GET /api/gamification?address=xxx
 * Get user's gamification progress
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'address is required' },
        { status: 400 }
      );
    }

    const progress = gamificationStore.get(address.toLowerCase());

    if (!progress) {
      // Return default progress for new users
      return NextResponse.json({
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        achievements: [],
        stats: {
          messagesSent: 0,
          friendsAdded: 0,
          groupsCreated: 0,
          paymentsSent: 0,
          daysActive: 0,
          lastActiveDate: '',
          currentStreak: 0,
          longestStreak: 0,
        },
      });
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('[Gamification GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gamification data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gamification/xp
 * Award XP to user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, amount, reason } = body;

    if (!address || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get existing progress
    const progress = gamificationStore.get(address.toLowerCase()) || {
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      achievements: [],
      stats: {
        messagesSent: 0,
        friendsAdded: 0,
        groupsCreated: 0,
        paymentsSent: 0,
        daysActive: 0,
        lastActiveDate: '',
        currentStreak: 0,
        longestStreak: 0,
      },
    };

    // Add XP
    progress.xp += amount;

    // Check for level up
    let levelUp = false;
    while (progress.xp >= progress.xpToNextLevel) {
      progress.level += 1;
      levelUp = true;
      // Exponential XP curve: 100, 250, 500, 850, 1300...
      progress.xpToNextLevel = Math.floor(100 * Math.pow(progress.level, 1.5));
    }

    // Save progress
    gamificationStore.set(address.toLowerCase(), progress);

    // Invalidate leaderboard cache
    leaderboardCache.lastUpdate = 0;

    return NextResponse.json({
      success: true,
      levelUp,
      progress,
      reason,
    });
  } catch (error) {
    console.error('[Gamification XP API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gamification/leaderboard
 * Get global leaderboard
 */
export async function GET_LEADERBOARD(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'xp';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Check cache (1 minute TTL)
    if (leaderboardCache.lastUpdate > Date.now() - 60000) {
      return NextResponse.json({
        leaderboard: leaderboardCache.data.slice(0, limit),
        cached: true,
      });
    }

    // Build leaderboard
    const entries = Array.from(gamificationStore.entries()).map(([address, progress]) => ({
      address,
      level: progress.level,
      totalXP: progress.xp,
      achievementCount: progress.achievements.length,
    }));

    // Sort based on category
    entries.sort((a, b) => {
      switch (category) {
        case 'xp':
          return b.totalXP - a.totalXP;
        case 'level':
          return b.level - a.level || b.totalXP - a.totalXP;
        case 'achievements':
          return b.achievementCount - a.achievementCount;
        default:
          return 0;
      }
    });

    // Add ranks
    const leaderboard = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Update cache
    leaderboardCache.data = leaderboard;
    leaderboardCache.lastUpdate = Date.now();

    return NextResponse.json({
      leaderboard: leaderboard.slice(0, limit),
      total: leaderboard.length,
      cached: false,
    });
  } catch (error) {
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
