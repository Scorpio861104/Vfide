/**
 * Merchant Business Transfer API (Phase 1 — Succession Execution).
 *
 * The execution layer for "a business survives the owner." Participant-controlled, non-custodial:
 *   POST action:
 *     • 'initiate'        — OWNER starts a voluntary transfer to their designated successor.
 *                           Successor must 'accept' before it can 'execute'.
 *     • 'emergency_request' — a configured EMERGENCY OPERATOR or the DESIGNATED SUCCESSOR starts an
 *                           emergency transfer (owner incapacity). Enters a 7-day veto window; the
 *                           OWNER may 'veto' until it elapses. No seizure — the owner always has veto.
 *     • 'accept'          — SUCCESSOR accepts a voluntary transfer.
 *     • 'veto'            — OWNER cancels an emergency request during the window.
 *     • 'cancel'          — OWNER or SUCCESSOR cancels before execution.
 *     • 'execute'         — performs the reassign once authorized (accepted, or emergency window
 *                           elapsed with no veto). Reassigns BUSINESS RECORDS only; funds are the
 *                           separate on-chain inheritance flow.
 *   GET — transfers the caller is party to.
 *
 * The successor must be the one recorded in merchant_succession (you can't transfer to an arbitrary
 * address). Emergency requesters must be a recorded operator or that successor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { emitServerEvent } from '@/lib/events/serverEmit';
import { reassignBusinessRecords } from '@/lib/merchant/businessTransfer';

export const dynamic = 'force-dynamic';

const EMERGENCY_VETO_DAYS = 7; // mirrors the on-chain recovery delay
// Wave 89: how long a returning owner may reverse an EXECUTED emergency transfer. Generous because the
// whole point is an owner who was unreachable for a while (hospital, deployment) — a short window would
// reproduce the very absence-blindness it exists to fix.
const RECLAIM_DAYS = 30;

function authAddr(user: JWTPayload): string | null {
  const a = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a ? a : null;
}

interface TransferRow {
  id: string; from_address: string; to_address: string; kind: string; status: string;
  veto_until: string | null; note: string | null; transferred_summary: unknown;
  created_at: string; updated_at: string; executed_at: string | null;
  reclaim_until: string | null; reclaimed_at: string | null;
}

async function getDesignatedSuccessor(merchant: string): Promise<string | null> {
  const r = (await query<{ successor_address: string }>(
    `SELECT successor_address FROM merchant_succession WHERE merchant_address = $1`, [merchant],
  )).rows[0];
  return r?.successor_address?.toLowerCase() ?? null;
}

// Wave 93 / CID-2 (off-chain): the business-level proof-of-life address, if designated. A trusted party who
// may veto an emergency transfer on the owner's behalf while the owner is unreachable.
async function getProofOfLifeAddress(merchant: string): Promise<string | null> {
  const r = (await query<{ proof_of_life_address: string }>(
    `SELECT proof_of_life_address FROM merchant_proof_of_life WHERE merchant_address = $1`, [merchant],
  )).rows[0];
  return r?.proof_of_life_address?.toLowerCase() ?? null;
}

async function isEmergencyOperator(merchant: string, addr: string): Promise<boolean> {
  const r = (await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM merchant_operators WHERE merchant_address = $1 AND lower(operator_address) = $2`,
    [merchant, addr],
  )).rows[0];
  return Number(r?.c ?? 0) > 0;
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const rows = (await query<TransferRow>(
      `SELECT * FROM merchant_business_transfers WHERE from_address = $1 OR to_address = $1 ORDER BY updated_at DESC LIMIT 50`,
      [addr],
    )).rows;
    return NextResponse.json({ transfers: rows.map((t) => ({ ...t, role: t.from_address === addr ? 'owner' : 'successor' })) });
  } catch (err) {
    logger.error('GET /api/merchant/business-transfer failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load transfers' }, { status: 500 });
  }
}

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('initiate'), note: z.string().max(2000).optional() }),
  z.object({ action: z.literal('emergency_request'), merchant_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/), note: z.string().max(2000).optional() }),
  z.object({ action: z.literal('accept'), id: z.string().uuid() }),
  z.object({ action: z.literal('veto'), id: z.string().uuid() }),
  z.object({ action: z.literal('cancel'), id: z.string().uuid() }),
  z.object({ action: z.literal('execute'), id: z.string().uuid() }),
  z.object({ action: z.literal('reclaim'), id: z.string().uuid() }),
]);

async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof BodySchema>;
  try { body = BodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  try {
    // ── Owner starts a voluntary transfer to their designated successor ──
    if (body.action === 'initiate') {
      const successor = await getDesignatedSuccessor(addr);
      if (!successor) return NextResponse.json({ error: 'Designate a successor first' }, { status: 400 });
      const row = (await query<TransferRow>(
        `INSERT INTO merchant_business_transfers (from_address, to_address, kind, status, note)
         VALUES ($1, $2, 'voluntary', 'initiated', $3) RETURNING *`,
        [addr, successor, body.note ?? null],
      )).rows[0];
      await emitServerEvent(addr, 'OWNERSHIP_TRANSFER_INITIATED', { id: row?.id, kind: 'voluntary' }, 'api/merchant/business-transfer');
      await emitServerEvent(successor, 'OWNERSHIP_TRANSFER_INITIATED', { id: row?.id, kind: 'voluntary' }, 'api/merchant/business-transfer');
      return NextResponse.json({ transfer: row }, { status: 201 });
    }

    // ── Emergency: operator or successor requests, owner gets a veto window ──
    if (body.action === 'emergency_request') {
      const merchant = body.merchant_address.toLowerCase();
      const successor = await getDesignatedSuccessor(merchant);
      const allowed = (successor && successor === addr) || (await isEmergencyOperator(merchant, addr));
      if (!allowed) return NextResponse.json({ error: 'Only a designated successor or emergency operator may request this' }, { status: 403 });
      if (!successor) return NextResponse.json({ error: 'This merchant has no designated successor to receive the business' }, { status: 400 });
      const vetoUntil = new Date(Date.now() + EMERGENCY_VETO_DAYS * 24 * 3600 * 1000).toISOString();
      const row = (await query<TransferRow>(
        `INSERT INTO merchant_business_transfers (from_address, to_address, kind, status, veto_until, note)
         VALUES ($1, $2, 'emergency', 'veto_window', $3, $4) RETURNING *`,
        [merchant, successor, vetoUntil, body.note ?? null],
      )).rows[0];
      // Notify the owner so they can veto if they're fine.
      await emitServerEvent(merchant, 'OWNERSHIP_TRANSFER_INITIATED', { id: row?.id, kind: 'emergency', vetoUntil }, 'api/merchant/business-transfer');
      await emitServerEvent(successor, 'OWNERSHIP_TRANSFER_INITIATED', { id: row?.id, kind: 'emergency', vetoUntil }, 'api/merchant/business-transfer');
      return NextResponse.json({ transfer: row }, { status: 201 });
    }

    // Remaining actions operate on an existing transfer.
    const t = (await query<TransferRow>(`SELECT * FROM merchant_business_transfers WHERE id = $1`, [body.id])).rows[0];
    if (!t) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    const isOwner = t.from_address === addr;
    const isSuccessor = t.to_address === addr;
    // Wave 93 / CID-2: a designated proof-of-life address is also a party to the transfer (for veto only).
    const polAddr = await getProofOfLifeAddress(t.from_address);
    const isProofOfLife = !!polAddr && polAddr === addr;
    if (!isOwner && !isSuccessor && !isProofOfLife) return NextResponse.json({ error: 'Not your transfer' }, { status: 403 });

    // ── Owner returns and reverses an EXECUTED emergency transfer within the reclaim window (Wave 89) ──
    // Placed before the terminal-status guard because 'executed' is otherwise terminal. Only the original
    // owner, only an emergency transfer, only while reclaim_until is in the future. Reverses the record
    // reassignment (successor → owner) in one transaction; funds were never moved, so nothing else to undo.
    if (body.action === 'reclaim') {
      if (!isOwner) return NextResponse.json({ error: 'Only the original owner can reclaim a transferred business' }, { status: 403 });
      if (t.kind !== 'emergency' || t.status !== 'executed') {
        return NextResponse.json({ error: 'Only an executed emergency transfer can be reclaimed' }, { status: 409 });
      }
      const reclaimOpen = !!t.reclaim_until && new Date(t.reclaim_until).getTime() > Date.now();
      if (!reclaimOpen) {
        return NextResponse.json({ error: 'The reclaim window for this transfer has closed' }, { status: 409 });
      }
      const client = await getClient();
      try {
        await client.query('BEGIN');
        // Reverse the reassignment: move the business records back from the successor to the owner.
        const summary = await reassignBusinessRecords(client, t.to_address, t.from_address);
        await client.query(
          `UPDATE merchant_business_transfers SET status = 'reclaimed', reclaimed_at = NOW(), updated_at = NOW(), transferred_summary = $2 WHERE id = $1`,
          [body.id, JSON.stringify(summary)],
        );
        await client.query('COMMIT');
        await emitServerEvent(t.from_address, 'BUSINESS_TRANSFER_INITIATED', { id: body.id, reclaimed: true }, 'api/merchant/business-transfer');
        await emitServerEvent(t.to_address, 'BUSINESS_TRANSFER_INITIATED', { id: body.id, reclaimed: true }, 'api/merchant/business-transfer');
        return NextResponse.json({ transfer: { ...t, status: 'reclaimed' }, summary });
      } catch (txErr) {
        await client.query('ROLLBACK');
        logger.error('business transfer reclaim rolled back', { error: txErr instanceof Error ? txErr.message : String(txErr) });
        return NextResponse.json({ error: 'Reclaim failed and was rolled back; nothing changed' }, { status: 500 });
      } finally {
        client.release();
      }
    }

    const terminal = ['executed', 'cancelled', 'vetoed', 'reclaimed'].includes(t.status);
    if (terminal) return NextResponse.json({ error: 'Transfer is already closed' }, { status: 409 });

    if (body.action === 'accept') {
      if (!isSuccessor) return NextResponse.json({ error: 'Only the successor can accept' }, { status: 403 });
      if (t.kind !== 'voluntary' || t.status !== 'initiated') return NextResponse.json({ error: 'Not awaiting acceptance' }, { status: 409 });
      const row = (await query<TransferRow>(`UPDATE merchant_business_transfers SET status = 'accepted', updated_at = NOW() WHERE id = $1 RETURNING *`, [body.id])).rows[0];
      return NextResponse.json({ transfer: row });
    }

    if (body.action === 'veto') {
      // Wave 93 / CID-2: the owner OR their designated business proof-of-life address may veto an emergency
      // transfer — the alive-signal protects the business side too, not just inheritance.
      if (!isOwner && !isProofOfLife) return NextResponse.json({ error: 'Only the owner or their proof-of-life address can veto' }, { status: 403 });
      if (t.kind !== 'emergency') return NextResponse.json({ error: 'Only emergency requests can be vetoed' }, { status: 409 });
      const row = (await query<TransferRow>(`UPDATE merchant_business_transfers SET status = 'vetoed', updated_at = NOW() WHERE id = $1 RETURNING *`, [body.id])).rows[0];
      return NextResponse.json({ transfer: row });
    }

    if (body.action === 'cancel') {
      const row = (await query<TransferRow>(`UPDATE merchant_business_transfers SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`, [body.id])).rows[0];
      return NextResponse.json({ transfer: row });
    }

    // ── execute ──
    // Authorization to execute: voluntary+accepted (either party may trigger), OR emergency whose veto
    // window has elapsed with no veto.
    const canExecuteVoluntary = t.kind === 'voluntary' && t.status === 'accepted';
    const windowElapsed = !!t.veto_until && new Date(t.veto_until).getTime() <= Date.now();
    const canExecuteEmergency = t.kind === 'emergency' && t.status === 'veto_window' && windowElapsed;
    if (!canExecuteVoluntary && !canExecuteEmergency) {
      return NextResponse.json({ error: t.kind === 'emergency' ? 'Veto window has not elapsed yet' : 'Successor has not accepted yet' }, { status: 409 });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const summary = await reassignBusinessRecords(client, t.from_address, t.to_address);
      // Wave 89: an EMERGENCY transfer (the owner was absent) gets a bounded owner-returns reclaim window.
      // A returning owner can reverse it within RECLAIM_DAYS. Voluntary transfers were consented to, so
      // they are not reclaimable (reclaim_until stays NULL).
      const reclaimUntil = t.kind === 'emergency'
        ? new Date(Date.now() + RECLAIM_DAYS * 24 * 3600 * 1000).toISOString()
        : null;
      await client.query(
        `UPDATE merchant_business_transfers SET status = 'executed', executed_at = NOW(), updated_at = NOW(), reclaim_until = $2, transferred_summary = $3 WHERE id = $1`,
        [body.id, reclaimUntil, JSON.stringify(summary)],
      );
      await client.query('COMMIT');
      await emitServerEvent(t.from_address, 'BUSINESS_TRANSFER_INITIATED', { id: body.id, executed: true }, 'api/merchant/business-transfer');
      await emitServerEvent(t.to_address, 'BUSINESS_TRANSFER_INITIATED', { id: body.id, executed: true }, 'api/merchant/business-transfer');
      return NextResponse.json({ transfer: { ...t, status: 'executed' }, summary });
    } catch (txErr) {
      await client.query('ROLLBACK');
      logger.error('business transfer execute rolled back', { error: txErr instanceof Error ? txErr.message : String(txErr) });
      return NextResponse.json({ error: 'Transfer failed and was rolled back; nothing changed' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('POST /api/merchant/business-transfer failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Transfer action failed' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
