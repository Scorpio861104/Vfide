"use client";

import { GlobalNav } from "@/components/layout/GlobalNav";
import { Footer } from "@/components/layout/Footer";
import { useVaultRecovery } from "@/hooks/useVaultRecovery";
import { useVaultHub } from "@/hooks/useVaultHub";
import { TransactionHistory } from "@/components/vault/TransactionHistory";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { useState, useEffect } from "react";
import { isAddress, parseUnits, formatUnits } from "viem";
import { devLog } from "@/lib/utils";
import { useVaultBalance, useSelfPanic, useQuarantineStatus, useCanSelfPanic } from "@/lib/vfide-hooks";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, AlertTriangle, Lock, Clock, Plus, UserPlus, Users, Key, 
  Heart, ArrowDownToLine, ArrowUpFromLine, RefreshCw, CheckCircle2,
  Zap, DollarSign, TrendingUp, X, Loader2
} from "lucide-react";
import { safeParseFloat } from "@/lib/validation";
import { CONTRACT_ADDRESSES, VFIDETokenABI, VaultHubLiteABI, UserVaultABI } from "@/lib/contracts";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

// Glassmorphism card
function GlassCard({ children, className = "", hover = true, gradient }: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
  gradient?: "cyan" | "gold" | "red" | "green";
}) {
  const gradientMap = {
    cyan: "from-cyan-500/20 to-blue-500/10",
    gold: "from-amber-500/20 to-orange-500/10",
    red: "from-red-500/20 to-red-500/5",
    green: "from-emerald-500/20 to-emerald-500/5"
  };
  
  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -2 } : {}}
      transition={{ type: "spring", stiffness: 400 }}
      className={`relative overflow-hidden rounded-2xl bg-linear-to-br ${gradient ? gradientMap[gradient] : 'from-white/[0.08] to-white/[0.02]'} backdrop-blur-xl border border-white/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Compact security section with Panic Button
function VaultSecuritySection({ vaultAddress }: { vaultAddress: `0x${string}` | null | undefined }) {
  const quarantineData = useQuarantineStatus(vaultAddress || undefined);
  const panicData = useCanSelfPanic();
  const { selfPanic, isPanicking, isAvailable: isPanicAvailable } = useSelfPanic();
  
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [panicDuration, setPanicDuration] = useState(24);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  
  useEffect(() => {
    // Update time every minute for countdown
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 60000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  const quarantineRemaining = Math.max(0, quarantineData.quarantineUntil - now);
  const isQuarantined = quarantineRemaining > 0;
  const remainingHours = Math.floor(quarantineRemaining / 3600);
  const remainingMinutes = Math.floor((quarantineRemaining % 3600) / 60);
  
  const cooldownRemaining = Math.max(0, (panicData.lastPanicTime + panicData.cooldownSeconds) - now);
  const canPanic = isPanicAvailable && cooldownRemaining === 0 && !isQuarantined;
  
  const handlePanic = () => {
    if (!isPanicAvailable) return;
    selfPanic(panicDuration);
    setShowPanicConfirm(false);
  };

  if (!vaultAddress) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <GlassCard 
          className={`p-6 ${isQuarantined ? 'border-red-500/50' : 'border-white/10'}`} 
          hover={false}
          gradient={isQuarantined ? "red" : undefined}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div 
                animate={isQuarantined ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={`p-4 rounded-2xl ${isQuarantined ? 'bg-red-500/20' : 'bg-cyan-500/20'}`}
              >
                {isQuarantined ? (
                  <Lock className="w-8 h-8 text-red-400" />
                ) : (
                  <Shield className="w-8 h-8 text-cyan-400" />
                )}
              </motion.div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {isQuarantined ? 'Vault Quarantined' : 'Emergency Security'}
                </h3>
                <p className="text-white/60 text-sm">
                  {isQuarantined 
                    ? `Locked for ${remainingHours}h ${remainingMinutes}m`
                    : 'Suspect compromise? Lock immediately.'}
                </p>
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              {!showPanicConfirm ? (
                <motion.button
                  key="panic-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: canPanic ? 1.05 : 1 }}
                  whileTap={{ scale: canPanic ? 0.95 : 1 }}
                  onClick={() => setShowPanicConfirm(true)}
                  disabled={!canPanic || isQuarantined}
                  className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    isQuarantined 
                      ? 'bg-white/10 text-white/40 cursor-not-allowed'
                      : canPanic 
                        ? 'bg-linear-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  {isQuarantined ? <Lock size={18} /> : <AlertTriangle size={18} />}
                  {isQuarantined ? 'Already Locked' : 'Panic Button'}
                </motion.button>
              ) : (
                <motion.div
                  key="panic-confirm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col sm:flex-row items-center gap-3"
                >
                  <select
                    value={panicDuration}
                    onChange={(e) => setPanicDuration(Number(e.target.value))}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={72}>3 days</option>
                    <option value={168}>7 days</option>
                  </select>
                  <button
                    onClick={handlePanic}
                    disabled={isPanicking}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold disabled:opacity-50"
                  >
                    {isPanicking ? 'Locking...' : 'Confirm Lock'}
                  </button>
                  <button
                    onClick={() => setShowPanicConfirm(false)}
                    className="px-4 py-2 text-white/60 hover:text-white rounded-xl"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {isQuarantined && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="flex items-center gap-2 text-red-400">
                <Clock size={16} />
                <span className="text-sm">
                  Auto-unlock in <strong>{remainingHours}h {remainingMinutes}m</strong>
                </span>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </div>
    </section>
  );
}

function VaultContent() {
  const { showToast } = useToast();
  const { address } = useAccount();
  
  const { vaultAddress, hasVault, isLoadingVault, createVault, isCreatingVault } = useVaultHub();
  const { balance: vaultBalance, isLoading: isLoadingBalance } = useVaultBalance();
  const PRESALE_REFERENCE_PRICE = 0.07;
  const usdValue = (safeParseFloat(vaultBalance, 0) * PRESALE_REFERENCE_PRICE).toFixed(2);
  
  const {
    vaultOwner,
    guardianCount,
    isUserGuardian,
    nextOfKin,
    inheritanceStatus,
    isWritePending,
    setNextOfKinAddress,
    addGuardian,
  } = useVaultRecovery(vaultAddress);
  
  const [newGuardianAddress, setNewGuardianAddress] = useState("");
  const [newNextOfKinAddress, setNewNextOfKinAddress] = useState("");
  
  // Deposit/Withdraw state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [depositStep, setDepositStep] = useState<'approve' | 'deposit'>('approve');
  
  // Contract hooks
  const { writeContractAsync } = useWriteContract();
  
  // Read wallet token balance for deposit
  const { data: walletBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  
  // Read allowance for VaultHub
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.VFIDEToken,
    abi: VFIDETokenABI,
    functionName: 'allowance',
    args: address && CONTRACT_ADDRESSES.VaultHub ? [address, CONTRACT_ADDRESSES.VaultHub] : undefined,
  });
  
  const walletBalanceFormatted = walletBalance ? formatUnits(walletBalance as bigint, 18) : '0';
  
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }
    
    const amountWei = parseUnits(depositAmount, 18);
    const currentAllowance = allowance as bigint || 0n;
    
    setIsDepositing(true);
    try {
      // Step 1: Approve if needed
      if (currentAllowance < amountWei) {
        setDepositStep('approve');
        showToast("Approving VFIDE tokens...", "info");
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.VFIDEToken,
          abi: VFIDETokenABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.VaultHub, amountWei],
        });
        await refetchAllowance();
      }
      
      // Step 2: Deposit
      setDepositStep('deposit');
      showToast("Depositing to vault...", "info");
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.VaultHub,
        abi: VaultHubLiteABI,
        functionName: 'deposit',
        args: [amountWei],
      });
      
      showToast("Deposit successful!", "success");
      setDepositAmount("");
      setShowDepositModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('rejected') && !message.includes('denied')) {
        showToast("Deposit failed: " + message.slice(0, 50), "error");
      } else {
        showToast("Transaction cancelled", "info");
      }
    } finally {
      setIsDepositing(false);
      setDepositStep('approve');
    }
  };
  
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }
    if (!withdrawRecipient || !isAddress(withdrawRecipient)) {
      showToast("Enter a valid recipient address", "error");
      return;
    }
    if (!vaultAddress) {
      showToast("No vault found", "error");
      return;
    }
    
    const amountWei = parseUnits(withdrawAmount, 18);
    
    setIsWithdrawing(true);
    try {
      showToast("Transferring from vault...", "info");
      await writeContractAsync({
        address: vaultAddress,
        abi: UserVaultABI,
        functionName: 'transferVFIDE',
        args: [withdrawRecipient as `0x${string}`, amountWei],
      });
      
      showToast("Withdrawal successful!", "success");
      setWithdrawAmount("");
      setWithdrawRecipient("");
      setShowWithdrawModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('cooldown')) {
        showToast("Withdrawal cooldown active. Please wait 24 hours.", "error");
      } else if (!message.includes('rejected') && !message.includes('denied')) {
        showToast("Withdrawal failed: " + message.slice(0, 50), "error");
      } else {
        showToast("Transaction cancelled", "info");
      }
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  const hasNextOfKin = nextOfKin && nextOfKin !== '0x0000000000000000000000000000000000000000';
  
  const handleSetNextOfKin = async () => {
    if (!isAddress(newNextOfKinAddress)) {
      showToast("Invalid address format", "error");
      return;
    }
    try {
      await setNextOfKinAddress(newNextOfKinAddress as `0x${string}`);
      setNewNextOfKinAddress("");
      showToast("Next of Kin set successfully!", "success");
    } catch (error) {
      devLog.error('Failed to set Next of Kin:', error);
      showToast("Failed to set Next of Kin", "error");
    }
  };
  
  const handleAddGuardian = async () => {
    if (!isAddress(newGuardianAddress)) {
      showToast("Invalid address format", "error");
      return;
    }
    try {
      await addGuardian(newGuardianAddress as `0x${string}`);
      setNewGuardianAddress("");
      showToast("Guardian added successfully!", "success");
    } catch (error) {
      devLog.error('Failed to add guardian:', error);
      showToast("Failed to add guardian", "error");
    }
  };
  
  return (
    <>
      <GlobalNav />
      
      <main className="min-h-screen bg-[#08080A] pt-20 relative">
        {/* Ambient Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
        </div>

        {/* Header */}
        <section className="relative py-12 border-b border-white/5">
          <div className="container mx-auto px-4 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 flex items-center gap-3">
                Vault Manager
                <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}>
                  <Shield className="text-emerald-400" size={40} />
                </motion.span>
              </h1>
              <p className="text-xl text-white/60 mb-6">
                Non-custodial storage with dual protection: recovery + inheritance
              </p>
            </motion.div>
            
            {/* No Vault - Create One */}
            {!hasVault && !isLoadingVault && address && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <GlassCard className="p-6 border-amber-500/30" gradient="gold" hover={false}>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-amber-500/20">
                        <Plus className="w-8 h-8 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">No Vault Found</h3>
                        <p className="text-white/60">Create your vault to start using VFIDE securely</p>
                      </div>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        try {
                          await createVault();
                          showToast("Vault created successfully!", "success");
                        } catch (error) {
                          devLog.error('Vault creation error:', error);
                          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                          showToast(errorMessage, "error");
                        }
                      }}
                      disabled={isCreatingVault}
                      className="px-8 py-4 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50"
                    >
                      {isCreatingVault ? "Creating..." : "Create Vault"}
                    </motion.button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
            
            {isLoadingVault && (
              <GlassCard className="p-6" hover={false}>
                <div className="flex items-center justify-center gap-3 py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full"
                  />
                  <p className="text-white/60">Loading vault information...</p>
                </div>
              </GlassCard>
            )}
            
            {!address && (
              <GlassCard className="p-6 border-red-500/30" gradient="red" hover={false}>
                <div className="text-center py-4">
                  <p className="text-red-400 font-bold mb-2">Wallet Not Connected</p>
                  <p className="text-white/60">Please connect your wallet to view your vault</p>
                </div>
              </GlassCard>
            )}
            
            {/* Feature Cards */}
            {hasVault && (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"
              >
                <motion.div variants={itemVariants}>
                  <GlassCard className="p-5 border-cyan-500/30" gradient="cyan">
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="text-cyan-400" size={24} />
                      <span className="text-cyan-400 font-bold">Chain of Return</span>
                    </div>
                    <p className="text-white/60 text-sm">
                      Lost wallet? Guardians verify your identity and help YOU regain access.
                    </p>
                  </GlassCard>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <GlassCard className="p-5 border-amber-500/30" gradient="gold">
                    <div className="flex items-center gap-3 mb-2">
                      <Heart className="text-amber-400" size={24} />
                      <span className="text-amber-400 font-bold">Next of Kin</span>
                    </div>
                    <p className="text-white/60 text-sm">
                      Estate planning. If you die, guardians verify and your HEIR inherits.
                    </p>
                  </GlassCard>
                </motion.div>
              </motion.div>
            )}
          </div>
        </section>

        {hasVault && (
          <>
            {/* Vault Overview Stats */}
            <section className="py-8 relative z-10">
              <div className="container mx-auto px-4 max-w-6xl">
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  <motion.div variants={itemVariants}>
                    <GlassCard className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white/60 text-sm">Total Balance</span>
                        <div className="p-2 rounded-xl bg-cyan-500/20">
                          <DollarSign className="text-cyan-400" size={18} />
                        </div>
                      </div>
                      {isLoadingBalance ? (
                        <>
                          <Skeleton height={40} className="w-48 mb-1 bg-white/10" />
                          <Skeleton height={16} className="w-32 bg-white/5" />
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-bold text-white mb-1">
                            {safeParseFloat(vaultBalance, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE
                          </div>
                          <div className="text-white/40 text-sm">≈ ${safeParseFloat(usdValue, 0).toLocaleString()} USD</div>
                        </>
                      )}
                    </GlassCard>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <GlassCard className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white/60 text-sm">Vault Status</span>
                        <div className="p-2 rounded-xl bg-emerald-500/20">
                          <CheckCircle2 className="text-emerald-400" size={18} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-emerald-400 mb-1">ACTIVE</div>
                      <div className="text-white/40 text-sm">All systems secure</div>
                    </GlassCard>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <GlassCard className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white/60 text-sm">Guardians</span>
                        <div className="p-2 rounded-xl bg-purple-500/20">
                          <Users className="text-purple-400" size={18} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-purple-400 mb-1">
                        {guardianCount !== undefined ? `${guardianCount}/5` : '...'}
                      </div>
                      <div className="text-white/40 text-sm">
                        {guardianCount && guardianCount >= 3 ? 'Recovery enabled' : 'Add guardians for recovery'}
                      </div>
                    </GlassCard>
                  </motion.div>
                </motion.div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="py-8 relative z-10">
              <div className="container mx-auto px-4 max-w-6xl">
                <GlassCard className="p-6" hover={false}>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Zap className="text-amber-400" size={24} />
                    Quick Actions
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.button 
                      onClick={() => setShowDepositModal(true)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-5 bg-linear-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
                    >
                      <ArrowDownToLine size={20} />
                      Deposit Funds
                    </motion.button>
                    <motion.button 
                      onClick={() => setShowWithdrawModal(true)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-5 bg-white/5 border border-cyan-500/30 text-cyan-400 rounded-xl font-bold hover:bg-cyan-500/10 flex items-center justify-center gap-2"
                    >
                      <ArrowUpFromLine size={20} />
                      Withdraw Funds
                    </motion.button>
                    <motion.button 
                      onClick={() => { setWithdrawRecipient(vaultAddress || ''); setShowWithdrawModal(true); }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-5 bg-white/5 border border-white/10 text-white/80 rounded-xl font-bold hover:border-white/20 hover:text-white flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={20} />
                      Transfer to Vault
                    </motion.button>
                  </div>
                </GlassCard>
              </div>
            </section>

            {/* Emergency Security */}
            <VaultSecuritySection vaultAddress={vaultAddress} />

            {/* Next of Kin Section */}
            <section className="py-8 relative z-10">
              <div className="container mx-auto px-4 max-w-6xl">
                <GlassCard className="p-6 border-amber-500/30" gradient="gold" hover={false}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <Heart className="text-amber-400" />
                        Next of Kin (Inheritance)
                      </h2>
                      <p className="text-white/60 text-sm max-w-2xl">
                        Estate planning for crypto. Your designated heir can claim vault ownership if you pass away.
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-center">
                      <div className="text-amber-400 text-xs font-bold">INHERITANCE</div>
                    </div>
                  </div>
                  
                  {/* Current Next of Kin Display */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-4">
                    {hasNextOfKin ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-emerald-400 font-bold text-sm mb-1">✓ Next of Kin Configured</div>
                          <div className="font-mono text-white/80 text-sm">
                            {nextOfKin?.slice(0, 6)}...{nextOfKin?.slice(-4)}
                          </div>
                        </div>
                        {inheritanceStatus.isActive && (
                          <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                            <div className="text-amber-400 text-xs font-bold">
                              Claim Active ({inheritanceStatus.daysRemaining} days left)
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-amber-400 text-sm text-center py-2">
                        ⚠️ No Next of Kin set. Set one to enable inheritance.
                      </div>
                    )}
                  </div>

                  {/* Set Next of Kin (Owner Only) */}
                  {address === vaultOwner && (
                    <div className="space-y-3 mb-4">
                      <input
                        type="text"
                        placeholder="Next of Kin address (0x...)"
                        value={newNextOfKinAddress}
                        onChange={(e) => setNewNextOfKinAddress(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSetNextOfKin}
                        disabled={isWritePending || !newNextOfKinAddress}
                        className="w-full py-3 bg-linear-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Heart size={18} />
                        {isWritePending ? "Processing..." : hasNextOfKin ? "Update Next of Kin" : "Set Next of Kin"}
                      </motion.button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl">
                      <div className="text-amber-400 font-bold text-sm mb-1">🔓 Instant Inheritance</div>
                      <div className="text-white/60 text-xs">
                        No guardians = immediate access after death.
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl">
                      <div className="text-cyan-400 font-bold text-sm mb-1">🛡️ Protected Inheritance</div>
                      <div className="text-white/60 text-xs">
                        With guardians = 2/3 approval required.
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </section>

            {/* Guardian Management */}
            <section className="py-8 relative z-10">
              <div className="container mx-auto px-4 max-w-6xl">
                <GlassCard className="p-6" hover={false}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <Key className="text-cyan-400" />
                        Chain of Return (Recovery)
                      </h2>
                      <p className="text-white/60 text-sm">
                        Lost wallet? Guardians help you regain access. Requires 2/3 approval + 7-day maturity.
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-center">
                      <div className="text-cyan-400 text-xs font-bold">30-DAY EXPIRY</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-xl mb-4">
                    {guardianCount > 0 ? (
                      <div className="text-center py-2">
                        <span className="text-white">{guardianCount} guardian{guardianCount !== 1 ? 's' : ''} configured</span>
                        {isUserGuardian && (
                          <div className="text-cyan-400 mt-2 text-sm">
                            ✓ You are a guardian
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-amber-400 text-sm text-center py-2">
                        ⚠️ No guardians. Next of Kin will have instant access.
                      </div>
                    )}
                  </div>
                  
                  {address === vaultOwner && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Guardian address (0x...)"
                        value={newGuardianAddress}
                        onChange={(e) => setNewGuardianAddress(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAddGuardian}
                        disabled={isWritePending || !newGuardianAddress}
                        className="w-full py-3 bg-linear-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <UserPlus size={18} />
                        {isWritePending ? "Processing..." : "Add Guardian"}
                      </motion.button>
                    </div>
                  )}
                </GlassCard>
              </div>
            </section>

            {/* Transaction History */}
            <section className="py-8 relative z-10">
              <div className="container mx-auto px-4 max-w-6xl">
                <GlassCard className="p-6" hover={false}>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="text-cyan-400" size={24} />
                    Transaction History
                  </h2>
                  <TransactionHistory />
                </GlassCard>
              </div>
            </section>
          </>
        )}

        {/* Deposit Modal */}
        <AnimatePresence>
          {showDepositModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => !isDepositing && setShowDepositModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1A1A1D] border border-white/10 rounded-2xl max-w-md w-full p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ArrowDownToLine className="text-cyan-400" size={24} />
                    Deposit VFIDE
                  </h3>
                  <button
                    onClick={() => !isDepositing && setShowDepositModal(false)}
                    disabled={isDepositing}
                    className="text-white/60 hover:text-white disabled:opacity-50"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-white/60 text-sm mb-1">Wallet Balance</div>
                  <div className="text-white font-bold">{parseFloat(walletBalanceFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE</div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-white/60 text-sm mb-2">Amount to Deposit</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 pr-20"
                    />
                    <button
                      onClick={() => setDepositAmount(walletBalanceFormatted)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-lg font-bold hover:bg-cyan-500/30"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: isDepositing ? 1 : 1.02 }}
                  whileTap={{ scale: isDepositing ? 1 : 0.98 }}
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}
                  className="w-full py-4 bg-linear-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDepositing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {depositStep === 'approve' ? 'Approving...' : 'Depositing...'}
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine size={20} />
                      Deposit to Vault
                    </>
                  )}
                </motion.button>
                
                <p className="text-white/40 text-xs text-center mt-4">
                  This will transfer tokens from your wallet to your vault.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Withdraw Modal */}
        <AnimatePresence>
          {showWithdrawModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => !isWithdrawing && setShowWithdrawModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1A1A1D] border border-white/10 rounded-2xl max-w-md w-full p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ArrowUpFromLine className="text-amber-400" size={24} />
                    Withdraw VFIDE
                  </h3>
                  <button
                    onClick={() => !isWithdrawing && setShowWithdrawModal(false)}
                    disabled={isWithdrawing}
                    className="text-white/60 hover:text-white disabled:opacity-50"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-white/60 text-sm mb-1">Vault Balance</div>
                  <div className="text-white font-bold">{safeParseFloat(vaultBalance, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} VFIDE</div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-white/60 text-sm mb-2">Recipient Address</label>
                  <input
                    type="text"
                    value={withdrawRecipient}
                    onChange={(e) => setWithdrawRecipient(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500/50"
                  />
                  {address && (
                    <button
                      onClick={() => setWithdrawRecipient(address)}
                      className="text-cyan-400 text-xs mt-1 hover:underline"
                    >
                      Use my wallet address
                    </button>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-white/60 text-sm mb-2">Amount to Withdraw</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 pr-20"
                    />
                    <button
                      onClick={() => setWithdrawAmount(String(safeParseFloat(vaultBalance, 0)))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-lg font-bold hover:bg-amber-500/30"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="text-amber-400 text-sm font-bold mb-1">⚠️ 24-Hour Cooldown</div>
                  <div className="text-white/60 text-xs">Withdrawals have a 24-hour cooldown period between transactions for security.</div>
                </div>
                
                <motion.button
                  whileHover={{ scale: isWithdrawing ? 1 : 1.02 }}
                  whileTap={{ scale: isWithdrawing ? 1 : 0.98 }}
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || !withdrawRecipient || parseFloat(withdrawAmount) <= 0}
                  className="w-full py-4 bg-linear-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Withdrawing...
                    </>
                  ) : (
                    <>
                      <ArrowUpFromLine size={20} />
                      Withdraw from Vault
                    </>
                  )}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </>
  );
}

export default function VaultPage() {
  return <VaultContent />;
}
