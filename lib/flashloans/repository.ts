import { query } from '@/lib/db'
import type { ActorRole, LoanAction, LoanSimulationState, LoanTerms, LoanStage } from './engine'

export interface FlashloanLaneRecord {
  id: number
  borrower_address: string
  lender_address: string
  arbiter_address: string | null
  principal: string
  duration_days: number
  interest_bps: number
  collateral_pct: number
  drawn_amount: string
  stage: LoanStage
  sim_day: number
  due_day: number | null
  evidence_note: string
  created_at: string
  updated_at: string
}

export interface FlashloanLaneEventRecord {
  id: number
  lane_id: number
  actor_address: string
  actor_role: ActorRole
  action: LoanAction
  event_text: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface CreateLaneInput {
  borrowerAddress: string
  lenderAddress: string
  arbiterAddress?: string | null
  terms: LoanTerms
  state: LoanSimulationState
}

export async function createLane(input: CreateLaneInput): Promise<FlashloanLaneRecord> {
  const result = await query<FlashloanLaneRecord>(
    `INSERT INTO flashloan_lanes (
      borrower_address,
      lender_address,
      arbiter_address,
      principal,
      duration_days,
      interest_bps,
      collateral_pct,
      drawn_amount,
      stage,
      sim_day,
      due_day,
      evidence_note
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      input.borrowerAddress,
      input.lenderAddress,
      input.arbiterAddress || null,
      input.terms.principal,
      input.terms.durationDays,
      input.terms.interestBps,
      input.terms.collateralPct,
      input.terms.drawnAmount,
      input.state.stage,
      input.state.simDay,
      input.state.dueDay,
      input.state.evidenceNote,
    ]
  )

  return result.rows[0]!
}

export async function getLaneById(id: number): Promise<FlashloanLaneRecord | null> {
  const result = await query<FlashloanLaneRecord>(
    `SELECT * FROM flashloan_lanes WHERE id = $1`,
    [id]
  )
  return result.rows[0] || null
}

export async function listLanesForAddress(address: string, limit = 50): Promise<FlashloanLaneRecord[]> {
  const result = await query<FlashloanLaneRecord>(
    `SELECT *
     FROM flashloan_lanes
     WHERE borrower_address = $1 OR lender_address = $1 OR arbiter_address = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [address, limit]
  )
  return result.rows
}

export async function updateLaneState(
  id: number,
  nextState: LoanSimulationState,
  nextTerms: LoanTerms
): Promise<FlashloanLaneRecord> {
  const result = await query<FlashloanLaneRecord>(
    `UPDATE flashloan_lanes
     SET stage = $2,
         sim_day = $3,
         due_day = $4,
         evidence_note = $5,
         drawn_amount = $6,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      nextState.stage,
      nextState.simDay,
      nextState.dueDay,
      nextState.evidenceNote,
      nextTerms.drawnAmount,
    ]
  )

  return result.rows[0]!
}

export async function appendLaneEvent(args: {
  laneId: number
  actorAddress: string
  actorRole: ActorRole
  action: LoanAction
  eventText: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await query(
    `INSERT INTO flashloan_lane_events (
      lane_id,
      actor_address,
      actor_role,
      action,
      event_text,
      metadata
    ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      args.laneId,
      args.actorAddress,
      args.actorRole,
      args.action,
      args.eventText,
      args.metadata ? JSON.stringify(args.metadata) : null,
    ]
  )
}

export async function getLaneEvents(laneId: number, limit = 100): Promise<FlashloanLaneEventRecord[]> {
  const result = await query<FlashloanLaneEventRecord>(
    `SELECT *
     FROM flashloan_lane_events
     WHERE lane_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [laneId, limit]
  )
  return result.rows
}

export function toEngineTerms(record: FlashloanLaneRecord): LoanTerms {
  return {
    principal: Number(record.principal),
    durationDays: record.duration_days,
    interestBps: record.interest_bps,
    collateralPct: record.collateral_pct,
    drawnAmount: Number(record.drawn_amount),
  }
}

export function toEngineState(record: FlashloanLaneRecord): LoanSimulationState {
  return {
    stage: record.stage,
    simDay: record.sim_day,
    dueDay: record.due_day,
    evidenceNote: record.evidence_note,
  }
}
