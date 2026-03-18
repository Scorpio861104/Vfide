'use client';

import { Footer } from "@/components/layout/Footer";
import { useState, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useSignMessage, usePublicClient } from "wagmi";
import { isAddress } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultHub } from "@/hooks/useVaultHub";
import { useVaultRecovery } from "@/hooks/useVaultRecovery";
import { USER_VAULT_ABI } from "@/lib/contracts";
import { buildGuardianAttestationMessage, type GuardianAttestationPayload } from "@/lib/recovery/guardianAttestation";
import { Shield, Users, Clock, CheckCircle2, AlertCircle, Key, Heart, UserPlus, UserMinus, RefreshCw, ArrowRightCircle, Timer, Lock, FileText } from "lucide-react";

type TabType = 'overview' | 'my-guardians' | 'next-of-kin' | 'recovery' | 'responsibilities' | 'pending';

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

type NextOfKinWatchedVault = {
  address: `0x${string}`;
  label: string;
  addedAt: number;
};

const GUARDIAN_WATCHLIST_KEY = 'vfide.guardian-watchlist.v1';
const NEXT_OF_KIN_WATCHLIST_KEY = 'vfide.next-of-kin-watchlist.v1';
const MAX_WATCHLIST_ENTRIES = 50;
const MAX_WATCHLIST_LABEL_LENGTH = 40;
const MIN_ADD_INTERVAL_MS = 800;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function useGuardianWatchlist() {
  const [entries, setEntries] = useState<WatchedVault[]>([]);
  const [lastAddAt, setLastAddAt] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(GUARDIAN_WATCHLIST_KEY);
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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GUARDIAN_WATCHLIST_KEY, JSON.stringify(next));
    }
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

