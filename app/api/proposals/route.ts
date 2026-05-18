import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, checkOwnership } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { createPublicClient, http, isAddress } from 'viem';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const MAX_PROPOSALS_LIMIT = 100;
const MAX_PROPOSALS_OFFSET = 10000;
const DB_GOVERNANCE_SCORE_FALLBACK_MIN = 5000;
const MAX_VOTING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const SEER_GOVERNANCE_ABI = [
  {
    type: 'function',
    name: 'minForGovernance',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint16' }],
  },
  {
    type: 'function',
    name: 'getScore',
    stateMutability: 'view',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [{ name: '', type: 'uint16' }],
  },
] as const;

const createProposalRequestSchema = z.object({
  proposerAddress: z.string().trim().refine((value) => isAddress(value), {
    message: 'Invalid proposer address format',
  }),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  endsAt: z.coerce.date().optional(),
}).superRefine((value, ctx) => {
  if (!value.endsAt) return;

  const now = Date.now();
  const endsAtMs = value.endsAt.getTime();
  if (endsAtMs <= now) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'endsAt must be in the future',
    });
    return;
  }

  if (endsAtMs > now + MAX_VOTING_WINDOW_MS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'Voting window cannot exceed 30 days',
    });
  }
});

function isDatabaseUnavailableError(error: unknown): boolean {
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const asRecord = typeof current === 'object' ? current as Record<string, unknown> : null;
    const message = current instanceof Error
      ? current.message.toLowerCase()
      : String(current).toLowerCase();
    const code = typeof asRecord?.code === 'string' ? asRecord.code.toLowerCase() : '';

    if (
      code === 'econnrefused' ||
      code === '57p01' ||
      code === '28p01' ||
      code === '42p01' ||
      code === '42703' ||
      message.includes('econnrefused') ||
      message.includes('database query failed') ||
      message.includes('password authentication failed') ||
      message.includes('connect') ||
      message.includes('connection terminated') ||
      message.includes('timeout expired') ||
      message.includes('does not exist')
    ) {
      return true;
    }

    const cause = asRecord?.cause;
    if (cause) stack.push(cause);

    const errors = asRecord?.errors;
    if (Array.isArray(errors)) {
      for (const nested of errors) stack.push(nested);
    }
  }

  return false;
}

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

function getGovernanceRpcUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function verifyOnChainGovernanceEligibility(address: string): Promise<{ verified: boolean; eligible: boolean }> {
  const seerAddress = process.env.NEXT_PUBLIC_SEER_ADDRESS?.trim();
  const rpcUrl = getGovernanceRpcUrl();

  if (!seerAddress || !isAddress(seerAddress) || !rpcUrl) {
    return { verified: false, eligible: false };
  }

  try {
    const seer = seerAddress as `0x${string}`;
    const subject = address as `0x${string}`;
    const client = createPublicClient({ transport: http(rpcUrl) });
    const [minForGovernance, score] = await Promise.all([
      client.readContract({
        address: seer,
        abi: SEER_GOVERNANCE_ABI,
        functionName: 'minForGovernance',
      }),
      client.readContract({
        address: seer,
        abi: SEER_GOVERNANCE_ABI,
        functionName: 'getScore',
        args: [subject],
      }),
    ]);

    return {
      verified: true,
      eligible: Number(score) >= Number(minForGovernance),
    };
  } catch (error) {
    logger.warn('[Proposals POST] On-chain governance eligibility verification failed', error);
    return { verified: false, eligible: false };
  }
}

