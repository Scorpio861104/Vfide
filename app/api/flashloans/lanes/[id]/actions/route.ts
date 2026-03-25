import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { withRateLimit } from '@/lib/auth/rateLimit'
import {
  appendLaneEvent,
  getLaneById,
  toEngineState,
  toEngineTerms,
  updateLaneState,
} from '@/lib/flashloans/repository'
import {
  performAction,
  sanitizeTerms,
  type ActorRole,
  type LoanAction,
  type LoanTerms,
} from '@/lib/flashloans/engine'
import { logger } from '@/lib/logger';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const ACTIONS: LoanAction[] = [
  'request',
  'approve',
  'fund-escrow',
  'draw',
  'repay',
  'raise-dispute',
  'resolve-borrower',
  'resolve-lender',
  'advance-day',
  'reset',
]

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase()
}

function parseLaneId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function resolveActorRole(authAddress: string, lane: {
  borrower_address: string
  lender_address: string
  arbiter_address: string | null
}): ActorRole | null {
  if (authAddress === lane.borrower_address) return 'borrower'
  if (authAddress === lane.lender_address) return 'lender'
  if (authAddress === lane.arbiter_address) return 'arbiter'
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseAction(value: unknown): LoanAction | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim() as LoanAction
  return ACTIONS.includes(normalized) ? normalized : null
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimited = await withRateLimit(request, 'write')
  if (rateLimited) return rateLimited

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const authAddress = normalizeAddress(authResult.user.address || '')
  if (!ADDRESS_RE.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await params
  const laneId = parseLaneId(resolved.id)
  if (!laneId) {
    return NextResponse.json({ error: 'Invalid lane id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 })
  }

  const action = parseAction(body.action)
  if (!action) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  try {
    const lane = await getLaneById(laneId)
    if (!lane) {
      return NextResponse.json({ error: 'Lane not found' }, { status: 404 })
    }

    const role = resolveActorRole(authAddress, lane)
    if (!role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentState = toEngineState(lane)
    const currentTerms: LoanTerms = toEngineTerms(lane)

    const patchedTerms = sanitizeTerms({
      ...currentTerms,
      drawnAmount:
        action === 'draw' && body.drawnAmount !== undefined
          ? Number(body.drawnAmount)
          : currentTerms.drawnAmount,
    })

    const evidenceNote = typeof body.evidenceNote === 'string' ? body.evidenceNote : currentState.evidenceNote

    const result = performAction(action, role, currentState, patchedTerms, { evidenceNote })

    const updatedLane = await updateLaneState(laneId, result.state, patchedTerms)
    await appendLaneEvent({
      laneId,
      actorAddress: authAddress,
      actorRole: role,
      action,
      eventText: result.event,
      metadata: {
        terms: patchedTerms,
        state: result.state,
      },
    })

    return NextResponse.json({ lane: updatedLane, event: result.event })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed'
    if (
      message.includes('Action not allowed') ||
      message.includes('requires') ||
      message.includes('expired') ||
      message.includes('Invalid simulation state')
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    logger.error('[Flashloans POST action] Error:', error)
    return NextResponse.json({ error: 'Failed to apply action' }, { status: 500 })
  }
}
