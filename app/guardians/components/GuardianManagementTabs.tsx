'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { isAddress } from 'viem';
import { Shield, Users, Clock } from 'lucide-react';
import { USER_VAULT_ABI, ZERO_ADDRESS, isCardBoundVaultMode } from '@/lib/contracts';
import { safeLocalStorage } from '@/lib/utils';

type WatchedVault = {
  address: `0x${string}`;
  label: string;
  addedAt: number;
  source: 'watchlist' | 'attestation';
};

type GuardianAttestationRecord = {
  owner: `0x${string}`;
  vault: `0x${string}`;
  guardian: `0x${string}`;
  issuedAt: number;
  expiresAt: number;
};

const GUARDIAN_WATCHLIST_KEY = 'vfide.guardian-watchlist.v1';
const MAX_WATCHLIST_ENTRIES = 50;
const MAX_WATCHLIST_LABEL_LENGTH = 40;
const MIN_ADD_INTERVAL_MS = 800;

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function useGuardianWatchlist() {
  const [entries, setEntries] = useState<WatchedVault[]>([]);
  const [lastAddAt, setLastAddAt] = useState(0);

  useEffect(() => {
    const raw = safeLocalStorage.getItem(GUARDIAN_WATCHLIST_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Array<{ address: string; label?: string; addedAt?: number }>;
      const normalized = parsed
        .filter((item) => isAddress(item.address))
        .map((item) => ({
          address: item.address.toLowerCase() as `0x${string}`,
          label: (item.label || '').trim().slice(0, MAX_WATCHLIST_LABEL_LENGTH),
          addedAt: item.addedAt || Date.now(),
          source: 'watchlist' as const,
        }));
      setEntries(normalized.slice(0, MAX_WATCHLIST_ENTRIES));
    } catch {
      setEntries([]);
    }
  }, []);

  const save = (next: WatchedVault[]) => {
    setEntries(next);
    safeLocalStorage.setItem(GUARDIAN_WATCHLIST_KEY, JSON.stringify(next));
  };

  const addEntry = (address: string, label: string) => {
    const now = Date.now();
    if (now - lastAddAt < MIN_ADD_INTERVAL_MS) {
      return { ok: false, message: 'Please wait a moment before adding another vault.' };
    }

    if (entries.length >= MAX_WATCHLIST_ENTRIES) {
      return { ok: false, message: `Watchlist limit reached (${MAX_WATCHLIST_ENTRIES} vaults). Remove one before adding another.` };
    }

    const normalized = address.toLowerCase() as `0x${string}`;
    if (!isAddress(normalized)) return { ok: false, message: 'Enter a valid vault address.' };
    if (entries.some((entry) => entry.address.toLowerCase() === normalized)) {
      return { ok: false, message: 'Vault is already in your guardian watchlist.' };
    }

    const cleanLabel = label.trim().slice(0, MAX_WATCHLIST_LABEL_LENGTH);
    const next = [{ address: normalized, label: cleanLabel, addedAt: now, source: 'watchlist' as const }, ...entries];
    save(next);
    setLastAddAt(now);
    return { ok: true, message: 'Vault added to guardian watchlist.' };
  };

  const removeEntry = (address: string) => {
    const normalized = address.toLowerCase();
    const next = entries.filter((entry) => entry.address.toLowerCase() !== normalized);
    save(next);
  };

  return { entries, addEntry, removeEntry };
}

function useGuardianAttestations(guardianAddress?: `0x${string}`) {
  const [attestations, setAttestations] = useState<GuardianAttestationRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!guardianAddress || typeof fetch !== 'function') {
      setAttestations([]);
      return;
    }

    const load = async () => {
      try {
        const response = await fetch(`/api/security/guardian-attestations?guardian=${guardianAddress}&limit=200`);
        if (!response.ok) return;
        const data = (await response.json()) as { attestations?: GuardianAttestationRecord[] };
        if (!cancelled) {
          setAttestations(Array.isArray(data.attestations) ? data.attestations : []);
        }
      } catch {
        if (!cancelled) setAttestations([]);
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [guardianAddress]);

  return { attestations };
}

function mergeInboxEntries(watchlist: WatchedVault[], attestations: GuardianAttestationRecord[]) {
  const map = new Map<string, WatchedVault>();

  for (const item of watchlist) {
    map.set(item.address.toLowerCase(), item);
  }

  for (const att of attestations) {
    const key = att.vault.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        address: att.vault,
        label: `Attested by ${shortAddress(att.owner)}`,
        addedAt: att.issuedAt * 1000,
        source: 'attestation',
      });
    }
  }

  return Array.from(map.values());
}

