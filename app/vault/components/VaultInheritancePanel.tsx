'use client';

/**
 * VaultInheritancePanel — owner interface for the CardBound vault inheritance
 * state machine (CardBoundVaultInheritanceManager).
 *
 * Covers:
 *  - Current state display (STATE_NORMAL / VETO_PERIOD / CLAIM_WINDOW / MEMORIAL / CLOSED)
 *  - Propose / confirm / cancel heir configuration
 *  - Set / clear proof-of-life wallet
 *  - Clear all heirs
 *  - Owner override during active claim
 *
 * Reads:
 *  vault.inheritanceState()          → { state: uint8, windowEnd: uint64 }
 *  vault.inheritanceConfigVersion()  → uint64
 *  vault.inheritanceManager()        → address (reads detailed state from manager)
 *  manager.heirCount()               → uint8
 *  manager.pendingHeirConfigEffectiveAt() → uint64
 *  manager.proofOfLifeWallet()       → address
 *  manager.heirGuardianByIndex(n)    → address
 *  manager.heirCommitmentByGuardian(addr) → bytes32
 *  manager.inheritanceStateValue()   → uint8
 *  manager.inheritanceInitiator()    → address
 *  manager.inheritanceReasonHash()   → bytes32
 *  manager.inheritanceStateWindowEnd() → uint64
 *  manager.vetoCount()               → uint256
 *  manager.snapshotVetoThreshold()   → uint256
 */

import { useState, useCallback, useMemo } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  toBytes,
  isAddress
} from 'viem';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  Clock,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { CARD_BOUND_VAULT_ABI } from '@/lib/contracts';

