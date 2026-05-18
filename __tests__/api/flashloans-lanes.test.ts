import { NextRequest, NextResponse } from 'next/server'
import { GET as listLanes, POST as createLaneRoute } from '@/app/api/flashloans/lanes/route'
import { GET as getLaneRoute } from '@/app/api/flashloans/lanes/[id]/route'
import { POST as laneActionRoute } from '@/app/api/flashloans/lanes/[id]/actions/route'

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}))

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/flashloans/repository', () => ({
  createLane: jest.fn(),
  listLanesForAddress: jest.fn(),
  getLaneById: jest.fn(),
  getLaneEvents: jest.fn(),
  toEngineState: jest.fn(),
  toEngineTerms: jest.fn(),
  updateLaneState: jest.fn(),
  appendLaneEvent: jest.fn(),
}))

describe('/api/flashloans/lanes routes', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit')
  const { requireAuth } = require('@/lib/auth/middleware')
  const repo = require('@/lib/flashloans/repository')

  const borrower = '0x1111111111111111111111111111111111111111'
  const lender = '0x2222222222222222222222222222222222222222'
  const arbiter = '0x3333333333333333333333333333333333333333'

  const laneRecord = {
    id: 1,
    borrower_address: borrower,
    lender_address: lender,
    arbiter_address: arbiter,
    principal: '1500',
    duration_days: 14,
    interest_bps: 600,
    collateral_pct: 125,
    drawn_amount: '1000',
    stage: 'drawn',
    sim_day: 3,
    due_day: 17,
    evidence_note: '',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    withRateLimit.mockResolvedValue(null)
    requireAuth.mockReturnValue({ user: { address: borrower } })
  })

  it('creates lane with valid terms and counterparties', async () => {
    repo.createLane.mockResolvedValue({ ...laneRecord, stage: 'draft', due_day: null, sim_day: 0, drawn_amount: '1500' })

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes', {
      method: 'POST',
      body: JSON.stringify({
        lenderAddress: lender,
        arbiterAddress: arbiter,
        principal: 1500,
        durationDays: 14,
        interestBps: 600,
        collateralPct: 125,
        drawnAmount: 1200,
      }),
    })

    const response = await createLaneRoute(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.lane.id).toBe(1)
    expect(repo.createLane).toHaveBeenCalledTimes(1)
  })

  it('rejects lane creation when borrower and lender are equal', async () => {
    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes', {
      method: 'POST',
      body: JSON.stringify({
        lenderAddress: borrower,
        principal: 1500,
        durationDays: 14,
        interestBps: 600,
        collateralPct: 125,
        drawnAmount: 1000,
      }),
    })

    const response = await createLaneRoute(request)
    expect(response.status).toBe(400)
  })

  it('lists lanes for authenticated party', async () => {
    repo.listLanesForAddress.mockResolvedValue([laneRecord])

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes?limit=10')
    const response = await listLanes(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.lanes).toHaveLength(1)
  })

  it('rejects invalid authenticated address on list endpoint', async () => {
    requireAuth.mockReturnValue({ user: { address: '0xabc' } })

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes?limit=10')
    const response = await listLanes(request)

    expect(response.status).toBe(401)
  })

  it('returns lane + events when authenticated party has access', async () => {
    repo.getLaneById.mockResolvedValue(laneRecord)
    repo.getLaneEvents.mockResolvedValue([{ id: 5, lane_id: 1, event_text: 'Borrower requested lane' }])

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/1')
    const response = await getLaneRoute(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.lane.id).toBe(1)
    expect(data.events).toHaveLength(1)
  })

  it('returns 400 for invalid lane id on lane detail route', async () => {
    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/not-a-number')
    const response = await getLaneRoute(request, { params: Promise.resolve({ id: 'not-a-number' }) })

    expect(response.status).toBe(400)
  })

  it('returns 404 when lane detail is requested for missing lane', async () => {
    repo.getLaneById.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/777')
    const response = await getLaneRoute(request, { params: Promise.resolve({ id: '777' }) })

    expect(response.status).toBe(404)
  })

  it('returns 403 when lane detail requester is not a lane participant', async () => {
    requireAuth.mockReturnValue({ user: { address: '0x9999999999999999999999999999999999999999' } })
    repo.getLaneById.mockResolvedValue(laneRecord)

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/1')
    const response = await getLaneRoute(request, { params: Promise.resolve({ id: '1' }) })

    expect(response.status).toBe(403)
  })

  it('blocks lane action for non-party', async () => {
    requireAuth.mockReturnValue({ user: { address: '0x9999999999999999999999999999999999999999' } })
    repo.getLaneById.mockResolvedValue(laneRecord)

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/1/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'request' }),
    })

    const response = await laneActionRoute(request, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(403)
  })

  it('applies lane action and appends immutable event', async () => {
    repo.getLaneById.mockResolvedValue({ ...laneRecord, stage: 'draft', sim_day: 0, due_day: null, evidence_note: '' })
    repo.toEngineState.mockReturnValue({ stage: 'draft', simDay: 0, dueDay: null, evidenceNote: '' })
    repo.toEngineTerms.mockReturnValue({ principal: 1500, durationDays: 14, interestBps: 600, collateralPct: 125, drawnAmount: 1000 })
    repo.updateLaneState.mockResolvedValue({ ...laneRecord, stage: 'requested', sim_day: 0, due_day: null })
    repo.appendLaneEvent.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/1/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'request', evidenceNote: '' }),
    })

    const response = await laneActionRoute(request, { params: Promise.resolve({ id: '1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.lane.stage).toBe('requested')
    expect(repo.appendLaneEvent).toHaveBeenCalledTimes(1)
  })

  it('returns 400 for invalid action payload', async () => {
    repo.getLaneById.mockResolvedValue(laneRecord)

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/1/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'not-real-action' }),
    })

    const response = await laneActionRoute(request, { params: Promise.resolve({ id: '1' }) })
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid lane id on action route', async () => {
    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/invalid/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'request' }),
    })

    const response = await laneActionRoute(request, { params: Promise.resolve({ id: 'invalid' }) })
    expect(response.status).toBe(400)
  })

  it('returns 404 for action route when lane is missing', async () => {
    repo.getLaneById.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/404/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'request' }),
    })

    const response = await laneActionRoute(request, { params: Promise.resolve({ id: '404' }) })
    expect(response.status).toBe(404)
  })

  it('returns 400 when dispute action is missing evidence', async () => {
    repo.getLaneById.mockResolvedValue({ ...laneRecord, stage: 'drawn', sim_day: 3, due_day: 17, evidence_note: '' })
    repo.toEngineState.mockReturnValue({ stage: 'drawn', simDay: 3, dueDay: 17, evidenceNote: '' })
    repo.toEngineTerms.mockReturnValue({ principal: 1500, durationDays: 14, interestBps: 600, collateralPct: 125, drawnAmount: 1000 })

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/1/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'raise-dispute', evidenceNote: 'short' }),
    })

    const response = await laneActionRoute(request, { params: Promise.resolve({ id: '1' }) })
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toMatch(/requires evidence note/i)
  })

  it('allows lender to raise dispute when evidence is provided', async () => {
    requireAuth.mockReturnValue({ user: { address: lender } })
    repo.getLaneById.mockResolvedValue({ ...laneRecord, stage: 'drawn', sim_day: 3, due_day: 17, evidence_note: '' })
    repo.toEngineState.mockReturnValue({ stage: 'drawn', simDay: 3, dueDay: 17, evidenceNote: '' })
    repo.toEngineTerms.mockReturnValue({ principal: 1500, durationDays: 14, interestBps: 600, collateralPct: 125, drawnAmount: 1000 })
    repo.updateLaneState.mockResolvedValue({ ...laneRecord, stage: 'disputed', sim_day: 3, due_day: 17, evidence_note: 'Lender evidence pack submitted for arbitration.' })
    repo.appendLaneEvent.mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes/1/actions', {
      method: 'POST',
      body: JSON.stringify({
        action: 'raise-dispute',
        evidenceNote: 'Lender evidence pack submitted for arbitration.',
      }),
    })

    const response = await laneActionRoute(request, { params: Promise.resolve({ id: '1' }) })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.lane.stage).toBe('disputed')
    expect(repo.appendLaneEvent).toHaveBeenCalledTimes(1)
  })

  it('short-circuits on rate-limit response', async () => {
    withRateLimit.mockResolvedValueOnce(NextResponse.json({ error: 'Rate limited' }, { status: 429 }))

    const request = new NextRequest('http://localhost:3000/api/flashloans/lanes')
    const response = await listLanes(request)

    expect(response.status).toBe(429)
  })
})
