'use client';

/**
 * MerchantContinuityCenter (Wave 50) — the real business-continuity surface.
 *
 * Distinct from personal continuity. Grandmother-friendly: plain language, clear "what's left",
 * obvious actions. Lets an owner choose a business successor and add emergency operators, with honest
 * safety framing (these are powerful — the UI warns, verifies, and keeps the owner in charge).
 */

import { useState } from 'react';
import { useMerchantContinuity } from '@/hooks/useMerchantContinuity';
import { ProtectiveConfirm } from '@/components/safety/ProtectiveConfirm';
import { CheckCircle2, Circle, ShieldAlert, UserPlus, Users, X, Loader2 } from 'lucide-react';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function MerchantContinuityCenter() {
  const c = useMerchantContinuity();
  const [successorInput, setSuccessorInput] = useState('');
  const [successorNote, setSuccessorNote] = useState('');
  const [operatorInput, setOperatorInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmSuccessor, setConfirmSuccessor] = useState(false);
  const [confirmOperator, setConfirmOperator] = useState(false);

  const successorValid = ADDRESS_RE.test(successorInput.trim());
  const operatorValid = ADDRESS_RE.test(operatorInput.trim());

  const run = async (key: string, fn: () => Promise<boolean>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  if (c.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Loading your business continuity…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Readiness checklist */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-7">
        <h2 className="text-lg font-semibold text-white">Is your business protected?</h2>
        <p className="mt-1 text-sm text-zinc-400">If something happens to you, this is what keeps the business running.</p>
        <ul className="mt-5 space-y-3">
          {c.readiness.map((r) => (
            <li key={r.id} className="flex items-start gap-3">
              {r.met
                ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                : <Circle size={18} className="mt-0.5 shrink-0 text-zinc-600" aria-hidden="true" />}
              <span>
                <span className={`block text-sm font-medium ${r.met ? 'text-zinc-200' : 'text-white'}`}>{r.label}</span>
                <span className="text-xs text-zinc-500">{r.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Successor */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-7">
        <h2 className="text-lg font-semibold text-white">Who takes over the business?</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Choose one person to become the owner if you can&apos;t continue. This is separate from who inherits your personal funds.
        </p>

        {c.succession ? (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4">
            <span>
              <span className="block text-sm font-medium text-emerald-200">Successor chosen</span>
              <span className="font-mono text-xs text-zinc-400">{short(c.succession.successor_address)}</span>
              {c.succession.note && <span className="mt-1 block text-xs text-zinc-500">{c.succession.note}</span>}
            </span>
            <button type="button" onClick={() => run('clear', c.clearSuccessor)} disabled={busy === 'clear'}
              className="text-xs text-zinc-400 underline hover:text-zinc-200">
              {busy === 'clear' ? 'Removing…' : 'Change'}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <input
              value={successorInput}
              onChange={(e) => setSuccessorInput(e.target.value)}
              placeholder="Successor's wallet address (0x…)"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-400/40 focus:outline-none"
            />
            <input
              value={successorNote}
              onChange={(e) => setSuccessorNote(e.target.value)}
              placeholder="A note to remember who this is (optional)"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-400/40 focus:outline-none"
            />
            <button
              type="button"
              disabled={!successorValid || busy === 'succ'}
              onClick={() => setConfirmSuccessor(true)}
              className="btn-premium btn-premium-primary text-sm disabled:opacity-40"
            >
              {busy === 'succ' ? 'Saving…' : 'Choose this successor'}
            </button>
            {successorInput && !successorValid && <p className="text-xs text-amber-300">That doesn&apos;t look like a wallet address (it should start with 0x and be 42 characters).</p>}
          </div>
        )}
      </section>

      {/* Operators */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-7">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-cyan-300/80" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Emergency helpers</h2>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          People who can help run the business in an emergency — <span className="text-zinc-300">without</span> becoming the owner. You stay in charge and can remove them anytime.
        </p>

        {c.operators.length > 0 && (
          <ul className="mt-5 space-y-2">
            {c.operators.map((op) => (
              <li key={op.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <span className="font-mono text-xs text-zinc-300">{short(op.operator_address)}</span>
                <button type="button" onClick={() => run(`rev-${op.id}`, () => c.revokeOperator(op.operator_address))}
                  disabled={busy === `rev-${op.id}`} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-300">
                  <X size={13} aria-hidden="true" /> {busy === `rev-${op.id}` ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={operatorInput}
            onChange={(e) => setOperatorInput(e.target.value)}
            placeholder="Helper's wallet address (0x…)"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cyan-400/40 focus:outline-none"
          />
          <button
            type="button"
            disabled={!operatorValid || busy === 'op'}
            onClick={() => setConfirmOperator(true)}
            className="btn-premium btn-premium-ghost flex items-center justify-center gap-1.5 text-sm disabled:opacity-40"
          >
            <UserPlus size={15} aria-hidden="true" /> {busy === 'op' ? 'Adding…' : 'Add helper'}
          </button>
        </div>

        {/* Honest safety framing — protection without control */}
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-3">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-amber-200/90">
            Only add people you trust. An emergency helper is recorded here and can be removed anytime — but choosing the wrong person could put your business at risk. VFIDE never takes control for you; these choices are yours.
          </p>
        </div>
      </section>

      <ProtectiveConfirm
        open={confirmSuccessor}
        risk="high"
        title="Choose this successor?"
        body="This person will be able to take over your business if you cannot continue. Make sure the address is exactly right."
        address={successorInput.trim()}
        addressLabel="Successor address"
        reassurance="You can change or remove your successor at any time. Choosing now does not hand over anything today."
        confirmText="Yes, choose them"
        source="merchant-succession"
        onCancel={() => setConfirmSuccessor(false)}
        onConfirm={() => {
          setConfirmSuccessor(false);
          void run('succ', () => c.setSuccessor(successorInput.trim(), successorNote.trim() || undefined));
        }}
      />

      <ProtectiveConfirm
        open={confirmOperator}
        risk="medium"
        title="Add this emergency helper?"
        body="This person will be recorded as someone who can help run your business in an emergency. They do not become the owner."
        address={operatorInput.trim()}
        addressLabel="Helper address"
        reassurance="You stay the owner and can remove this helper at any time."
        confirmText="Add helper"
        source="merchant-operator"
        onCancel={() => setConfirmOperator(false)}
        onConfirm={() => {
          setConfirmOperator(false);
          void run('op', () => c.grantOperator(operatorInput.trim()).then((ok) => {
            if (ok) setOperatorInput('');
            return ok;
          }));
        }}
      />
    </div>
  );
}
