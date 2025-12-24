'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  ArrowDownToLine,
  Loader2
} from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { formatUnits, parseUnits, isAddress } from 'viem'
import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'

// PayrollManager ABI
const PAYROLL_MANAGER_ABI = [
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

// PayrollManager not deployed on zkSync Sepolia testnet yet
// Contract addresses will be populated after mainnet deployment
const PAYROLL_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0x3249215721a21BC9635C01Ea05AdE032dd90961f') as `0x${string}`;

// Check if PayrollManager is deployed
const IS_PAYROLL_DEPLOYED = PAYROLL_MANAGER_ADDRESS !== '0x0000000000000000000000000000000000000000';

// Stream data type (from contract)
interface StreamData {
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

// Mock streams data
const mockStreams: StreamData[] = [
  {
    id: 1,
    payer: '0xCompany...1234',
    payee: '0x1234...5678',
    token: 'VFIDE',
    ratePerSecond: BigInt(Math.floor((5000 * 1e18) / (30 * 24 * 60 * 60))), // 5000/month
    startTime: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
    lastWithdrawTime: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    depositBalance: BigInt(10000 * 1e18),
    active: true,
    paused: false,
    pausedAt: 0,
    pausedAccrued: BigInt(0)
  },
  {
    id: 2,
    payer: '0xStartup...5678',
    payee: '0x1234...5678',
    token: 'VFIDE',
    ratePerSecond: BigInt(Math.floor((3000 * 1e18) / (30 * 24 * 60 * 60))), // 3000/month
    startTime: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastWithdrawTime: Date.now() - 5 * 24 * 60 * 60 * 1000,
    depositBalance: BigInt(2000 * 1e18),
    active: true,
    paused: true,
    pausedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    pausedAccrued: BigInt(500 * 1e18)
  },
  {
    id: 3,
    payer: '0x1234...5678',
    payee: '0xFreelancer...ABCD',
    token: 'VFIDE',
    ratePerSecond: BigInt(Math.floor((8000 * 1e18) / (30 * 24 * 60 * 60))), // 8000/month
    startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastWithdrawTime: Date.now() - 1 * 24 * 60 * 60 * 1000,
    depositBalance: BigInt(24000 * 1e18),
    active: true,
    paused: false,
    pausedAt: 0,
    pausedAccrued: BigInt(0)
  }
]

type TabId = 'receiving' | 'sending' | 'all'
type RoleType = 'employee' | 'employer'

export default function PayrollPage() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<TabId>('receiving')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    payee: '',
    rate: '',
    deposit: ''
  })

  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read payer streams
  const { data: payerStreamIds } = useReadContract({
    address: PAYROLL_MANAGER_ADDRESS,
    abi: PAYROLL_MANAGER_ABI,
    functionName: 'getPayerStreams',
    args: address ? [address] : undefined,
  });

  // Read payee streams
  const { data: payeeStreamIds } = useReadContract({
    address: PAYROLL_MANAGER_ADDRESS,
    abi: PAYROLL_MANAGER_ABI,
    functionName: 'getPayeeStreams',
    args: address ? [address] : undefined,
  });

  // Contract action handlers
  const handleCreateStream = () => {
    if (!isAddress(createForm.payee)) return;
    const rate = parseUnits(createForm.rate, 18);
    const deposit = parseUnits(createForm.deposit, 18);
    
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'createStream',
      args: [createForm.payee as `0x${string}`, VFIDE_TOKEN_ADDRESS, rate, deposit],
    });
  };

  const handleWithdraw = (streamId: number) => {
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'withdraw',
      args: [BigInt(streamId)],
    });
  };

  const handlePauseStream = (streamId: number) => {
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'pauseStream',
      args: [BigInt(streamId)],
    });
  };

  const handleResumeStream = (streamId: number) => {
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'resumeStream',
      args: [BigInt(streamId)],
    });
  };

  const handleCancelStream = (streamId: number) => {
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'cancelStream',
      args: [BigInt(streamId)],
    });
  };

  const handleTopUp = (streamId: number, amount: string) => {
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'topUp',
      args: [BigInt(streamId), parseUnits(amount, 18)],
    });
  };

  // Update time every second for real-time claimable display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'receiving', label: 'Receiving', icon: <ArrowDownToLine className="w-4 h-4" /> },
    { id: 'sending', label: 'Sending', icon: <ArrowRight className="w-4 h-4" /> },
    { id: 'all', label: 'All Streams', icon: <Zap className="w-4 h-4" /> }
  ]

  // Mock: Determine role based on tab (in production, compare with connected address)
  const getRole = (stream: StreamData): RoleType => {
    // For demo, streams 1 & 2 are receiving, stream 3 is sending
    return stream.id <= 2 ? 'employee' : 'employer'
  }

  // Filter streams based on tab
  const filteredStreams = mockStreams.filter(s => {
    if (!s.active) return false
    const role = getRole(s)
    switch (activeTab) {
      case 'receiving':
        return role === 'employee'
      case 'sending':
        return role === 'employer'
      default:
        return true
    }
  })

  // Calculate claimable in real-time
  const calculateClaimable = (stream: StreamData): bigint => {
    if (!stream.active) return BigInt(0)
    if (stream.paused) return stream.pausedAccrued
    
    const timeDelta = Math.floor((currentTime - stream.lastWithdrawTime) / 1000)
    let due = BigInt(timeDelta) * stream.ratePerSecond
    due += stream.pausedAccrued
    
    if (due > stream.depositBalance) {
      return stream.depositBalance
    }
    return due
  }

  // Calculate runway
  const calculateRunway = (stream: StreamData): number => {
    if (stream.ratePerSecond === BigInt(0)) return Infinity
    return Number(stream.depositBalance / stream.ratePerSecond)
  }

  // Stats
  const totalClaimable = filteredStreams
    .filter(s => getRole(s) === 'employee')
    .reduce((sum, s) => sum + calculateClaimable(s), BigInt(0))
  
  const totalStreaming = filteredStreams
    .filter(s => getRole(s) === 'employer')
    .reduce((sum, s) => sum + s.depositBalance, BigInt(0))
  
  const activeStreamCount = filteredStreams.filter(s => !s.paused).length
  const pausedStreamCount = filteredStreams.filter(s => s.paused).length

  const formatAmount = (amount: bigint): string => {
    return (Number(amount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  const formatRate = (ratePerSecond: bigint): string => {
    // Convert to monthly rate for readability
    const monthlyRate = Number(ratePerSecond) * 30 * 24 * 60 * 60 / 1e18
    return monthlyRate.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const formatRunway = (seconds: number): string => {
    if (seconds === Infinity) return '-'
    const days = Math.floor(seconds / (24 * 60 * 60))
    if (days > 30) {
      const months = Math.floor(days / 30)
      return `${months} month${months > 1 ? 's' : ''}`
    }
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  // Contract handlers are defined above (handleCreateStream, handleWithdraw, handlePauseStream, handleResumeStream, handleCancelStream, handleTopUp)

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.08),transparent_60%)]" />
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
              <Banknote className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Salary Streaming</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Get Paid <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Every Second</span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Stream salaries continuously to your team. Employees can withdraw earned wages 
              instantly - no more waiting for payday. Zero custody, full transparency.
            </p>
          </motion.div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
            {[
              { 
                label: activeTab === 'receiving' ? 'Available to Claim' : 'Total Streaming', 
                value: `${formatAmount(activeTab === 'receiving' ? totalClaimable : totalStreaming)} VFIDE`, 
                icon: <DollarSign className="w-5 h-5" />, 
                color: 'from-purple-500 to-purple-600',
                pulse: activeTab === 'receiving'
              },
              { label: 'Active Streams', value: activeStreamCount.toString(), icon: <Zap className="w-5 h-5" />, color: 'from-emerald-500 to-emerald-600' },
              { label: 'Paused Streams', value: pausedStreamCount.toString(), icon: <Pause className="w-5 h-5" />, color: 'from-amber-500 to-amber-600' },
              { label: 'Total Streams', value: mockStreams.filter(s => s.active).length.toString(), icon: <Timer className="w-5 h-5" />, color: 'from-blue-500 to-blue-600' }
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                  {stat.icon}
                </div>
                <p className={`text-2xl font-bold text-white ${stat.pulse ? 'animate-pulse' : ''}`}>{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          {/* Tabs & Create Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Stream
            </button>
          </div>

          {/* Stream List */}
          {!isConnected ? (
            <div className="text-center py-16">
              <Wallet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
              <p className="text-slate-400">Connect your wallet to view and manage your salary streams</p>
            </div>
          ) : filteredStreams.length === 0 ? (
            <div className="text-center py-16">
              <Banknote className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Streams Found</h3>
              <p className="text-slate-400">
                {activeTab === 'receiving' 
                  ? "You're not receiving any salary streams yet" 
                  : "You haven't created any salary streams yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStreams.map((stream, idx) => {
                const role = getRole(stream)
                const claimable = calculateClaimable(stream)
                const runway = calculateRunway(stream)
                const isLowRunway = runway < 7 * 24 * 60 * 60 // Less than 7 days
                
                return (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-slate-800/50 border rounded-xl overflow-hidden transition-colors ${
                      stream.paused 
                        ? 'border-amber-500/30' 
                        : isLowRunway && role === 'employer'
                        ? 'border-red-500/30'
                        : 'border-slate-700/50 hover:border-slate-600/50'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Stream Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {stream.paused ? (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                <Pause className="w-3 h-3" /> Paused
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <Play className="w-3 h-3" /> Active
                              </span>
                            )}
                            <span className="text-slate-500 text-sm">
                              Stream #{stream.id}
                            </span>
                            {role === 'employee' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                                Receiving
                              </span>
                            )}
                            {role === 'employer' && (
                              <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                                Paying
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500 mb-1 flex items-center gap-1">
                                {role === 'employee' ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                {role === 'employee' ? 'From' : 'To'}
                              </p>
                              <p className="text-white font-mono">
                                {role === 'employee' ? stream.payer : stream.payee}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Monthly Rate
                              </p>
                              <p className="text-white font-semibold">{formatRate(stream.ratePerSecond)} {stream.token}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1 flex items-center gap-1">
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
                                } {stream.token}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1 flex items-center gap-1">
                                <Timer className="w-3 h-3" /> Runway
                              </p>
                              <p className={`font-medium ${
                                isLowRunway ? 'text-red-400' : 'text-white'
                              }`}>
                                {formatRunway(runway)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: Actions */}
                        <div className="flex gap-3 lg:flex-col">
                          {role === 'employee' && (
                            <button
                              onClick={() => handleWithdraw(stream.id)}
                              disabled={actionLoading === `withdraw-${stream.id}` || claimable === BigInt(0)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === `withdraw-${stream.id}` ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <ArrowDownToLine className="w-4 h-4" />
                              )}
                              Withdraw
                            </button>
                          )}
                          
                          {role === 'employer' && (
                            <button
                              onClick={() => handleTopUp(stream.id, '5000')}
                              disabled={actionLoading === `topup-${stream.id}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === `topup-${stream.id}` ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              Top Up
                            </button>
                          )}
                          
                          {stream.paused ? (
                            <button
                              onClick={() => handleResumeStream(stream.id)}
                              disabled={actionLoading === `resume-${stream.id}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === `resume-${stream.id}` ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                              Resume
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePauseStream(stream.id)}
                              disabled={actionLoading === `pause-${stream.id}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-amber-400 rounded-lg font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === `pause-${stream.id}` ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Pause className="w-4 h-4" />
                              )}
                              Pause
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress bar for runway */}
                      {role === 'employer' && (
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                          <div className="flex justify-between text-xs text-slate-400 mb-2">
                            <span>Runway Progress</span>
                            <span>{formatRunway(runway)} remaining</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${
                                isLowRunway ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(5, Math.min(100, (runway / (90 * 24 * 60 * 60)) * 100))}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-white text-center mb-12">How Streaming Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: 'Employer Creates Stream',
                description: 'Set the rate and deposit tokens. Stream starts immediately.',
                icon: <Plus className="w-6 h-6" />,
                color: 'from-purple-500 to-purple-600'
              },
              {
                title: 'Tokens Stream Per Second',
                description: 'Funds accrue to the employee continuously, every second.',
                icon: <Zap className="w-6 h-6" />,
                color: 'from-blue-500 to-blue-600'
              },
              {
                title: 'Employee Withdraws Anytime',
                description: 'Claim earned wages instantly - no waiting for payday.',
                icon: <ArrowDownToLine className="w-6 h-6" />,
                color: 'from-emerald-500 to-emerald-600'
              }
            ].map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="text-center"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-4`}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
          
          {/* Benefits */}
          <div className="mt-16 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                For Employees
              </h3>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Access earned wages instantly, no more waiting for payday
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Eliminate payday lending fees and high-interest advances
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Full transparency - see exactly what you&apos;ve earned
                </li>
              </ul>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-400" />
                For Employers
              </h3>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Attract top talent with instant wage access benefit
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Pause streams for disputes without losing funds
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  Flexible rate adjustments and top-ups anytime
                </li>
              </ul>
            </div>
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
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Create Salary Stream</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Employee Address</label>
                  <input
                    type="text"
                    value={createForm.payee}
                    onChange={e => setCreateForm(f => ({ ...f, payee: e.target.value }))}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Monthly Rate (VFIDE)</label>
                  <input
                    type="number"
                    value={createForm.rate}
                    onChange={e => setCreateForm(f => ({ ...f, rate: e.target.value }))}
                    placeholder="5000"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Will be converted to per-second rate for streaming
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Initial Deposit (VFIDE)</label>
                  <input
                    type="number"
                    value={createForm.deposit}
                    onChange={e => setCreateForm(f => ({ ...f, deposit: e.target.value }))}
                    placeholder="15000"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  {createForm.rate && createForm.deposit && (
                    <p className="text-xs text-slate-400 mt-1">
                      Runway: ~{Math.floor(Number(createForm.deposit) / Number(createForm.rate))} months
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStream}
                  disabled={actionLoading === 'create' || !createForm.payee || !createForm.rate || !createForm.deposit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'create' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Start Streaming
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
