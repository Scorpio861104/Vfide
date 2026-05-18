import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit'
import type { JWTPayload } from '@/lib/auth/jwt';
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
import { z } from 'zod4';

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

const flashloanLaneActionSchema = z.object({
  action: z.enum(ACTIONS),
  drawnAmount: z.coerce.number().optional(),
  evidenceNote: z.string().optional(),
})

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

function toUserSafeActionError(message: string): string {
  if (message.toLowerCase().includes('requires evidence')) {
    return 'Action requires evidence note.'
  }

  if (message.includes('expired')) {
    return 'Action cannot be performed because the lane is expired.'
  }

  if (message.includes('Invalid simulation state')) {
    return 'Action cannot be applied due to invalid lane state.'
  }

  if (message.includes('Action not allowed') || message.includes('requires')) {
    return 'Action is not allowed in the current lane state.'
  }

  return 'Action failed validation.'
}

export const POST = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rateLimited = await withRateLimit(request, 'write')
  if (rateLimited) return rateLimited
  const authAddress = normalizeAddress(user.address || '')
  if (!ADDRESS_RE.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await context!.params
  const laneId = parseLaneId(resolved.id ?? '')
  if (!laneId) {
    return NextResponse.json({ error: 'Invalid lane id' }, { status: 400 })
  }

  let body: z.infer<typeof flashloanLaneActionSchema>
  try {
    const rawBody = await request.json()
    const parsed = flashloanLaneActionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    body = parsed.data
  } catch (error) {
    logger.debug('[Flashloans Action POST] Invalid JSON body', error)
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body.action

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
      return NextResponse.json({ error: toUserSafeActionError(message) }, { status: 400 })
    }

    logger.error('[Flashloans POST action] Error:', error)
    return NextResponse.json({ error: 'Failed to apply action' }, { status: 500 })
  }
});
