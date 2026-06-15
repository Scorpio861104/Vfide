'use client';

/**
 * ProtectiveConfirm (Wave 51) — reusable protective friction for risky actions.
 *
 * Product Law #4: protection without control. This adds AWARENESS, not prevention — the user can
 * always proceed. It makes risky actions (sending money, choosing a successor, changing recovery,
 * transferring ownership) deliberate instead of accidental, which is what the Grandmother Safety Test
 * needs: she should not be able to send money to a scammer or assign the wrong successor *by mistake*.
 *
 * Features:
 *   • Plain-language statement of what's about to happen and why it matters.
 *   • Optional address verification — shows the address in a chunked, readable form and (for high
 *     risk) requires the user to confirm they checked it. Money and control can't be recovered if an
 *     address is wrong, so this is the key anti-(address-poisoning / sleight) step.
 *   • Risk-scaled friction: low = one confirm; medium = acknowledge checkbox; high = type-to-confirm.
 *   • Emits RISK_WARNING_DISPLAYED when shown, so the trust record/timeline has evidence a warning
 *     was given (useful if a user is later coerced — there's a record they were warned).
 *   • Always offers a clear way out. Never blocks; the user stays in charge.
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useEmitEvent } from '@/lib/events/EventProvider';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ProtectiveConfirmProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Plain title, e.g. "Choose this successor?" */
  title: string;
  /** What's happening + why it matters, in plain words. */
  body: string;
  risk?: RiskLevel;
  /** If set, the address is shown chunked and (high risk) must be confirmed. */
  address?: string;
  /** Label for the address ("Successor", "Send to"). */
  addressLabel?: string;
  confirmText?: string;
  /** A reassurance — what makes this safe / recoverable (surfaces invisible protection). */
  reassurance?: string;
  /** Provenance for the RISK_WARNING_DISPLAYED event. */
  source?: string;
}

function chunk(addr: string): string {
  // 0x1234abcd…  → groups of 4 for verifiability
  const body = addr.startsWith('0x') ? addr.slice(2) : addr;
  const groups = body.match(/.{1,4}/g) ?? [body];
  return `0x ${groups.join(' ')}`;
}

const RISK_TONE: Record<RiskLevel, { ring: string; chip: string; label: string }> = {
  low: { ring: 'border-cyan-400/20', chip: 'bg-cyan-400/10 text-cyan-200', label: 'Please confirm' },
  medium: { ring: 'border-amber-400/25', chip: 'bg-amber-400/10 text-amber-200', label: 'Double-check this' },
  high: { ring: 'border-rose-400/30', chip: 'bg-rose-400/10 text-rose-200', label: 'Important — read carefully' },
};

export function ProtectiveConfirm({
  open, onCancel, onConfirm, title, body, risk = 'medium', address, addressLabel = 'Address',
  confirmText = 'Confirm', reassurance, source,
}: ProtectiveConfirmProps) {
  const emitEvent = useEmitEvent();
  const [acknowledged, setAcknowledged] = useState(false);
  const [typed, setTyped] = useState('');

  // Record that a warning was shown (evidence). Reset friction state each time it opens.
  useEffect(() => {
    if (open) {
      setAcknowledged(false);
      setTyped('');
      emitEvent('RISK_WARNING_DISPLAYED', { risk, action: source }, source ?? 'protective-confirm');
    }
  }, [open, risk, source, emitEvent]);

  const tone = RISK_TONE[risk];
  const canConfirm = useMemo(() => {
    if (risk === 'high') return typed.trim().toUpperCase() === 'CONFIRM';
    if (risk === 'medium') return acknowledged;
    return true;
  }, [risk, typed, acknowledged]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative w-full max-w-md rounded-2xl border ${tone.ring} bg-zinc-950 p-6 shadow-2xl`}>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300">
          <X size={18} />
        </button>

        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone.chip}`}>
          <AlertTriangle size={12} aria-hidden="true" /> {tone.label}
        </span>

        <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{body}</p>

        {address && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{addressLabel}</p>
            <p className="mt-1 break-all font-mono text-sm text-zinc-100">{chunk(address)}</p>
            <p className="mt-2 text-xs text-amber-300/90">
              Check every character. If this is wrong, what you send or hand over may be impossible to get back.
            </p>
          </div>
        )}

        {reassurance && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.05] p-3">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-emerald-200/90">{reassurance}</p>
          </div>
        )}

        {risk === 'medium' && (
          <label className="mt-4 flex items-start gap-2.5 text-sm text-zinc-300">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5" />
            I&apos;ve checked this and want to continue.
          </label>
        )}

        {risk === 'high' && (
          <div className="mt-4">
            <label className="block text-sm text-zinc-300">Type <span className="font-mono font-semibold text-white">CONFIRM</span> to continue:</label>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-zinc-100 focus:border-rose-400/40 focus:outline-none" />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="btn-premium btn-premium-ghost flex-1 text-sm">
            Cancel
          </button>
          <button type="button" disabled={!canConfirm}
            onClick={() => { if (canConfirm) { emitEvent('PROTECTIVE_CONFIRMATION_ACCEPTED', { risk, action: source }, source ?? 'protective-confirm'); onConfirm(); } }}
            className="btn-premium btn-premium-primary flex-1 text-sm disabled:opacity-40">
            {confirmText}
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-zinc-600">You&apos;re in control. VFIDE never does this for you.</p>
      </div>
    </div>
  );
}
