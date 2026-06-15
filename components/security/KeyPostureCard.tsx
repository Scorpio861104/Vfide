'use client';

/**
 * KeyPostureCard — makes the vault's key-separation posture visible and actionable in the Security Center.
 *
 * Addresses the Key Separation audit (Campaign B) MEDIUM finding: the three-key model was explained nowhere, and
 * the contract's weekly RecoverySplitReminder + splitAdminFromActive re-separation flow had no UI consumer. This
 * card reads the live on-chain posture, explains it in plain language, and surfaces the re-separation action.
 *
 * Honesty (Veritas Law): shows the ACTUAL on-chain keys and posture; never overstates protection; states clearly
 * that guardians remain the recovery safety net.
 */

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ShieldAlert, AlertTriangle, Loader2, Check } from 'lucide-react';
import { useKeyPosture, type KeyPosture } from '@/hooks/useKeyPosture';

function shortAddr(a: string | null): string {
  if (!a) return '—';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const STATUS: Record<KeyPosture, { label: string; tone: string; ring: string; Icon: typeof ShieldCheck }> = {
  separated: { label: 'Keys separated', tone: 'text-emerald-400', ring: 'border-emerald-500/25 bg-emerald-500/5', Icon: ShieldCheck },
  unseparated: { label: 'One key controls everything', tone: 'text-amber-400', ring: 'border-amber-500/25 bg-amber-500/5', Icon: ShieldAlert },
  actionNeeded: { label: 'Re-separate after recovery', tone: 'text-red-400', ring: 'border-red-500/25 bg-red-500/5', Icon: AlertTriangle },
  unknown: { label: 'Key posture unavailable', tone: 'text-zinc-500', ring: '', Icon: KeyRound },
};

const EXPLAIN: Record<KeyPosture, string> = {
  separated:
    'Your settings key and your everyday spending key are different. If your spending key is ever stolen, the thief still cannot change your guardians or limits.',
  unseparated:
    'One key currently controls both your settings and your everyday spending. Moving settings (admin) authority to a separate, rarely-used key means a stolen spending key cannot also change your guardians or limits.',
  actionNeeded:
    'After your recent recovery, your settings key and spending key were combined into one. Re-separate them by assigning a new, separate settings key.',
  unknown: 'Key details are loading or unavailable right now.',
};

export function KeyPostureCard() {
  const kp = useKeyPosture();
  const [newAdmin, setNewAdmin] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const status = STATUS[kp.posture];
  const { Icon } = status;
  const isPostRecovery = kp.posture === 'actionNeeded';
  const showAction = isPostRecovery || kp.posture === 'unseparated';

  const submit = async () => {
    setErr(null);
    setDone(false);
    setBusy(true);
    try {
      const value = newAdmin.trim();
      if (isPostRecovery) await kp.splitAdminFromActive(value);
      else await kp.transferAdmin(value);
      setDone(true);
      setNewAdmin('');
      kp.refetch();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  // Honest empty state — no vault means no posture to show.
  if (!kp.isLoading && !kp.hasVault) {
    return (
      <div className="analytics-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-zinc-500" />
          <span className="font-semibold text-white text-sm">Key Posture</span>
        </div>
        <p className="text-xs text-zinc-500">Connect a wallet with a VFIDE vault to see how your keys are arranged.</p>
      </div>
    );
  }

  return (
    <div className={`analytics-card p-5 border ${status.ring}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/8 flex items-center justify-center shrink-0">
          <KeyRound size={18} className="text-zinc-300" />
        </div>
        <div>
          <div className="font-semibold text-white text-sm">Key Posture</div>
          <div className={`flex items-center gap-1 text-xs ${status.tone}`}>
            <Icon size={12} />
            {kp.isLoading ? 'Checking…' : status.label}
          </div>
        </div>
      </div>

      {/* The keys, shown honestly */}
      <div className="space-y-1.5 mb-3">
        <KeyRow label="Settings / admin key" value={shortAddr(kp.admin)} />
        <KeyRow label="Everyday spending key" value={shortAddr(kp.activeWallet)} />
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed mb-3">{EXPLAIN[kp.posture]}</p>

      {/* Three-key model, briefly explained */}
      {kp.posture !== 'unknown' && (
        <details className="mb-3 group">
          <summary className="text-[11px] text-zinc-500 cursor-pointer hover:text-zinc-400 select-none">
            How VFIDE keys work
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] text-zinc-500 leading-relaxed">
            <li><span className="text-zinc-400">Spending key</span> — signs your everyday payments.</li>
            <li><span className="text-zinc-400">Settings key</span> — changes guardians and limits (time-locked, guardian-cancellable).</li>
            <li><span className="text-zinc-400">Guardians</span> — your recovery safety net if a key is lost or stolen.</li>
          </ul>
        </details>
      )}

      {showAction && (
        <div className="space-y-2">
          <label className="block text-xs text-zinc-500" htmlFor="key-posture-new-admin">
            {isPostRecovery ? 'New settings (admin) key' : 'Separate settings (admin) key'}
          </label>
          <input
            id="key-posture-new-admin"
            type="text"
            inputMode="text"
            spellCheck={false}
            value={newAdmin}
            onChange={(e) => setNewAdmin(e.target.value)}
            placeholder="0x…"
            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 font-mono"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || kp.isWritePending || !newAdmin.trim()}
            className="w-full flex items-center justify-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed border border-cyan-500/30 text-cyan-300 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
          >
            {(busy || kp.isWritePending) && <Loader2 size={14} className="animate-spin" />}
            {isPostRecovery ? 'Re-separate keys' : 'Move admin to a separate key'}
          </button>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            This starts a two-step transfer — the new key must confirm before it takes effect. Your guardians remain
            your recovery safety net throughout.
          </p>
          {done && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check size={12} /> Transfer started — confirm from the new key to finish.
            </div>
          )}
          {err && <div className="text-xs text-red-400 leading-relaxed">{err}</div>}
        </div>
      )}
    </div>
  );
}

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-300">{value}</span>
    </div>
  );
}
