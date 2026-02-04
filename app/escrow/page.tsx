'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { safeParseInt as _safeParseInt, validateAddress } from '@/lib/validation'
import { toast } from '@/lib/toast'
import { 
  Shield, 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Plus,
  Timer,
  Scale,
  FileCheck,
  Wallet,
  Info,
  DollarSign,
  User,
  Calendar,
  Hash
} from 'lucide-react'
import { useAccount, useWriteContract as _useWriteContract, useWaitForTransactionReceipt as _useWaitForTransactionReceipt, useReadContract as _useReadContract } from 'wagmi'
import { parseUnits as _parseUnits } from 'viem'
import { Footer } from '@/components/layout/Footer'
import { useEscrow } from '@/lib/escrow/useEscrow'
import { Loader2 } from 'lucide-react'

// EscrowManager ABI
const _ESCROW_MANAGER_ABI = [
  { name: 'createEscrow', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'seller', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'timeout', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'release', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'refund', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'claimTimeout', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'raiseDispute', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'checkTimeout', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'isNearTimeout', type: 'bool' }, { name: 'timeRemaining', type: 'uint256' }] },
  { name: 'escrows', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'buyer', type: 'address' }, { name: 'seller', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'state', type: 'uint8' }] },
  { name: 'nextId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// Contract addresses from environment
const _ESCROW_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS || '0x2167C57dDfcd1bD2a6aDDB2bf510a05c48e7aC15') as `0x${string}`;
const _VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x3249215721a21BC9635C01Ea05AdE032dd90961f') as `0x${string}`;

// Escrow States (from contract)
enum EscrowState {
  CREATED = 0,
  RELEASED = 1,
  REFUNDED = 2,
  DISPUTED = 3
}

const stateLabels: Record<EscrowState, string> = {
  [EscrowState.CREATED]: 'Active',
  [EscrowState.RELEASED]: 'Released',
  [EscrowState.REFUNDED]: 'Refunded',
  [EscrowState.DISPUTED]: 'Disputed'
}

const _stateColors: Record<EscrowState, string> = {
  [EscrowState.CREATED]: 'text-amber-400 bg-amber-500/20',
  [EscrowState.RELEASED]: 'text-emerald-400 bg-emerald-500/20',
  [EscrowState.REFUNDED]: 'text-blue-400 bg-blue-500/20',
  [EscrowState.DISPUTED]: 'text-red-400 bg-red-500/20'
}

type TabId = 'active' | 'completed' | 'disputed'

