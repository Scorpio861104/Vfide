'use client';

/**
 * /verifier — Trusted Verifier Console
 *
 * This page is for trusted verifiers (a small set of protocol-attested
 * addresses) who act as a fallback quorum for vault recovery claims when
 * the guardian set is unavailable or unresponsive.
 *
 * Verifiers are set by the protocol owner via:
 *   VaultRecoveryClaim.setTrustedVerifier(address, bool)
 *
 * The UI:
 *   1. Checks if the connected wallet is a trusted verifier
 *   2. Lets the verifier look up a claim by claimId
 *   3. Shows full claim detail: vault, claimant, guardian votes, status, timeline
 *   4. Allows Approve / Reject vote if not already voted
 *   5. Shows expiry and finalize button if approved + challenge window passed
 */

import { useState, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { type Address } from 'viem';
import { useVerifierVote } from '@/hooks/useVerifierVote';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
import VaultRecoveryClaimABI from '@/lib/abis/VaultRecoveryClaim.json';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// ─────────────────────────────────────────────────────────────────────────────
// Types mirroring VaultRecoveryClaim.RecoveryClaim struct
// ─────────────────────────────────────────────────────────────────────────────
type ClaimStatus = 0n | 1n | 2n | 3n | 4n | 5n;
const STATUS_LABELS: Record<string, string> = {
  '0': 'None',
  '1': 'Pending',
  '2': 'Guardian Approved',
  '3': 'Finalized',
  '4': 'Rejected',
  '5': 'Expired',
};
const STATUS_COLORS: Record<string, string> = {
  '0': 'text-zinc-400',
  '1': 'text-amber-400',
  '2': 'text-emerald-400',
  '3': 'text-sky-400',
  '4': 'text-red-400',
  '5': 'text-zinc-500',
};

function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Claim Detail Panel
// ─────────────────────────────────────────────────────────────────────────────
function ClaimPanel({ claimId }: { claimId: bigint }) {
  const recoveryAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim as Address;
  const configured = isConfiguredContractAddress(recoveryAddress);

  const { data: rawClaim, isLoading: claimLoading, refetch: refetchClaim } =
    useReadContract({
      address: recoveryAddress,
      abi: VaultRecoveryClaimABI,
      functionName: 'getClaim',
      args: [claimId],
      query: { enabled: configured && claimId > 0n },
    });

  const { data: canFinalizeRaw } = useReadContract({
    address: recoveryAddress,
    abi: VaultRecoveryClaimABI,
    functionName: 'canFinalize',
    args: [claimId],
    query: { enabled: configured && claimId > 0n },
  });

  const { data: challengeSecsRaw } = useReadContract({
    address: recoveryAddress,
    abi: VaultRecoveryClaimABI,
    functionName: 'challengeTimeRemaining',
    args: [claimId],
    query: { enabled: configured && claimId > 0n },
  });

  const {
    isTrustedVerifier,
    hasVoted,
    vote,
    isWritePending,
    isConfirming,
    isConfirmed,
    writeError,
    refetchVoted,
  } = useVerifierVote({ claimId });

  const claim = rawClaim as {
    vault: string;
    claimant: string;
    initiatedAt: bigint;
    challengePeriodSnapshot: bigint;
    reason: string;
    evidenceHash: string;
    status: ClaimStatus;
    guardianApprovals: bigint;
    guardianRejections: bigint;
    verifierApprovals: bigint;
    verifierRejections: bigint;
    requiredApprovals: bigint;
    requiredVerifierApprovals: bigint;
  } | undefined;

  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSent, setVoteSent] = useState(false);

  const handleVote = useCallback(
    async (approve: boolean) => {
      setVoteError(null);
      setVoteSent(false);
      try {
        await vote(approve);
        setVoteSent(true);
        setTimeout(() => {
          refetchVoted();
          refetchClaim();
        }, 3000);
      } catch (err) {
        setVoteError(err instanceof Error ? err.message : 'Vote failed');
      }
    },
    [vote, refetchVoted, refetchClaim]
  );

  if (claimLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  if (!claim || claim.vault === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-6 text-center text-zinc-400">
        No claim found for ID #{claimId.toString()}
      </div>
    );
  }

  const statusKey = claim.status.toString();
  const statusLabel = STATUS_LABELS[statusKey] ?? 'Unknown';
  const statusColor = STATUS_COLORS[statusKey] ?? 'text-zinc-400';
  const canFinalize = Array.isArray(canFinalizeRaw) ? canFinalizeRaw[0] : false;
  const challengeSecs = typeof challengeSecsRaw === 'bigint' ? Number(challengeSecsRaw) : 0;
  const challengeMins = Math.ceil(challengeSecs / 60);

  return (
    <div className="space-y-4">
      {/* Claim summary card */}
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-white">
            Claim #{claimId.toString()}
          </span>
          <span className={`text-sm font-medium px-3 py-1 rounded-full bg-zinc-700 ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-zinc-500 uppercase text-xs tracking-wide mb-1">Vault</p>
            <p className="font-mono text-zinc-300">{shortAddr(claim.vault)}</p>
          </div>
          <div>
            <p className="text-zinc-500 uppercase text-xs tracking-wide mb-1">Claimant</p>
            <p className="font-mono text-zinc-300">{shortAddr(claim.claimant)}</p>
          </div>
          <div>
            <p className="text-zinc-500 uppercase text-xs tracking-wide mb-1">Initiated</p>
            <p className="text-zinc-300">
              {claim.initiatedAt > 0n
                ? new Date(Number(claim.initiatedAt) * 1000).toLocaleString()
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-zinc-500 uppercase text-xs tracking-wide mb-1">Challenge Period</p>
            <p className="text-zinc-300">
              {claim.challengePeriodSnapshot > 0n
                ? `${Math.ceil(Number(claim.challengePeriodSnapshot) / 3600)}h`
                : '—'}
            </p>
          </div>
        </div>

        {claim.reason && (
          <div>
            <p className="text-zinc-500 uppercase text-xs tracking-wide mb-1">Reason</p>
            <p className="text-zinc-300 text-sm">{claim.reason}</p>
          </div>
        )}

        {claim.evidenceHash && claim.evidenceHash !== '0x' + '0'.repeat(64) && (
          <div>
            <p className="text-zinc-500 uppercase text-xs tracking-wide mb-1">Evidence Hash</p>
            <p className="font-mono text-zinc-400 text-xs break-all">{claim.evidenceHash}</p>
          </div>
        )}
      </div>

      {/* Votes */}
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-6">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-4">
          Vote Tally
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-400">
              {claim.guardianApprovals.toString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Guardian Approvals</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">
              {claim.guardianRejections.toString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Guardian Rejections</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-sky-400">
              {claim.verifierApprovals.toString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Verifier Approvals</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">
              {claim.verifierRejections.toString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Verifier Rejections</p>
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-xs text-zinc-500">
          <span>Required guardian: {claim.requiredApprovals.toString()}</span>
          <span>Required verifier: {claim.requiredVerifierApprovals.toString()}</span>
        </div>
      </div>

      {/* Challenge timer */}
      {statusKey === '2' && challengeSecs > 0 && (
        <div className="rounded-2xl border border-amber-700/40 bg-amber-900/10 p-4 text-sm text-amber-300">
          ⏳ Challenge window: {challengeMins} minute{challengeMins !== 1 ? 's' : ''} remaining
        </div>
      )}

      {/* Verifier vote panel */}
      {isTrustedVerifier && (statusKey === '1' || statusKey === '2') && (
        <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
            Cast Your Verifier Vote
          </h3>
          {hasVoted ? (
            <div className="text-sm text-emerald-400">
              ✅ You have already voted on this claim.
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleVote(true)}
                disabled={isWritePending || isConfirming}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3 text-sm font-semibold text-white transition-colors"
              >
                {isWritePending || isConfirming ? 'Submitting…' : '✓ Approve'}
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={isWritePending || isConfirming}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 py-3 text-sm font-semibold text-white transition-colors"
              >
                {isWritePending || isConfirming ? 'Submitting…' : '✗ Reject'}
              </button>
            </div>
          )}
          {(isConfirmed || voteSent) && !writeError && (
            <p className="text-sm text-emerald-400">Vote submitted successfully.</p>
          )}
          {(voteError ?? writeError) && (
            <p className="text-sm text-red-400 break-words">
              {voteError ?? writeError?.message}
            </p>
          )}
        </div>
      )}

      {!isTrustedVerifier && (
        <div className="rounded-2xl border border-zinc-700 bg-zinc-800/40 p-4 text-sm text-zinc-500 text-center">
          Your wallet is not registered as a trusted verifier. Only verifiers can vote.
        </div>
      )}

      {/* Finalize */}
      {canFinalize && (
        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/10 p-4 text-sm text-emerald-300 text-center">
          ✅ This claim is ready to finalize. Head to the recovery page to execute.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function VerifierConsolePage() {
  const { address, isConnected } = useAccount();
  const [claimIdInput, setClaimIdInput] = useState('');
  const [activeClaimId, setActiveClaimId] = useState<bigint | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const recoveryAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim as Address;
  const configured = isConfiguredContractAddress(recoveryAddress);

  // Check if connected wallet is a trusted verifier
  const { data: isTrustedRaw } = useReadContract({
    address: recoveryAddress,
    abi: VaultRecoveryClaimABI,
    functionName: 'trustedVerifier',
    args: address ? [address] : undefined,
    query: { enabled: configured && isConnected && !!address },
  });
  const isTrusted = !!isTrustedRaw;

  const handleLookup = useCallback(() => {
    setInputError(null);
    const trimmed = claimIdInput.trim();
    if (!trimmed) {
      setInputError('Please enter a claim ID.');
      return;
    }
    try {
      const id = BigInt(trimmed);
      if (id <= 0n) {
        setInputError('Claim ID must be greater than 0.');
        return;
      }
      setActiveClaimId(id);
    } catch {
      setInputError('Invalid claim ID — must be a positive integer.');
    }
  }, [claimIdInput]);

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-2xl px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <div className="badge-live mb-3">
            🔍 Verifier Console
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xl">
              🔍
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Verifier Console</h1>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Trusted verifiers can review and vote on vault recovery claims as a
            fallback quorum when the guardian set is unavailable. This page is for
            protocol-attested verifiers only.
          </p>
        </div>

        {/* Wallet */}
        {!isConnected ? (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-6 text-center space-y-3">
            <p className="text-zinc-400 text-sm">
              Connect your wallet to access the verifier console.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Connected</p>
              <p className="font-mono text-sm text-zinc-300">{address}</p>
            </div>
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                isTrusted
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {isTrusted ? '✓ Trusted Verifier' : 'Not a Verifier'}
            </span>
          </div>
        )}

        {/* Contract not configured */}
        {!configured && (
          <div className="rounded-2xl border border-amber-700/40 bg-amber-900/10 p-4 text-sm text-amber-300">
            VaultRecoveryClaim contract is not configured on this network. Connect
            to Base mainnet or Base Sepolia.
          </div>
        )}

        {/* Claim lookup */}
        {isConnected && configured && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Look Up a Claim
            </h2>
            <div className="flex gap-3">
              <input
                type="number"
                inputMode="numeric"
                value={claimIdInput}
                onChange={(e) => setClaimIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="Claim ID (e.g. 1)"
                className="flex-1 rounded-xl bg-zinc-700 border border-zinc-600 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <button
                onClick={handleLookup}
                className="rounded-xl bg-sky-600 hover:bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                Look Up
              </button>
            </div>
            {inputError && (
              <p className="text-sm text-red-400">{inputError}</p>
            )}
          </div>
        )}

        {/* Claim detail */}
        {activeClaimId !== null && configured && (
          <ClaimPanel claimId={activeClaimId} />
        )}

        {/* Info box */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-xs text-zinc-500 space-y-2">
          <p className="font-semibold text-zinc-400">How verifier voting works</p>
          <p>
            When a vault owner initiates a recovery claim, the primary path is
            guardian M-of-N approval. If guardians are unavailable, a fallback
            quorum of trusted verifiers can approve or reject the claim instead.
          </p>
          <p>
            Verifiers are set by the protocol owner and cannot self-register.
            Each verifier gets one vote per claim. Once the required verifier
            approvals threshold is met, the claim transitions to Guardian Approved
            state and the challenge window begins.
          </p>
          <p>
            During the challenge window, the original vault owner can veto the
            claim. If no challenge is raised, anyone can call finalize to
            execute the wallet rotation.
          </p>
        </div>
      </div>
    </div>
  );
}
