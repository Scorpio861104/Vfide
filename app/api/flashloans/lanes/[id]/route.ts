import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { withRateLimit } from '@/lib/auth/rateLimit'
import { getLaneById, getLaneEvents } from '@/lib/flashloans/repository'
import { logger } from '@/lib/logger';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase()
}

function parseLaneId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function canAccessLane(authAddress: string, lane: {
  borrower_address: string
  lender_address: string
  arbiter_address: string | null
}): boolean {
  return (
    authAddress === lane.borrower_address ||
    authAddress === lane.lender_address ||
    authAddress === lane.arbiter_address
  )
}

export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimited = await withRateLimit(request, 'read')
  if (rateLimited) return rateLimited
  const authAddress = normalizeAddress(user.address || '')
  if (!ADDRESS_RE.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await params
  const laneId = parseLaneId(resolved.id)
  if (!laneId) {
    return NextResponse.json({ error: 'Invalid lane id' }, { status: 400 })
  }

  try {
    const lane = await getLaneById(laneId)
    if (!lane) {
      return NextResponse.json({ error: 'Lane not found' }, { status: 404 })
    }

    if (!canAccessLane(authAddress, lane)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const events = await getLaneEvents(laneId, 100)
    return NextResponse.json({ lane, events })
  } catch (error) {
    logger.error('[Flashloans GET lane] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch lane' }, { status: 500 })
  }
});
