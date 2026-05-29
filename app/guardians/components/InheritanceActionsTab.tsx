'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
/**
 * InheritanceActionsTab — per-vault panel for guardians and heirs in the
 * CardBound inheritance flow.
 *
 * Guardian actions (per watched vault):
 *  - Initiate claim (STATE_NORMAL, is guardian, has heirs configured)
 *  - Veto claim (STATE_VETO_PERIOD, is guardian)
 *
 * Heir actions (per watched vault):
 *  - Reveal secret + basis points (STATE_CLAIM_WINDOW)
 *  - Finalize distribution (STATE_CLAIM_WINDOW, all revealed or window ended)
 *  - Withdraw payout (STATE_MEMORIAL)
 *  - Cleanup memorial (STATE_MEMORIAL, after memorial period)
 */

import { useState, useCallback } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { keccak256, toBytes, isAddress, encodeAbiParameters, parseAbiParameters } from 'viem';
import { m, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import {
  Shield,
  Heart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowRight,
} from 'lucide-react';
import { CARD_BOUND_VAULT_ABI } from '@/lib/contracts';
import { useGuardianWatchlist, useGuardianAttestations, mergeInboxEntries } from './hooks';
import { shortAddress, type WatchedVault } from './types';
import { useMemo } from 'react';

// ── Inline minimal ABI for the InheritanceManager ───────────────────────────
const INHERITANCE_MANAGER_ABI = [
  { name: 'heirCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'inheritanceStateValue', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'inheritanceStateWindowEnd', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { name: 'inheritanceInitiator', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'inheritanceReasonHash', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { name: 'vetoCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'snapshotVetoThreshold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'heirCommitmentByGuardian', type: 'function', stateMutability: 'view', inputs: [{ name: 'guardian', type: 'address' }], outputs: [{ type: 'bytes32' }] },
  { name: 'distributionFinalized', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'payoutBalance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'claimedHashes', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { name: 'totalRevealedBasisPoints', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// ── Constants ────────────────────────────────────────────────────────────────
const INHERITANCE_COMMITMENT_DOMAIN = keccak256(toBytes('VFIDE_INHERITANCE_V1'));

const STATE_NORMAL = 0;
const STATE_VETO_PERIOD = 1;
const STATE_CLAIM_WINDOW = 2;
const STATE_MEMORIAL = 3;
const STATE_CLOSED = 4;

const STATE_LABELS: Record<number, string> = {
  [STATE_NORMAL]: 'Normal',
  [STATE_VETO_PERIOD]: 'Veto Period',
  [STATE_CLAIM_WINDOW]: 'Claim Window',
  [STATE_MEMORIAL]: 'Memorial',
  [STATE_CLOSED]: 'Closed',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function computeCommitment(heirAddress: `0x${string}`, secret: `0x${string}`): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('bytes32, address, bytes32'),
      [INHERITANCE_COMMITMENT_DOMAIN, heirAddress, secret]
    )
  );
}

function formatCountdown(unixTs: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const secs = Number(unixTs) - now;
  if (secs <= 0) return 'Expired';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Per-vault card ────────────────────────────────────────────────────────────
function VaultInheritanceCard({
  entry,
  userAddress,
}: {
  entry: WatchedVault;
  userAddress: `0x${string}`;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [basisPointsInput, setBasisPointsInput] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'submitted' | 'success' | 'error'>('idle');
  const [txMsg, setTxMsg] = useState('');

  const { writeContractAsync } = useWriteContract();

  // ── Vault reads ─────────────────────────────────────────────────────────
  const { data: inheritanceStateRaw } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'inheritanceState',
  });

  const { data: managerAddress } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'inheritanceManager',
  });

  const { data: isGuardian } = useReadContract({
    address: entry.address,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'isGuardian',
    args: [userAddress],
  });

  const currentState = inheritanceStateRaw ? Number((inheritanceStateRaw as [bigint, bigint])[0]) : STATE_NORMAL;
  const windowEnd = inheritanceStateRaw ? (inheritanceStateRaw as [bigint, bigint])[1] : 0n;

  const hasManager = !!managerAddress &&
    managerAddress !== '0x0000000000000000000000000000000000000000' &&
    isAddress(managerAddress as string);

  // ── Manager reads ───────────────────────────────────────────────────────
  const { data: heirCountRaw } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'heirCount',
    query: { enabled: hasManager },
  });

  const { data: heirCommitment, refetch: refetchCommitment } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'heirCommitmentByGuardian',
    args: [userAddress],
    query: { enabled: hasManager },
  });

  const { data: distributionFinalized } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'distributionFinalized',
    query: { enabled: hasManager },
  });

  const { data: payoutBalance } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'payoutBalance',
    query: { enabled: hasManager },
  });

  const { data: vetoCount } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'vetoCount',
    query: { enabled: hasManager && currentState === STATE_VETO_PERIOD },
  });

  const { data: snapshotVetoThreshold } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'snapshotVetoThreshold',
    query: { enabled: hasManager && currentState === STATE_VETO_PERIOD },
  });

  const { data: totalRevealedBasisPoints } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'totalRevealedBasisPoints',
    query: { enabled: hasManager && currentState === STATE_CLAIM_WINDOW },
  });

  const heirCount = heirCountRaw ? Number(heirCountRaw) : 0;
  const isGuardianBool = !!isGuardian;
  const heirCommitmentStr = heirCommitment as string | undefined;
  const isHeir = !!(heirCommitmentStr) && heirCommitmentStr !== '0x0000000000000000000000000000000000000000000000000000000000000000';

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleInitiateClaim = useCallback(async () => {
    if (!reasonInput.trim()) {
      setTxMsg('Enter a reason for the claim.');
      setTxStatus('error');
      return;
    }
    const reasonHash = keccak256(toBytes(reasonInput.trim()));
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: entry.address,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'initiateInheritanceClaim',
        args: [reasonHash],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Inheritance claim initiated. 30-day veto period started.');
        setReasonInput('');
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [entry.address, reasonInput, writeContractAsync]);

  const handleVetoClaim = useCallback(async () => {
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: entry.address,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'vetoInheritanceClaim',
        args: [],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Veto submitted.');
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [entry.address, writeContractAsync]);

  const handleRevealSecret = useCallback(async () => {
    const trimmed = secretInput.trim() as `0x${string}`;
    const bp = parseInt(basisPointsInput, 10);
    if (!trimmed || isNaN(bp) || bp <= 0) {
      setTxMsg('Enter your secret and basis points.');
      setTxStatus('error');
      return;
    }
    // Validate commitment locally before sending
    const expectedCommitment = computeCommitment(userAddress, trimmed);
    if (heirCommitment && expectedCommitment.toLowerCase() !== (heirCommitment as string).toLowerCase()) {
      setTxMsg('Secret does not match the on-chain commitment for your address. Check the value.');
      setTxStatus('error');
      return;
    }
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: entry.address,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'claimHeirShare',
        args: [trimmed, BigInt(bp)],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Heir share revealed.');
        setSecretInput('');
        setBasisPointsInput('');
        refetchCommitment();
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [entry.address, secretInput, basisPointsInput, userAddress, heirCommitment, writeContractAsync, refetchCommitment]);

  const handleFinalize = useCallback(async () => {
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: entry.address,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'finalizeInheritanceDistribution',
        args: [],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Distribution finalized.');
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [entry.address, writeContractAsync]);

  const handleWithdraw = useCallback(async () => {
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: entry.address,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'withdrawFinalHeirPayout',
        args: [],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Payout withdrawn to your vault.');
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [entry.address, writeContractAsync]);

  const handleCleanup = useCallback(async () => {
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: entry.address,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'cleanupMemorialVault',
        args: [],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Memorial vault cleaned up.');
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [entry.address, writeContractAsync]);

  // ── Determine what to show ───────────────────────────────────────────────
  const hasGuardianAction = isGuardianBool && (
    (currentState === STATE_NORMAL && heirCount > 0) ||
    currentState === STATE_VETO_PERIOD
  );
  const hasHeirAction = isHeir && (
    currentState === STATE_CLAIM_WINDOW ||
    currentState === STATE_MEMORIAL
  );
  const hasFinalizeAction = currentState === STATE_CLAIM_WINDOW;
  const hasCleanupAction = currentState === STATE_MEMORIAL;

  const hasAnyAction = hasGuardianAction || hasHeirAction || hasFinalizeAction || hasCleanupAction;

  // State badge color
  const stateBadgeColor = {
    [STATE_NORMAL]: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    [STATE_VETO_PERIOD]: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    [STATE_CLAIM_WINDOW]: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    [STATE_MEMORIAL]: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    [STATE_CLOSED]: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
  }[currentState] ?? 'text-gray-400 border-gray-500/30 bg-gray-500/10';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <Heart size={18} className="text-pink-400 shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">{entry.label}</p>
            <p className="text-white/40 text-xs font-mono">{shortAddress(entry.address)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${stateBadgeColor}`}>
            {STATE_LABELS[currentState] ?? 'Unknown'}
          </span>
          {hasAnyAction && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Action available" />
          )}
          {expanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-5 space-y-5">
              {/* State info */}
              <div className="flex flex-wrap gap-4 text-xs text-white/50">
                <span>State: <span className="text-white/80 font-bold">{STATE_LABELS[currentState]}</span></span>
                {heirCount > 0 && <span>Configured heirs: <span className="text-white/80">{heirCount}</span></span>}
                {windowEnd > 0n && <span>Window: <span className="text-white/80">{formatCountdown(windowEnd)}</span></span>}
                {isGuardianBool && <span className="text-accent font-bold">✓ You are a guardian</span>}
                {isHeir && <span className="text-pink-400 font-bold">✓ You are an heir</span>}
              </div>

              {/* GUARDIAN: Initiate claim */}
              {isGuardianBool && currentState === STATE_NORMAL && heirCount > 0 && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                  <p className="text-amber-300 font-bold text-sm flex items-center gap-2">
                    <AlertTriangle size={15} />
                    Initiate Inheritance Claim
                  </p>
                  <p className="text-white/50 text-xs">
                    Only initiate if the vault owner has been unreachable for an extended period.
                    A 30-day veto window lets other guardians or the owner cancel the claim.
                  </p>
                  <textarea
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500/50 outline-none resize-none"
                    rows={2}
                    placeholder="Reason (will be hashed and stored on-chain)"
                    value={reasonInput}
                    onChange={e => setReasonInput(e.target.value)}
                  />
                  <button
                    onClick={handleInitiateClaim}
                    disabled={!reasonInput.trim() || txStatus === 'signing' || txStatus === 'submitted'}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors disabled:opacity-40"
                  >
                    {txStatus === 'signing' ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    Initiate Claim
                  </button>
                </div>
              )}

              {/* GUARDIAN: Veto claim */}
              {isGuardianBool && currentState === STATE_VETO_PERIOD && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-3">
                  <p className="text-red-300 font-bold text-sm flex items-center gap-2">
                    <Shield size={15} />
                    Veto Inheritance Claim
                  </p>
                  {vetoCount !== undefined && snapshotVetoThreshold !== undefined && (
                    <p className="text-white/50 text-xs">
                      Vetoes submitted: {String(vetoCount)} / {String(snapshotVetoThreshold)} required to cancel
                    </p>
                  )}
                  <p className="text-white/50 text-xs">
                    Veto if you believe the vault owner is still alive. Once enough guardians veto,
                    the claim is cancelled.
                  </p>
                  <button
                    onClick={handleVetoClaim}
                    disabled={txStatus === 'signing' || txStatus === 'submitted'}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-40"
                  >
                    {txStatus === 'signing' ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    Submit Veto
                  </button>
                </div>
              )}

              {/* HEIR: Reveal secret */}
              {isHeir && currentState === STATE_CLAIM_WINDOW && (
                <div className="p-4 rounded-xl border border-pink-500/20 bg-pink-500/5 space-y-3">
                  <p className="text-pink-300 font-bold text-sm flex items-center gap-2">
                    <Download size={15} />
                    Reveal Your Heir Share
                  </p>
                  <p className="text-white/50 text-xs">
                    Enter the secret from your backup file and the basis points you were assigned.
                    Your address and secret are verified against the on-chain commitment before the
                    transaction is sent.
                  </p>
                  <input
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-pink-500/50 outline-none font-mono"
                    placeholder="Secret (0x… 32 bytes)"
                    value={secretInput}
                    onChange={e => setSecretInput(e.target.value)}
                  />
                  <input
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-pink-500/50 outline-none"
                    placeholder="Basis points (e.g. 5000 = 50%)"
                    type="number"
                    min="1"
                    max="10000"
                    value={basisPointsInput}
                    onChange={e => setBasisPointsInput(e.target.value)}
                  />
                  <button
                    onClick={handleRevealSecret}
                    disabled={!secretInput.trim() || !basisPointsInput || txStatus === 'signing' || txStatus === 'submitted'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm transition-colors disabled:opacity-40"
                  >
                    {txStatus === 'signing' ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    Reveal Heir Share
                  </button>
                </div>
              )}

              {/* Anyone: Finalize distribution */}
              {currentState === STATE_CLAIM_WINDOW && (
                <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
                  <p className="text-purple-300 font-bold text-sm">Finalize Distribution</p>
                  {totalRevealedBasisPoints !== undefined && (
                    <p className="text-white/50 text-xs">
                      Basis points revealed so far: {String(totalRevealedBasisPoints)} / 10,000
                    </p>
                  )}
                  <p className="text-white/50 text-xs">
                    Can be called by anyone once all heirs have revealed, or when the 90-day claim
                    window expires. Forfeited shares go to the protocol.
                  </p>
                  <button
                    onClick={handleFinalize}
                    disabled={!!distributionFinalized || txStatus === 'signing' || txStatus === 'submitted'}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors disabled:opacity-40"
                  >
                    {distributionFinalized ? 'Already Finalized' : 'Finalize Distribution'}
                  </button>
                </div>
              )}

              {/* HEIR: Withdraw payout */}
              {isHeir && currentState === STATE_MEMORIAL && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                  <p className="text-emerald-300 font-bold text-sm">Withdraw Your Payout</p>
                  {payoutBalance !== undefined && (
                    <p className="text-white/50 text-xs">
                      Payout balance in vault: {(Number(payoutBalance) / 1e18).toFixed(4)} VFIDE
                    </p>
                  )}
                  <button
                    onClick={handleWithdraw}
                    disabled={txStatus === 'signing' || txStatus === 'submitted'}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors disabled:opacity-40"
                  >
                    {txStatus === 'signing' ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    Withdraw to My Vault
                  </button>
                </div>
              )}

              {/* Anyone: Cleanup memorial */}
              {hasCleanupAction && (
                <div className="p-4 rounded-xl border border-gray-500/20 bg-gray-500/5 space-y-2">
                  <p className="text-gray-300 text-sm font-bold">Cleanup Memorial Vault</p>
                  <p className="text-white/40 text-xs">
                    Available after the 365-day memorial period. Closes the vault permanently.
                  </p>
                  <button
                    onClick={handleCleanup}
                    disabled={txStatus === 'signing' || txStatus === 'submitted'}
                    className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white/60 font-bold text-sm transition-colors disabled:opacity-40"
                  >
                    Cleanup Memorial Vault
                  </button>
                </div>
              )}

              {/* No action available */}
              {!hasAnyAction && (
                <p className="text-white/40 text-sm text-center py-2">
                  No inheritance actions available for this vault right now.
                </p>
              )}

              {/* Tx status */}
              <AnimatePresence>
                {txStatus !== 'idle' && (
                  <m.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                      txStatus === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                      txStatus === 'error'   ? 'bg-red-500/10 text-red-300 border border-red-500/30' :
                      'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {(txStatus === 'signing' || txStatus === 'submitted') && <Loader2 size={14} className="animate-spin shrink-0" />}
                    {txStatus === 'success' && <CheckCircle size={14} className="shrink-0" />}
                    {txStatus === 'error' && <XCircle size={14} className="shrink-0" />}
                    <span className="break-all">{txMsg}</span>
                    {(txStatus === 'success' || txStatus === 'error') && (
                      <button onClick={() => setTxStatus('idle')} className="ml-auto shrink-0 text-white/40 hover:text-white/80">
                        <XCircle size={14} />
                      </button>
                    )}
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export function InheritanceActionsTab({ isConnected }: { isConnected: boolean }) {
  const [vaultInput, setVaultInput] = useState('');
  const [vaultLabel, setVaultLabel] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const { address } = useAccount();
  const { entries, addEntry } = useGuardianWatchlist();
  const { attestations } = useGuardianAttestations(address);
  const inboxEntries = useMemo(() => mergeInboxEntries(entries, attestations), [entries, attestations]);

  const handleAddVault = () => {
    const result = addEntry(vaultInput, vaultLabel);
    setNotice(result.message);
    if (result.ok) {
      setVaultInput('');
      setVaultLabel('');
    }
  };

  if (!isConnected) {
    return (
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <m.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Heart className="w-16 h-16 mx-auto mb-4 text-pink-400" />
        </m.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see inheritance actions</p>
        <div className="mt-6 flex justify-center"><VfideConnectButton size="md" /></div>
      </m.div>
    );
  }

  return (
    <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-pink-400 mb-2 flex items-center gap-3">
          <Heart size={22} />
          Inheritance Actions
        </h2>
        <p className="text-white/60 text-sm">
          Track vaults for inheritance actions. Guardian actions: initiate or veto claims.
          Heir actions: reveal your secret and withdraw your share after finalization.
        </p>
      </div>

      {/* Add vault */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-white font-bold mb-3 text-sm">Track a Vault</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="sm:col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-pink-500/50 outline-none font-mono"
            placeholder="Vault address (0x…)"
            value={vaultInput}
            onChange={e => setVaultInput(e.target.value)}
          />
          <input
            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-pink-500/50 outline-none"
            placeholder="Label (optional)"
            value={vaultLabel}
            onChange={e => setVaultLabel(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleAddVault}
            disabled={!vaultInput.trim()}
            className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm transition-colors disabled:opacity-40"
          >
            Track Vault
          </button>
          {notice && <span className="text-xs text-white/50">{notice}</span>}
        </div>
      </div>

      {/* Vault list */}
      {inboxEntries.length === 0 ? (
        <div className="text-center py-10 text-white/40">
          <Heart size={32} className="mx-auto mb-3 text-white/20" />
          <p>No vaults tracked yet. Add a vault address above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inboxEntries.map(entry =>
            address ? (
              <VaultInheritanceCard key={entry.address} entry={entry} userAddress={address} />
            ) : null
          )}
        </div>
      )}
    </m.div>
  );
}
