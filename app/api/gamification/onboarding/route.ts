import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

const CHECKLIST_ITEMS = [
  {
    id: 'connect-wallet',
    title: 'Connect Your Wallet',
    description: 'Link your wallet to get started',
    reward: { xp: 50, vfide: 10 },
    action: { label: 'Connected', link: '#' },
    order: 1,
  },
  {
    id: 'setup-guardians',
    title: 'Set Up Guardians',
    description: 'Add 3 trusted guardians for account recovery',
    reward: { xp: 100, vfide: 25, badge: 'Guardian Angel' },
    action: { label: 'Add Guardians', link: '/vault' },
    order: 2,
  },
  {
    id: 'first-transaction',
    title: 'Make First Transaction',
    description: 'Send or receive your first payment',
    reward: { xp: 150, vfide: 50 },
    action: { label: 'Send Payment', link: '/crypto' },
    order: 3,
  },
  {
    id: 'add-friends',
    title: 'Add 3 Friends',
    description: 'Build your network',
    reward: { xp: 100, vfide: 30 },
    action: { label: 'Find Friends', link: '/social' },
    order: 4,
  },
  {
    id: 'send-message',
    title: 'Send First Message',
    description: 'Start a conversation',
    reward: { xp: 75 },
    action: { label: 'Open Chat', link: '/social-messaging' },
    order: 5,
  },
  {
    id: 'cast-vote',
    title: 'Cast Your First Vote',
    description: 'Participate in governance',
    reward: { xp: 200, vfide: 75, badge: 'Active Voter' },
    action: { label: 'View Proposals', link: '/governance' },
    order: 6,
  },
  {
    id: 'proofscore-600',
    title: 'Reach 600 ProofScore',
    description: 'Build your reputation',
    reward: { xp: 300, vfide: 100, badge: 'Trusted Member' },
    action: { label: 'View Score', link: '/dashboard' },
    order: 7,
  },
  {
    id: 'first-badge',
    title: 'Earn Your First Badge',
    description: 'Unlock an achievement',
    reward: { xp: 250, vfide: 150 },
    action: { label: 'View Badges', link: '/achievements' },
    order: 8,
  },
];

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ items: CHECKLIST_ITEMS.map((item) => ({ ...item, completed: false })) });
    }

    const progressResult = await query<{ item_id: string }>(
      'SELECT item_id FROM onboarding_progress WHERE user_id = $1',
      [userId]
    );

    const completedSet = new Set(progressResult.rows.map((row) => row.item_id));

    return NextResponse.json({
      items: CHECKLIST_ITEMS.map((item) => ({
        ...item,
        completed: completedSet.has(item.id),
      })),
    });
  } catch (error) {
    console.error('[Onboarding GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch onboarding checklist' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { itemId, completed } = body as { itemId?: string; completed?: boolean };

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // API-09 Fix: Validate itemId against the whitelist
    if (!CHECKLIST_ITEMS.some(item => item.id === itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (completed === false) {
      await query('DELETE FROM onboarding_progress WHERE user_id = $1 AND item_id = $2', [userId, itemId]);
    } else {
      await query(
        `INSERT INTO onboarding_progress (user_id, item_id, completed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, item_id) DO NOTHING`,
        [userId, itemId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Onboarding PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update onboarding checklist' }, { status: 500 });
  }
}
