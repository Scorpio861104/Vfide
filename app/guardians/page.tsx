'use client';

import { Footer } from "@/components/layout/Footer";
import { useState, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { isAddress } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Clock, CheckCircle2, AlertCircle, Key, Heart, UserPlus, UserMinus, RefreshCw, ArrowRightCircle, Timer, Lock, FileText } from "lucide-react";
import { UserVaultABI } from "@/lib/abis";
import { useUserVault } from "@/hooks/useVaultHooks";
import { ZERO_ADDRESS } from "@/lib/constants";
import { formatAddress } from "@/lib/utils";

type TabType = 'overview' | 'my-guardians' | 'next-of-kin' | 'recovery' | 'responsibilities' | 'pending';

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
          <div className="absolute top-1/4 -left-32 w-[31.25rem] h-[31.25rem] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-32 w-[25rem] h-[25rem] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[37.5rem] h-[37.5rem] bg-blue-500/5 rounded-full blur-[150px]" />
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
                  Guardian <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">Dashboard</span>
                </h1>
                <p className="text-xl text-gray-400">
                  Manage vault recoveries you&apos;re responsible for
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
                      ? `bg-linear-to-r ${colorMap[tab.id].gradient} text-white shadow-lg ${colorMap[tab.id].shadow}`
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
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400 mb-6 flex items-center gap-3">
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
  const { address } = useAccount();
  const [lookupVault, setLookupVault] = useState('');
  const isValidVault = useMemo(() => {
    if (!lookupVault) return null;
    return isAddress(lookupVault);
  }, [lookupVault]);

  const { data: isGuardianData } = useReadContract({
    address: isValidVault ? (lookupVault as `0x${string}`) : ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'isGuardian',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && isValidVault === true },
  });

  const { data: recoveryStatusData } = useReadContract({
    address: isValidVault ? (lookupVault as `0x${string}`) : ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: isValidVault === true },
  });

  const { data: inheritanceStatusData } = useReadContract({
    address: isValidVault ? (lookupVault as `0x${string}`) : ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'getInheritanceStatus',
    query: { enabled: isValidVault === true },
  });

  const recoveryStatus = Array.isArray(recoveryStatusData)
    ? {
        approvals: Number(recoveryStatusData[1] ?? 0),
        threshold: Number(recoveryStatusData[2] ?? 0),
        expiryTime: Number(recoveryStatusData[3] ?? 0),
        active: Boolean(recoveryStatusData[4]),
      }
    : null;

  const inheritanceStatus = Array.isArray(inheritanceStatusData)
    ? {
        active: Boolean(inheritanceStatusData[0]),
        approvals: Number(inheritanceStatusData[1] ?? 0),
        threshold: Number(inheritanceStatusData[2] ?? 0),
        expiryTime: Number(inheritanceStatusData[3] ?? 0),
        denied: Boolean(inheritanceStatusData[4]),
      }
    : null;

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
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Guardian Responsibilities Lookup
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Vault Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={lookupVault}
              onChange={(e) => setLookupVault(e.target.value)}
              className={`w-full px-4 py-3 bg-black/30 border rounded-xl text-white focus:outline-none focus:ring-2 font-mono transition-all ${
                isValidVault === false
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : isValidVault === true
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                    : 'border-white/10 focus:border-cyan-500 focus:ring-cyan-500/20'
              }`}
            />
            {isValidVault === false && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Enter a valid vault address
              </p>
            )}
          </div>

          {isValidVault && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
                <div className="text-gray-400 text-xs mb-1">Guardian Status</div>
                <div className="text-white font-bold">
                  {isGuardianData ? 'You are a guardian' : 'Not a guardian'}
                </div>
              </div>
              <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
                <div className="text-gray-400 text-xs mb-1">Active Recovery</div>
                <div className="text-white font-bold">
                  {recoveryStatus?.active ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
                <div className="text-gray-400 text-xs mb-1">Active Inheritance</div>
                <div className="text-white font-bold">
                  {inheritanceStatus?.active && !inheritanceStatus.denied ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="p-4 bg-black/30 border border-white/10 rounded-xl">
                <div className="text-gray-400 text-xs mb-1">Approvals Needed</div>
                <div className="text-white font-bold">
                  {recoveryStatus?.active
                    ? `${recoveryStatus.approvals}/${recoveryStatus.threshold}`
                    : inheritanceStatus?.active
                      ? `${inheritanceStatus.approvals}/${inheritanceStatus.threshold}`
                      : '0/0'}
                </div>
              </div>
            </div>
          )}
        </div>
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
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [lookupVault, setLookupVault] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isValidVault = useMemo(() => {
    if (!lookupVault) return null;
    return isAddress(lookupVault);
  }, [lookupVault]);

  const { data: isGuardianData } = useReadContract({
    address: isValidVault ? (lookupVault as `0x${string}`) : ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'isGuardian',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && isValidVault === true },
  });

  const { data: recoveryStatusData, refetch: refetchRecoveryStatus } = useReadContract({
    address: isValidVault ? (lookupVault as `0x${string}`) : ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: isValidVault === true },
  });

  const { data: inheritanceStatusData, refetch: refetchInheritanceStatus } = useReadContract({
    address: isValidVault ? (lookupVault as `0x${string}`) : ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'getInheritanceStatus',
    query: { enabled: isValidVault === true },
  });

  const recoveryStatus = Array.isArray(recoveryStatusData)
    ? {
        proposedOwner: recoveryStatusData[0] as string,
        approvals: Number(recoveryStatusData[1] ?? 0),
        threshold: Number(recoveryStatusData[2] ?? 0),
        expiryTime: Number(recoveryStatusData[3] ?? 0),
        active: Boolean(recoveryStatusData[4]),
      }
    : null;

  const inheritanceStatus = Array.isArray(inheritanceStatusData)
    ? {
        active: Boolean(inheritanceStatusData[0]),
        approvals: Number(inheritanceStatusData[1] ?? 0),
        threshold: Number(inheritanceStatusData[2] ?? 0),
        expiryTime: Number(inheritanceStatusData[3] ?? 0),
        denied: Boolean(inheritanceStatusData[4]),
      }
    : null;

  const isGuardian = Boolean(isGuardianData);

  const handleApproveRecovery = async () => {
    if (!isValidVault || !isGuardian) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: lookupVault as `0x${string}`,
        abi: UserVaultABI,
        functionName: 'approveRecovery',
        args: [],
      });
      await refetchRecoveryStatus();
    } catch {
      setActionError('Failed to approve recovery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveInheritance = async () => {
    if (!isValidVault || !isGuardian) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: lookupVault as `0x${string}`,
        abi: UserVaultABI,
        functionName: 'approveInheritance',
        args: [],
      });
      await refetchInheritanceStatus();
    } catch {
      setActionError('Failed to approve inheritance.');
    } finally {
      setIsSubmitting(false);
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
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-400" />
          Pending Actions Lookup
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Vault Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={lookupVault}
              onChange={(e) => setLookupVault(e.target.value)}
              className={`w-full px-4 py-3 bg-black/30 border rounded-xl text-white focus:outline-none focus:ring-2 font-mono transition-all ${
                isValidVault === false
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : isValidVault === true
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                    : 'border-white/10 focus:border-cyan-500 focus:ring-cyan-500/20'
              }`}
            />
            {isValidVault === false && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Enter a valid vault address
              </p>
            )}
          </div>

          {isValidVault && (
            <div className="space-y-4">
              {!isGuardian && (
                <div className="p-4 bg-black/30 border border-white/10 rounded-xl text-sm text-gray-400">
                  You are not registered as a guardian for this vault.
                </div>
              )}

              {isGuardian && recoveryStatus?.active && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-yellow-500/50 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Recovery Approval Needed</h3>
                      <p className="text-gray-400 text-sm font-mono">{lookupVault}</p>
                    </div>
                    <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full">
                      <span className="text-yellow-400 text-sm font-bold">Recovery</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'New Address', value: formatAddress(recoveryStatus.proposedOwner), mono: true },
                      { label: 'Approvals', value: `${recoveryStatus.approvals}/${recoveryStatus.threshold}`, mono: false },
                      { label: 'Expiry', value: recoveryStatus.expiryTime ? new Date(recoveryStatus.expiryTime * 1000).toLocaleDateString() : 'N/A', mono: false },
                      { label: 'Status', value: 'Active', color: 'text-yellow-400', mono: false },
                    ].map((item, i) => (
                      <div key={i} className="bg-black/30 rounded-xl p-3 border border-white/10">
                        <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                        <div className={`text-sm ${item.color || 'text-white'} ${item.mono ? 'font-mono' : 'font-bold'}`}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSubmitting}
                      onClick={handleApproveRecovery}
                      className="flex-1 px-6 py-3 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/25 disabled:opacity-50"
                    >
                      ✓ Approve Recovery
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {isGuardian && inheritanceStatus?.active && !inheritanceStatus.denied && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-pink-500/50 rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Inheritance Approval Needed</h3>
                      <p className="text-gray-400 text-sm font-mono">{lookupVault}</p>
                    </div>
                    <div className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded-full">
                      <span className="text-pink-400 text-sm font-bold">Inheritance</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Approvals', value: `${inheritanceStatus.approvals}/${inheritanceStatus.threshold}`, mono: false },
                      { label: 'Expiry', value: inheritanceStatus.expiryTime ? new Date(inheritanceStatus.expiryTime * 1000).toLocaleDateString() : 'N/A', mono: false },
                      { label: 'Status', value: 'Active', color: 'text-pink-400', mono: false },
                    ].map((item, i) => (
                      <div key={i} className="bg-black/30 rounded-xl p-3 border border-white/10">
                        <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                        <div className={`text-sm ${item.color || 'text-white'} ${item.mono ? 'font-mono' : 'font-bold'}`}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSubmitting}
                      onClick={handleApproveInheritance}
                      className="flex-1 px-6 py-3 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/25 disabled:opacity-50"
                    >
                      ✓ Approve Inheritance
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {isGuardian && !recoveryStatus?.active && !inheritanceStatus?.active && (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" as const, stiffness: 200 }}
                  >
                    <div className="relative inline-block">
                      <CheckCircle2 className="w-16 h-16 text-green-400" />
                      <motion.div 
                        className="absolute inset-0 rounded-full bg-green-500/20"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-4 mt-4">All Clear!</h2>
                  <p className="text-gray-400">No pending guardian actions for this vault</p>
                </div>
              )}
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {actionError}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ========== MY GUARDIANS TAB ==========
function MyGuardiansTab({ isConnected }: { isConnected: boolean }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuardianAddress, setNewGuardianAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { vaultAddress, hasVault } = useUserVault();
  const { writeContractAsync } = useWriteContract();

  const { data: guardiansData, refetch: refetchGuardians, isLoading: isGuardiansLoading } = useReadContract({
    address: vaultAddress ?? ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'getGuardians',
    query: { enabled: !!vaultAddress },
  });
  
  // Validate guardian address
  const isValidAddress = useMemo(() => {
    if (!newGuardianAddress) return null; // No input yet
    return isAddress(newGuardianAddress);
  }, [newGuardianAddress]);
  
  const myGuardians: Array<{ address: string; alias: string; addedDate: string; mature: boolean }> = useMemo(() => {
    const guardiansTuple = guardiansData as
      | readonly [readonly `0x${string}`[], readonly boolean[]]
      | undefined;
    const guardians = Array.isArray(guardiansTuple?.[0]) ? (guardiansTuple?.[0] as `0x${string}`[]) : [];
    const mature = Array.isArray(guardiansTuple?.[1]) ? (guardiansTuple?.[1] as boolean[]) : [];

    return guardians.map((guardian, index) => ({
      address: guardian,
      alias: formatAddress(guardian),
      addedDate: 'On-chain',
      mature: Boolean(mature[index]),
    }));
  }, [guardiansData]);

  const handleAddGuardian = async () => {
    if (!vaultAddress) {
      setActionError('Create a vault before adding guardians.');
      return;
    }

    if (!isAddress(newGuardianAddress)) {
      setActionError('Enter a valid guardian address.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'setGuardian',
        args: [newGuardianAddress as `0x${string}`, true],
      });
      await refetchGuardians();
      setNewGuardianAddress('');
      setShowAddForm(false);
    } catch {
      setActionError('Failed to add guardian. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveGuardian = async (guardian: string) => {
    if (!vaultAddress) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'setGuardian',
        args: [guardian as `0x${string}`, false],
      });
      await refetchGuardians();
    } catch {
      setActionError('Failed to remove guardian.');
    } finally {
      setIsSubmitting(false);
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

  if (!hasVault) {
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
        <h2 className="text-2xl font-bold text-white mb-4">Create a Vault</h2>
        <p className="text-gray-400">You need a vault before adding guardians.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Guardian Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Guardians', value: myGuardians.length, sub: 'Max recommended: 5', icon: Users, iconColor: 'text-cyan-400', textColor: 'text-cyan-400', gradient: 'from-cyan-500/20 to-blue-500/20' },
          { label: 'Mature Guardians', value: myGuardians.filter(g => g.mature).length, sub: '7+ days active', icon: CheckCircle2, iconColor: 'text-green-400', textColor: 'text-green-400', gradient: 'from-green-500/20 to-emerald-500/20' },
          { label: 'Recovery Threshold', value: `2/${myGuardians.length}`, sub: 'Approvals needed', icon: Shield, iconColor: 'text-yellow-400', textColor: 'text-yellow-400', gradient: 'from-yellow-500/20 to-amber-500/20' },
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
            className="px-4 py-2 bg-linear-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25"
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
                {actionError && (
                  <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {actionError}
                  </p>
                )}
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!isValidAddress || isSubmitting}
                onClick={handleAddGuardian}
                className="w-full py-3 bg-linear-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Guardian'}
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
        <div className="space-y-3">
          {isGuardiansLoading ? (
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center text-gray-400">
              Loading guardians...
            </div>
          ) : myGuardians.length === 0 ? (
            <div className="p-6 bg-black/30 border border-white/10 rounded-xl text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-400">No guardians added yet</p>
              <p className="text-gray-500 text-sm mt-1">Add trusted contacts to secure your vault</p>
            </div>
          ) : (
            myGuardians.map((guardian) => (
              <motion.div 
                key={guardian.address} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.01 }}
                className="p-4 bg-black/20 border border-white/10 rounded-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${guardian.mature ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                      {guardian.mature ? (
                        <CheckCircle2 className="text-green-400" size={20} />
                      ) : (
                        <Timer className="text-yellow-400" size={20} />
                      )}
                    </div>
                    <div>
                      <div className="text-white font-bold">{guardian.alias}</div>
                      <div className="text-gray-400 text-sm font-mono">{guardian.address}</div>
                      <div className="text-gray-500 text-xs">Added: {guardian.addedDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!guardian.mature && (
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                        Maturing...
                      </span>
                    )}
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemoveGuardian(guardian.address)}
                      disabled={isSubmitting}
                      className="p-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <UserMinus size={18} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== NEXT OF KIN TAB ==========
function NextOfKinTab({ isConnected }: { isConnected: boolean }) {
  const [showSetForm, setShowSetForm] = useState(false);
  const [newKinAddress, setNewKinAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { vaultAddress, hasVault } = useUserVault();
  const { writeContractAsync } = useWriteContract();

  const { data: nextOfKinData, refetch: refetchNextOfKin } = useReadContract({
    address: vaultAddress ?? ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'nextOfKin',
    query: { enabled: !!vaultAddress },
  });

  const { data: inheritanceStatusData, refetch: refetchInheritanceStatus } = useReadContract({
    address: vaultAddress ?? ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'getInheritanceStatus',
    query: { enabled: !!vaultAddress },
  });

  const currentNextOfKin =
    typeof nextOfKinData === 'string' && nextOfKinData !== ZERO_ADDRESS
      ? { address: nextOfKinData, alias: formatAddress(nextOfKinData), setDate: 'On-chain' }
      : null;

  const inheritanceStatus = Array.isArray(inheritanceStatusData)
    ? {
        active: Boolean(inheritanceStatusData[0]),
        approvals: Number(inheritanceStatusData[1] ?? 0),
        threshold: Number(inheritanceStatusData[2] ?? 0),
        expiryTime: Number(inheritanceStatusData[3] ?? 0),
        denied: Boolean(inheritanceStatusData[4]),
      }
    : null;

  const inheritanceRequest = inheritanceStatus?.active && !inheritanceStatus.denied
    ? {
        approvals: inheritanceStatus.approvals,
        threshold: inheritanceStatus.threshold,
        expiryTime: inheritanceStatus.expiryTime,
      }
    : null;

  const handleSetNextOfKin = async () => {
    if (!vaultAddress) {
      setActionError('Create a vault before setting a Next of Kin.');
      return;
    }

    if (!isAddress(newKinAddress)) {
      setActionError('Enter a valid address for Next of Kin.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'setNextOfKin',
        args: [newKinAddress as `0x${string}`],
      });
      await refetchNextOfKin();
      setNewKinAddress('');
      setShowSetForm(false);
    } catch {
      setActionError('Failed to set Next of Kin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDenyInheritance = async () => {
    if (!vaultAddress) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'denyInheritance',
        args: [],
      });
      await refetchInheritanceStatus();
    } catch {
      setActionError('Failed to deny inheritance request.');
    } finally {
      setIsSubmitting(false);
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

  if (!hasVault) {
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
        <h2 className="text-2xl font-bold text-white mb-4">Create a Vault</h2>
        <p className="text-gray-400">You need a vault before setting a Next of Kin.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
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
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSetForm(!showSetForm)}
            className="px-4 py-2 border border-cyan-500/50 text-cyan-400 rounded-xl font-bold hover:bg-cyan-500/10 transition-colors"
          >
            {showSetForm ? 'Cancel' : 'Change'}
          </motion.button>
        </div>
        
        {currentNextOfKin ? (
          <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Heart className="text-yellow-400" size={24} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">{currentNextOfKin.alias}</div>
                <div className="text-gray-400 text-sm font-mono">{currentNextOfKin.address}</div>
                <div className="text-gray-500 text-xs">Set: {currentNextOfKin.setDate}</div>
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
                  {actionError && (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {actionError}
                    </p>
                  )}
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
                disabled={isSubmitting}
                onClick={handleSetNextOfKin}
                className="w-full py-3 bg-linear-to-r from-yellow-500 to-amber-500 text-black rounded-xl font-bold shadow-lg shadow-yellow-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Set Next of Kin'}
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
            Someone has initiated an inheritance claim on your vault. If you are alive and this is fraudulent, 
            deny the request immediately.
          </p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDenyInheritance}
            disabled={isSubmitting}
            className="w-full py-3 bg-linear-to-r from-red-500 to-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deny Inheritance Request (I&apos;m Alive!)
          </motion.button>
        </motion.div>
      )}

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
            { step: "2", title: "30-Day Window", desc: "Allows time for you to deny if called prematurely (fraud protection)" },
            { step: "3", title: "Guardian Verification", desc: "2/3 guardians must verify death and approve transfer" },
            { step: "4", title: "Funds Transfer", desc: "Vault balance transfers to heir's vault. Original vault locked for records." },
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

// ========== RECOVERY (CHAIN OF RETURN) TAB ==========
function RecoveryTab({ isConnected }: { isConnected: boolean }) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { vaultAddress, hasVault } = useUserVault();
  const { writeContractAsync } = useWriteContract();

  const { data: recoveryStatusData, refetch: refetchRecoveryStatus } = useReadContract({
    address: vaultAddress ?? ZERO_ADDRESS,
    abi: UserVaultABI,
    functionName: 'getRecoveryStatus',
    query: { enabled: !!vaultAddress },
  });

  const recoveryStatus = Array.isArray(recoveryStatusData)
    ? {
        proposedOwner: recoveryStatusData[0] as string,
        approvals: Number(recoveryStatusData[1] ?? 0),
        threshold: Number(recoveryStatusData[2] ?? 0),
        expiryTime: Number(recoveryStatusData[3] ?? 0),
        active: Boolean(recoveryStatusData[4]),
      }
    : null;

  const activeRecovery = recoveryStatus?.active
    ? {
        proposedOwner: recoveryStatus.proposedOwner,
        approvals: recoveryStatus.approvals,
        threshold: recoveryStatus.threshold,
        expiryTime: recoveryStatus.expiryTime,
      }
    : null;

  const handleRequestRecovery = async () => {
    if (!vaultAddress) {
      setActionError('Create a vault before requesting recovery.');
      return;
    }

    if (!isAddress(newAddress)) {
      setActionError('Enter a valid new owner address.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'requestRecovery',
        args: [newAddress as `0x${string}`],
      });
      await refetchRecoveryStatus();
      setShowRequestForm(false);
      setNewAddress('');
    } catch {
      setActionError('Failed to request recovery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeRecovery = async () => {
    if (!vaultAddress) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'finalizeRecovery',
        args: [],
      });
      await refetchRecoveryStatus();
    } catch {
      setActionError('Failed to finalize recovery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRecovery = async () => {
    if (!vaultAddress) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'cancelRecovery',
        args: [],
      });
      await refetchRecoveryStatus();
    } catch {
      setActionError('Failed to cancel recovery.');
    } finally {
      setIsSubmitting(false);
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

  if (!hasVault) {
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
        <h2 className="text-2xl font-bold text-white mb-4">Create a Vault</h2>
        <p className="text-gray-400">You need a vault before starting recovery.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
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
            <strong className="text-green-400">Security:</strong> Recovery requires 2/3 guardian approval AND guardians must 
            have been active for 7+ days (maturity period) to prevent flash attacks.
          </p>
        </div>
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
              { label: 'New Address', value: formatAddress(activeRecovery.proposedOwner), mono: true },
              { label: 'Approvals', value: `${activeRecovery.approvals}/${activeRecovery.threshold}`, color: 'text-green-400', mono: false },
              { label: 'Expires In', value: activeRecovery.expiryTime ? `${Math.max(0, Math.ceil((activeRecovery.expiryTime * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))} days` : 'Unknown', color: 'text-yellow-400', mono: false },
              { label: 'Started By', value: 'On-chain request', mono: false },
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
              onClick={handleFinalizeRecovery}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalize Recovery
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCancelRecovery}
              disabled={isSubmitting}
              className="px-6 py-3 border border-red-500/50 text-red-400 rounded-xl font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Recovery
            </motion.button>
          </div>
          {actionError && (
            <p className="mt-4 text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {actionError}
            </p>
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
              className="px-4 py-2 bg-linear-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25"
            >
              {showRequestForm ? 'Cancel' : 'Start Recovery'}
            </motion.button>
          </div>
          
          <p className="text-gray-400 mb-4">
            No active recovery request. If you lost your wallet, start a recovery to regain access via a new address.
          </p>
          
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
                    <strong>Who can request recovery?</strong> The vault owner, any guardian, or Next of Kin. 
                    You&apos;re calling from your NEW wallet to recover to it.
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
                {actionError && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {actionError}
                  </p>
                )}
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRequestRecovery}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-linear-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Requesting...' : 'Request Recovery'}
                </motion.button>
                <p className="text-gray-500 text-xs text-center">
                  Recovery expires after 30 days. Contact your guardians to approve.
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
              { icon: Key, bgColor: "bg-cyan-500/20", borderColor: "border-cyan-500/50", iconColor: "text-cyan-400", title: "Recovery Requested", desc: "Owner, guardian, or Next of Kin initiates request" },
              { icon: Timer, bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/50", iconColor: "text-yellow-400", title: "30-Day Window Opens", desc: "Owner can cancel if fraudulent. Guardians verify identity." },
              { icon: Users, bgColor: "bg-green-500/20", borderColor: "border-green-500/50", iconColor: "text-green-400", title: "Guardian Approvals", desc: "2/3 mature guardians (7+ days active) must approve" },
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
          Special Case: Instant Recovery
        </h3>
        <p className="text-gray-400 text-sm">
          If your vault has <strong className="text-white">no guardians</strong> and you are the Next of Kin, you can recover instantly 
          without waiting for approvals. This is useful for simple estates but offers less security.
        </p>
      </motion.div>
    </motion.div>
  );
}
