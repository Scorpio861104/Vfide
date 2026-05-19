'use client';

/**
 * Inheritance setup wizard.
 *
 * Builds the owner's heir configuration locally, then submits it as a
 * single proposeInheritanceConfig call. After that, a 30-day cooldown
 * runs before the owner can confirmInheritanceConfig.
 *
 * Flow:
 *   1. Pick heir guardians (must already be vault guardians; design decision 1)
 *   2. Assign basis points to each (sum must == 10000; design decision 3)
 *   3. Generate a 32-byte secret for each heir + compute commitments locally
 *   4. Review — show what gets sent on-chain (addresses + hashes only;
 *      secrets are LOCAL ONLY and printed into the envelope handouts)
 *   5. Propose — single tx
 *
 * Important honesty constraints surfaced in the UI:
 *   - Once you click Propose, the 30-day cooldown starts. You can cancel
 *     during the window but can't speed it up.
 *   - The heir secrets shown in step 5 are the ONLY copies. If you lose
 *     them, you cannot tell the heir what their share was; the heir
 *     cannot claim. Print/save the envelopes before navigating away.
 *   - Heirs must already be your guardians. We surface this as a hard
 *     check, not a warning.
 *   - Shares are hidden on-chain until claim. Heirs cannot see their
 *     own share until they reveal it during the claim window.
 */

import { useEffect, useMemo, useState } from 'react';
import { useChainId } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Shield,
  Key,
  FileText,
  CheckCircle2,
  Download,
  AlertTriangle,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import type { Address, Hex } from 'viem';
import { useInheritance } from '@/hooks/useInheritance';
import { useGuardians } from '@/hooks/useGuardians';
import { useUserVault } from '@/hooks/useVaultHooks';

interface DraftHeir {
  /** Local id used as the React key while building the draft. */
  id: string;
  /** Guardian address picked from the user's guardian list. */
  guardian: Address | '';
  /** Basis points as a plain number (0..10000). */
  basisPoints: number;
  /** Locally-generated 32-byte secret. Hex string. */
  secret: Hex | null;
  /** Display-only short note the owner can attach (e.g. "Mom"). Never leaves the client. */
  note: string;
}

function newDraftHeir(): DraftHeir {
  return {
    id: `h-${Math.random().toString(36).slice(2, 10)}`,
    guardian: '',
    basisPoints: 0,
    secret: null,
    note: '',
  };
}