export function GuardiansOverviewTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-xl border border-cyan-500/30 p-8">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-6 flex items-center gap-3">
          <Shield className="w-7 h-7 text-cyan-400" />
          What is a Guardian?
        </h2>
        <p className="text-white leading-relaxed mb-4">
          Guardians are trusted individuals who can help vault owners recover access if they lose their wallet.
          Being a guardian is a <strong>responsibility</strong>, not a privilege.
        </p>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">
            <strong className="text-amber-400">⚠️ Important:</strong> Guardians cannot access funds directly.
            They can only approve recovery requests from vault owners to a new wallet address.
          </p>
        </div>
        <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/30 mt-3">
          <p className="text-cyan-200 text-sm">
            Guardians are a private trust list chosen by each vault holder (typically family/friends). This is not an open guardian network.
          </p>
          <p className="text-cyan-100/90 text-sm mt-2">
            VFIDE social features can help you discover, invite, and coordinate with trusted people, but guardian and Next of Kin assignment is always explicit owner consent.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Clock className="w-7 h-7 text-cyan-400" />
          How Recovery Works
        </h2>
        <div className="space-y-4">
          {[
            { step: '1', title: 'Owner Requests Recovery', desc: 'Vault owner lost their wallet and requests recovery to a new address' },
            { step: '2', title: '7-Day Waiting Period', desc: 'A mandatory waiting period allows the owner to cancel if the request was fraudulent' },
            { step: '3', title: 'Guardians Verify & Approve', desc: 'Guardians verify the owner\'s identity (off-chain) and approve the recovery' },
            { step: '4', title: 'Recovery Finalized', desc: 'Once enough guardians approve, the vault ownership is transferred to the new address' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-cyan-500/25">
                {item.step}
              </div>
              <div>
                <div className="text-white font-bold">{item.title}</div>
                <div className="text-gray-400 text-sm">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/30 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl">🔑</span>
            <h3 className="text-xl font-bold text-cyan-400">Chain of Return</h3>
          </div>
          <p className="text-white mb-2">
            <strong>Lost Wallet Recovery</strong>
          </p>
          <p className="text-gray-400 text-sm">
            The vault owner lost their wallet and needs to regain access using a new wallet address.
            Guardians verify the owner&apos;s identity before approving.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl">💎</span>
            <h3 className="text-xl font-bold text-yellow-400">Next of Kin</h3>
          </div>
          <p className="text-white mb-2">
            <strong>Inheritance Recovery</strong>
          </p>
          <p className="text-gray-400 text-sm">
            The vault owner has passed away. Guardians verify the death and transfer ownership
            to the designated heir.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function GuardiansResponsibilitiesTab({ isConnected }: { isConnected: boolean }) {
  const [vaultInput, setVaultInput] = useState('');
  const [vaultLabel, setVaultLabel] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const { address } = useAccount();
  const { entries, addEntry, removeEntry } = useGuardianWatchlist();
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see vaults you&apos;re guarding</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Guardian Vault Watchlist</h2>
        <p className="text-gray-400 text-sm mb-4">
          Closed-system inbox: add specific vaults where you were selected as guardian. No public guardian discovery.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
           
            value={vaultInput}
            onChange={(e) => setVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <input
            type="text"
           
            value={vaultLabel}
            onChange={(e) => setVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button onClick={handleAddVault} className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold">
          Add Vault to Watchlist
        </button>
        {notice && <p className="text-sm text-cyan-200 mt-3">{notice}</p>}
      </div>

      <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Vaults You&apos;re Guarding ({inboxEntries.length})
        </h2>

        {inboxEntries.length === 0 ? (
          <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <p className="text-gray-400">No tracked vaults yet.</p>
            <p className="text-gray-500 text-sm mt-1">Add known vault addresses to build your private guardian inbox.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inboxEntries.map((entry) => (
              <GuardianResponsibilitiesCard
                key={entry.address}
                entry={entry}
                userAddress={address}
                onRemove={entry.source === 'watchlist' ? () => removeEntry(entry.address) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold text-yellow-400 mb-3">⚠️ Guardian Responsibilities</h3>
        <ul className="space-y-2 text-white text-sm">
          <li>• <strong>Verify identity</strong> before approving any recovery request</li>
          <li>• <strong>Contact the owner</strong> through known channels (phone, in-person)</li>
          <li>• <strong>Never approve</strong> if you can&apos;t verify the request is legitimate</li>
          <li>• <strong>Report suspicious</strong> activity if you suspect fraud</li>
        </ul>
      </motion.div>
    </motion.div>
  );
}

export function GuardiansPendingActionsTab({ isConnected }: { isConnected: boolean }) {
  const [vaultInput, setVaultInput] = useState('');
  const [vaultLabel, setVaultLabel] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const { address } = useAccount();
  const { entries, addEntry, removeEntry } = useGuardianWatchlist();
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see pending recovery requests</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Pending Recovery Inbox</h2>
        <p className="text-gray-400 text-sm mb-4">
          This inbox checks only vaults you add manually from trusted relationships. It is not an open guardian feed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
           
            value={vaultInput}
            onChange={(e) => setVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <input
            type="text"
           
            value={vaultLabel}
            onChange={(e) => setVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button onClick={handleAddVault} className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold">
          Add Vault to Inbox
        </button>
        {notice && <p className="text-sm text-cyan-200 mt-3">{notice}</p>}
      </div>

      {inboxEntries.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
          <p className="text-gray-400">No tracked vaults yet. Add vault addresses to monitor active recovery requests.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {inboxEntries.map((entry) => (
            <GuardianPendingRecoveryCard
              key={entry.address}
              entry={entry}
              userAddress={address}
              onRemove={entry.source === 'watchlist' ? () => removeEntry(entry.address) : undefined}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function GuardianResponsibilitiesCard({
  entry,
  userAddress,
  onRemove,
}: {
  entry: WatchedVault;
  userAddress?: `0x${string}`;
  onRemove?: () => void;
}) {
  const recoverySupported = !isCardBoundVaultMode();

  const { data: owner } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
    query: { enabled: recoverySupported },
  });

  const { data: isGuardian } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress && !!isGuardian },
  });

  const { data: recoveryStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: recoverySupported },
  });

  const recovery = recoveryStatus as [string, bigint, bigint, bigint, boolean] | undefined;
  const activeRecovery = !!recovery && recovery[4];

  const status = !isGuardian
    ? { label: 'Not Assigned', className: 'text-red-300 bg-red-500/20' }
    : !isGuardianMature
      ? { label: 'Maturing', className: 'text-yellow-300 bg-yellow-500/20' }
      : activeRecovery
        ? { label: 'Action Required', className: 'text-amber-300 bg-amber-500/20' }
        : { label: 'Healthy', className: 'text-green-300 bg-green-500/20' };

  return (
    <div className="p-4 bg-black/20 border border-white/10 rounded-xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-white font-bold">{entry.label || shortAddress(entry.address)}</p>
          <p className="text-gray-400 text-sm font-mono">{entry.address}</p>
          <p className="text-gray-500 text-xs mt-1">Owner: {owner ? shortAddress(owner as string) : 'Loading...'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.className}`}>{status.label}</span>
          {onRemove ? (
            <button onClick={onRemove} className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10">
              Remove
            </button>
          ) : (
            <span className="px-3 py-1 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold">Attested</span>
          )}
        </div>
      </div>
    </div>
  );
}

function GuardianPendingRecoveryCard({
  entry,
  userAddress,
  onRemove,
}: {
  entry: WatchedVault;
  userAddress?: `0x${string}`;
  onRemove?: () => void;
}) {
  const recoverySupported = !isCardBoundVaultMode();
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'info' | 'success' | 'error'>('info');
  const [isReportingFraud, setIsReportingFraud] = useState(false);
  const [txStage, setTxStage] = useState<'idle' | 'signing' | 'submitted' | 'confirmed' | 'failed'>('idle');
  const [txHashPreview, setTxHashPreview] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: isGuardian } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: recoverySupported && !!userAddress && !!isGuardian },
  });

  const { data: recoveryStatus, refetch: refetchRecoveryStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: recoverySupported, refetchInterval: 15000 },
  });

  const recovery = recoveryStatus as [string, bigint, bigint, bigint, boolean] | undefined;
  const active = !!recovery && recovery[4];
  const approvals = recovery ? Number(recovery[1]) : 0;
  const threshold = recovery ? Number(recovery[2]) : 0;
  const proposedOwner = recovery ? recovery[0] : ZERO_ADDRESS;
  const expirySec = recovery ? Number(recovery[3]) : 0;
  const daysLeft = expirySec > 0 ? Math.max(0, Math.ceil((expirySec * 1000 - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  const riskScore = useMemo(() => {
    let score = 0;
    if (active) score += 25;
    if (active && approvals < threshold) score += 20;
    if (active && daysLeft !== null && daysLeft <= 2) score += 25;
    if (!isGuardian) score += 15;
    if (isGuardian && !isGuardianMature) score += 15;
    return Math.min(100, score);
  }, [active, approvals, threshold, daysLeft, isGuardian, isGuardianMature]);

  const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';

  const handleApprove = async () => {
    setActionNotice(null);
    setActionTone('info');

    if (!recoverySupported) {
      setActionTone('error');
      setActionNotice('Recovery approvals are not supported in CardBound vault mode.');
      return;
    }

    if (!active) {
      setActionTone('error');
      setActionNotice('No active recovery request on this vault.');
      return;
    }
    if (!isGuardian) {
      setActionTone('error');
      setActionNotice('This wallet is not an assigned guardian for this vault.');
      return;
    }
    if (!isGuardianMature) {
      setActionTone('error');
      setActionNotice('Guardian maturity period has not completed yet.');
      return;
    }

    try {
      setTxStage('signing');
      const txHash = await writeContractAsync({
        address: entry.address,
        abi: USER_VAULT_ABI,
        functionName: 'guardianApproveRecovery',
      });
      const txHashText = String(txHash);
      setTxHashPreview(txHashText);
      setTxStage('submitted');
      setActionTone('success');
      setActionNotice(`Recovery approval submitted: ${txHashText.slice(0, 12)}...`);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        setTxStage('confirmed');
        setActionNotice(`Recovery approval confirmed: ${txHashText.slice(0, 12)}...`);
      }

      setTimeout(() => {
        void refetchRecoveryStatus();
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Approval failed';
      setTxStage('failed');
      setActionTone('error');
      setActionNotice(message);
    }
  };

  const handleReportFraud = async () => {
    setActionNotice(null);
    setActionTone('info');
    setIsReportingFraud(true);
    try {
      if (typeof fetch !== 'function') {
        throw new Error('Fraud reporting unavailable in this environment.');
      }

      const response = await fetch('/api/security/recovery-fraud-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault: entry.address,
          label: entry.label,
          source: 'guardian-inbox',
          proposedOwner,
          approvals,
          threshold,
          active,
          watcher: userAddress || 'unknown',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const err = typeof payload?.error === 'string' ? payload.error : `Fraud report failed (${response.status})`;
        throw new Error(err);
      }

      setActionTone('success');
      setActionNotice('Fraud report submitted to security telemetry.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fraud report failed';
      setActionTone('error');
      setActionNotice(message);
    } finally {
      setIsReportingFraud(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-yellow-500/40 rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-white font-bold">{entry.label || shortAddress(entry.address)}</h3>
          <p className="text-gray-400 text-sm font-mono">{entry.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${active ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>
            {active ? 'Recovery Active' : 'No Active Recovery'}
          </span>
          {onRemove ? (
            <button onClick={onRemove} className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10">
              Remove
            </button>
          ) : (
            <span className="px-3 py-1 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold">Attested</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Proposed Owner</div>
          <div className="text-white text-sm font-mono">{proposedOwner !== ZERO_ADDRESS ? shortAddress(proposedOwner) : 'n/a'}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Approvals</div>
          <div className="text-white text-sm font-bold">{approvals}/{threshold}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Expires In</div>
          <div className="text-white text-sm font-bold">{daysLeft !== null ? `${daysLeft}d` : 'n/a'}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Your Guardian Status</div>
          <div className="text-white text-sm font-bold">
            {!isGuardian ? 'Not assigned' : isGuardianMature ? 'Mature' : 'Maturing'}
          </div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Risk Score</div>
          <div className={`text-sm font-bold ${riskLevel === 'High' ? 'text-red-300' : riskLevel === 'Medium' ? 'text-yellow-300' : 'text-green-300'}`}>
            {riskLevel} ({riskScore})
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <button
          onClick={() => void handleApprove()}
          disabled={!active || !isGuardian || !isGuardianMature || isPending || approvals >= threshold}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : approvals >= threshold ? 'Threshold Reached' : 'Approve Recovery'}
        </button>
        <button
          onClick={() => void handleReportFraud()}
          disabled={isReportingFraud}
          className="px-4 py-3 border border-red-500/60 text-red-300 rounded-xl font-bold hover:bg-red-500/10 disabled:opacity-50"
        >
          {isReportingFraud ? 'Reporting...' : 'Report Fraud'}
        </button>
      </div>

      {actionNotice && (
        <p className={`text-xs mt-3 ${actionTone === 'error' ? 'text-red-300' : actionTone === 'success' ? 'text-green-300' : 'text-cyan-200'}`}>
          {actionNotice}
        </p>
      )}
      {txStage !== 'idle' && (
        <p className="text-xs text-gray-400 mt-2">
          Tx stage: {txStage}{txHashPreview ? ` (${txHashPreview.slice(0, 10)}...)` : ''}
        </p>
      )}
    </div>
  );
}