function useNextOfKinWatchlist() {
  const [entries, setEntries] = useState<NextOfKinWatchedVault[]>([]);
  const [lastAddAt, setLastAddAt] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(NEXT_OF_KIN_WATCHLIST_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Array<{ address: string; label?: string; addedAt?: number }>;
      const normalized = parsed
        .filter((item) => isAddress(item.address))
        .map((item) => ({
          address: item.address.toLowerCase() as `0x${string}`,
          label: (item.label || '').trim().slice(0, MAX_WATCHLIST_LABEL_LENGTH),
          addedAt: item.addedAt || Date.now(),
        }));
      setEntries(normalized.slice(0, MAX_WATCHLIST_ENTRIES));
    } catch {
      setEntries([]);
    }
  }, []);

  const save = (next: NextOfKinWatchedVault[]) => {
    setEntries(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NEXT_OF_KIN_WATCHLIST_KEY, JSON.stringify(next));
    }
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
      return { ok: false, message: 'Vault is already in your Next of Kin inbox.' };
    }

    const cleanLabel = label.trim().slice(0, MAX_WATCHLIST_LABEL_LENGTH);
    const next = [{ address: normalized, label: cleanLabel, addedAt: now }, ...entries];
    save(next);
    setLastAddAt(now);
    return { ok: true, message: 'Vault added to Next of Kin inbox.' };
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!guardianAddress || typeof fetch !== 'function') {
      setAttestations([]);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/security/guardian-attestations?guardian=${guardianAddress}&limit=200`);
        if (!response.ok) return;
        const data = (await response.json()) as { attestations?: GuardianAttestationRecord[] };
        if (!cancelled) {
          setAttestations(Array.isArray(data.attestations) ? data.attestations : []);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
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

  return { attestations, isLoading };
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

export default function GuardiansPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const colorMap = {
    overview: { gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/25' },
    'my-guardians': { gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-500/25' },
    'next-of-kin': { gradient: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-500/25' },
    recovery: { gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/25' },
    responsibilities: { gradient: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/25' },
    pending: { gradient: 'from-red-500 to-orange-500', shadow: 'shadow-red-500/25' }
  };

  return (
    <>
      
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-zinc-950 pt-20 relative overflow-hidden"
      >
        {/* Premium Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-125 h-125 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-100 h-100 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-blue-500/5 rounded-full blur-[150px]" />
        </div>

        {/* Header */}
        <section className="py-12 relative z-10">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-4"
            >
              <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl shadow-lg shadow-cyan-500/25">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Guardian <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Dashboard</span>
                </h1>
                <p className="text-xl text-gray-400">
                  Manage recoveries only for vaults where the owner explicitly selected you as guardian
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 sticky top-20 z-40">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide" role="tablist" aria-label="Guardian management sections">
              {[
                { id: 'overview' as const, label: 'Overview', icon: Shield },
                { id: 'my-guardians' as const, label: 'My Guardians', icon: Users },
                { id: 'next-of-kin' as const, label: 'Next of Kin', icon: Heart },
                { id: 'recovery' as const, label: 'Chain of Return', icon: Key },
                { id: 'responsibilities' as const, label: 'Responsibilities', icon: FileText },
                { id: 'pending' as const, label: 'Pending Actions', icon: Clock },
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? `bg-gradient-to-r ${colorMap[tab.id].gradient} text-white shadow-lg ${colorMap[tab.id].shadow}`
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tab.icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          <AnimatePresence mode="wait">
            <div role="tabpanel" id="tabpanel-overview" hidden={activeTab !== 'overview'}>
              {activeTab === 'overview' && <OverviewTab key="overview" />}
            </div>
            <div role="tabpanel" id="tabpanel-my-guardians" hidden={activeTab !== 'my-guardians'}>
              {activeTab === 'my-guardians' && <MyGuardiansTab key="my-guardians" isConnected={isConnected} />}
            </div>
            <div role="tabpanel" id="tabpanel-next-of-kin" hidden={activeTab !== 'next-of-kin'}>
              {activeTab === 'next-of-kin' && <NextOfKinTab key="next-of-kin" isConnected={isConnected} />}
            </div>
            <div role="tabpanel" id="tabpanel-recovery" hidden={activeTab !== 'recovery'}>
              {activeTab === 'recovery' && <RecoveryTab key="recovery" isConnected={isConnected} />}
            </div>
            <div role="tabpanel" id="tabpanel-responsibilities" hidden={activeTab !== 'responsibilities'}>
              {activeTab === 'responsibilities' && <ResponsibilitiesTab key="responsibilities" isConnected={isConnected} />}
            </div>
            <div role="tabpanel" id="tabpanel-pending" hidden={activeTab !== 'pending'}>
              {activeTab === 'pending' && <PendingActionsTab key="pending" isConnected={isConnected} />}
            </div>
          </AnimatePresence>
        </div>
      </motion.main>

      <Footer />
    </>
  );
}

function OverviewTab() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* What is a Guardian */}
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

      {/* How Recovery Works */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Clock className="w-7 h-7 text-cyan-400" />
          How Recovery Works
        </h2>
        <div className="space-y-4">
          {[
            { step: "1", title: "Owner Requests Recovery", desc: "Vault owner lost their wallet and requests recovery to a new address" },
            { step: "2", title: "7-Day Waiting Period", desc: "A mandatory waiting period allows the owner to cancel if the request was fraudulent" },
            { step: "3", title: "Guardians Verify & Approve", desc: "Guardians verify the owner's identity (off-chain) and approve the recovery" },
            { step: "4", title: "Recovery Finalized", desc: "Once enough guardians approve, the vault ownership is transferred to the new address" },
          ].map((item, i) => (
            <motion.div 
              key={i}
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

      {/* Two Recovery Types */}
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

function ResponsibilitiesTab({ isConnected }: { isConnected: boolean }) {
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see vaults you&apos;re guarding</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Guardian Vault Watchlist</h2>
        <p className="text-gray-400 text-sm mb-4">
          Closed-system inbox: add specific vaults where you were selected as guardian. No public guardian discovery.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Vault address (0x...)"
            value={vaultInput}
            onChange={(e) => setVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={vaultLabel}
            onChange={(e) => setVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={handleAddVault}
          className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold"
        >
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

function PendingActionsTab({ isConnected }: { isConnected: boolean }) {
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to see pending recovery requests</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Pending Recovery Inbox</h2>
        <p className="text-gray-400 text-sm mb-4">
          This inbox checks only vaults you add manually from trusted relationships. It is not an open guardian feed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Vault address (0x...)"
            value={vaultInput}
            onChange={(e) => setVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 font-mono"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={vaultLabel}
            onChange={(e) => setVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          onClick={handleAddVault}
          className="mt-3 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold"
        >
          Add Vault to Inbox
        </button>
        {notice && <p className="text-sm text-cyan-200 mt-3">{notice}</p>}
      </div>

      {inboxEntries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-10"
        >
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
  const { data: owner } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
  });

  const { data: isGuardian } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!isGuardian },
  });

  const { data: recoveryStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
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
            <button
              onClick={onRemove}
              className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10"
            >
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
    query: { enabled: !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!isGuardian },
  });

  const { data: recoveryStatus, refetch: refetchRecoveryStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getRecoveryStatus',
    query: { refetchInterval: 15000 },
  });

  const recovery = recoveryStatus as [string, bigint, bigint, bigint, boolean] | undefined;
  const active = !!recovery && recovery[4];
  const approvals = recovery ? Number(recovery[1]) : 0;
  const threshold = recovery ? Number(recovery[2]) : 0;
  const proposedOwner = recovery ? recovery[0] : '0x0000000000000000000000000000000000000000';
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
        functionName: 'approveRecovery',
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
            <button
              onClick={onRemove}
              className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10"
            >
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
          <div className="text-white text-sm font-mono">{proposedOwner !== '0x0000000000000000000000000000000000000000' ? shortAddress(proposedOwner) : 'n/a'}</div>
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

// ========== MY GUARDIANS TAB ==========
function MyGuardiansTab({ isConnected }: { isConnected: boolean }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const { vaultOwner, guardians, guardianCount, isWritePending, addGuardian, removeGuardian } = useVaultRecovery(vaultAddress);
  const guardianList = guardians || [];
  const recoveryThreshold = guardianCount < 2 ? 2 : Math.floor(guardianCount / 2) + 1;
  const isOwner = !!address && !!vaultOwner && address.toLowerCase() === (vaultOwner as string).toLowerCase();
  
  // Validate guardian address
  const isValidAddress = useMemo(() => {
    if (!newGuardianAddress) return null; // No input yet
    return isAddress(newGuardianAddress);
  }, [newGuardianAddress]);
  
  const clearNotices = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleCreateVault = async () => {
    clearNotices();
    try {
      await createVault();
      setActionSuccess('Vault creation submitted. Refresh after confirmation to manage guardians.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create vault';
      setActionError(message);
    }
  };

  const handleAddGuardian = async () => {
    clearNotices();

    if (!isAddress(newGuardianAddress)) {
      setActionError('Enter a valid guardian wallet address.');
      return;
    }

    try {
      await addGuardian(newGuardianAddress as `0x${string}`);
      setActionSuccess('Guardian add transaction submitted.');
      setNewGuardianAddress('');
      setShowAddForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add guardian';
      setActionError(message);
    }
  };

  const handleRemoveGuardian = async (guardianAddress: string) => {
    clearNotices();
    try {
      await removeGuardian(guardianAddress as `0x${string}`);
      setActionSuccess('Guardian removal transaction submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove guardian';
      setActionError(message);
    }
  };

  const handleIssueAttestation = async (guardianAddress: `0x${string}`) => {
    clearNotices();

    if (!isOwner || !address || !vaultAddress) {
      setActionError('Only the vault owner can issue guardian attestations.');
      return;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const payload: GuardianAttestationPayload = {
        version: 'vfide-guardian-attestation-v1',
        owner: address,
        vault: vaultAddress,
        guardian: guardianAddress,
        issuedAt: now,
        expiresAt: now + 365 * 24 * 60 * 60,
      };

      const signature = await signMessageAsync({
        message: buildGuardianAttestationMessage(payload),
      });

      if (typeof fetch !== 'function') {
        throw new Error('Attestation publishing is unavailable in this environment.');
      }

      const response = await fetch('/api/security/guardian-attestations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, signature }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = typeof data?.error === 'string' ? data.error : `Attestation publish failed (${response.status})`;
        throw new Error(message);
      }

      setActionSuccess('Guardian attestation signed and published. Guardian inbox auto-discovery enabled for this relationship.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to issue guardian attestation';
      setActionError(message);
    }
  };

  if (!isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to manage your guardians</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {!hasVault && !isLoadingVault && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Create Vault First</h3>
          <p className="text-gray-300 mb-4">Guardian management is tied to your vault contract.</p>
          <button
            onClick={() => void handleCreateVault()}
            disabled={isCreatingVault}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {isCreatingVault ? 'Creating Vault...' : 'Create Vault'}
          </button>
        </div>
      )}

      {actionError && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="bg-green-500/15 border border-green-500/40 rounded-xl p-4 text-green-300 text-sm">
          {actionSuccess}
        </div>
      )}

      {/* Guardian Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Guardians', value: guardianList.length, sub: 'Max recommended: 5', icon: Users, iconColor: 'text-cyan-400', textColor: 'text-cyan-400', gradient: 'from-cyan-500/20 to-blue-500/20' },
          { label: 'Mature Guardians', value: 'On-chain', sub: 'Checked at vote-time', icon: CheckCircle2, iconColor: 'text-green-400', textColor: 'text-green-400', gradient: 'from-green-500/20 to-emerald-500/20' },
          { label: 'Recovery Threshold', value: `${recoveryThreshold}/${guardianList.length || 1}`, sub: 'Approvals needed', icon: Shield, iconColor: 'text-yellow-400', textColor: 'text-yellow-400', gradient: 'from-yellow-500/20 to-amber-500/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border border-white/10 rounded-2xl p-6`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{stat.label}</span>
              <stat.icon className={stat.iconColor} size={20} />
            </div>
            <div className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</div>
            <div className="text-gray-500 text-xs">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Add Guardian */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus size={20} className="text-cyan-400" />
            Add Guardian
          </h3>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25"
          >
            {showAddForm ? 'Cancel' : '+ Add Guardian'}
          </motion.button>
        </div>
        
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-white/10"
            >
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                <p className="text-yellow-400 text-sm">
                  <strong>7-Day Maturity Period:</strong> New guardians cannot participate in recovery votes for 7 days after being added. This prevents last-minute guardian manipulation.
                </p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Guardian Wallet Address</label>
                <input 
                  type="text" 
                  placeholder="0x..." 
                  value={newGuardianAddress}
                  onChange={(e) => setNewGuardianAddress(e.target.value)}
                  aria-label="Guardian wallet address"
                  aria-invalid={isValidAddress === false}
                  className={`w-full px-4 py-3 bg-black/30 border rounded-xl text-white focus:outline-none focus:ring-2 font-mono transition-all ${
                    isValidAddress === false 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : isValidAddress === true
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                        : 'border-white/10 focus:border-cyan-500 focus:ring-cyan-500/20'
                  }`}
                />
                {isValidAddress === false && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Please enter a valid Ethereum address (0x...)
                  </p>
                )}
                {isValidAddress === true && (
                  <p className="mt-1 text-sm text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Valid address
                  </p>
                )}
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleAddGuardian()}
                disabled={!isValidAddress || isWritePending || !hasVault}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isWritePending ? 'Processing...' : 'Add Guardian'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Guardian List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Your Guardians</h3>
        {guardianList.length === 0 ? (
          <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <p className="text-gray-400">No guardians set yet.</p>
            <p className="text-gray-500 text-sm mt-1">Add trusted contacts to secure recovery.</p>
          </div>
        ) : (
        <div className="space-y-3">
          {guardianList.map((guardian, index) => (
            <motion.div 
              key={guardian} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.01 }}
              className="p-4 bg-black/20 border border-white/10 rounded-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-cyan-500/20">
                    <Users className="text-cyan-400" size={20} />
                  </div>
                  <div>
                    <div className="text-white font-bold">Guardian {index + 1}</div>
                    <div className="text-gray-400 text-sm font-mono">{guardian}</div>
                    <div className="text-gray-500 text-xs">Maturity checked on-chain when approving recovery</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => void handleIssueAttestation(guardian)}
                    disabled={!isOwner || !hasVault}
                    className="p-2 border border-cyan-500/50 text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
                    title="Issue owner-signed guardian attestation"
                  >
                    <FileText size={18} />
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => void handleRemoveGuardian(guardian)}
                    disabled={isWritePending || !hasVault}
                    className="p-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <UserMinus size={18} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ========== NEXT OF KIN TAB ==========
function NextOfKinTab({ isConnected }: { isConnected: boolean }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const [newKinAddress, setNewKinAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [inboxVaultInput, setInboxVaultInput] = useState('');
  const [inboxVaultLabel, setInboxVaultLabel] = useState('');
  const [inboxNotice, setInboxNotice] = useState<string | null>(null);

  const { address } = useAccount();
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const { entries: inboxEntries, addEntry: addInboxEntry, removeEntry: removeInboxEntry } = useNextOfKinWatchlist();
  const {
    vaultOwner,
    nextOfKin,
    inheritanceStatus,
    isUserGuardian,
    isUserGuardianMature,
    isWritePending,
    setNextOfKinAddress,
    requestInheritance,
    approveInheritance,
    denyInheritance,
    finalizeInheritance,
    cancelInheritance,
    guardianCancelInheritance,
  } = useVaultRecovery(vaultAddress);

  const inheritanceRequest = inheritanceStatus.isActive;
  const isOwner = !!address && !!vaultOwner && address.toLowerCase() === (vaultOwner as string).toLowerCase();
  const isNextOfKin = !!address && !!nextOfKin && address.toLowerCase() === nextOfKin.toLowerCase();

  const clearNotices = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleCreateVault = async () => {
    clearNotices();
    try {
      await createVault();
      setActionSuccess('Vault creation submitted. Refresh after confirmation to continue inheritance setup.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create vault';
      setActionError(message);
    }
  };

  const handleSetNextOfKin = async () => {
    clearNotices();

    if (!isAddress(newKinAddress)) {
      setActionError('Enter a valid Next of Kin address.');
      return;
    }

    try {
      await setNextOfKinAddress(newKinAddress as `0x${string}`);
      setActionSuccess('Next of Kin update submitted.');
      setShowSetForm(false);
      setNewKinAddress('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set Next of Kin';
      setActionError(message);
    }
  };

  const handleRequestInheritance = async () => {
    clearNotices();
    try {
      await requestInheritance();
      setActionSuccess('Inheritance request submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request inheritance';
      setActionError(message);
    }
  };

  const handleAddInboxVault = () => {
    const result = addInboxEntry(inboxVaultInput, inboxVaultLabel);
    setInboxNotice(result.message);
    if (result.ok) {
      setInboxVaultInput('');
      setInboxVaultLabel('');
    }
  };

  const handleApproveInheritance = async () => {
    clearNotices();
    try {
      await approveInheritance();
      setActionSuccess('Inheritance approval submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve inheritance';
      setActionError(message);
    }
  };

  const handleDenyInheritance = async () => {
    clearNotices();
    try {
      await denyInheritance();
      setActionSuccess('Inheritance denial submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to deny inheritance';
      setActionError(message);
    }
  };

  const handleGuardianCancelInheritance = async () => {
    clearNotices();
    try {
      await guardianCancelInheritance();
      setActionSuccess('Guardian cancellation vote submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel inheritance as guardian';
      setActionError(message);
    }
  };

  const handleFinalizeInheritance = async () => {
    clearNotices();
    try {
      await finalizeInheritance();
      setActionSuccess('Inheritance finalization submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finalize inheritance';
      setActionError(message);
    }
  };

  const handleCancelInheritance = async () => {
    clearNotices();
    try {
      await cancelInheritance();
      setActionSuccess('Inheritance cancellation submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel inheritance';
      setActionError(message);
    }
  };

  if (!isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to manage your Next of Kin</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {!hasVault && !isLoadingVault && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Create Vault First</h3>
          <p className="text-gray-300 mb-4">Next of Kin configuration and inheritance status are managed from your vault contract.</p>
          <button
            onClick={() => void handleCreateVault()}
            disabled={isCreatingVault}
            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-xl font-bold disabled:opacity-50"
          >
            {isCreatingVault ? 'Creating Vault...' : 'Create Vault'}
          </button>
        </div>
      )}

      {actionError && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="bg-green-500/15 border border-green-500/40 rounded-xl p-4 text-green-300 text-sm">
          {actionSuccess}
        </div>
      )}

      {/* What is Next of Kin */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-6"
      >
        <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-3">
          <Heart size={24} />
          What is Next of Kin?
        </h2>
        <p className="text-white mb-4">
          Next of Kin is your designated heir who can inherit your vault funds if you pass away. 
          This is different from recovery (lost wallet) - inheritance requires guardian verification of death.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-black/30 rounded-xl p-4 border border-white/10">
            <h4 className="text-cyan-400 font-bold mb-2">Chain of Return</h4>
            <p className="text-gray-400 text-sm">Lost wallet recovery. You&apos;re alive but can&apos;t access your wallet.</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4 border border-white/10">
            <h4 className="text-yellow-400 font-bold mb-2">Next of Kin (Inheritance)</h4>
            <p className="text-gray-400 text-sm">Death inheritance. Funds transfer to designated heir after guardian verification.</p>
          </div>
        </div>
      </motion.div>

      {/* Current Next of Kin */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Current Next of Kin</h3>
          {isOwner && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSetForm(!showSetForm)}
              className="px-4 py-2 border border-cyan-500/50 text-cyan-400 rounded-xl font-bold hover:bg-cyan-500/10 transition-colors"
            >
              {showSetForm ? 'Cancel' : 'Change'}
            </motion.button>
          )}
        </div>
        
        {nextOfKin && nextOfKin !== ZERO_ADDRESS ? (
          <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Heart className="text-yellow-400" size={24} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">Configured On-Chain</div>
                <div className="text-gray-400 text-sm font-mono">{nextOfKin}</div>
                {inheritanceStatus.isActive && (
                  <div className="text-amber-300 text-xs mt-1">Active claim: {inheritanceStatus.approvals}/{inheritanceStatus.threshold} approvals</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <Heart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400">No Next of Kin designated</p>
            <p className="text-gray-500 text-sm mt-1">Protect your legacy by setting an inheritor</p>
          </div>
        )}
        
        <AnimatePresence>
          {showSetForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 mt-4 border-t border-white/10"
            >
              <div>
                <label className="block text-gray-400 text-sm mb-2">New Next of Kin Address</label>
                <input 
                  type="text" 
                  placeholder="0x..." 
                  value={newKinAddress}
                  onChange={(e) => setNewKinAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 font-mono transition-all"
                />
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">
                  <strong>Warning:</strong> Your Next of Kin must have their own VFIDE vault to receive inheritance. 
                  They must also understand they need 2/3 guardian approval to claim.
                </p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleSetNextOfKin()}
                disabled={!isOwner || !isAddress(newKinAddress) || isWritePending || !hasVault}
                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-xl font-bold shadow-lg shadow-yellow-500/25"
              >
                Set Next of Kin
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Active Inheritance Request (if any) */}
      {inheritanceRequest && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Active Inheritance Request
          </h3>
          <p className="text-white mb-4">
            Inheritance claim is currently active on this vault. Actions below are role-gated on-chain.
          </p>
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Approvals</div>
              <div className="text-white font-bold">{inheritanceStatus.approvals}/{inheritanceStatus.threshold}</div>
            </div>
            <div>
              <div className="text-gray-500">Expires In</div>
              <div className="text-white font-bold">{inheritanceStatus.daysRemaining !== null ? `${inheritanceStatus.daysRemaining} days` : 'n/a'}</div>
            </div>
            <div>
              <div className="text-gray-500">Owner Denied</div>
              <div className={`font-bold ${inheritanceStatus.denied ? 'text-red-300' : 'text-green-300'}`}>{inheritanceStatus.denied ? 'Yes' : 'No'}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {isUserGuardian && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleApproveInheritance()}
                disabled={isWritePending || !hasVault || !isUserGuardianMature}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/25 disabled:opacity-50"
              >
                Approve Inheritance (Guardian)
              </motion.button>
            )}
            {isUserGuardian && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleGuardianCancelInheritance()}
                disabled={isWritePending || !hasVault || !isUserGuardianMature}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/25 disabled:opacity-50"
              >
                Cancel Claim Vote (Guardian)
              </motion.button>
            )}
            {isNextOfKin && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleFinalizeInheritance()}
                disabled={isWritePending || !hasVault}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
              >
                Finalize Inheritance (Next of Kin)
              </motion.button>
            )}
            {isOwner && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleDenyInheritance()}
                disabled={isWritePending || !hasVault}
                className="w-full py-3 border border-red-500/60 text-red-300 rounded-xl font-bold hover:bg-red-500/10 disabled:opacity-50"
              >
                Deny Inheritance (Owner)
              </motion.button>
            )}
            {isOwner && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => void handleCancelInheritance()}
                disabled={isWritePending || !hasVault}
                className="w-full py-3 border border-red-500/60 text-red-300 rounded-xl font-bold hover:bg-red-500/10 disabled:opacity-50"
              >
                Cancel Claim (Owner)
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {!inheritanceRequest && isNextOfKin && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/30 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-cyan-400 mb-3">You are the configured Next of Kin</h3>
          <p className="text-gray-300 mb-4">If inheritance conditions are met, you can open the claim process on this vault from this tab.</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => void handleRequestInheritance()}
            disabled={isWritePending || !hasVault}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
          >
            Request Inheritance (Next of Kin)
          </motion.button>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-2">Next of Kin Claim Inbox</h3>
        <p className="text-gray-400 text-sm mb-4">
          Track external vaults where you may be configured as Next of Kin. This is private and manual; there is no public heir directory.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Owner vault address (0x...)"
            value={inboxVaultInput}
            onChange={(e) => setInboxVaultInput(e.target.value)}
            className="md:col-span-2 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-500/50 font-mono"
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={inboxVaultLabel}
            onChange={(e) => setInboxVaultLabel(e.target.value)}
            className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-500/50"
          />
        </div>
        <button
          onClick={handleAddInboxVault}
          className="mt-3 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-xl font-bold"
        >
          Add Vault to Kin Inbox
        </button>
        {inboxNotice && <p className="text-sm text-yellow-200 mt-3">{inboxNotice}</p>}

        {inboxEntries.length === 0 ? (
          <div className="mt-4 p-6 bg-black/30 border border-white/10 rounded-xl text-center">
            <p className="text-gray-400">No tracked inheritance vaults yet.</p>
            <p className="text-gray-500 text-sm mt-1">Add known vault addresses to monitor inheritance status and act with proper role permissions.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {inboxEntries.map((entry) => (
              <NextOfKinInboxCard
                key={entry.address}
                entry={entry}
                userAddress={address}
                onRemove={() => removeInboxEntry(entry.address)}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Inheritance Process */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Inheritance Process</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Next of Kin Initiates Claim", desc: "After your passing, they call requestInheritance()" },
            { step: "2", title: "7-Day Timelock", desc: "Mandatory delay before finalization, even after threshold approvals" },
            { step: "3", title: "Guardian Verification", desc: "2/3 guardians must verify death and approve transfer" },
            { step: "4", title: "Finalize Before Expiry", desc: "Finalization must happen within 30 days, then funds transfer to heir vault" },
          ].map((item, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex gap-4 p-3 bg-black/20 rounded-xl border border-white/10"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center text-black font-bold shrink-0 text-sm shadow-lg shadow-yellow-500/25">
                {item.step}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{item.title}</div>
                <div className="text-gray-400 text-xs">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function NextOfKinInboxCard({
  entry,
  userAddress,
  onRemove,
}: {
  entry: NextOfKinWatchedVault;
  userAddress?: `0x${string}`;
  onRemove: () => void;
}) {
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionTone, setActionTone] = useState<'info' | 'success' | 'error'>('info');
  const [isReportingFraud, setIsReportingFraud] = useState(false);
  const [txStage, setTxStage] = useState<'idle' | 'signing' | 'submitted' | 'confirmed' | 'failed'>('idle');
  const [txHashPreview, setTxHashPreview] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const { data: owner } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'owner',
  });

  const { data: nextOfKin } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'nextOfKin',
  });

  const { data: isGuardian } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardian',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const { data: isGuardianMature } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'isGuardianMature',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress && !!isGuardian },
  });

  const { data: inheritanceStatus, refetch: refetchInheritanceStatus } = useReadContract({
    address: entry.address,
    abi: USER_VAULT_ABI,
    functionName: 'getInheritanceStatus',
    query: { refetchInterval: 15000 },
  });

  const inheritance = inheritanceStatus as [boolean, bigint, bigint, bigint, boolean] | undefined;
  const active = !!inheritance && inheritance[0];
  const approvals = inheritance ? Number(inheritance[1]) : 0;
  const threshold = inheritance ? Number(inheritance[2]) : 0;
  const expirySec = inheritance ? Number(inheritance[3]) : 0;
  const denied = inheritance ? inheritance[4] : false;
  const daysLeft = expirySec > 0 ? Math.max(0, Math.ceil((expirySec * 1000 - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  const ownerAddress = (owner as string | undefined) || ZERO_ADDRESS;
  const nextOfKinAddress = (nextOfKin as string | undefined) || ZERO_ADDRESS;
  const normalizedUser = userAddress?.toLowerCase();
  const isOwner = !!normalizedUser && ownerAddress.toLowerCase() === normalizedUser;
  const isConfiguredNextOfKin = !!normalizedUser && nextOfKinAddress.toLowerCase() === normalizedUser;

  const execute = async (functionName: 'requestInheritance' | 'finalizeInheritance' | 'approveInheritance' | 'guardianCancelInheritance' | 'denyInheritance' | 'cancelInheritance') => {
    setActionNotice(null);
    setActionTone('info');

    try {
      setTxStage('signing');
      const txHash = await writeContractAsync({
        address: entry.address,
        abi: USER_VAULT_ABI,
        functionName,
      });

      const txHashText = String(txHash);
      setTxHashPreview(txHashText);
      setTxStage('submitted');
      setActionTone('success');
      setActionNotice(`${functionName} submitted: ${txHashText.slice(0, 12)}...`);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
        setTxStage('confirmed');
        setActionNotice(`${functionName} confirmed: ${txHashText.slice(0, 12)}...`);
      }

      setTimeout(() => {
        void refetchInheritanceStatus();
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${functionName} failed`;
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

      const response = await fetch('/api/security/next-of-kin-fraud-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault: entry.address,
          label: entry.label,
          source: 'next-of-kin-inbox',
          nextOfKin: nextOfKinAddress,
          approvals,
          threshold,
          active,
          denied,
          watcher: userAddress || 'unknown',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const err = typeof payload?.error === 'string' ? payload.error : `Fraud report failed (${response.status})`;
        throw new Error(err);
      }

      setActionTone('success');
      setActionNotice('Next of Kin fraud report submitted to security telemetry.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fraud report failed';
      setActionTone('error');
      setActionNotice(message);
    } finally {
      setIsReportingFraud(false);
    }
  };

  return (
    <div className="bg-black/20 border border-yellow-500/30 rounded-xl p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div>
          <p className="text-white font-bold">{entry.label || shortAddress(entry.address)}</p>
          <p className="text-gray-400 text-sm font-mono">{entry.address}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${active ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>
            {active ? 'Inheritance Active' : 'No Active Inheritance'}
          </span>
          <button
            onClick={onRemove}
            className="px-3 py-1 border border-red-500/40 text-red-300 rounded-lg text-xs font-bold hover:bg-red-500/10"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Owner</div>
          <div className="text-white text-sm font-mono">{ownerAddress !== ZERO_ADDRESS ? shortAddress(ownerAddress) : 'n/a'}</div>
        </div>
        <div className="bg-black/30 border border-white/10 rounded-xl p-3">
          <div className="text-gray-500 text-xs mb-1">Configured Kin</div>
          <div className="text-white text-sm font-mono">{nextOfKinAddress !== ZERO_ADDRESS ? shortAddress(nextOfKinAddress) : 'none'}</div>
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
          <div className="text-gray-500 text-xs mb-1">Owner Denied</div>
          <div className={`text-sm font-bold ${denied ? 'text-red-300' : 'text-green-300'}`}>{denied ? 'Yes' : 'No'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <button
          onClick={() => void execute('requestInheritance')}
          disabled={!isConfiguredNextOfKin || active || denied || isPending}
          className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
        >
          Request (Next of Kin)
        </button>
        <button
          onClick={() => void execute('finalizeInheritance')}
          disabled={!isConfiguredNextOfKin || !active || isPending}
          className="px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
        >
          Finalize (Next of Kin)
        </button>
        <button
          onClick={() => void execute('approveInheritance')}
          disabled={!isGuardian || !isGuardianMature || !active || isPending}
          className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
        >
          Approve (Guardian)
        </button>
        <button
          onClick={() => void execute('guardianCancelInheritance')}
          disabled={!isGuardian || !isGuardianMature || !active || isPending}
          className="px-3 py-2 border border-red-500/60 text-red-300 rounded-lg text-sm font-bold hover:bg-red-500/10 disabled:opacity-50"
        >
          Cancel Vote (Guardian)
        </button>
        <button
          onClick={() => void execute('denyInheritance')}
          disabled={!isOwner || !active || isPending}
          className="px-3 py-2 border border-red-500/60 text-red-300 rounded-lg text-sm font-bold hover:bg-red-500/10 disabled:opacity-50"
        >
          Deny (Owner)
        </button>
        <button
          onClick={() => void execute('cancelInheritance')}
          disabled={!isOwner || !active || isPending}
          className="px-3 py-2 border border-orange-500/60 text-orange-300 rounded-lg text-sm font-bold hover:bg-orange-500/10 disabled:opacity-50"
        >
          Cancel (Owner)
        </button>
        <button
          onClick={() => void handleReportFraud()}
          disabled={isReportingFraud}
          className="px-3 py-2 border border-fuchsia-500/60 text-fuchsia-300 rounded-lg text-sm font-bold hover:bg-fuchsia-500/10 disabled:opacity-50"
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

// ========== RECOVERY (CHAIN OF RETURN) TAB ==========
function RecoveryTab({ isConnected }: { isConnected: boolean }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const {
    recoveryStatus,
    guardianCount,
    isUserGuardian,
    isUserGuardianMature,
    isWritePending,
    requestRecovery,
    approveRecovery,
    finalizeRecovery,
    cancelRecovery,
  } = useVaultRecovery(vaultAddress);

  const requiredApprovals = recoveryStatus.isActive && recoveryStatus.threshold > 0
    ? recoveryStatus.threshold
    : (guardianCount < 2 ? 2 : Math.floor(guardianCount / 2) + 1);
  const activeRecovery = recoveryStatus.isActive;

  const clearNotices = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const handleCreateVault = async () => {
    clearNotices();
    try {
      await createVault();
      setActionSuccess('Vault creation submitted. Refresh after confirmation to continue recovery setup.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create vault';
      setActionError(message);
    }
  };

  const handleRequestRecovery = async () => {
    clearNotices();

    if (!isUserGuardian) {
      setActionError('Only guardians selected by the vault holder can open Chain of Return recovery.');
      return;
    }

    if (!isUserGuardianMature) {
      setActionError('Guardian is still in maturity period. Wait 7 days before opening recovery.');
      return;
    }

    if (guardianCount < 2) {
      setActionError('Chain of Return in this vault requires at least 2 guardians before recovery can be finalized.');
      return;
    }

    if (!isAddress(newAddress)) {
      setActionError('Enter a valid wallet address for the proposed new owner.');
      return;
    }

    try {
      await requestRecovery(newAddress as `0x${string}`);
      setActionSuccess('Recovery request submitted. Guardians can now approve.');
      setShowRequestForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request recovery';
      setActionError(message);
    }
  };

  const handleApproveRecovery = async () => {
    clearNotices();
    try {
      await approveRecovery();
      setActionSuccess('Recovery approval submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to approve recovery';
      setActionError(message);
    }
  };

  const handleFinalizeRecovery = async () => {
    clearNotices();
    try {
      await finalizeRecovery();
      setActionSuccess('Recovery finalized. Ownership transfer submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finalize recovery';
      setActionError(message);
    }
  };

  const handleCancelRecovery = async () => {
    clearNotices();
    try {
      await cancelRecovery();
      setActionSuccess('Recovery cancellation submitted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel recovery';
      setActionError(message);
    }
  };

  if (!isConnected) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Key className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
        <p className="text-gray-400">Connect your wallet to manage recovery</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {!hasVault && !isLoadingVault && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-2">Create Vault First</h3>
          <p className="text-gray-300 mb-4">Chain of Return requires an active vault for recovery state and guardian checks.</p>
          <button
            onClick={() => void handleCreateVault()}
            disabled={isCreatingVault}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {isCreatingVault ? 'Creating Vault...' : 'Create Vault'}
          </button>
        </div>
      )}

      {actionError && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="bg-green-500/15 border border-green-500/40 rounded-xl p-4 text-green-300 text-sm">
          {actionSuccess}
        </div>
      )}

      {/* What is Chain of Return */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6"
      >
        <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-3">
          <Key size={24} />
          Chain of Return
        </h2>
        <p className="text-white mb-4">
          Lost your wallet? Chain of Return allows you to recover vault access to a new wallet address 
          with guardian approval. This is for <strong>living users</strong> who lost access, not for inheritance.
        </p>
        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-sm">
            <strong className="text-green-400">Security:</strong> Recovery has a mandatory 7-day minimum timelock and guardian maturity checks.
            Approval threshold follows majority voting based on guardian snapshot at request time.
          </p>
        </div>
        <p className="text-cyan-200 text-sm mt-3">
          Only guardians pre-selected by the vault holder can approve. There is no open enrollment.
        </p>
      </motion.div>

      {/* Active Recovery Status */}
      {activeRecovery ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <RefreshCw size={20} className="animate-spin" />
            Active Recovery Request
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'New Address',
                value: recoveryStatus.proposedOwner
                  ? `${recoveryStatus.proposedOwner.slice(0, 6)}...${recoveryStatus.proposedOwner.slice(-4)}`
                  : 'n/a',
                mono: true,
              },
              { label: 'Approvals', value: `${recoveryStatus.approvals}/${requiredApprovals}`, color: 'text-green-400' },
              {
                label: 'Expires In',
                value: recoveryStatus.daysRemaining !== null ? `${recoveryStatus.daysRemaining} day${recoveryStatus.daysRemaining === 1 ? '' : 's'}` : 'n/a',
                color: 'text-yellow-400',
              },
              { label: 'Guardians', value: `${guardianCount}` },
            ].map((item, i) => (
              <div key={i} className="bg-black/30 rounded-xl p-4 border border-white/10">
                <div className="text-gray-400 text-xs mb-1">{item.label}</div>
                <div className={`${item.color || 'text-white'} ${item.mono ? 'font-mono text-sm' : 'font-bold'}`}>{item.value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleFinalizeRecovery()}
              disabled={isWritePending || !hasVault}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/25"
            >
              Finalize Recovery
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleCancelRecovery()}
              disabled={isWritePending || !hasVault}
              className="px-6 py-3 border border-red-500/50 text-red-400 rounded-xl font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              Cancel Recovery
            </motion.button>
          </div>

          {isUserGuardian && !isUserGuardianMature && (
            <p className="text-amber-300 text-sm mt-3">You are a guardian but still in the 7-day maturity period and cannot approve yet.</p>
          )}

          {isUserGuardian && isUserGuardianMature && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => void handleApproveRecovery()}
              disabled={isWritePending || !hasVault}
              className="w-full mt-3 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
            >
              Approve Recovery (Guardian)
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Request Recovery</h3>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRequestForm(!showRequestForm)}
              disabled={!hasVault}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25"
            >
              {showRequestForm ? 'Cancel' : 'Start Recovery'}
            </motion.button>
          </div>
          
          <p className="text-gray-400 mb-4">
            No active recovery request. If you lost your wallet, start a recovery to regain access via a new address.
          </p>

          {!isUserGuardian && (
            <p className="text-amber-300 text-sm mb-4">
              Your current wallet is not configured as a guardian for this vault, so it cannot open recovery requests.
            </p>
          )}

          {isUserGuardian && !isUserGuardianMature && (
            <p className="text-amber-300 text-sm mb-4">
              You are a guardian, but still in maturity period. Recovery requests unlock after 7 days.
            </p>
          )}

          {guardianCount < 2 && (
            <p className="text-amber-300 text-sm mb-4">
              This vault has fewer than 2 guardians. Add at least one more guardian to make Chain of Return recoverable.
            </p>
          )}
          
          <AnimatePresence>
            {showRequestForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-white/10"
              >
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                  <p className="text-yellow-400 text-sm">
                    <strong>Who can request recovery?</strong> A mature guardian selected by the vault holder.
                    The request proposes the new owner wallet to recover access.
                  </p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">New Owner Address (your new wallet)</label>
                  <input 
                    type="text" 
                    placeholder="0x..." 
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all"
                  />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void handleRequestRecovery()}
                  disabled={
                    isWritePending
                    || !hasVault
                    || !isAddress(newAddress)
                    || !isUserGuardian
                    || !isUserGuardianMature
                    || guardianCount < 2
                  }
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  Request Recovery
                </motion.button>
                <p className="text-gray-500 text-xs text-center">
                  Recovery expires after 30 days. Finalization still requires the minimum 7-day timelock.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Recovery Timeline */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-xl font-bold text-white mb-4">Recovery Timeline</h3>
        <div className="relative">
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-500/50 via-yellow-500/50 to-green-500/50" />
          <div className="space-y-6">
            {[
              { icon: Key, bgColor: "bg-cyan-500/20", borderColor: "border-cyan-500/50", iconColor: "text-cyan-400", title: "Recovery Requested", desc: "A mature guardian selected by the vault owner opens the recovery request." },
              { icon: Timer, bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/50", iconColor: "text-yellow-400", title: "7-Day Minimum Timelock", desc: "Recovery cannot finalize before the timelock. Owner can cancel fraudulent requests." },
              { icon: Users, bgColor: "bg-green-500/20", borderColor: "border-green-500/50", iconColor: "text-green-400", title: "Guardian Approvals", desc: "Mature guardians approve by majority snapshot (minimum 2 guardians required)." },
              { icon: CheckCircle2, bgColor: "bg-green-500/20", borderColor: "border-green-500/50", iconColor: "text-green-400", title: "Finalize Recovery", desc: "Anyone can call finalizeRecovery() once threshold met" },
              { icon: ArrowRightCircle, bgColor: "bg-cyan-500/20", borderColor: "border-cyan-500/50", iconColor: "text-cyan-400", title: "Ownership Transferred", desc: "Vault now owned by new address. Full access restored." },
            ].map((step, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex gap-4 relative"
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${step.bgColor} border ${step.borderColor}`}
                >
                  <step.icon size={16} className={step.iconColor} />
                </div>
                <div className="pt-1">
                  <div className="text-white font-bold text-sm">{step.title}</div>
                  <div className="text-gray-400 text-xs">{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Special Case: NextOfKin with No Guardians */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Lock size={18} className="text-yellow-400" />
          Special Case: Next of Kin Without Guardians
        </h3>
        <p className="text-gray-400 text-sm">
          If your vault has <strong className="text-white">no guardians</strong> and recovery is requested by Next of Kin, approval threshold is reduced,
          but finalization still enforces the minimum 7-day timelock.
        </p>
      </motion.div>
    </motion.div>
  );
}