export default function InheritanceSetupPage() {
  const chainId = useChainId();
  const { vaultAddress } = useUserVault();
  const inheritance = useInheritance();
  const { guardians, isLoading: guardiansLoading } = useGuardians();

  // Wizard step machine
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  // Draft heir array (size 1-5)
  const [heirs, setHeirs] = useState<DraftHeir[]>([newDraftHeir()]);
  // Track per-step error so the user can see why "Next" is disabled
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTxHash, setSubmittedTxHash] = useState<Hex | null>(null);

  // Pre-existing config — if one is active or pending, the wizard renders a
  // notice and lets the owner cancel the pending change rather than proposing
  // a new one (the contract enforces this anyway).
  const hasActiveConfig = inheritance.heirCount > 0;
  const hasPendingConfig = inheritance.pendingConfig !== null;

  // Available guardian addresses for selection. Heirs MUST already be
  // guardians at confirm time, so we surface only current guardians here.
  const guardianAddresses = useMemo<Address[]>(
    () => guardians.map((g) => g.address),
    [guardians],
  );

  // Sum of basis points across all heir drafts. Strict-sum at step 4.
  const totalBasisPoints = useMemo(
    () => heirs.reduce((sum, h) => sum + (h.basisPoints || 0), 0),
    [heirs],
  );

  function addHeir() {
    if (heirs.length >= 5) {
      setError('Maximum 5 heirs.');
      return;
    }
    setHeirs((prev) => [...prev, newDraftHeir()]);
    setError(null);
  }

  function removeHeir(id: string) {
    setHeirs((prev) => (prev.length > 1 ? prev.filter((h) => h.id !== id) : prev));
  }

  function updateHeir(id: string, patch: Partial<DraftHeir>) {
    setHeirs((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  // Step 1 validation: every heir slot has a guardian, and no duplicates.
  function canGoStep1to2(): boolean {
    for (const h of heirs) {
      if (!h.guardian) return false;
    }
    const seen = new Set<string>();
    for (const h of heirs) {
      const key = h.guardian.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }

  // Step 2 validation: shares sum to exactly 10000, each share > 0.
  function canGoStep2to3(): boolean {
    if (totalBasisPoints !== 10000) return false;
    for (const h of heirs) {
      if (!h.basisPoints || h.basisPoints <= 0) return false;
    }
    return true;
  }

  // Step 3: generate per-heir secrets + commitments. Idempotent — recomputes
  // commitments when called repeatedly with the same secrets.
  function generateSecrets() {
    setHeirs((prev) =>
      prev.map((h) => ({
        ...h,
        secret: h.secret ?? inheritance.generateHeirSecret(),
      })),
    );
  }

  // The commitments array sent to the contract. Computed only after
  // secrets exist for all heirs.
  const commitments = useMemo<Hex[]>(() => {
    if (!vaultAddress) return [];
    const nextConfigVersion = (inheritance.configVersion ?? 0n) + 1n;
    return heirs.map((h) => {
      if (!h.secret || !h.guardian) return '0x' as Hex;
      return inheritance.computeHeirCommitment({
        chainId: BigInt(chainId),
        vault: vaultAddress as Address,
        configVersion: nextConfigVersion,
        heirGuardian: h.guardian as Address,
        basisPoints: BigInt(h.basisPoints),
        heirSecret: h.secret,
      });
    });
  }, [heirs, vaultAddress, chainId, inheritance]);

  async function submitProposal() {
    if (!vaultAddress) {
      setSubmitError('Vault not deployed.');
      return;
    }
    if (heirs.some((h) => !h.guardian || !h.secret)) {
      setSubmitError('Some heir slots are incomplete.');
      return;
    }
    if (totalBasisPoints !== 10000) {
      setSubmitError(`Basis points sum to ${totalBasisPoints}, must be 10000.`);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const guardiansArr = heirs.map((h) => h.guardian as Address);
      const tx = await inheritance.proposeConfig(guardiansArr, commitments);
      setSubmittedTxHash(tx);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Proposal failed.');
    } finally {
      setSubmitting(false);
    }
  }

  // Download envelope for a single heir — plain text the owner gives to them.
  function downloadEnvelope(heir: DraftHeir, index: number) {
    if (!heir.secret) return;
    const content = [
      'VFIDE INHERITANCE ENVELOPE',
      '===========================',
      '',
      `From:        ${vaultAddress ?? '(your vault)'}`,
      `To:          ${heir.guardian} ${heir.note ? '(' + heir.note + ')' : ''}`,
      `Heir slot:   ${index + 1} of ${heirs.length}`,
      `Share:       ${heir.basisPoints / 100}% (${heir.basisPoints} basis points)`,
      '',
      'HEIR SECRET (REQUIRED TO CLAIM):',
      heir.secret,
      '',
      'How to use this:',
      '  1. Keep this somewhere private and secure — alongside your will,',
      '     in a safe, in a sealed envelope, or in a password manager that',
      '     your family knows how to access.',
      '  2. If the owner of the vault passes away, a guardian will initiate',
      '     an inheritance claim on-chain. There is a 30-day veto window',
      '     and then a 90-day claim window.',
      '  3. During the 90-day claim window, go to the VFIDE app and use',
      '     this secret + your share (above) to claim. Connect with the',
      '     guardian address shown above — the secret only works from',
      '     that address.',
      '  4. Your share is hidden on-chain until you reveal it. Do not',
      '     share this secret with anyone else.',
      '',
      'If you lose this, the share allocated to you can NOT be recovered.',
      'There is no backup, no support line, no reset.',
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vfide-inheritance-envelope-${index + 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // If a config is already active or pending, surface a notice early.
  if (hasActiveConfig || hasPendingConfig) {
    return <ExistingConfigNotice />;
  }

  if (guardiansLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  if (!vaultAddress) {
    return <NoVaultNotice />;
  }

  if (guardianAddresses.length === 0) {
    return <NoGuardiansNotice />;
  }

  // After a successful proposal, show the confirmation page with envelopes.
  if (submittedTxHash) {
    return (
      <ProposalSuccessPage
        txHash={submittedTxHash}
        heirs={heirs}
        onDownloadEnvelope={downloadEnvelope}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:pt-[3.5rem] pb-12">
      <Header step={step} />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Step1Heirs
              heirs={heirs}
              guardianAddresses={guardianAddresses}
              onAdd={addHeir}
              onRemove={removeHeir}
              onUpdate={updateHeir}
              error={error}
            />
            <NavButtons
              backDisabled
              nextDisabled={!canGoStep1to2()}
              onNext={() => {
                setError(null);
                setStep(2);
              }}
            />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Step2Shares
              heirs={heirs}
              total={totalBasisPoints}
              onUpdate={updateHeir}
            />
            <NavButtons
              onBack={() => setStep(1)}
              nextDisabled={!canGoStep2to3()}
              onNext={() => {
                generateSecrets();
                setStep(3);
              }}
            />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Step3Secrets
              heirs={heirs}
              onRegenerate={(id) =>
                updateHeir(id, { secret: inheritance.generateHeirSecret() })
              }
              onUpdateNote={(id, note) => updateHeir(id, { note })}
              onDownload={(h, idx) => downloadEnvelope(h, idx)}
            />
            <NavButtons
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Step4Review
              heirs={heirs}
              commitments={commitments}
              total={totalBasisPoints}
              onSubmit={submitProposal}
              submitting={submitting}
              error={submitError}
            />
            <NavButtons
              onBack={() => setStep(3)}
              nextHidden
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

function Header({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-white">Inheritance setup</h1>
      <p className="mt-1 text-sm text-gray-400">
        Designate up to 5 heirs. Each heir must be one of your guardians.
        Shares stay hidden on-chain until inheritance is claimed.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs">
        {[
          { n: 1, label: 'Heirs' },
          { n: 2, label: 'Shares' },
          { n: 3, label: 'Secrets' },
          { n: 4, label: 'Review' },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                step >= s.n ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-gray-500'
              }`}
            >
              {step > s.n ? <CheckCircle2 size={12} /> : s.n}
            </div>
            <span className={step >= s.n ? 'text-gray-200' : 'text-gray-600'}>
              {s.label}
            </span>
            {s.n < 4 && <span className="w-4 text-gray-700">—</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: pick heir guardians ────────────────────────────────────────────

function Step1Heirs({
  heirs,
  guardianAddresses,
  onAdd,
  onRemove,
  onUpdate,
  error,
}: {
  heirs: DraftHeir[];
  guardianAddresses: Address[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<DraftHeir>) => void;
  error: string | null;
}) {
  // Build a Set of already-picked addresses so we can dim them in dropdowns.
  const picked = new Set(heirs.map((h) => h.guardian.toLowerCase()).filter(Boolean));

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-cyan-400">
        <Users size={18} />
        <h2 className="text-lg font-semibold">Who are your heirs?</h2>
      </div>
      <p className="text-sm text-gray-400">
        Pick 1 to 5 heir wallets from your existing guardians. If someone you
        want as an heir isn&apos;t a guardian yet, add them as a guardian first
        (in the Guardians tab) and come back here.
      </p>

      <div className="space-y-3">
        {heirs.map((heir, i) => (
          <div
            key={heir.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-gray-500">
                Heir {i + 1}
              </span>
              {heirs.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(heir.id)}
                  className="rounded-lg p-1 text-gray-500 transition hover:bg-white/5 hover:text-white"
                  aria-label="Remove heir"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <label className="block text-xs text-gray-400">Guardian address</label>
            <select
              value={heir.guardian}
              onChange={(e) => onUpdate(heir.id, { guardian: e.target.value as Address })}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            >
              <option value="">— select a guardian —</option>
              {guardianAddresses.map((addr) => {
                const isPickedHere = heir.guardian.toLowerCase() === addr.toLowerCase();
                const isPickedElsewhere = picked.has(addr.toLowerCase()) && !isPickedHere;
                return (
                  <option key={addr} value={addr} disabled={isPickedElsewhere}>
                    {addr}{isPickedElsewhere ? ' (already chosen)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        ))}
      </div>

      {heirs.length < 5 && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-white/5"
        >
          <Plus size={12} /> Add another heir
        </button>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
    </section>
  );
}

// ─── Step 2: assign shares ──────────────────────────────────────────────────

function Step2Shares({
  heirs,
  total,
  onUpdate,
}: {
  heirs: DraftHeir[];
  total: number;
  onUpdate: (id: string, patch: Partial<DraftHeir>) => void;
}) {
  const distance = total - 10000;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-cyan-400">
        <Shield size={18} />
        <h2 className="text-lg font-semibold">How is the vault split?</h2>
      </div>
      <p className="text-sm text-gray-400">
        Shares are entered as percent (with up to two decimals — 50.25, for
        example). The total must be exactly 100%. Shares are hidden on-chain
        until claim.
      </p>

      <div className="space-y-3">
        {heirs.map((heir, i) => (
          <div
            key={heir.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wider text-gray-500">
                Heir {i + 1}
              </div>
              <div className="truncate font-mono text-xs text-gray-300">
                {heir.guardian}
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={heir.basisPoints === 0 ? '' : heir.basisPoints / 100}
                onChange={(e) => {
                  const pct = parseFloat(e.target.value || '0');
                  const bp = Math.round(pct * 100);
                  onUpdate(heir.id, { basisPoints: Math.max(0, Math.min(10000, bp)) });
                }}
                className="w-24 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-right text-sm text-white"
              />
              <span className="text-sm text-gray-400">%</span>
            </label>
          </div>
        ))}
      </div>

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          total === 10000
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        }`}
      >
        Total: <span className="font-mono">{(total / 100).toFixed(2)}%</span>
        {total === 10000 ? ' — balanced.' : ` (${distance > 0 ? 'over' : 'under'} by ${(Math.abs(distance) / 100).toFixed(2)}%)`}
      </div>
    </section>
  );
}

// ─── Step 3: secrets + envelope download ────────────────────────────────────

function Step3Secrets({
  heirs,
  onRegenerate,
  onUpdateNote,
  onDownload,
}: {
  heirs: DraftHeir[];
  onRegenerate: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onDownload: (heir: DraftHeir, index: number) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-cyan-400">
        <Key size={18} />
        <h2 className="text-lg font-semibold">Secrets for each heir</h2>
      </div>
      <p className="text-sm text-gray-400">
        Each heir gets a 32-byte secret. Print or download the envelopes below
        and give each one to the matching heir — sealed envelope alongside your
        will, password manager entry your family can access, whatever fits your
        plan. <strong>These secrets exist only here.</strong> If you lose them,
        the corresponding share cannot be claimed.
      </p>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-start gap-2 text-xs text-amber-200">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            On-chain we store the hash of (secret + share). The secret itself
            never goes on-chain. There is no recovery for a lost secret.
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {heirs.map((heir, i) => (
          <div
            key={heir.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-gray-500">
                  Heir {i + 1} — {(heir.basisPoints / 100).toFixed(2)}%
                </div>
                <div className="truncate font-mono text-xs text-gray-300">
                  {heir.guardian}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDownload(heir, i)}
                disabled={!heir.secret}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
              >
                <Download size={12} /> Envelope
              </button>
            </div>
            <label className="mt-3 block text-xs text-gray-400">
              Note (private, for your records — never sent on-chain)
            </label>
            <input
              type="text"
              value={heir.note}
              onChange={(e) => onUpdateNote(heir.id, e.target.value)}
              placeholder="e.g. Mom"
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                Show secret (sensitive)
              </summary>
              <div className="mt-2 break-all rounded-lg bg-black/40 p-2 font-mono text-[10px] text-gray-300">
                {heir.secret ?? '(not generated)'}
              </div>
              <button
                type="button"
                onClick={() => onRegenerate(heir.id)}
                className="mt-2 text-[10px] text-cyan-400 hover:text-cyan-300"
              >
                Regenerate secret
              </button>
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Step 4: review + propose ───────────────────────────────────────────────

function Step4Review({
  heirs,
  commitments,
  total,
  onSubmit,
  submitting,
  error,
}: {
  heirs: DraftHeir[];
  commitments: Hex[];
  total: number;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const allReady = heirs.every((h) => h.guardian && h.secret) && total === 10000;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-cyan-400">
        <FileText size={18} />
        <h2 className="text-lg font-semibold">Review your inheritance plan</h2>
      </div>
      <p className="text-sm text-gray-400">
        Below is exactly what gets sent on-chain. Shares are hidden — the
        contract sees only the commitment hashes.
      </p>

      <div className="space-y-2">
        {heirs.map((heir, i) => (
          <div
            key={heir.id}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500">
                  Heir {i + 1}
                </div>
                <div className="font-mono text-xs text-white">{heir.guardian}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Share (local)</div>
                <div className="text-sm text-white">{(heir.basisPoints / 100).toFixed(2)}%</div>
              </div>
            </div>
            <div className="mt-2 truncate font-mono text-[10px] text-gray-500">
              commitment: {commitments[i] ?? '0x…'}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-cyan-200">
        After you click <strong>Propose</strong>, a 30-day cooldown starts. You
        can cancel during that window. After 30 days, return to this tab and
        click <strong>Confirm</strong> to make the configuration active.
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!allReady || submitting}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-white font-bold disabled:opacity-50"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Submitting…
          </span>
        ) : (
          'Propose inheritance configuration'
        )}
      </button>
    </section>
  );
}

// ─── Navigation buttons ─────────────────────────────────────────────────────

function NavButtons({
  onBack,
  onNext,
  backDisabled,
  nextDisabled,
  nextHidden,
}: {
  onBack?: () => void;
  onNext?: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextHidden?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-between">
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled || !onBack}
        className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 disabled:opacity-30"
      >
        Back
      </button>
      {!nextHidden && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || !onNext}
          className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/30 disabled:opacity-30"
        >
          Next
        </button>
      )}
    </div>
  );
}

// ─── Empty-state messages ───────────────────────────────────────────────────

function ExistingConfigNotice() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
        <Shield className="mx-auto text-amber-400" size={32} />
        <h2 className="mt-4 text-xl font-bold text-white">
          Inheritance configuration already exists
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          You already have a configured or pending inheritance plan. To make
          changes, cancel the existing plan first on the inheritance status
          page.
        </p>
        <a
          href="/inheritance/status"
          className="mt-4 inline-block rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300"
        >
          Open status page
        </a>
      </div>
    </div>
  );
}

function NoVaultNotice() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <h2 className="text-xl font-bold text-white">No vault deployed</h2>
        <p className="mt-2 text-sm text-gray-400">
          You need a CardBound vault before configuring inheritance. Deploy
          one from the vault page first.
        </p>
        <a
          href="/vault"
          className="mt-4 inline-block rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300"
        >
          Deploy vault
        </a>
      </div>
    </div>
  );
}

function NoGuardiansNotice() {
  return (
    <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
        <Users className="mx-auto text-amber-400" size={32} />
        <h2 className="mt-4 text-xl font-bold text-white">Add guardians first</h2>
        <p className="mt-2 text-sm text-gray-400">
          Heirs must already be guardians on your vault. Add at least one
          guardian (ideally 2–3), then come back to configure inheritance.
        </p>
        <a
          href="/guardians"
          className="mt-4 inline-block rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300"
        >
          Manage guardians
        </a>
      </div>
    </div>
  );
}

function ProposalSuccessPage({
  txHash,
  heirs,
  onDownloadEnvelope,
}: {
  txHash: Hex;
  heirs: DraftHeir[];
  onDownloadEnvelope: (heir: DraftHeir, index: number) => void;
}) {
  // Defensive: surface a final reminder that envelopes are the ONLY copies.
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  useEffect(() => {
    // No side-effect by default. We just want a controlled toggle.
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 md:pt-[3.5rem] pb-12">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <CheckCircle2 className="text-emerald-400" size={32} />
        <h2 className="mt-3 text-xl font-bold text-white">
          Inheritance proposed
        </h2>
        <p className="mt-2 text-sm text-gray-300">
          The proposal is on-chain. A 30-day cooldown is now running. After
          that, return to the status page and click <strong>Confirm</strong> to
          activate the configuration.
        </p>
        <p className="mt-1 break-all font-mono text-[10px] text-gray-500">
          tx: {txHash}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2 text-amber-200">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Before you leave</h3>
            <p className="mt-1 text-xs">
              Download each heir&apos;s envelope and store them safely. Once
              this page closes, the secrets are gone — there is no copy
              anywhere else.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {heirs.map((heir, i) => (
          <div
            key={heir.id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-gray-500">
                Heir {i + 1} — {(heir.basisPoints / 100).toFixed(2)}%
              </div>
              <div className="truncate font-mono text-xs text-gray-300">
                {heir.guardian}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onDownloadEnvelope(heir, i);
                setDownloaded((prev) => new Set([...Array.from(prev), heir.id]));
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${
                downloaded.has(heir.id)
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25'
              }`}
            >
              {downloaded.has(heir.id) ? (
                <>
                  <CheckCircle2 size={12} /> Downloaded
                </>
              ) : (
                <>
                  <Download size={12} /> Envelope
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <a
        href="/inheritance/status"
        className="mt-6 inline-block rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-300"
      >
        Go to status page
      </a>
    </div>
  );
}
