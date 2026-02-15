import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth, isAdmin } from '@/lib/auth/middleware';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

type ContentType = 'proposal' | 'user' | 'transaction' | 'activity' | 'all';
type SearchStatus = 'active' | 'completed' | 'pending' | 'archived' | 'all';

interface SearchApiItem {
  id: string;
  type: string;
  title: string;
  description: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  createdAt: string;
  score: number;
  category: string;
  status: SearchStatus;
  highlights?: string[];
  tags?: string[];
  attachments?: number;
}

const toSearchStatus = (value?: string | null): SearchStatus => {
  const normalized = value?.toLowerCase();
  if (normalized === 'active' || normalized === 'pending' || normalized === 'archived' || normalized === 'completed') {
    return normalized;
  }
  return 'completed';
};

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const queryText = searchParams.get('q')?.trim() ?? '';
    const typesParam = searchParams.get('types') ?? 'all';
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), MAX_LIMIT) : DEFAULT_LIMIT;
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;

    if (!queryText) {
      return NextResponse.json({ results: [], total: 0, limit, offset });
    }

    const requestedTypes = typesParam.split(',').map((t) => t.trim()).filter(Boolean) as ContentType[];
    const isRequesterAdmin = isAdmin(authResult.user);
    const allowedTypes: Exclude<ContentType, 'all'>[] = isRequesterAdmin
      ? ['proposal', 'user', 'transaction', 'activity']
      : ['proposal', 'user'];
    const types: Exclude<ContentType, 'all'>[] = requestedTypes.includes('all')
      ? allowedTypes
      : (requestedTypes.filter((t) => t !== 'all' && allowedTypes.includes(t as Exclude<ContentType, 'all'>)) as Exclude<ContentType, 'all'>[]);

    if (types.length === 0) {
      return NextResponse.json({ results: [], total: 0, limit, offset });
    }

    const perTypeLimit = Math.max(1, Math.ceil(limit / types.length));
    // Escape LIKE wildcards to prevent pattern injection
    const escapedQuery = queryText.replace(/([%_!])/g, '!$1');
    const searchValue = `%${escapedQuery}%`;
    const results: SearchApiItem[] = [];

    if (types.includes('proposal')) {
      const proposalResult = await query<{
        id: number;
        title: string;
        description: string | null;
        status: string | null;
        votes_for: string | null;
        votes_against: string | null;
        created_at: string;
        wallet_address: string;
        username: string | null;
        avatar_url: string | null;
      }>(
        `SELECT p.id, p.title, p.description, p.status, p.votes_for, p.votes_against, p.created_at,
                u.wallet_address, u.username, u.avatar_url
         FROM proposals p
         JOIN users u ON p.proposer_id = u.id
         WHERE p.title ILIKE $1 ESCAPE '!' OR p.description ILIKE $1 ESCAPE '!'
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchValue, perTypeLimit, offset]
      );

      const proposalResults = proposalResult.rows.map((row) => ({
        id: `proposal-${row.id}`,
        type: 'proposal',
        title: row.title,
        description: row.description ?? '',
        author: {
          id: row.wallet_address,
          username: row.username ?? row.wallet_address,
          displayName: row.username ?? row.wallet_address,
          avatar: row.avatar_url ?? '',
        },
        createdAt: row.created_at,
        score: Number(row.votes_for || 0) - Number(row.votes_against || 0),
        category: 'Governance',
        status: toSearchStatus(row.status),
        highlights: [queryText],
        tags: [],
        attachments: 0,
      }));

      results.push(...proposalResults);
    }

    if (types.includes('user')) {
      const userResult = await query<{
        id: number;
        username: string | null;
        wallet_address: string;
        avatar_url: string | null;
        bio: string | null;
        created_at: string;
        proof_score: number | null;
      }>(
        `SELECT id, username, wallet_address, avatar_url, bio, created_at, proof_score
         FROM users
         WHERE username ILIKE $1 ESCAPE '!' OR wallet_address ILIKE $1 ESCAPE '!' OR bio ILIKE $1 ESCAPE '!'
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchValue, perTypeLimit, offset]
      );

      const userResults = userResult.rows.map((row) => ({
        id: `user-${row.id}`,
        type: 'user',
        title: row.username ?? row.wallet_address,
        description: row.bio ?? 'VFIDE user profile',
        author: {
          id: row.wallet_address,
          username: row.username ?? row.wallet_address,
          displayName: row.username ?? row.wallet_address,
          avatar: row.avatar_url ?? '',
        },
        createdAt: row.created_at,
        score: row.proof_score ?? 0,
        category: 'Community',
        status: toSearchStatus('active'),
        highlights: [queryText],
        tags: [],
        attachments: 0,
      }));

      results.push(...userResults);
    }

    if (types.includes('transaction')) {
      const txResult = await query<{
        id: number;
        type: string;
        amount: string | null;
        status: string | null;
        timestamp: string;
        wallet_address: string;
        username: string | null;
        avatar_url: string | null;
      }>(
        `SELECT t.id, t.type, t.amount, t.status, t.timestamp,
                u.wallet_address, u.username, u.avatar_url
         FROM transactions t
         JOIN users u ON t.user_id = u.id
         WHERE t.type ILIKE $1 ESCAPE '!' OR t.status ILIKE $1 ESCAPE '!'
         ORDER BY t.timestamp DESC
         LIMIT $2 OFFSET $3`,
        [searchValue, perTypeLimit, offset]
      );

      const txResults = txResult.rows.map((row) => ({
        id: `transaction-${row.id}`,
        type: 'transaction',
        title: `${row.type} transaction`,
        description: `Status: ${row.status ?? 'completed'} • Amount: ${row.amount ?? '0'}`,
        author: {
          id: row.wallet_address,
          username: row.username ?? row.wallet_address,
          displayName: row.username ?? row.wallet_address,
          avatar: row.avatar_url ?? '',
        },
        createdAt: row.timestamp,
        score: Number(row.amount ?? 0),
        category: 'Finance',
        status: toSearchStatus(row.status),
        highlights: [queryText],
        tags: [],
        attachments: 0,
      }));

      results.push(...txResults);
    }

    if (types.includes('activity')) {
      const activityResult = await query<{
        id: number;
        activity_type: string | null;
        title: string | null;
        description: string | null;
        created_at: string;
        wallet_address: string;
        username: string | null;
        avatar_url: string | null;
      }>(
        `SELECT a.id, a.activity_type, a.title, a.description, a.created_at,
                u.wallet_address, u.username, u.avatar_url
         FROM activities a
         JOIN users u ON a.user_id = u.id
         WHERE a.title ILIKE $1 ESCAPE '!' OR a.description ILIKE $1 ESCAPE '!' OR a.activity_type ILIKE $1 ESCAPE '!'
         ORDER BY a.created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchValue, perTypeLimit, offset]
      );

      const activityResults = activityResult.rows.map((row) => ({
        id: `activity-${row.id}`,
        type: 'activity',
        title: row.title ?? row.activity_type ?? 'Activity',
        description: row.description ?? 'User activity',
        author: {
          id: row.wallet_address,
          username: row.username ?? row.wallet_address,
          displayName: row.username ?? row.wallet_address,
          avatar: row.avatar_url ?? '',
        },
        createdAt: row.created_at,
        score: 0,
        category: 'Activity',
        status: toSearchStatus('completed'),
        highlights: [queryText],
        tags: [],
        attachments: 0,
      }));

      results.push(...activityResults);
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Search GET API] Error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