/**
 * GET /api/proposals?status=active&limit=50&offset=0
 * Get governance proposals
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const proposerId = searchParams.get('proposerId');

    const parsedLimit = parseStrictIntegerParam(limitParam);
    const parsedOffset = parseStrictIntegerParam(offsetParam);

    if ((limitParam !== null && parsedLimit === null) || (offsetParam !== null && parsedOffset === null)) {
      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: 400 }
      );
    }

    // Parse and validate limit/offset with upper bounds
    const limit = parsedLimit === null
      ? 50
      : Math.min(Math.max(1, parsedLimit), MAX_PROPOSALS_LIMIT);
    const offset = parsedOffset === null
      ? 0
      : Math.min(Math.max(0, parsedOffset), MAX_PROPOSALS_OFFSET);

    // Validate status if provided
    const VALID_STATUSES = ['active', 'pending', 'passed', 'rejected', 'executed'];
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const normalizedProposerId = proposerId?.trim().toLowerCase() ?? null;
    if (normalizedProposerId && !isAddress(normalizedProposerId)) {
      return NextResponse.json(
        { error: 'Invalid proposerId address format' },
        { status: 400 }
      );
    }

    const selectBase = `
      SELECT
        p.*,
        u.wallet_address as proposer_address,
        u.username as proposer_username,
        u.avatar_url as proposer_avatar
      FROM proposals p
      JOIN users u ON p.proposer_id = u.id
    `;

    const countBase = `
      SELECT COUNT(*) as count
      FROM proposals p
      JOIN users u ON p.proposer_id = u.id
    `;

    let result;
    let countResult;

    if (status && normalizedProposerId) {
      result = await query<Proposal>(
        `${selectBase} WHERE p.status = $1 AND u.wallet_address = $2 ORDER BY p.created_at DESC LIMIT $3 OFFSET $4`,
        [status, normalizedProposerId, limit, offset]
      );
      countResult = await query<{ count: string }>(
        `${countBase} WHERE p.status = $1 AND u.wallet_address = $2`,
        [status, normalizedProposerId]
      );
    } else if (status) {
      result = await query<Proposal>(
        `${selectBase} WHERE p.status = $1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );
      countResult = await query<{ count: string }>(
        `${countBase} WHERE p.status = $1`,
        [status]
      );
    } else if (normalizedProposerId) {
      result = await query<Proposal>(
        `${selectBase} WHERE u.wallet_address = $1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
        [normalizedProposerId, limit, offset]
      );
      countResult = await query<{ count: string }>(
        `${countBase} WHERE u.wallet_address = $1`,
        [normalizedProposerId]
      );
    } else {
      result = await query<Proposal>(
        `${selectBase} ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      countResult = await query<{ count: string }>(countBase);
    }

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
    logger.error('[Proposals GET API] Error:', error);

    // Graceful degradation for local/offline environments where DB is unavailable.
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({
        proposals: [],
        total: 0,
        limit: 50,
        offset: 0,
        degraded: true,
      });
    }

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
const postHandler = async (request: NextRequest, user: JWTPayload) => {
  // Rate limiting
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authenticatedAddress = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof createProposalRequestSchema>;
  try {
    const rawBody = await request.json();
    const parsed = createProposalRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Proposals POST] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const { proposerAddress, title, description, endsAt } = body;

    // Verify user is creating proposal for themselves
    if (!checkOwnership(user, proposerAddress)) {
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

    // Check eligibility: council members are allowed; otherwise prefer on-chain Seer verification.
    // If chain verification is unavailable, fall back to a strict DB threshold aligned with governance scale.
    const proofScore = Number(proposer.proof_score ?? 0);
    const onChainEligibility = await verifyOnChainGovernanceEligibility(proposerAddress.toLowerCase());
    const dbFallbackEligible = proofScore >= DB_GOVERNANCE_SCORE_FALLBACK_MIN;
    const canPropose = proposer.is_council_member || (onChainEligibility.verified ? onChainEligibility.eligible : dbFallbackEligible);

    if (!canPropose) {
      return NextResponse.json(
        { error: 'Insufficient governance eligibility to propose' },
        { status: 403 }
      );
    }

    // Per-proposer weekly rate limit: max 5 proposals per 7-day window (P2-M-18)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentCount = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM proposals WHERE proposer_id = $1 AND created_at >= $2`,
      [proposer.id, weekAgo]
    );
    const MAX_PROPOSALS_PER_WEEK = 5;
    if (Number(recentCount.rows[0]?.count ?? 0) >= MAX_PROPOSALS_PER_WEEK) {
      return NextResponse.json(
        { error: 'Proposal rate limit exceeded: maximum 5 proposals per week per proposer' },
        { status: 429 }
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
    logger.error('[Proposals POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(postHandler);

/**
 * GET /api/proposals/:id
 * Get a specific proposal
 */
export async function GET_BY_ID(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsedId = parsePositiveInteger(id);
    if (!parsedId) {
      return NextResponse.json(
        { error: 'Invalid proposal ID' },
        { status: 400 }
      );
    }

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
      [parsedId]
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
    logger.error('[Proposal GET BY ID API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposal' },
      { status: 500 }
    );
  }
}
