import {
  canPerformAction,
  computeTotalDue,
  performAction,
  sanitizeTerms,
  validateSimulationState,
  type ActorRole,
  type LoanSimulationState,
  type LoanTerms,
} from '@/lib/flashloans/engine'

describe('flashloans engine institutional invariants', () => {
  const baseTerms: LoanTerms = {
    principal: 1500,
    durationDays: 14,
    interestBps: 600,
    collateralPct: 125,
    drawnAmount: 1000,
  }

  const baseState: LoanSimulationState = {
    stage: 'draft',
    simDay: 0,
    dueDay: null,
    evidenceNote: '',
  }

  it('sanitizes terms into policy bounds', () => {
    const sanitized = sanitizeTerms({
      principal: -1,
      durationDays: 999,
      interestBps: 1,
      collateralPct: 999,
      drawnAmount: 999999,
    })

    expect(sanitized.principal).toBe(100)
    expect(sanitized.durationDays).toBe(30)
    expect(sanitized.interestBps).toBe(100)
    expect(sanitized.collateralPct).toBe(200)
    expect(sanitized.drawnAmount).toBe(100)
  })

  it('computes due from drawn amount, not full principal', () => {
    expect(computeTotalDue(baseTerms)).toBe(1060)
  })

  it('enforces role-based action permissions', () => {
    const requested = performAction('request', 'borrower', baseState, baseTerms).state
    expect(canPerformAction('approve', 'borrower', requested, baseTerms)).toBe(false)
    expect(canPerformAction('approve', 'lender', requested, baseTerms)).toBe(true)
  })

  it('requires evidence for dispute', () => {
    const requested = performAction('request', 'borrower', baseState, baseTerms).state
    const approved = performAction('approve', 'lender', requested, baseTerms).state
    const funded = performAction('fund-escrow', 'lender', approved, baseTerms).state

    expect(() => performAction('raise-dispute', 'borrower', funded, baseTerms)).toThrow(
      'Dispute requires evidence note'
    )
  })

  it('allows lender to raise dispute with sufficient evidence', () => {
    const requested = performAction('request', 'borrower', baseState, baseTerms).state
    const approved = performAction('approve', 'lender', requested, baseTerms).state
    const funded = performAction('fund-escrow', 'lender', approved, baseTerms).state

    const disputed = performAction('raise-dispute', 'lender', funded, baseTerms, {
      evidenceNote: 'Lender provides escrow reconciliation and breach timeline details.',
    }).state

    expect(disputed.stage).toBe('disputed')
    expect(disputed.evidenceNote).toMatch(/Lender provides escrow reconciliation/i)
  })

  it('requires arbiter evidence for resolution', () => {
    const requested = performAction('request', 'borrower', baseState, baseTerms).state
    const approved = performAction('approve', 'lender', requested, baseTerms).state
    const funded = performAction('fund-escrow', 'lender', approved, baseTerms).state
    const disputed = performAction('raise-dispute', 'borrower', funded, baseTerms, {
      evidenceNote: 'Borrower included transfer hashes and timeline.',
    }).state

    expect(() => performAction('resolve-lender', 'arbiter', disputed, baseTerms)).toThrow(
      'Resolution requires arbitration note'
    )
  })

  it('auto-disputes overdue draw on day advancement', () => {
    const requested = performAction('request', 'borrower', baseState, baseTerms).state
    const approved = performAction('approve', 'lender', requested, baseTerms).state
    const funded = performAction('fund-escrow', 'lender', approved, baseTerms).state
    const drawn = performAction('draw', 'borrower', funded, baseTerms).state

    let current = drawn
    for (let i = 0; i <= baseTerms.durationDays; i += 1) {
      current = performAction('advance-day', 'simulator', current, baseTerms).state
    }

    expect(current.stage).toBe('disputed')
    expect(current.evidenceNote).toContain('Auto-flagged')
  })

  it('blocks repay after due date has expired', () => {
    const requested = performAction('request', 'borrower', baseState, baseTerms).state
    const approved = performAction('approve', 'lender', requested, baseTerms).state
    const funded = performAction('fund-escrow', 'lender', approved, baseTerms).state
    const drawn = performAction('draw', 'borrower', funded, baseTerms).state

    const overdueState: LoanSimulationState = {
      ...drawn,
      simDay: (drawn.dueDay || 0) + 1,
    }

    expect(() => performAction('repay', 'borrower', overdueState, baseTerms)).toThrow(
      'Repayment window has expired'
    )
  })

  it('rejects invalid state shapes via invariant checks', () => {
    const invalidState: LoanSimulationState = {
      stage: 'approved',
      simDay: 0,
      dueDay: 3,
      evidenceNote: '',
    }

    expect(() => validateSimulationState(invalidState)).toThrow(
      'dueDay must be null before draw'
    )
  })

  it('supports simulator role to perform all transitions', () => {
    const role: ActorRole = 'simulator'
    const requested = performAction('request', role, baseState, baseTerms).state
    const approved = performAction('approve', role, requested, baseTerms).state
    const funded = performAction('fund-escrow', role, approved, baseTerms).state
    const drawn = performAction('draw', role, funded, baseTerms).state
    const repaid = performAction('repay', role, drawn, baseTerms).state

    expect(repaid.stage).toBe('repaid')
  })
})
