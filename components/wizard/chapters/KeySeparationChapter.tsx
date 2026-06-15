'use client';

import { useState } from 'react';
import { KeyRound, ShieldCheck, Info } from 'lucide-react';
import { useKeyPosture } from '@/hooks/useKeyPosture';
import { ChapterShell } from '../ChapterShell';

interface KeySeparationChapterProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Optional onboarding step (Frontend Verification Campaign item 2 / Key Separation audit remediation 2):
 * introduce the three-key model and OFFER — never force — separating the settings (admin) key from the everyday
 * spending key. Most people start with a single key, so this is purely optional; the identical action also lives
 * in Security Center → Key Posture. Surfacing it here makes the choice visible at setup instead of hidden.
 *
 * Honesty (Veritas Law): reuses the live on-chain posture via useKeyPosture, frames the benefit precisely
 * ("a stolen spending key can't also change your guardians or limits"), and is explicit that guardians remain the
 * recovery safety net. Skipping is a first-class, consequence-free choice.
 */
export function KeySeparationChapter({ onComplete, onSkip }: KeySeparationChapterProps) {
  const kp = useKeyPosture();
  const [newAdmin, setNewAdmin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const alreadySeparated = kp.posture === 'separated';
  const wantsToSeparate = newAdmin.trim().length > 0 && !alreadySeparated;

  const handlePrimary = async () => {
    setErr(null);
    if (!wantsToSeparate) {
      onComplete(); // acknowledged; the user can separate later in the Security Center
      return;
    }
    setBusy(true);
    try {
      await kp.transferAdmin(newAdmin.trim());
      onComplete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not start the transfer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChapterShell
      chapter="keySeparation"
      description="By default, one key controls both your everyday spending and your settings. You can optionally move your settings (admin) authority to a separate, rarely-used key — so a stolen spending key can't also change your guardians or limits."
      onPrimary={handlePrimary}
      onSkip={onSkip}
      isWorking={busy || kp.isWritePending}
      primaryLabel={wantsToSeparate ? 'Use a separate settings key' : 'Continue'}
      notice={err ? { tone: 'error', text: err } : null}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <KeyRound size={15} className="text-cyan-400" /> Your keys
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-400 leading-relaxed">
            <li><span className="text-zinc-200">Spending key</span> — signs your everyday payments.</li>
            <li><span className="text-zinc-200">Settings key</span> — changes guardians and limits (time-locked, guardian-cancellable).</li>
            <li><span className="text-zinc-200">Guardians</span> — your recovery safety net if a key is lost or stolen.</li>
          </ul>
        </div>

        {alreadySeparated ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck size={14} /> Your settings key is already separate from your spending key.
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="ksc-admin" className="block text-xs text-zinc-500">
              Separate settings (admin) key — optional
            </label>
            <input
              id="ksc-admin"
              type="text"
              spellCheck={false}
              value={newAdmin}
              onChange={(e) => setNewAdmin(e.target.value)}
              placeholder="0x… (leave blank to decide later)"
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 font-mono"
            />
            <div className="flex items-start gap-1.5 text-[11px] text-zinc-500 leading-relaxed">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>
                Most people set this up later. You can do it anytime in Security Center → Key Posture. Setting it
                here starts a two-step transfer — the new key must confirm before it takes effect.
              </span>
            </div>
          </div>
        )}
      </div>
    </ChapterShell>
  );
}
