import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { withRateLimit } from '@/lib/auth/rateLimit'
import { createLane, listLanesForAddress } from '@/lib/flashloans/repository'
import { sanitizeTerms, validateSimulationState, type LoanSimulationState, type LoanTerms } from '@/lib/flashloans/engine'
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

const createLaneSchema = z.object({
  lenderAddress: z.string().trim().regex(ADDRESS_RE),
  arbiterAddress: z.string().trim().regex(ADDRESS_RE).optional(),
  principal: z.coerce.number(),
  durationDays: z.coerce.number(),
  interestBps: z.coerce.number(),
  collateralPct: z.coerce.number(),
  drawnAmount: z.coerce.number().optional(),
})

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase()
}

function parseLimit(value: string | null): number {
  if (!value) return 50
  const parsed = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 50
  return Math.min(parsed, 200)
}

export async function GET(request: NextRequest) {
  const rateLimited = await withRateLimit(request, 'read')
  if (rateLimited) return rateLimited

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const authAddress = normalizeAddress(authResult.user.address || '')
  if (!ADDRESS_RE.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get('limit'))

  try {
    const lanes = await listLanesForAddress(authAddress, limit)
    return NextResponse.json({ lanes })
  } catch (error) {
    logger.error('[Flashloans GET] Error:', error)
    return NextResponse.json({ error: 'Failed to list lanes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = await withRateLimit(request, 'write')
  if (rateLimited) return rateLimited

  const authResult = await requireAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const authAddress = normalizeAddress(authResult.user.address || '')
  if (!ADDRESS_RE.test(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: z.infer<typeof createLaneSchema>
  try {
    const rawBody = await request.json()
    const parsed = createLaneSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    body = parsed.data
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const lenderAddressRaw = typeof body.lenderAddress === 'string' ? normalizeAddress(body.lenderAddress) : ''
  const arbiterAddressRaw = typeof body.arbiterAddress === 'string' ? normalizeAddress(body.arbiterAddress) : null

  if (!ADDRESS_RE.test(lenderAddressRaw)) {
    return NextResponse.json({ error: 'Valid lenderAddress required' }, { status: 400 })
  }
  if (arbiterAddressRaw && !ADDRESS_RE.test(arbiterAddressRaw)) {
    return NextResponse.json({ error: 'Invalid arbiterAddress' }, { status: 400 })
  }
  if (lenderAddressRaw === authAddress) {
    return NextResponse.json({ error: 'Borrower and lender must be distinct addresses' }, { status: 400 })
  }

  const rawTerms: LoanTerms = {
    principal: Number(body.principal),
    durationDays: Number(body.durationDays),
    interestBps: Number(body.interestBps),
    collateralPct: Number(body.collateralPct),
    drawnAmount: Number(body.drawnAmount ?? body.principal),
  }

  const terms = sanitizeTerms(rawTerms)
  const initialState: LoanSimulationState = {
    stage: 'draft',
    simDay: 0,
    dueDay: null,
    evidenceNote: '',
  }

  try {
    validateSimulationState(initialState)
    const lane = await createLane({
      borrowerAddress: authAddress,
      lenderAddress: lenderAddressRaw,
      arbiterAddress: arbiterAddressRaw,
      terms,
      state: initialState,
    })

    return NextResponse.json({ lane }, { status: 201 })
  } catch (error) {
    logger.error('[Flashloans POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create lane' }, { status: 500 })
  }
}