// ── Inline minimal ABI for the InheritanceManager (separate deployed contract) ──
const INHERITANCE_MANAGER_ABI = [
  { name: 'heirCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'pendingHeirConfigEffectiveAt', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { name: 'proofOfLifeWallet', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'heirGuardianByIndex', type: 'function', stateMutability: 'view', inputs: [{ name: 'idx', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'heirCommitmentByGuardian', type: 'function', stateMutability: 'view', inputs: [{ name: 'guardian', type: 'address' }], outputs: [{ type: 'bytes32' }] },
  { name: 'inheritanceStateValue', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'inheritanceInitiator', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'inheritanceReasonHash', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { name: 'inheritanceStateWindowEnd', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
  { name: 'vetoCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'snapshotVetoThreshold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'inheritanceConfigVersion', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint64' }] },
] as const;

// ── Constants (mirror CardBoundVaultInheritanceManager.sol) ──────────────────
const INHERITANCE_COMMITMENT_DOMAIN = keccak256(toBytes('VFIDE_INHERITANCE_V1'));
const MAX_HEIRS = 5;
const TOTAL_BASIS_POINTS = 10000;
const INHERITANCE_CONFIG_COOLDOWN_DAYS = 30;

// State enum
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

const STATE_COLORS: Record<number, string> = {
  [STATE_NORMAL]: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  [STATE_VETO_PERIOD]: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  [STATE_CLAIM_WINDOW]: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  [STATE_MEMORIAL]: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  [STATE_CLOSED]: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
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

function generateSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function formatCountdown(unixTs: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const secs = Number(unixTs) - now;
  if (secs <= 0) return 'Ready';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Heir row state ───────────────────────────────────────────────────────────
type HeirRow = {
  id: number;
  guardianAddress: string;
  basisPoints: string;
  secret: `0x${string}` | null;
  commitment: `0x${string}` | null;
};

function newHeirRow(id: number): HeirRow {
  return { id, guardianAddress: '', basisPoints: '', secret: null, commitment: null };
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StateBadge({ state }: { state: number }) {
  const label = STATE_LABELS[state] ?? 'Unknown';
  const color = STATE_COLORS[state] ?? 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface VaultInheritancePanelProps {
  vaultAddress: `0x${string}` | undefined;
  userAddress: `0x${string}` | undefined;
}

export function VaultInheritancePanel({ vaultAddress, userAddress }: VaultInheritancePanelProps) {
  const hasVault = !!vaultAddress && isAddress(vaultAddress);

  // ── Vault-level reads ───────────────────────────────────────────────────
  const { data: inheritanceStateRaw } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'inheritanceState',
    query: { enabled: hasVault },
  });

  const { data: managerAddress } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'inheritanceManager',
    query: { enabled: hasVault },
  });

  const { data: vaultAdmin } = useReadContract({
    address: vaultAddress,
    abi: CARD_BOUND_VAULT_ABI,
    functionName: 'admin',
    query: { enabled: hasVault },
  });

  const vaultAdminStr = vaultAdmin as string | undefined;
  const isAdmin = !!userAddress && !!vaultAdminStr &&
    userAddress.toLowerCase() === vaultAdminStr.toLowerCase();

  const managerAddressStr = managerAddress as string | undefined;
  const hasManager = !!managerAddressStr && isAddress(managerAddressStr) &&
    managerAddressStr !== '0x0000000000000000000000000000000000000000';

  const currentState = inheritanceStateRaw ? Number((inheritanceStateRaw as [bigint, bigint])[0]) : STATE_NORMAL;
  const windowEnd = inheritanceStateRaw ? (inheritanceStateRaw as [bigint, bigint])[1] : 0n;

  // ── Manager reads ───────────────────────────────────────────────────────
  const { data: heirCountRaw, refetch: refetchHeirCount } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'heirCount',
    query: { enabled: hasManager },
  });

  const { data: pendingEffectiveAt } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'pendingHeirConfigEffectiveAt',
    query: { enabled: hasManager },
  });

  const { data: proofOfLifeWallet, refetch: refetchPolWallet } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'proofOfLifeWallet',
    query: { enabled: hasManager },
  });

  const { data: inheritanceInitiator } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'inheritanceInitiator',
    query: { enabled: hasManager },
  });

  const { data: inheritanceReasonHash } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'inheritanceReasonHash',
    query: { enabled: hasManager },
  });

  const { data: vetoCount } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'vetoCount',
    query: { enabled: hasManager },
  });

  const { data: snapshotVetoThreshold } = useReadContract({
    address: managerAddress as `0x${string}`,
    abi: INHERITANCE_MANAGER_ABI,
    functionName: 'snapshotVetoThreshold',
    query: { enabled: hasManager },
  });

  // Read heir addresses (up to MAX_HEIRS)
  const heirCount = heirCountRaw ? Number(heirCountRaw) : 0;
  const { data: heir0 } = useReadContract({ address: managerAddress as `0x${string}`, abi: INHERITANCE_MANAGER_ABI, functionName: 'heirGuardianByIndex', args: [0n], query: { enabled: hasManager && heirCount > 0 } });
  const { data: heir1 } = useReadContract({ address: managerAddress as `0x${string}`, abi: INHERITANCE_MANAGER_ABI, functionName: 'heirGuardianByIndex', args: [1n], query: { enabled: hasManager && heirCount > 1 } });
  const { data: heir2 } = useReadContract({ address: managerAddress as `0x${string}`, abi: INHERITANCE_MANAGER_ABI, functionName: 'heirGuardianByIndex', args: [2n], query: { enabled: hasManager && heirCount > 2 } });
  const { data: heir3 } = useReadContract({ address: managerAddress as `0x${string}`, abi: INHERITANCE_MANAGER_ABI, functionName: 'heirGuardianByIndex', args: [3n], query: { enabled: hasManager && heirCount > 3 } });
  const { data: heir4 } = useReadContract({ address: managerAddress as `0x${string}`, abi: INHERITANCE_MANAGER_ABI, functionName: 'heirGuardianByIndex', args: [4n], query: { enabled: hasManager && heirCount > 4 } });

  const existingHeirs = [heir0, heir1, heir2, heir3, heir4]
    .slice(0, heirCount)
    .filter((h): h is `0x${string}` => !!h);

  // ── Local state ─────────────────────────────────────────────────────────
  const [heirRows, setHeirRows] = useState<HeirRow[]>([newHeirRow(0)]);
  const [secretsGenerated, setSecretsGenerated] = useState(false);
  const [secretsDownloaded, setSecretsDownloaded] = useState(false);
  const [polInput, setPolInput] = useState('');
  const [isSettingPolWallet, setIsSettingPolWallet] = useState(false);
  const [isClearingHeirs, setIsClearingHeirs] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'signing' | 'submitted' | 'success' | 'error'>('idle');
  const [txMsg, setTxMsg] = useState('');
  const [showProposeForm, setShowProposeForm] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // ── Basis points validation ─────────────────────────────────────────────
  const totalBasisPoints = useMemo(() => {
    return heirRows.reduce((acc, r) => {
      const val = parseInt(r.basisPoints, 10);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [heirRows]);

  const isBasisPointsValid = totalBasisPoints === TOTAL_BASIS_POINTS;

  // ── Generate secrets for all rows ───────────────────────────────────────
  const handleGenerateSecrets = useCallback(() => {
    const updated = heirRows.map(row => {
      const secret = generateSecret();
      const addr = row.guardianAddress.trim();
      const commitment = isAddress(addr)
        ? computeCommitment(addr as `0x${string}`, secret)
        : null;
      return { ...row, secret, commitment };
    });
    setHeirRows(updated);
    setSecretsGenerated(true);
    setSecretsDownloaded(false);
  }, [heirRows]);

  // ── Download secrets backup ─────────────────────────────────────────────
  const handleDownloadSecrets = useCallback(() => {
    const lines = heirRows
      .filter(r => r.secret)
      .map(r =>
        `Heir guardian: ${r.guardianAddress}\nBasis points: ${r.basisPoints}\nSecret (keep private): ${r.secret}\nCommitment (on-chain): ${r.commitment}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob(
      [`VFIDE Inheritance Heir Secrets\nVault: ${vaultAddress}\nGenerated: ${new Date().toISOString()}\n\n---\n\n${lines}\n\nWARNING: Store these secrets securely. You need them to claim your inheritance share.\n`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vfide-heir-secrets-${vaultAddress?.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setSecretsDownloaded(true);
  }, [heirRows, vaultAddress]);

  // ── Propose config ──────────────────────────────────────────────────────
  const handleProposeConfig = useCallback(async () => {
    if (!vaultAddress || !isBasisPointsValid || !secretsDownloaded) return;

    const guardians = heirRows.map(r => r.guardianAddress.trim() as `0x${string}`);
    const commitments = heirRows.map(r => r.commitment as `0x${string}`);

    if (guardians.some(g => !isAddress(g))) {
      setTxMsg('One or more heir addresses are invalid.');
      setTxStatus('error');
      return;
    }
    if (commitments.some(c => !c)) {
      setTxMsg('Generate secrets before submitting.');
      setTxStatus('error');
      return;
    }

    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'proposeInheritanceConfig',
        args: [guardians, commitments],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg(`Inheritance config proposed. ${INHERITANCE_CONFIG_COOLDOWN_DAYS}-day cooldown started.`);
        setShowProposeForm(false);
        refetchHeirCount();
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [vaultAddress, heirRows, isBasisPointsValid, secretsDownloaded, writeContractAsync, refetchHeirCount]);

  // ── Confirm pending config ──────────────────────────────────────────────
  const handleConfirmConfig = useCallback(async () => {
    if (!vaultAddress) return;
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'confirmInheritanceConfig',
        args: [],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Inheritance config confirmed.');
        refetchHeirCount();
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [vaultAddress, writeContractAsync, refetchHeirCount]);

  // ── Cancel pending config ───────────────────────────────────────────────
  const handleCancelConfig = useCallback(async () => {
    if (!vaultAddress) return;
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'cancelInheritanceConfigChange',
        args: [],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Pending config cancelled.');
        refetchHeirCount();
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [vaultAddress, writeContractAsync, refetchHeirCount]);

  // ── Clear all heirs ─────────────────────────────────────────────────────
  const handleClearAllHeirs = useCallback(async () => {
    if (!vaultAddress) return;
    try {
      setIsClearingHeirs(true);
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'clearAllHeirs',
        args: [],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('All heirs cleared.');
        setConfirmClear(false);
        refetchHeirCount();
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setIsClearingHeirs(false);
    }
  }, [vaultAddress, writeContractAsync, refetchHeirCount]);

  // ── Set proof-of-life wallet ────────────────────────────────────────────
  const handleSetPolWallet = useCallback(async () => {
    if (!vaultAddress || !isAddress(polInput.trim())) return;
    try {
      setIsSettingPolWallet(true);
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'setProofOfLifeWallet',
        args: [polInput.trim() as `0x${string}`],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Proof-of-life wallet updated.');
        setPolInput('');
        refetchPolWallet();
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setIsSettingPolWallet(false);
    }
  }, [vaultAddress, polInput, writeContractAsync, refetchPolWallet]);

  // ── Owner override ──────────────────────────────────────────────────────
  const handleOwnerOverride = useCallback(async () => {
    if (!vaultAddress) return;
    try {
      setTxStatus('signing');
      setTxMsg('Waiting for wallet signature…');
      const hash = await writeContractAsync({
        address: vaultAddress,
        abi: CARD_BOUND_VAULT_ABI,
        functionName: 'ownerOverrideClaim',
        args: [],
      });
      setTxStatus('submitted');
      setTxMsg(`Submitted: ${hash.slice(0, 10)}…`);
      setTimeout(() => {
        setTxStatus('success');
        setTxMsg('Claim overridden. Vault returned to normal state.');
      }, 2000);
    } catch (e: unknown) {
      setTxStatus('error');
      setTxMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }, [vaultAddress, writeContractAsync]);

  // ── Heir row helpers ────────────────────────────────────────────────────
  const updateRow = (id: number, patch: Partial<HeirRow>) => {
    setHeirRows(rows => rows.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      // Recompute commitment if address and secret are set
      if (updated.secret && updated.guardianAddress && isAddress(updated.guardianAddress.trim())) {
        updated.commitment = computeCommitment(updated.guardianAddress.trim() as `0x${string}`, updated.secret);
      }
      return updated;
    }));
    setSecretsGenerated(false);
    setSecretsDownloaded(false);
  };

  if (!hasVault) return null;

  const hasPending = pendingEffectiveAt && Number(pendingEffectiveAt) > 0;
  const pendingReady = hasPending && Number(pendingEffectiveAt) <= Math.floor(Date.now() / 1000);
  const isActiveClaim = currentState === STATE_VETO_PERIOD || currentState === STATE_CLAIM_WINDOW;

  return (
    <section className="py-8 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <GlassCard className="p-6" hover={false}>
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Heart className="text-pink-400" size={24} />
                Inheritance
              </h2>
              <p className="text-white/60 text-sm">
                Configure heirs and manage the vault inheritance flow.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StateBadge state={currentState} />
              {currentState !== STATE_NORMAL && (
                <span className="text-xs text-white/40">
                  Window ends: {windowEnd > 0n ? formatCountdown(windowEnd) : '—'}
                </span>
              )}
            </div>
          </div>

          {/* Active claim alert */}
          <AnimatePresence>
            {isActiveClaim && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 rounded-xl border border-amber-500/50 bg-amber-500/10"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={18} />
                  <div className="flex-1">
                    <p className="text-amber-300 font-bold text-sm mb-1">
                      {currentState === STATE_VETO_PERIOD ? 'Inheritance Claim — Veto Period Active' : 'Inheritance Claim — Claim Window Open'}
                    </p>
                    {inheritanceInitiator && (
                      <p className="text-amber-200/70 text-xs">
                        Initiated by: {shortAddr(inheritanceInitiator as string)}
                        {inheritanceReasonHash ? ` · Reason hash: ${(inheritanceReasonHash as string).slice(0, 10)}…` : ''}
                      </p>
                    )}
                    {vetoCount !== undefined && snapshotVetoThreshold !== undefined && (
                      <p className="text-amber-200/70 text-xs mt-1">
                        Vetoes: {String(vetoCount)} / {String(snapshotVetoThreshold)} required to cancel
                      </p>
                    )}
                    <p className="text-amber-200/70 text-xs mt-1">
                      Window closes in: {windowEnd > 0n ? formatCountdown(windowEnd) : '—'}
                    </p>
                    <button
                      onClick={handleOwnerOverride}
                      disabled={txStatus === 'signing' || txStatus === 'submitted'}
                      className="mt-3 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors disabled:opacity-50"
                    >
                      Override Claim (I&apos;m Alive)
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current heirs */}
          {heirCount > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <ShieldCheck size={16} className="text-cyan-400" />
                Configured Heirs ({heirCount})
              </h3>
              <div className="space-y-2">
                {existingHeirs.map((addr, i) => (
                  <div key={addr} className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-lg">
                    <span className="text-white/80 text-sm font-mono">
                      Heir {i + 1}: {shortAddr(addr)}
                    </span>
                    <span className="text-white/40 text-xs">{addr}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {heirCount === 0 && currentState === STATE_NORMAL && (
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <Info size={18} className="text-white/40 mx-auto mb-2" />
              <p className="text-white/50 text-sm">No heirs configured yet.</p>
            </div>
          )}

          {/* Pending config banner */}
          {hasPending && (
            <div className={`mb-6 p-4 rounded-xl border ${pendingReady ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-blue-500/30 bg-blue-500/10'}`}>
              <div className="flex items-start gap-3">
                <Clock size={18} className={pendingReady ? 'text-emerald-400' : 'text-blue-400'} />
                <div className="flex-1">
                  <p className={`font-bold text-sm mb-1 ${pendingReady ? 'text-emerald-300' : 'text-blue-300'}`}>
                    Pending Inheritance Config
                  </p>
                  {pendingReady ? (
                    <>
                      <p className="text-emerald-200/70 text-xs mb-3">30-day cooldown passed. Ready to confirm.</p>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={handleConfirmConfig}
                            disabled={txStatus === 'signing' || txStatus === 'submitted'}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
                          >
                            Confirm Config
                          </button>
                          <button
                            onClick={handleCancelConfig}
                            disabled={txStatus === 'signing' || txStatus === 'submitted'}
                            className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white/70 font-bold text-sm transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-blue-200/70 text-xs mb-1">
                        Confirmable in: {formatCountdown(pendingEffectiveAt as bigint)}
                        {' '}({INHERITANCE_CONFIG_COOLDOWN_DAYS}-day cooldown)
                      </p>
                      {isAdmin && (
                        <button
                          onClick={handleCancelConfig}
                          disabled={txStatus === 'signing' || txStatus === 'submitted'}
                          className="mt-2 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white/70 font-bold text-sm transition-colors disabled:opacity-50"
                        >
                          Cancel Pending Config
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && currentState === STATE_NORMAL && (
            <div className="space-y-4">
              {/* Propose heirs toggle */}
              <div>
                <button
                  onClick={() => setShowProposeForm(v => !v)}
                  className="flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <UserPlus size={16} />
                  {heirCount > 0 ? 'Update Heir Configuration' : 'Configure Heirs'}
                  {showProposeForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {showProposeForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4"
                    >
                      <p className="text-white/50 text-xs">
                        Add up to {MAX_HEIRS} heirs. Each heir must be a guardian address for this vault.
                        Basis points must sum to 10,000 (= 100%).
                        Secrets are generated locally — download them before submitting. Heirs need their
                        secret to claim their share after a successful claim.
                      </p>

                      {/* Heir rows */}
                      <div className="space-y-3">
                        {heirRows.map((row, i) => (
                          <div key={row.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white/60 text-xs font-bold">Heir {i + 1}</span>
                              {heirRows.length > 1 && (
                                <button
                                  onClick={() => setHeirRows(rows => rows.filter(r => r.id !== row.id))}
                                  className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                className="col-span-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-500/50 outline-none font-mono"
                                placeholder="Guardian address (0x…)"
                                value={row.guardianAddress}
                                onChange={e => updateRow(row.id, { guardianAddress: e.target.value, commitment: null, secret: null })}
                              />
                              <input
                                className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-500/50 outline-none text-right"
                                placeholder="Basis pts"
                                value={row.basisPoints}
                                type="number"
                                min="1"
                                max="10000"
                                onChange={e => updateRow(row.id, { basisPoints: e.target.value })}
                              />
                            </div>
                            {row.secret && (
                              <p className="text-xs text-emerald-400/60 mt-1 truncate font-mono">
                                Secret: {row.secret.slice(0, 18)}…
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Basis points total */}
                      <div className={`flex items-center gap-2 text-sm font-bold ${isBasisPointsValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isBasisPointsValid
                          ? <><CheckCircle size={14} /> {totalBasisPoints} / 10,000 ✓</>
                          : <><AlertTriangle size={14} /> {totalBasisPoints} / 10,000 — must equal 10,000</>
                        }
                      </div>

                      {/* Add heir / generate secrets / download / submit */}
                      <div className="flex flex-wrap gap-2">
                        {heirRows.length < MAX_HEIRS && (
                          <button
                            onClick={() => setHeirRows(rows => [...rows, newHeirRow(Date.now())])}
                            className="px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white/70 text-sm transition-colors"
                          >
                            + Add Heir
                          </button>
                        )}
                        <button
                          onClick={handleGenerateSecrets}
                          disabled={!isBasisPointsValid || heirRows.some(r => !isAddress(r.guardianAddress.trim()))}
                          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-colors disabled:opacity-40"
                        >
                          Generate Secrets
                        </button>
                        {secretsGenerated && (
                          <button
                            onClick={handleDownloadSecrets}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors"
                          >
                            <Download size={14} />
                            {secretsDownloaded ? 'Downloaded ✓' : 'Download Secrets'}
                          </button>
                        )}
                        <button
                          onClick={handleProposeConfig}
                          disabled={!secretsDownloaded || !isBasisPointsValid || txStatus === 'signing' || txStatus === 'submitted'}
                          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-colors disabled:opacity-40"
                        >
                          {txStatus === 'signing' ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                          Propose Config
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Proof-of-life wallet */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  Proof-of-Life Wallet
                  {proofOfLifeWallet && proofOfLifeWallet !== '0x0000000000000000000000000000000000000000' && (
                    <span className="ml-2 text-emerald-400 text-xs font-mono">
                      {shortAddr(proofOfLifeWallet as string)} (set)
                    </span>
                  )}
                </h3>
                <p className="text-white/40 text-xs mb-3">
                  An alternative wallet that can call ownerOverrideClaim (to prove you are alive without
                  using your primary admin key). Optional but recommended.
                </p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-emerald-500/50 outline-none font-mono"
                    placeholder="0x… proof-of-life wallet address"
                    value={polInput}
                    onChange={e => setPolInput(e.target.value)}
                  />
                  <button
                    onClick={handleSetPolWallet}
                    disabled={!isAddress(polInput.trim()) || isSettingPolWallet}
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-40"
                  >
                    {isSettingPolWallet ? <Loader2 size={14} className="animate-spin" /> : 'Set'}
                  </button>
                </div>
              </div>

              {/* Clear all heirs */}
              {heirCount > 0 && (
                <div className="pt-4 border-t border-white/10">
                  {!confirmClear ? (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors"
                    >
                      <ShieldOff size={15} />
                      Clear All Heirs
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10">
                      <p className="text-red-300 text-sm mb-3">Remove all heirs from this vault? This cannot be undone without re-proposing.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleClearAllHeirs}
                          disabled={isClearingHeirs}
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
                        >
                          {isClearingHeirs ? <Loader2 size={14} className="animate-spin inline" /> : null}
                          Confirm Clear
                        </button>
                        <button
                          onClick={() => setConfirmClear(false)}
                          className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white/70 font-bold text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Non-admin read-only notice */}
          {!isAdmin && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-white/40 text-sm">
              Connect as vault admin to manage inheritance configuration.
            </div>
          )}

          {/* Tx status */}
          <AnimatePresence>
            {txStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
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
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>
    </section>
  );
}