export default function EscrowPage() {
  const { isConnected, address } = useAccount()
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Use real escrow hook
  const {
    escrows,
    loading: escrowLoading,
    error: escrowError,
    activeEscrows,
    completedEscrows,
    disputedEscrows,
    createEscrow,
    releaseEscrow,
    refundEscrow,
    raiseDispute,
    claimTimeout,
    formatEscrowAmount,
    getTimeRemaining,
    refresh
  } = useEscrow()
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    merchant: '',
    amount: '',
    orderId: ''
  })

  // Contract action handlers using the hook
  const handleCreateEscrow = async () => {
    // Validate merchant address
    const validation = validateAddress(createForm.merchant);
    if (!validation.valid) {
      alert(`Invalid merchant address: ${validation.error}`);
      return;
    }
    
    try {
      await createEscrow(
        createForm.merchant as `0x${string}`,
        createForm.amount,
        createForm.orderId
      );
      setShowCreateModal(false);
      setCreateForm({ merchant: '', amount: '', orderId: '' });
      toast.success('Escrow created successfully');
    } catch (err) {
      console.error('Failed to create escrow:', err);
      toast.error('Failed to create escrow. Please try again.');
    }
  };

  const handleRelease = async (id: number) => {
    try {
      await releaseEscrow(BigInt(id));
      toast.success('Escrow released successfully');
    } catch (err) {
      console.error('Failed to release escrow:', err);
      toast.error('Failed to release escrow. Please try again.');
    }
  };

  const handleDispute = async (id: number) => {
    try {
      await raiseDispute(BigInt(id));
      toast.success('Dispute raised successfully');
    } catch (err) {
      console.error('Failed to raise dispute:', err);
      toast.error('Failed to raise dispute. Please try again.');
    }
  };

  const handleRefund = async (id: number) => {
    try {
      await refundEscrow(BigInt(id));
      toast.success('Refund issued successfully');
    } catch (err) {
      console.error('Failed to refund escrow:', err);
      toast.error('Failed to refund escrow. Please try again.');
    }
  };

  const handleClaimTimeout = async (id: number) => {
    try {
      await claimTimeout(BigInt(id));
      toast.success('Timeout claim submitted successfully');
    } catch (err) {
      console.error('Failed to claim timeout:', err);
      toast.error('Failed to claim timeout. Please try again.');
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'active', label: 'Active', icon: <Clock className="w-4 h-4" /> },
    { id: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'disputed', label: 'Disputed', icon: <AlertTriangle className="w-4 h-4" /> }
  ]

  // Filter escrows based on tab - using hook's pre-filtered arrays
  const filteredEscrows = activeTab === 'active' 
    ? activeEscrows 
    : activeTab === 'completed' 
      ? completedEscrows 
      : disputedEscrows

  // Stats from real escrow data
  const totalInEscrow = activeEscrows.reduce((sum, e) => sum + e.amount, BigInt(0))
  const activeCount = activeEscrows.length
  const completedCount = completedEscrows.length
  const disputedCount = disputedEscrows.length

  const formatAmount = (amount: bigint): string => {
    return formatEscrowAmount(amount)
  }

  const formatTimeRemaining = (releaseTime: bigint): string => {
    return getTimeRemaining(releaseTime)
  }

  return (
    <>
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,197,94,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
      </div>

      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-24 pb-16"
      >
        {/* Hero */}
        <section className="relative py-12 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 rounded-full mb-6"
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">Safe Buy Protection</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-4">
                <span className="text-white">Buyer Protection </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400">
                  Escrow
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Secure your transactions with smart contract escrow. Funds are held safely 
                until delivery is confirmed, with dispute resolution backed by the DAO.
              </p>
            </motion.div>
          
            {escrowError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 max-w-3xl mx-auto"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Escrow service unavailable</p>
                  <p className="text-red-200/80">We couldn&apos;t load your escrows. Check your wallet connection and try again.</p>
                </div>
              </motion.div>
            )}

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto"
            >
              {[
                { label: 'Total in Escrow', value: `${formatAmount(totalInEscrow)} VFIDE`, icon: <DollarSign className="w-5 h-5" />, gradient: 'from-cyan-500/20 to-teal-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
                { label: 'Active Escrows', value: activeCount.toString(), icon: <Clock className="w-5 h-5" />, gradient: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
                { label: 'Completed', value: completedCount.toString(), icon: <CheckCircle2 className="w-5 h-5" />, gradient: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
                { label: 'In Dispute', value: disputedCount.toString(), icon: <Scale className="w-5 h-5" />, gradient: 'from-red-500/20 to-rose-500/10', border: 'border-red-500/20', text: 'text-red-400' }
              ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-gradient-to-br ${stat.gradient} backdrop-blur-xl border ${stat.border} rounded-2xl p-4`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} border ${stat.border} flex items-center justify-center mb-3`}>
                  <div className={stat.text}>{stat.icon}</div>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="pb-12">
          <div className="container mx-auto px-3 sm:px-4">
            {/* Tabs & Create Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
            >
              <div className="flex gap-2">
                {tabs.map(tab => (
                  <motion.button
                    key={tab.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/25'
                        : 'bg-white/5 text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </motion.button>
                ))}
              </div>
            
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Escrow
              </motion.button>
            </motion.div>

            {/* Escrow List */}
            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.div 
                  key="connect"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 border border-cyan-500/20 inline-block mb-4">
                    <Wallet className="w-12 h-12 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-400">Connect your wallet to view and manage your escrows</p>
                </motion.div>
              ) : escrowLoading && escrows.length === 0 ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                  <p className="text-gray-400">Loading your escrows...</p>
                </motion.div>
              ) : filteredEscrows.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 border border-cyan-500/20 inline-block mb-4">
                    <Package className="w-12 h-12 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Escrows Found</h3>
                  <p className="text-gray-400">You don&apos;t have any {activeTab} escrows yet</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => refresh()}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div 
                  key="escrows"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {filteredEscrows.map((escrow, idx) => {
                    const normalizedAddress = address?.toLowerCase()
                    const isBuyer = normalizedAddress && escrow.buyer.toLowerCase() === normalizedAddress
                    const isMerchant = normalizedAddress && escrow.merchant.toLowerCase() === normalizedAddress
                    const isTimeoutReady = Number(escrow.releaseTime) * 1000 <= Date.now()

                    return (
                      <motion.div
                        key={escrow.id.toString()}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.005, y: -2 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors"
                      >
                      <div className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Left: Order Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                escrow.state === 0 ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' :
                                escrow.state === 1 ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' :
                                escrow.state === 2 ? 'text-blue-400 bg-blue-500/20 border-blue-500/30' :
                                'text-red-400 bg-red-500/20 border-red-500/30'
                              }`}>
                                {stateLabels[escrow.state as EscrowState] || 'Unknown'}
                              </span>
                              <span className="text-gray-500 text-sm flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                ESC-{escrow.id.toString()}
                              </span>
                            </div>
                        
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 mb-1 flex items-center gap-1">
                                  <User className="w-3 h-3" /> Merchant
                                </p>
                                <p className="text-white font-mono">{escrow.merchant.slice(0, 8)}...{escrow.merchant.slice(-6)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1 flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" /> Amount
                                </p>
                                <p className="text-white font-semibold">{formatAmount(escrow.amount)} VFIDE</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Created
                                </p>
                                <p className="text-white">{new Date(Number(escrow.createdAt) * 1000).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1 flex items-center gap-1">
                                  <Timer className="w-3 h-3" /> Release
                                </p>
                                <p className={`font-medium ${
                                  Number(escrow.releaseTime) * 1000 <= Date.now() + 24 * 60 * 60 * 1000 
                                    ? 'text-amber-400' 
                                    : 'text-white'
                                }`}>
                                  {formatTimeRemaining(escrow.releaseTime)}
                                </p>
                              </div>
                            </div>
                          </div>
                      
                          {/* Right: Actions */}
                          {escrow.state === 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:flex lg:flex-col lg:items-stretch">
                              {isBuyer && (
                                <>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleRelease(Number(escrow.id))}
                                    disabled={escrowLoading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
                                  >
                                    {escrowLoading ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    Release Funds
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleDispute(Number(escrow.id))}
                                    disabled={escrowLoading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-red-400 rounded-xl font-medium border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50"
                                  >
                                    {escrowLoading ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <AlertTriangle className="w-4 h-4" />
                                    )}
                                    Raise Dispute
                                  </motion.button>
                                </>
                              )}
                              {isMerchant && (
                                <>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleRefund(Number(escrow.id))}
                                    disabled={escrowLoading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-blue-300 rounded-xl font-medium border border-blue-500/30 hover:bg-blue-500/10 transition-all disabled:opacity-50"
                                  >
                                    {escrowLoading ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <FileCheck className="w-4 h-4" />
                                    )}
                                    Refund Buyer
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleClaimTimeout(Number(escrow.id))}
                                    disabled={escrowLoading || !isTimeoutReady}
                                    title={isTimeoutReady ? 'Claim funds after the timeout period' : `Available in ${formatTimeRemaining(escrow.releaseTime)}`}
                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all disabled:opacity-50"
                                  >
                                    {escrowLoading ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Timer className="w-4 h-4" />
                                    )}
                                    Claim Timeout
                                  </motion.button>
                                </>
                              )}
                              {!isBuyer && !isMerchant && (
                                <div className="text-xs text-gray-400">
                                  Connect with the buyer or merchant wallet to manage this escrow.
                                </div>
                              )}
                            </div>
                          )}
                      
                          {escrow.state === 3 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                              <Scale className="w-5 h-5 text-red-400" />
                              <span className="text-red-300 text-sm">Awaiting Arbiter Decision</span>
                            </div>
                          )}
                      
                          {(escrow.state === 1 || escrow.state === 2) && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                              <FileCheck className="w-5 h-5 text-emerald-400" />
                              <span className="text-emerald-300 text-sm">
                                {escrow.state === 1 ? 'Funds Released' : 'Funds Refunded'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container mx-auto px-3 sm:px-4">
            <h2 className="text-2xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">How Escrow Works</h2>
          
            <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Create Escrow',
                description: 'Buyer deposits funds into the smart contract escrow',
                icon: <Plus className="w-6 h-6" />,
                gradient: 'from-cyan-500/20 to-teal-500/10',
                border: 'border-cyan-500/20',
                text: 'text-cyan-400'
              },
              {
                step: '2',
                title: 'Merchant Delivers',
                description: 'Merchant ships the product or provides the service',
                icon: <Package className="w-6 h-6" />,
                gradient: 'from-blue-500/20 to-indigo-500/10',
                border: 'border-blue-500/20',
                text: 'text-blue-400'
              },
              {
                step: '3',
                title: 'Buyer Confirms',
                description: 'Buyer confirms receipt and releases funds to merchant',
                icon: <CheckCircle2 className="w-6 h-6" />,
                gradient: 'from-emerald-500/20 to-green-500/10',
                border: 'border-emerald-500/20',
                text: 'text-emerald-400'
              },
              {
                step: '4',
                title: 'Or Dispute',
                description: 'If issues arise, DAO arbiter resolves the dispute fairly',
                icon: <Scale className="w-6 h-6" />,
                gradient: 'from-amber-500/20 to-orange-500/10',
                border: 'border-amber-500/20',
                text: 'text-amber-400'
              }
            ].map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -4 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className={`text-center bg-gradient-to-br ${step.gradient} backdrop-blur-xl border ${step.border} rounded-2xl p-6`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.gradient} border ${step.border} flex items-center justify-center mx-auto mb-4`}>
                  <div className={step.text}>{step.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
          
          {/* Trust-based release times */}
          <div className="mt-16 max-w-3xl mx-auto">
            <motion.div 
              whileHover={{ scale: 1.01, y: -2 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Dynamic Release Times</h3>
                  <p className="text-gray-400 mb-4">
                    Lock periods are based on the merchant&apos;s ProofScore:
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <p className="text-emerald-400 font-semibold">High Trust (80%+)</p>
                      <p className="text-white">3 days</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <p className="text-amber-400 font-semibold">Medium Trust (60%+)</p>
                      <p className="text-white">7 days</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-gray-400 font-semibold">Default</p>
                      <p className="text-white">14 days</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border border-white/10 p-6 max-w-lg w-full"
            >
              <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">Create Escrow</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Merchant Address</label>
                  <input
                    type="text"
                    value={createForm.merchant}
                    onChange={e => setCreateForm(f => ({ ...f, merchant: e.target.value }))}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Amount (VFIDE)</label>
                  <input
                    type="number"
                    value={createForm.amount}
                    onChange={e => setCreateForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="1000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Order ID</label>
                  <input
                    type="text"
                    value={createForm.orderId}
                    onChange={e => setCreateForm(f => ({ ...f, orderId: e.target.value }))}
                    placeholder="ORD-2024-XXX"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 text-gray-300 rounded-xl font-medium border border-white/10 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateEscrow}
                  disabled={escrowLoading || !createForm.merchant || !createForm.amount || !createForm.orderId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
                >
                  {escrowLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Create Escrow
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.main>
      <Footer />
    </>
  )
}
