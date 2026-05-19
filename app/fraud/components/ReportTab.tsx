'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
/**
 * ReportTab — file a fraud complaint against a target address.
 *
 * Contract-enforced requirements (surfaced in UI before submit):
 *   • target ≠ 0, target ≠ msg.sender, target ≠ a vault address
 *   • msg.sender's ProofScore (cached) ≥ MIN_REPORTER_SCORE (5000)
 *   • msg.sender hasn't already complained about target in the current epoch
 *   • target isn't already pendingReview / flagged / permanentlyBanned
 *
 * Penalty: if the DAO later dismisses the complaint, the reporter's
 * ProofScore is reduced by COMPLAINT_REPORTER_PENALTY (50).
 */

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { isAddress, type Address } from 'viem';
import { Flag, Loader2, AlertCircle, CheckCircle2, Info, Wallet, AlertTriangle } from 'lucide-react';
import { useFraudRegistry } from '@/hooks/useFraudRegistry';
import { SeerABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';

const MAX_REASON_LENGTH = 1000;

export function ReportTab() {
  const { address } = useAccount();
  const fr = useFraudRegistry();
  const seerAddress = CONTRACT_ADDRESSES.Seer;
  const seerConfigured = isConfiguredContractAddress(seerAddress);

  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Caller's ProofScore — needed to check the MIN_REPORTER_SCORE gate
  const { data: myScoreRaw } = useReadContract({
    address: seerAddress,
    abi: SeerABI,
    functionName: 'getCachedScore',
    args: address ? [address] : undefined,
    query: { enabled: seerConfigured && !!address },
  });
  const myScore = Number((myScoreRaw as bigint | undefined) ?? 0n);
  const scoreReady = address && myScoreRaw !== undefined;

  // Live target-side pre-flight: are they already pending/flagged/self/etc.?
  const [targetStatus, setTargetStatus] = useState<{
    pendingReview: boolean;
    flagged: boolean;
    banned: boolean;
    alreadyComplained: boolean;
    error: boolean;
    complaintCount: number;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const t = target.trim();
    if (!isAddress(t)) {
      setTargetStatus(null);
      return;
    }
    const cancel = { current: false };
    setChecking(true);
    void (async () => {
      const [status, hasComplained] = await Promise.all([
        fr.fetchStatus(t as Address),
        fr.fetchHasComplained(t as Address),
      ]);
      if (cancel.current) return;
      if (!status) {
        setTargetStatus({
          pendingReview: false,
          flagged: false,
          banned: false,
          alreadyComplained: false,
          error: true,
          complaintCount: 0,
        });
      } else {
        setTargetStatus({
          pendingReview: status.pendingReview,
          flagged: status.flagged,
          banned: status.permanentlyBanned,
          alreadyComplained: hasComplained,
          error: false,
          complaintCount: status.totalComplaints,
        });
      }
      setChecking(false);
    })();
    return () => {
      cancel.current = true;
    };
  }, [target, fr]);

  // Eligibility gate evaluation
  const targetTrimmed = target.trim();
  const targetIsValid = isAddress(targetTrimmed);
  const targetIsSelf = !!address && targetTrimmed.toLowerCase() === address.toLowerCase();
  const scoreOk = myScore >= fr.minReporterScore;

  const gateReasons: string[] = [];
  if (!fr.fraudConfigured) gateReasons.push('FraudRegistry is not configured for this environment.');
  if (!address) gateReasons.push('Connect your wallet to file a complaint.');
  if (address && scoreReady && !scoreOk) gateReasons.push(`Your ProofScore (${myScore}) is below the minimum (${fr.minReporterScore}).`);
  if (targetTrimmed && !targetIsValid) gateReasons.push('Target must be a valid Ethereum address.');
  if (targetIsValid && targetIsSelf) gateReasons.push('You cannot file a complaint against your own address.');
  if (targetStatus?.pendingReview) gateReasons.push('Target is already under DAO review.');
  if (targetStatus?.flagged) gateReasons.push('Target is already flagged.');
  if (targetStatus?.banned) gateReasons.push('Target is permanently banned.');
  if (targetStatus?.alreadyComplained) gateReasons.push('You have already filed a complaint against this target.');
  if (!reason.trim()) gateReasons.push('Provide a reason describing the alleged fraud.');

  const canSubmit = gateReasons.length === 0 && !submitting;

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await fr.fileComplaint(targetTrimmed as Address, reason.trim());
      setSuccess(`Complaint filed against ${targetTrimmed.slice(0, 6)}…${targetTrimmed.slice(-4)}. It will appear in the lookup view shortly.`);
      setReason('');
      setTarget('');
      setTargetStatus(null);
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Failed to file complaint';
      if (msg.includes('FR_InsufficientScore')) setError('Your ProofScore is below the minimum required to file complaints.');
      else if (msg.includes('FR_AlreadyComplained')) setError('You have already filed a complaint against this target.');
      else if (msg.includes('FR_SelfComplaint')) setError('Cannot file a complaint against yourself.');
      else if (msg.includes('FR_InvalidTarget')) setError('Target is not a valid complaint subject (vault addresses are excluded).');
      else if (msg.includes('FR_ReviewActive')) setError('Target is already under review, flagged, or banned.');
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Eligibility status banner */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 flex items-start gap-3">
        <Wallet className="text-cyan-400 shrink-0 mt-0.5" size={18} />
        <div className="flex-1 text-sm">
          {!address ? (
            <>
              <p className="text-zinc-300">Connect your wallet to file a complaint.</p>
              <div className="mt-6 flex justify-center">
                <ConnectButton />
              </div>
            </>
          ) : !seerConfigured ? (
            <p className="text-zinc-300">Seer (ProofScore) not configured — eligibility cannot be verified.</p>
          ) : !scoreReady ? (
            <p className="text-zinc-400 inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Checking eligibility…
            </p>
          ) : (
            <>
              <p className="text-zinc-100">
                Your ProofScore: <span className="font-semibold tabular-nums">{myScore}</span>{' '}
                <span className="text-zinc-500">(minimum required: {fr.minReporterScore})</span>
              </p>
              {!scoreOk && (
                <p className="text-amber-300 text-xs mt-1 flex items-center gap-1">
                  <Info size={10} /> You need a higher ProofScore to file complaints. Build trust by transacting normally on the protocol.
                </p>
              )}
              {scoreOk && (
                <p className="text-emerald-300 text-xs mt-1 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Eligible to file complaints
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-2">Target address</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0x…"
            className="w-full bg-black/40 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none text-sm font-mono"
          />
          {targetIsValid && checking && (
            <p className="text-xs text-zinc-500 mt-1.5 inline-flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> Checking target status…
            </p>
          )}
          {targetStatus && !targetStatus.error && targetStatus.complaintCount > 0 && !targetStatus.alreadyComplained && (
            <p className="text-xs text-amber-300 mt-1.5 inline-flex items-center gap-1">
              <AlertTriangle size={10} /> Target already has {targetStatus.complaintCount}{' '}
              complaint{targetStatus.complaintCount === 1 ? '' : 's'}.{' '}
              One more would put them at {targetStatus.complaintCount + 1} / {fr.complaintsToFlag}.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-2">
            Reason
            <span className="text-zinc-500 ml-2 normal-case">(public on-chain — be specific and factual)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
            rows={5}
            placeholder="Describe the alleged fraud. Include transaction hashes or relevant context where possible."
            className="w-full bg-black/40 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none text-sm resize-none"
          />
          <p className="text-xs text-zinc-500 text-right mt-1">
            {reason.length} / {MAX_REASON_LENGTH}
          </p>
        </div>

        {/* Gate reasons (only show if there are any, and only after user has interacted) */}
        {(targetTrimmed || reason) && gateReasons.length > 0 && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
            <p className="text-xs uppercase tracking-wide text-amber-300 mb-2 flex items-center gap-1">
              <Info size={11} /> Before you can submit
            </p>
            <ul className="text-xs text-amber-200/90 space-y-1 list-disc list-inside">
              {gateReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 flex items-start gap-2">
            <AlertCircle size={12} className="text-red-300 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-start gap-2">
            <CheckCircle2 size={12} className="text-emerald-300 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300">{success}</p>
          </div>
        )}

        <button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Filing complaint…
            </>
          ) : (
            <>
              <Flag size={14} /> File Complaint
            </>
          )}
        </button>

        {/* Penalty disclosure */}
        <div className="text-xs text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-start gap-1.5">
          <Info size={11} className="mt-0.5 shrink-0" />
          <span>
            If the DAO later dismisses this complaint as false, your ProofScore will be reduced by{' '}
            <strong>{fr.complaintReporterPenalty} points</strong>. File only when you have genuine reason to believe fraud occurred.
          </span>
        </div>
      </div>
    </div>
  );
}
