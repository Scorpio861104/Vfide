export type LoanStage =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'escrow-funded'
  | 'drawn'
  | 'repaid'
  | 'disputed'
  | 'resolved-borrower'
  | 'resolved-lender'

export type ActorRole = 'simulator' | 'borrower' | 'lender' | 'arbiter'

export type LoanAction =
  | 'request'
  | 'approve'
  | 'fund-escrow'
  | 'draw'
  | 'repay'
  | 'raise-dispute'
  | 'resolve-borrower'
  | 'resolve-lender'
  | 'advance-day'
  | 'reset'

export interface LoanTerms {
  principal: number
  durationDays: number
  interestBps: number
  collateralPct: number
  drawnAmount: number
}

export interface LoanSimulationState {
  stage: LoanStage
  simDay: number
  dueDay: number | null
  evidenceNote: string
}

export interface ProtectionStatus {
  borrowerProtected: boolean
  lenderProtected: boolean
}

export interface ActionResult {
  state: LoanSimulationState
  event: string
}

export interface ActionContext {
  evidenceNote?: string
}

export function sanitizeTerms(terms: LoanTerms): LoanTerms {
  const principal = Math.max(100, Math.floor(Number(terms.principal) || 100))
  const durationDays = Math.min(30, Math.max(1, Math.floor(Number(terms.durationDays) || 1)))
  const interestBps = Math.min(1200, Math.max(100, Math.floor(Number(terms.interestBps) || 100)))
  const collateralPct = Math.min(200, Math.max(110, Math.floor(Number(terms.collateralPct) || 110)))
  const drawnAmount = Math.min(principal, Math.max(1, Math.floor(Number(terms.drawnAmount) || 1)))

  return {
    principal,
    durationDays,
    interestBps,
    collateralPct,
    drawnAmount,
  }
}

export function getProtectionStatus(terms: LoanTerms): ProtectionStatus {
  return {
    borrowerProtected: terms.collateralPct <= 200 && terms.interestBps <= 1200,
    lenderProtected: terms.collateralPct >= 110,
  }
}

export function computeTotalDue(terms: LoanTerms): number {
  const principal = Math.min(terms.drawnAmount, terms.principal)
  const interest = (principal * terms.interestBps) / 10000
  return principal + interest
}

export function validateSimulationState(state: LoanSimulationState): void {
  if (state.simDay < 0) {
    throw new Error('Invalid simulation state: simDay cannot be negative')
  }

  const preDrawStages: LoanStage[] = ['draft', 'requested', 'approved', 'escrow-funded']
  if (preDrawStages.includes(state.stage) && state.dueDay !== null) {
    throw new Error('Invalid simulation state: dueDay must be null before draw')
  }
}

function hasRole(role: ActorRole, required: Exclude<ActorRole, 'simulator'>): boolean {
  return role === 'simulator' || role === required
}

function hasAnyRole(role: ActorRole, required: Array<Exclude<ActorRole, 'simulator'>>): boolean {
  return role === 'simulator' || required.includes(role)
}

export function canPerformAction(
  action: LoanAction,
  role: ActorRole,
  state: LoanSimulationState,
  terms: LoanTerms
): boolean {
  const { borrowerProtected, lenderProtected } = getProtectionStatus(terms)

  switch (action) {
    case 'request':
      return state.stage === 'draft' && borrowerProtected && lenderProtected && hasRole(role, 'borrower')
    case 'approve':
      return state.stage === 'requested' && hasRole(role, 'lender')
    case 'fund-escrow':
      return state.stage === 'approved' && hasRole(role, 'lender')
    case 'draw':
      return (
        state.stage === 'escrow-funded' &&
        hasRole(role, 'borrower') &&
        terms.drawnAmount > 0 &&
        terms.drawnAmount <= terms.principal
      )
    case 'repay':
      return state.stage === 'drawn' && hasRole(role, 'borrower')
    case 'raise-dispute':
      return (
        (state.stage === 'escrow-funded' || state.stage === 'drawn') &&
        hasAnyRole(role, ['borrower', 'lender'])
      )
    case 'resolve-borrower':
    case 'resolve-lender':
      return state.stage === 'disputed' && hasRole(role, 'arbiter')
    case 'advance-day':
      return true
    case 'reset':
      return true
    default:
      return false
  }
}

export function performAction(
  action: LoanAction,
  role: ActorRole,
  current: LoanSimulationState,
  termsInput: LoanTerms,
  context: ActionContext = {}
): ActionResult {
  const terms = sanitizeTerms(termsInput)
  validateSimulationState(current)

  if (!canPerformAction(action, role, current, terms)) {
    throw new Error(`Action not allowed: ${action}`)
  }

  if (action === 'raise-dispute') {
    const note = (context.evidenceNote || '').trim()
    if (note.length < 10) {
      throw new Error('Dispute requires evidence note (min 10 characters)')
    }
  }

  if (action === 'resolve-borrower' || action === 'resolve-lender') {
    const note = (context.evidenceNote || '').trim()
    if (note.length < 10) {
      throw new Error('Resolution requires arbitration note (min 10 characters)')
    }
  }

  const next: LoanSimulationState = { ...current }
  let event = ''

  switch (action) {
    case 'request':
      next.stage = 'requested'
      event = 'Borrower requested lane'
      break
    case 'approve':
      next.stage = 'approved'
      event = 'Lender approved terms'
      break
    case 'fund-escrow':
      next.stage = 'escrow-funded'
      event = 'Lender funded escrow'
      break
    case 'draw':
      next.stage = 'drawn'
      next.dueDay = next.simDay + terms.durationDays
      event = `Borrower drew ${terms.drawnAmount} USDC; due day ${next.dueDay}`
      break
    case 'repay':
      if (next.dueDay !== null && next.simDay > next.dueDay) {
        throw new Error('Repayment window has expired; dispute is required')
      }
      next.stage = 'repaid'
      event = `Borrower repaid ${computeTotalDue(terms).toFixed(2)} USDC`
      break
    case 'raise-dispute':
      next.stage = 'disputed'
      next.evidenceNote = (context.evidenceNote || '').trim()
      event = 'Borrower raised dispute'
      break
    case 'resolve-borrower':
      next.stage = 'resolved-borrower'
      next.evidenceNote = (context.evidenceNote || '').trim()
      event = 'Arbiter resolved to borrower'
      break
    case 'resolve-lender':
      next.stage = 'resolved-lender'
      next.evidenceNote = (context.evidenceNote || '').trim()
      event = 'Arbiter resolved to lender'
      break
    case 'advance-day':
      next.simDay += 1
      event = `Simulation advanced to day ${next.simDay}`
      if (next.stage === 'drawn' && next.dueDay !== null && next.simDay > next.dueDay) {
        next.stage = 'disputed'
        if (!next.evidenceNote.trim()) {
          next.evidenceNote = `Auto-flagged: repayment window missed on day ${next.dueDay} (current day ${next.simDay}).`
        }
        event = `${event}; auto-dispute due to overdue repayment`
      }
      break
    case 'reset':
      next.stage = 'draft'
      next.simDay = 0
      next.dueDay = null
      next.evidenceNote = ''
      event = 'Simulation reset'
      break
  }

  validateSimulationState(next)

  return { state: next, event }
}
