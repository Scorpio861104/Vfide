'use client'

import { useState, useEffect as _useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { safeBigIntToNumber as _safeBigIntToNumber } from '@/lib/validation'
import { toast } from '@/lib/toast'
import { 
  Banknote, 
  Play, 
  Pause, 
  Plus,
  ArrowRight,
  Wallet,
  RefreshCw,
  TrendingUp,
  DollarSign,
  User,
  Building,
  CheckCircle2,
  Timer,
  Zap,
  ArrowDownToLine
} from 'lucide-react'
import { useAccount, useWriteContract as _useWriteContract, useWaitForTransactionReceipt as _useWaitForTransactionReceipt, useReadContract as _useReadContract } from 'wagmi'
import { parseUnits as _parseUnits, isAddress } from 'viem'
import { Footer } from '@/components/layout/Footer'
import { usePayroll } from '@/hooks/usePayroll'
import { Loader2 } from 'lucide-react'

// PayrollManager ABI
const _PAYROLL_MANAGER_ABI = [
  { name: 'createStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'payee', type: 'address' }, { name: 'token', type: 'address' }, { name: 'rate', type: 'uint256' }, { name: 'initialDeposit', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'topUp', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'pauseStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [] },
  { name: 'resumeStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [] },
  { name: 'cancelStream', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [] },
  { name: 'claimable', type: 'function', stateMutability: 'view', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'getStream', type: 'function', stateMutability: 'view', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [{ name: 'stream', type: 'tuple', components: [{ name: 'payer', type: 'address' }, { name: 'payee', type: 'address' }, { name: 'token', type: 'address' }, { name: 'ratePerSecond', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'lastWithdrawTime', type: 'uint256' }, { name: 'depositBalance', type: 'uint256' }, { name: 'active', type: 'bool' }, { name: 'paused', type: 'bool' }, { name: 'pausedAt', type: 'uint256' }, { name: 'pausedAccrued', type: 'uint256' }] }] },
  { name: 'getPayerStreams', type: 'function', stateMutability: 'view', inputs: [{ name: 'payer', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'getPayeeStreams', type: 'function', stateMutability: 'view', inputs: [{ name: 'payee', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'getStreamStatus', type: 'function', stateMutability: 'view', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [{ name: 'claimableAmount', type: 'uint256' }, { name: 'totalStreamed', type: 'uint256' }, { name: 'remainingDeposit', type: 'uint256' }, { name: 'isActive', type: 'bool' }, { name: 'isPaused', type: 'bool' }] },
  { name: 'estimateEndTime', type: 'function', stateMutability: 'view', inputs: [{ name: 'streamId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
] as const;

// PayrollManager not deployed on Base Sepolia testnet yet
// Contract addresses will be populated after mainnet deployment
const PAYROLL_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const _VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0xf57992ab9F8887650C2a220A34fe86ebD00c02f5') as `0x${string}`;

// Check if PayrollManager is deployed
const _IS_PAYROLL_DEPLOYED = PAYROLL_MANAGER_ADDRESS !== '0x0000000000000000000000000000000000000000';

// Stream data type (from contract)
interface _StreamData {
  id: number
  payer: string
  payee: string
  token: string
  ratePerSecond: bigint
  startTime: number
  lastWithdrawTime: number
  depositBalance: bigint
  active: boolean
  paused: boolean
  pausedAt: number
  pausedAccrued: bigint
}

type TabId = 'receiving' | 'sending' | 'all'
type RoleType = 'employee' | 'employer'

export default function PayrollPage() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<TabId>('receiving')
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    payee: '',
    rate: '',
    deposit: ''
  })

  // Use the payroll hook for all stream operations
  const {
    streams,
    receivingStreams,
    sendingStreams,
    loading: payrollLoading,
    error: payrollError,
    isDeployed,
    currentTime,
    totalReceiving: _totalReceiving,
    totalSending,
    totalClaimable,
    createStream,
    withdraw,
    pauseStream: pauseStreamAction,
    resumeStream: resumeStreamAction,
    topUp,
    refresh,
    formatAmount,
    formatMonthlyRate,
    formatTimeRemaining,
    calculateClaimable,
  } = usePayroll()

  // Action handlers using the hook
  const handleCreateStream = async () => {
    if (!isAddress(createForm.payee)) return;
    try {
      await createStream(createForm.payee, createForm.rate, createForm.deposit);
      setShowCreateModal(false);
      setCreateForm({ payee: '', rate: '', deposit: '' });
      toast.success('Stream created successfully');
    } catch (err) {
      console.error('Failed to create stream:', err);
      toast.error('Failed to create stream. Please try again.');
    }
  };

  const handleWithdraw = async (streamId: number) => {
    try {
      await withdraw(BigInt(streamId));
      toast.success('Withdrawal successful');
    } catch (err) {
      console.error('Failed to withdraw:', err);
      toast.error('Failed to withdraw. Please try again.');
    }
  };

  const handlePauseStream = async (streamId: number) => {
    try {
      await pauseStreamAction(BigInt(streamId));
      toast.success('Stream paused');
    } catch (err) {
      console.error('Failed to pause stream:', err);
      toast.error('Failed to pause stream. Please try again.');
    }
  };

  const handleResumeStream = async (streamId: number) => {
    try {
      await resumeStreamAction(BigInt(streamId));
      toast.success('Stream resumed');
    } catch (err) {
      console.error('Failed to resume stream:', err);
      toast.error('Failed to resume stream. Please try again.');
    }
  };

  const handleTopUp = async (streamId: number, amount: string) => {
    try {
      await topUp(BigInt(streamId), amount);
      toast.success('Top up successful');
    } catch (err) {
      console.error('Failed to top up:', err);
      toast.error('Failed to top up. Please try again.');
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'receiving', label: 'Receiving', icon: <ArrowDownToLine className="w-4 h-4" /> },
    { id: 'sending', label: 'Sending', icon: <ArrowRight className="w-4 h-4" /> },
    { id: 'all', label: 'All Streams', icon: <Zap className="w-4 h-4" /> }
  ]

  // Determine role based on address comparison
  const getRole = (stream: { payer: string; payee: string }): RoleType => {
    if (stream.payee === address) return 'employee'
    if (stream.payer === address) return 'employer'
    return 'employee' // Default
  }

  // Filter streams based on tab - using hook's pre-filtered arrays
  const filteredStreams = activeTab === 'receiving' 
    ? receivingStreams 
    : activeTab === 'sending' 
      ? sendingStreams 
      : streams.filter(s => s.active)

  // Calculate runway using hook helper
  const calculateRunway = (stream: { depositBalance: bigint; ratePerSecond: bigint }): string => {
    return formatTimeRemaining(stream.depositBalance, stream.ratePerSecond)
  }

  // Stats using hook values
  const activeStreamCount = filteredStreams.filter(s => !s.paused).length
  const pausedStreamCount = filteredStreams.filter(s => s.paused).length

  // Suppress unused variable warnings
  void payrollError
  void isDeployed
  void currentTime

  return (
    <>
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-[#0f0f18] to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.08),transparent_50%)]" />
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-full mb-6"
              >
                <Banknote className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Salary Streaming</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-4">
                <span className="text-white">Get Paid </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
                  Every Second
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Stream salaries continuously to your team. Employees can withdraw earned wages 
                instantly - no more waiting for payday. Zero custody, full transparency.
              </p>
            </motion.div>
          
            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto"
            >
              {[
                { 
                  label: activeTab === 'receiving' ? 'Available to Claim' : 'Total Streaming', 
                  value: `${formatAmount(activeTab === 'receiving' ? totalClaimable : totalSending)} VFIDE`, 
                  icon: <DollarSign className="w-5 h-5" />, 
                  gradient: 'from-purple-500/20 to-indigo-500/10',
                  border: 'border-purple-500/20',
                  text: 'text-purple-400',
                  pulse: activeTab === 'receiving'
                },
                { label: 'Active Streams', value: activeStreamCount.toString(), icon: <Zap className="w-5 h-5" />, gradient: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
                { label: 'Paused Streams', value: pausedStreamCount.toString(), icon: <Pause className="w-5 h-5" />, gradient: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
                { label: 'Total Streams', value: streams.filter(s => s.active).length.toString(), icon: <Timer className="w-5 h-5" />, gradient: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' }
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
                  <p className={`text-2xl font-bold text-white ${stat.pulse ? 'animate-pulse' : ''}`}>{stat.value}</p>
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
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-white/5 text-gray-400 hover:bg-purple-500/10 hover:text-purple-400'
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
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Stream
              </motion.button>
            </motion.div>

            {/* Stream List */}
            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.div 
                  key="connect"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 inline-block mb-4">
                    <Wallet className="w-12 h-12 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-400">Connect your wallet to view and manage your salary streams</p>
                </motion.div>
              ) : payrollLoading && streams.length === 0 ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
                  <p className="text-gray-400">Loading your streams...</p>
                </motion.div>
              ) : filteredStreams.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 inline-block mb-4">
                    <Banknote className="w-12 h-12 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Streams Found</h3>
                  <p className="text-gray-400">
                    {activeTab === 'receiving' 
                      ? "You're not receiving any salary streams yet" 
                      : "You haven't created any salary streams yet"}
                  </p>
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
                  key="streams"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {filteredStreams.map((stream, idx) => {
                    const role = getRole(stream)
                    const claimable = calculateClaimable(stream)
                    const runway = calculateRunway(stream)
                    const isLowRunway = runway.includes('Less') || (parseInt(runway) < 7 && runway.includes('d'))
                  
                    return (
                      <motion.div
                        key={stream.id.toString()}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.005, y: -2 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/8 to-white/2 backdrop-blur-xl border transition-colors ${
                          stream.paused 
                            ? 'border-amber-500/30' 
                            : isLowRunway && role === 'employer'
                            ? 'border-red-500/30'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Left: Stream Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                {stream.paused ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1 border border-amber-500/30">
                                    <Pause className="w-3 h-3" /> Paused
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                                    <Play className="w-3 h-3" /> Active
                                  </span>
                                )}
                                <span className="text-gray-500 text-sm">
                                  Stream #{stream.id}
                                </span>
                                {role === 'employee' && (
                                  <span className="px-2 py-0.5 rounded-lg text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                    Receiving
                                  </span>
                                )}
                                {role === 'employer' && (
                                  <span className="px-2 py-0.5 rounded-lg text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    Paying
                                  </span>
                                )}
                              </div>
                            
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 mb-1 flex items-center gap-1">
                                    {role === 'employee' ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                    {role === 'employee' ? 'From' : 'To'}
                                  </p>
                                  <p className="text-white font-mono">
                                    {role === 'employee' 
                                      ? `${stream.payer.slice(0, 6)}...${stream.payer.slice(-4)}` 
                                      : `${stream.payee.slice(0, 6)}...${stream.payee.slice(-4)}`
                                    }
                                  </p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Monthly Rate
                              </p>
                              <p className="text-white font-semibold">{formatMonthlyRate(stream.ratePerSecond)} VFIDE</p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> 
                                {role === 'employee' ? 'Claimable' : 'Balance'}
                              </p>
                              <p className={`font-semibold ${
                                role === 'employee' && !stream.paused 
                                  ? 'text-emerald-400 animate-pulse' 
                                  : 'text-white'
                              }`}>
                                {role === 'employee' 
                                  ? formatAmount(claimable) 
                                  : formatAmount(stream.depositBalance)
                                } VFIDE
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1 flex items-center gap-1">
                                <Timer className="w-3 h-3" /> Runway
                              </p>
                              <p className={`font-medium ${
                                isLowRunway ? 'text-red-400' : 'text-white'
                              }`}>
                                {runway}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: Actions */}
                        <div className="flex gap-3 lg:flex-col">
                          {role === 'employee' && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleWithdraw(Number(stream.id))}
                              disabled={payrollLoading || claimable === BigInt(0)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
                            >
                              {payrollLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <ArrowDownToLine className="w-4 h-4" />
                              )}
                              Withdraw
                            </motion.button>
                          )}
                          
                          {role === 'employer' && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleTopUp(Number(stream.id), '5000')}
                              disabled={payrollLoading}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
                            >
                              {payrollLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              Top Up
                            </motion.button>
                          )}
                          
                          {stream.paused ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleResumeStream(Number(stream.id))}
                              disabled={payrollLoading}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-emerald-400 rounded-xl font-medium border border-emerald-500/30 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                            >
                              {payrollLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              Resume
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handlePauseStream(Number(stream.id))}
                              disabled={payrollLoading}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-amber-400 rounded-xl font-medium border border-amber-500/30 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                            >
                              {payrollLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Pause className="w-4 h-4" />
                              )}
                              Pause
                            </motion.button>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress bar for runway */}
                      {role === 'employer' && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex justify-between text-xs text-gray-400 mb-2">
                            <span>Runway Progress</span>
                            <span>{runway} remaining</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${
                                isLowRunway ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(5, Math.min(100, (parseInt(runway) || 0) / 90 * 100))}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )}
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
          <h2 className="text-2xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">How Streaming Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: 'Employer Creates Stream',
                description: 'Set the rate and deposit tokens. Stream starts immediately.',
                icon: <Plus className="w-6 h-6" />,
                gradient: 'from-purple-500/20 to-indigo-500/10',
                border: 'border-purple-500/20',
                text: 'text-purple-400'
              },
              {
                title: 'Tokens Stream Per Second',
                description: 'Funds accrue to the employee continuously, every second.',
                icon: <Zap className="w-6 h-6" />,
                gradient: 'from-cyan-500/20 to-blue-500/10',
                border: 'border-cyan-500/20',
                text: 'text-cyan-400'
              },
              {
                title: 'Employee Withdraws Anytime',
                description: 'Claim earned wages instantly - no waiting for payday.',
                icon: <ArrowDownToLine className="w-6 h-6" />,
                gradient: 'from-emerald-500/20 to-green-500/10',
                border: 'border-emerald-500/20',
                text: 'text-emerald-400'
              }
            ].map((step, idx) => (
              <motion.div
                key={step.title}
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
          
          {/* Benefits */}
          <div className="mt-16 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <motion.div 
              whileHover={{ scale: 1.01, y: -2 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-xl border border-cyan-500/20 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                For Employees
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Access earned wages instantly, no more waiting for payday
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Eliminate payday lending fees and high-interest advances
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Full transparency - see exactly what you&apos;ve earned
                </li>
              </ul>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.01, y: -2 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 backdrop-blur-xl border border-purple-500/20 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-400" />
                For Employers
              </h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Attract top talent with instant wage access benefit
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Pause streams for disputes without losing funds
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Flexible rate adjustments and top-ups anytime
                </li>
              </ul>
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
              <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">Create Salary Stream</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Employee Address</label>
                  <input
                    type="text"
                    value={createForm.payee}
                    onChange={e => setCreateForm(f => ({ ...f, payee: e.target.value }))}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Monthly Rate (VFIDE)</label>
                  <input
                    type="number"
                    value={createForm.rate}
                    onChange={e => setCreateForm(f => ({ ...f, rate: e.target.value }))}
                    placeholder="5000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will be converted to per-second rate for streaming
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Initial Deposit (VFIDE)</label>
                  <input
                    type="number"
                    value={createForm.deposit}
                    onChange={e => setCreateForm(f => ({ ...f, deposit: e.target.value }))}
                    placeholder="15000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  {createForm.rate && createForm.deposit && (
                    <p className="text-xs text-gray-400 mt-1">
                      Runway: ~{Math.floor(Number(createForm.deposit) / Number(createForm.rate))} months
                    </p>
                  )}
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
                  onClick={handleCreateStream}
                  disabled={payrollLoading || !createForm.payee || !createForm.rate || !createForm.deposit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50"
                >
                  {payrollLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Start Streaming
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
