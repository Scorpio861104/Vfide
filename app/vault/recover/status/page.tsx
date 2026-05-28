'use client';

export const dynamic = 'force-dynamic';

/**
 * /vault/recover/status — claimant-side recovery lifecycle tracker.
 *
 * After a user submits a recovery claim through ClaimFlowModal, they land
 * here to track progress and finalize when ready. The page also accepts
 * direct navigation with ?vault=0x... or ?recoveryId=... for users who
 * are returning later (different session, different device).
 *
 * Why this page exists (Phase 1.5):
 *   ClaimFlowModal submits the claim and closes. There was no in-app path
 *   to come back, track progress, or finalize. The claimant had to use
 *   Etherscan for the final step. This page closes that gap.
 *
 * Lifecycle states the page renders:
 *   - Pending: guardians still voting. Progress display, no action.
 *   - GuardianApproved: in challenge window. Countdown display, no action
 *     (the OWNER might challenge during this; the claimant just waits).
 *   - Approved: window passed, ready to finalize. PROMINENT finalize button.
 *   - Executed: done. Success state with link to new vault dashboard.
 *   - Challenged/Rejected/Expired: terminal failure. Explain what happened
 *     and what the user can do next.
 *
 * Permissionless finalization: the contract allows ANYONE to call
 * finalizeClaim, not just the claimant. So this page is usable by a
 * helper or guardian too — they enter the vault address and finalize on
 * the claimant's behalf if the claimant can't (e.g., is offline). The UI
 * doesn't gate the action on "are you the claimant"; it just gates on
 * "can the claim be finalized right now."
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePublicClient } from 'wagmi';
import {
  ArrowLeft,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  Search,
  Unlock,
  Hourglass,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/GlassCard';
import { useRecoveryClaim, RecoveryClaimStatus } from '@/hooks/useRecoveryClaim';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { VaultRegistryABI } from '@/lib/abis';

const SECONDS_PER_DAY = 86_400;

function formatTimeRemaining(seconds: bigint): string {
  const s = Number(seconds);
  if (s <= 0) return 'window closed';
  const days = Math.floor(s / SECONDS_PER_DAY);
  if (days >= 2) return `${days} days remaining`;
  if (days === 1) return '1 day remaining';
  const hours = Math.floor(s / 3600);
  if (hours >= 2) return `${hours} hours remaining`;
  if (hours === 1) return '1 hour remaining';
  const minutes = Math.floor(s / 60);
  return minutes >= 2 ? `${minutes} minutes remaining` : 'less than 1 minute';
}

function formatStatus(status: RecoveryClaimStatus): { label: string; color: string } {
  switch (status) {
    case RecoveryClaimStatus.None:
      return { label: 'No active claim', color: 'text-gray-400' };
    case RecoveryClaimStatus.Pending:
      return { label: 'Awaiting guardian votes', color: 'text-amber-300' };
    case RecoveryClaimStatus.GuardianApproved:
      return { label: 'Guardians approved — challenge window active', color: 'text-cyan-300' };
    case RecoveryClaimStatus.Approved:
      return { label: 'Ready to finalize', color: 'text-emerald-300' };
    case RecoveryClaimStatus.Challenged:
      return { label: 'Challenged by owner', color: 'text-red-300' };
    case RecoveryClaimStatus.Rejected:
      return { label: 'Rejected', color: 'text-red-300' };
    case RecoveryClaimStatus.Expired:
      return { label: 'Expired', color: 'text-gray-400' };
    case RecoveryClaimStatus.Executed:
      return { label: 'Recovery complete', color: 'text-emerald-300' };
  }
}

export default function RecoveryStatusPage() {
  const searchParams = useSearchParams();
  const publicClient = usePublicClient();

  // Two ways to identify the vault:
  // 1. Direct ?vault= parameter (came from ClaimFlowModal which knew the address)
  // 2. ?recoveryId= parameter — needs lookup against VaultRegistry
  const vaultParam = searchParams.get('vault') as `0x${string}` | null;
  const recoveryIdParam = searchParams.get('recoveryId');

  const [lookupInput, setLookupInput] = useState('');
  const [resolvedVault, setResolvedVault] = useState<`0x${string}` | null>(vaultParam);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [finalizeSuccess, setFinalizeSuccess] = useState(false);

  // If we got a recoveryId param, resolve it to a vault address on mount.
  useEffect(() => {
    if (recoveryIdParam && !resolvedVault && publicClient) {
      (async () => {
        try {
          const vault = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.VaultRegistry,
            abi: VaultRegistryABI as any,
            functionName: 'searchByRecoveryId',
            args: [recoveryIdParam],
          });
          if (vault && vault !== '0x0000000000000000000000000000000000000000') {
            setResolvedVault(vault as `0x${string}`);
          } else {
            setLookupError('Recovery ID not found.');
          }
        } catch (e: any) {
          setLookupError(e?.shortMessage || e?.message || 'Lookup failed');
        }
      })();
    }
  }, [recoveryIdParam, resolvedVault, publicClient]);

  const handleLookup = async () => {
    setLookupError(null);
    if (!publicClient) return;
    if (!lookupInput.trim()) return;

    // Heuristic: 0x-prefixed and right length → treat as vault address.
    // Otherwise treat as recovery ID and look it up.
    const trimmed = lookupInput.trim();
    if (trimmed.startsWith('0x') && trimmed.length === 42) {
      setResolvedVault(trimmed as `0x${string}`);
      return;
    }
    try {
      const vault = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.VaultRegistry,
        abi: VaultRegistryABI as any,
        functionName: 'searchByRecoveryId',
        args: [trimmed],
      });
      if (vault && vault !== '0x0000000000000000000000000000000000000000') {
        setResolvedVault(vault as `0x${string}`);
      } else {
        setLookupError('Recovery ID not found.');
      }
    } catch (e: any) {
      setLookupError(e?.shortMessage || e?.message || 'Lookup failed');
    }
  };

  return (
    <>
      <div className="min-h-screen md:pt-[3.5rem] text-white">
        <div className="container mx-auto max-w-3xl px-4 pb-16">
          <Link
            href="/vault/recover"
            className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
          >
            <ArrowLeft size={16} /> Back to recovery search
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
              <Hourglass className="text-cyan-400" size={28} />
              Recovery status
            </h1>
            <p className="text-gray-400 leading-relaxed">
              Track the progress of a recovery claim, finalize when ready, or check what happened
              to a claim that didn&apos;t go through.
            </p>
          </div>

          {/* Lookup form (only shown if no vault resolved yet) */}
          {!resolvedVault && (
            <GlassCard hover={false} className="mb-6 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Find a recovery claim</h3>
              <p className="text-xs text-gray-400 mb-4">
                Enter the vault address or recovery ID. If you just submitted a claim, the link
                you received already contains the vault address.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="0x... or recovery ID"
                  className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-white/20 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 font-mono"
                />
                <button
                  onClick={() => void handleLookup()}
                  disabled={!lookupInput.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Search size={16} />
                  Look up
                </button>
              </div>
              {lookupError && (
                <p className="text-xs text-red-300 mt-3">{lookupError}</p>
              )}
            </GlassCard>
          )}

          {resolvedVault && (
            <RecoveryStatusBody
              vaultAddress={resolvedVault}
              finalizeError={finalizeError}
              setFinalizeError={setFinalizeError}
              finalizeSuccess={finalizeSuccess}
              setFinalizeSuccess={setFinalizeSuccess}
              onClear={() => {
                setResolvedVault(null);
                setLookupInput('');
                setFinalizeError(null);
                setFinalizeSuccess(false);
              }}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

interface BodyProps {
  vaultAddress: `0x${string}`;
  finalizeError: string | null;
  setFinalizeError: (s: string | null) => void;
  finalizeSuccess: boolean;
  setFinalizeSuccess: (b: boolean) => void;
  onClear: () => void;
}

/**
 * The actual status body — receives the resolved vault address and renders
 * the appropriate state. Split into its own component so the hook is only
 * invoked once we have a valid vault address.
 */
function RecoveryStatusBody({
  vaultAddress,
  finalizeError,
  setFinalizeError,
  finalizeSuccess,
  setFinalizeSuccess,
  onClear,
}: BodyProps) {
  const publicClient = usePublicClient();
  const {
    claimId,
    hasClaim,
    claim,
    claimStatus,
    canFinalize,
    challengeTimeRemaining,
    finalize,
    isWritePending,
    refetchClaim,
  } = useRecoveryClaim({ targetVault: vaultAddress });

  const handleFinalize = async () => {
    setFinalizeError(null);
    try {
      const hash = await finalize();
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setFinalizeSuccess(true);
      await refetchClaim();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.details || e?.message || 'Finalize failed';
      setFinalizeError(msg);
    }
  };

  // No claim found on this vault
  if (!hasClaim || !claim) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="text-center py-8">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-lg font-bold text-white mb-2">No active recovery claim</h3>
          <p className="text-sm text-gray-400 mb-1 font-mono break-all">{vaultAddress}</p>
          <p className="text-xs text-gray-500 mb-6">
            This vault either has no recovery in progress, or the claim has been cleaned up after
            execution.
          </p>
          <button
            onClick={onClear}
            className="px-5 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            Search again
          </button>
        </div>
      </GlassCard>
    );
  }

  const status = formatStatus(claimStatus);
  const isTerminal = [
    RecoveryClaimStatus.Challenged,
    RecoveryClaimStatus.Rejected,
    RecoveryClaimStatus.Expired,
    RecoveryClaimStatus.Executed,
  ].includes(claimStatus);

  return (
    <div className="space-y-5">
      {/* Status overview card */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-start gap-4 mb-5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              claimStatus === RecoveryClaimStatus.Executed
                ? 'bg-emerald-500/20'
                : claimStatus === RecoveryClaimStatus.Approved
                  ? 'bg-emerald-500/20'
                  : claimStatus === RecoveryClaimStatus.GuardianApproved
                    ? 'bg-cyan-500/20'
                    : claimStatus === RecoveryClaimStatus.Pending
                      ? 'bg-amber-500/20'
                      : 'bg-red-500/20'
            }`}
          >
            {claimStatus === RecoveryClaimStatus.Executed ? (
              <CheckCircle2 className="text-emerald-400" size={24} />
            ) : claimStatus === RecoveryClaimStatus.Approved ? (
              <Unlock className="text-emerald-400" size={24} />
            ) : claimStatus === RecoveryClaimStatus.GuardianApproved ? (
              <Clock className="text-cyan-400" size={24} />
            ) : claimStatus === RecoveryClaimStatus.Pending ? (
              <Users className="text-amber-400" size={24} />
            ) : (
              <XCircle className="text-red-400" size={24} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Claim status</p>
            <h2 className={`text-xl font-bold ${status.color}`}>{status.label}</h2>
            <p className="text-xs text-gray-500 mt-1">Vault {vaultAddress}</p>
          </div>
        </div>

        {/* Progress: approvals + window */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-black/20">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Guardian approvals</p>
            <p className="text-white font-bold">
              {claim.guardianApprovals} of {claim.guardianCountSnapshot}
            </p>
          </div>
          {claimStatus === RecoveryClaimStatus.GuardianApproved && (
            <div className="p-3 rounded-lg bg-black/20">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Challenge window</p>
              <p className="text-white font-bold">{formatTimeRemaining(challengeTimeRemaining)}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Action card */}
      {claimStatus === RecoveryClaimStatus.Approved && !finalizeSuccess && (
        <GlassCard hover={false} gradient="green" className="p-6">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Unlock className="text-emerald-400" size={20} />
            Ready to finalize
          </h3>
          <p className="text-sm text-gray-300 mb-5">
            The challenge window has passed without veto. Click below to complete the recovery
            and transfer vault ownership to the new wallet.
          </p>
          {finalizeError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
              <p className="text-xs text-red-300">{finalizeError}</p>
            </div>
          )}
          <button
            onClick={() => void handleFinalize()}
            disabled={!canFinalize || isWritePending}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWritePending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizing…
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                Finalize Recovery
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-3">
            This action is permissionless — any wallet can finalize an approved claim. The new
            owner is set by the original claimant address, not whoever calls this.
          </p>
        </GlassCard>
      )}

      {/* Waiting state — guardian voting */}
      {claimStatus === RecoveryClaimStatus.Pending && (
        <GlassCard hover={false} className="p-6">
          <h3 className="text-sm font-bold text-amber-300 mb-2 flex items-center gap-2">
            <Users size={16} />
            Waiting for guardians
          </h3>
          <p className="text-sm text-gray-300">
            Your guardians need to review and vote on this claim. They&apos;ll see the reason you
            provided and decide whether to approve. Once enough guardians approve, the challenge
            window begins.
          </p>
        </GlassCard>
      )}

      {/* Waiting state — challenge window */}
      {claimStatus === RecoveryClaimStatus.GuardianApproved && (
        <GlassCard hover={false} className="p-6">
          <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
            <Clock size={16} />
            Challenge window in progress
          </h3>
          <p className="text-sm text-gray-300">
            Guardians approved your claim. The original wallet now has a window to challenge if
            this recovery wasn&apos;t actually requested. Assuming no challenge, you&apos;ll be able to
            finalize when the window closes ({formatTimeRemaining(challengeTimeRemaining)}).
          </p>
        </GlassCard>
      )}

      {/* Success state — finalized */}
      {(claimStatus === RecoveryClaimStatus.Executed || finalizeSuccess) && (
        <GlassCard hover={false} gradient="green" className="p-6 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
          <h3 className="text-xl font-bold text-white mb-2">Recovery complete</h3>
          <p className="text-sm text-gray-300 mb-5">
            Vault ownership has been transferred to the new wallet. You can now access your
            vault from this device.
          </p>
          <Link
            href="/vault"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold"
          >
            <Shield size={16} />
            Open vault dashboard
          </Link>
        </GlassCard>
      )}

      {/* Terminal failure states */}
      {claimStatus === RecoveryClaimStatus.Challenged && (
        <GlassCard hover={false} className="p-6 border border-red-500/30">
          <h3 className="text-lg font-bold text-red-300 mb-2 flex items-center gap-2">
            <XCircle size={20} />
            Claim was challenged
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            The original wallet challenged this recovery before the window closed. This wallet
            cannot initiate another claim against this vault for 30 days (the cooldown period).
          </p>
          <p className="text-xs text-gray-500">
            If you believe the challenge was wrong (someone else has access to your old wallet
            and is blocking your legitimate recovery), contact your guardians directly — they
            can coordinate a new claim from a different wallet.
          </p>
        </GlassCard>
      )}

      {claimStatus === RecoveryClaimStatus.Rejected && (
        <GlassCard hover={false} className="p-6 border border-red-500/30">
          <h3 className="text-lg font-bold text-red-300 mb-2 flex items-center gap-2">
            <XCircle size={20} />
            Claim was rejected
          </h3>
          <p className="text-sm text-gray-300">
            Guardians voted against this recovery. The most common reasons are that they
            couldn&apos;t verify the claimant&apos;s identity, the reason given didn&apos;t match what they
            knew about the situation, or they suspected the claim was fraudulent.
          </p>
        </GlassCard>
      )}

      {claimStatus === RecoveryClaimStatus.Expired && (
        <GlassCard hover={false} className="p-6">
          <h3 className="text-lg font-bold text-gray-300 mb-2 flex items-center gap-2">
            <AlertCircle size={20} />
            Claim expired
          </h3>
          <p className="text-sm text-gray-300">
            This claim never reached enough guardian approvals before the 90-day expiry window
            closed. The vault is free to accept a new claim. If you still need to recover this
            vault, start a fresh recovery claim and make sure your guardians know to vote.
          </p>
        </GlassCard>
      )}

      {/* Claim details (always visible, low-key) */}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-300">Claim details</summary>
        <div className="mt-3 space-y-2 p-4 rounded-lg bg-black/20">
          <p>
            <span className="text-gray-600">Claim ID:</span> {claimId.toString()}
          </p>
          <p>
            <span className="text-gray-600">Claimant:</span>{' '}
            <span className="font-mono break-all">{claim.claimant}</span>
          </p>
          {claim.initiator !== claim.claimant && (
            <p>
              <span className="text-gray-600">Initiator (trustee):</span>{' '}
              <span className="font-mono break-all">{claim.initiator}</span>
            </p>
          )}
          <p>
            <span className="text-gray-600">Initiated:</span>{' '}
            {new Date(Number(claim.initiatedAt) * 1000).toLocaleString()}
          </p>
          {claim.claimReason && (
            <p>
              <span className="text-gray-600">Reason:</span> <em>&quot;{claim.claimReason}&quot;</em>
            </p>
          )}
        </div>
      </details>

      {!isTerminal && (
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Look up a different vault
        </button>
      )}
    </div>
  );
}
