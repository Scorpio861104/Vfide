'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Loader2,
  X
} from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from 'wagmi'
import { formatUnits, parseUnits, isAddress } from 'viem'
import { ZERO_ADDRESS } from '@/lib/constants'
import { SectionHeading, SurfaceCard, AccentBadge } from '@/components/ui/primitives'
import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { useToast } from "@/components/ui/toast"

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

// PayrollManager not deployed on Base Sepolia testnet yet
// Contract addresses will be populated after mainnet deployment
const PAYROLL_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS || ZERO_ADDRESS) as `0x${string}`;
const VFIDE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS || '0xf57992ab9F8887650C2a220A34fe86ebD00c02f5') as `0x${string}`;

const ERC20_METADATA_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

// Check if PayrollManager is deployed
const IS_PAYROLL_DEPLOYED = PAYROLL_MANAGER_ADDRESS !== ZERO_ADDRESS;

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
  claimableAmount?: bigint
  remainingDeposit?: bigint
  totalStreamed?: bigint
}

// Derived stream data from PayrollManager
const emptyStreams: StreamData[] = []

type TabId = 'receiving' | 'sending' | 'all'
type RoleType = 'employee' | 'employer'

interface StreamEvent {
  id: string
  streamId: number
  type: 'created' | 'withdrawn' | 'paused' | 'resumed' | 'cancelled' | 'topped-up'
  amount?: bigint
  timestamp: number
  txHash?: string
}

export default function PayrollPage() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('receiving')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [streamHistory, setStreamHistory] = useState<StreamEvent[]>([])
  const [showHistory, setShowHistory] = useState(false)
  
  // Create form state
  const [createForm, setCreateForm] = useState<{
    payee: string;
    rate: string;
    deposit: string;
    token: string;
  }>({
    payee: '',
    rate: '',
    deposit: '',
    token: VFIDE_TOKEN_ADDRESS,
  })

  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast({
        title: "Transaction Successful",
        description: "Your transaction has been confirmed.",
        variant: "default",
      });
                      <motion.div
                        key={stream.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.005, y: -2 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <SurfaceCard
                          variant="muted"
                          className={`relative border transition-colors ${
                            stream.paused 
                              ? 'border-amber-500/30' 
                              : isLowRunway && role === 'employer'
                              ? 'border-red-500/30'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Left: Stream Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                {stream.paused ? (
                                  <AccentBadge label="Paused" color="amber" className="px-3 py-1 text-xs" />
                                ) : (
                                  <AccentBadge label="Active" color="emerald" className="px-3 py-1 text-xs" />
                                )}
                                <span className="text-gray-500 text-sm">
                                  Stream #{stream.id}
                                </span>
                                {role === 'employee' && (
                                  <AccentBadge label="Receiving" color="cyan" className="px-2 py-0.5 text-[11px]" />
                                )}
                                {role === 'employer' && (
                                  <AccentBadge label="Paying" color="purple" className="px-2 py-0.5 text-[11px]" />
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 mb-1 flex items-center gap-1">
                                    {role === 'employee' ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                    {role === 'employee' ? 'From' : 'To'}
                                  </p>
                                  <p className="text-white font-mono">
                                    {role === 'employee' ? stream.payer : stream.payee}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> Monthly Rate
                                  </p>
                                  <p className="text-white font-semibold">{formatRate(stream.ratePerSecond, stream.token)} {getTokenMeta(stream.token).symbol}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1 flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> 
                                    {role === 'employee' ? 'Claimable' : 'Balance'}
                                  </p>
                                  <p className={`font-semibold ${
                                    role === 'employee' && !stream.paused 
                                      ? 'text-emerald-400' 
                                      : 'text-white'
                                  }`}>
                                    {formatAmount(role === 'employee' ? claimable : stream.remainingDeposit ?? stream.depositBalance, stream.token)} {getTokenMeta(stream.token).symbol}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" /> Runway
                                  </p>
                                  <p className={`font-semibold ${isLowRunway && role === 'employer' ? 'text-red-400' : 'text-white'}`}>{formatRunway(runway)}</p>
                                </div>
                              </div>
    return {
      symbol: token.toLowerCase() === VFIDE_TOKEN_ADDRESS.toLowerCase() ? 'VFIDE' : 'TOKEN',
      decimals: 18,
    }
  }

  const streams: StreamData[] = useMemo(() => {
    if (!streamIds.length || !streamDetails) return emptyStreams

    return streamIds
      .map((id, idx) => {
        const raw = streamDetails[idx]?.result as Record<string, unknown> | undefined
        const stream = raw?.stream ?? raw
        if (!stream) return null

        const status = statusDetails?.[idx]?.result as Record<string, unknown> | undefined
        const claimableAmount = BigInt(status?.claimableAmount ?? status?.[0] ?? 0)
        const totalStreamed = BigInt(status?.totalStreamed ?? status?.[1] ?? 0)
        const remainingDeposit = BigInt(status?.remainingDeposit ?? status?.[2] ?? stream.depositBalance ?? 0)

        return {
          id: Number(id),
          payer: stream.payer as string,
          payee: stream.payee as string,
          token: stream.token as string,
          ratePerSecond: BigInt(stream.ratePerSecond ?? 0),
          startTime: Number(stream.startTime ?? 0),
          lastWithdrawTime: Number(stream.lastWithdrawTime ?? stream.startTime ?? 0),
          depositBalance: BigInt(stream.depositBalance ?? 0),
          claimableAmount,
          totalStreamed,
          remainingDeposit,
          active: Boolean(status?.isActive ?? status?.[3] ?? stream.active),
          paused: Boolean(status?.isPaused ?? status?.[4] ?? stream.paused),
          pausedAt: Number(stream.pausedAt ?? 0),
          pausedAccrued: BigInt(stream.pausedAccrued ?? 0),
        }
      })
      .filter(Boolean) as StreamData[]
  }, [streamDetails, statusDetails, streamIds])

  const tokenAddresses = useMemo<`0x${string}`[]>(() => {
    const set = new Set<string>()
    streams.forEach((s) => set.add(s.token.toLowerCase()))
    if (set.size === 0 && VFIDE_TOKEN_ADDRESS) set.add(VFIDE_TOKEN_ADDRESS.toLowerCase())
    return Array.from(set).map((a) => a as `0x${string}`)
  }, [streams])

  const { data: tokenMetaResults } = useReadContracts({
    contracts: tokenAddresses.flatMap((token) => ([
      {
        address: token,
        abi: ERC20_METADATA_ABI,
        functionName: 'symbol',
      },
      {
        address: token,
        abi: ERC20_METADATA_ABI,
        functionName: 'decimals',
      },
    ])),
    query: { enabled: tokenAddresses.length },
  })

  const tokenMetaMap = useMemo(() => {
    const map = new Map<string, { symbol: string; decimals: number }>()
    tokenAddresses.forEach((token, idx) => {
      const symbol = tokenMetaResults?.[idx * 2]?.result as string | undefined
      const decimals = tokenMetaResults?.[idx * 2 + 1]?.result as number | bigint | undefined
      const fallbackSymbol = token.toLowerCase() === VFIDE_TOKEN_ADDRESS.toLowerCase() ? 'VFIDE' : 'TOKEN'
      map.set(token.toLowerCase(), {
        symbol: symbol || fallbackSymbol,
        decimals: decimals !== undefined ? Number(decimals) : 18,
      })
    })
    return map
  }, [tokenAddresses, tokenMetaResults])

  // Contract action handlers
  const handleCreateStream = () => {
    if (!isAddress(createForm.payee) || !isAddress(createForm.token)) return;
    const { decimals } = getTokenMeta(createForm.token)
    const rate = parseUnits(createForm.rate, decimals);
    const deposit = parseUnits(createForm.deposit, decimals);
    
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'createStream',
      args: [createForm.payee as `0x${string}`, createForm.token as `0x${string}`, rate, deposit],
    });
  };

  const handleWithdraw = (streamId: number) => {
    setActionLoading(`withdraw-${streamId}`)
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'withdraw',
      args: [BigInt(streamId)],
    });
  };

  const handlePauseStream = (streamId: number) => {
    setActionLoading(`pause-${streamId}`)
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'pauseStream',
      args: [BigInt(streamId)],
    });
  };

  const handleResumeStream = (streamId: number) => {
    setActionLoading(`resume-${streamId}`)
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'resumeStream',
      args: [BigInt(streamId)],
    });
  };

  const handleCancelStream = (streamId: number) => {
    setActionLoading(`cancel-${streamId}`)
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'cancelStream',
      args: [BigInt(streamId)],
    });
  };

  const handleTopUp = (streamId: number, amount: string) => {
    setActionLoading(`topup-${streamId}`)
    const target = streams.find((s) => s.id === streamId)
    const decimals = target ? getTokenMeta(target.token).decimals : 18
    writeContract({
      address: PAYROLL_MANAGER_ADDRESS,
      abi: PAYROLL_MANAGER_ABI,
      functionName: 'topUp',
      args: [BigInt(streamId), parseUnits(amount, decimals)],
    });
  };

  // Update time every second for real-time claimable display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const getRole = useCallback((stream: StreamData): RoleType => {
    if (!address) return 'employee'
    if (stream.payee.toLowerCase() === address.toLowerCase()) return 'employee'
    if (stream.payer.toLowerCase() === address.toLowerCase()) return 'employer'
    return 'employee'
  }, [address])

  // Check for low runway and notify
  useEffect(() => {
    if (!address || streams.length === 0) return
    
    const lowRunwayStreams = streams.filter(s => {
      const role = getRole(s)
      if (role !== 'employer' || !s.active || s.paused) return false
      const runway = calculateRunway(s)
      return runway < 7 * 24 * 60 * 60 // Less than 7 days
    })
    
    if (lowRunwayStreams.length) {
      lowRunwayStreams.forEach(s => {
        const runway = calculateRunway(s)
        const days = Math.floor(runway / (24 * 60 * 60))
        toast({
          title: `⚠️ Low Runway Alert`,
          description: `Stream #${s.id} has only ${days} day${days !== 1 ? 's' : ''} remaining`,
          variant: 'destructive',
        })
      })
    }
  }, [streams, address, getRole, toast]) // Only run when streams change

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'receiving', label: 'Receiving', icon: <ArrowDownToLine className="w-4 h-4" /> },
    { id: 'sending', label: 'Sending', icon: <ArrowRight className="w-4 h-4" /> },
    { id: 'all', label: 'All Streams', icon: <Zap className="w-4 h-4" /> }
  ]

  // Filter streams based on tab
  const filteredStreams = useMemo(() => {
    return streams.filter((s) => {
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
  }, [streams, activeTab, getRole])

  // Calculate claimable in real-time
  const calculateClaimable = (stream: StreamData): bigint => {
    if (stream.claimableAmount !== undefined) return stream.claimableAmount
    if (!stream.active) return BigInt(0)
    if (stream.paused) return stream.pausedAccrued
    
    const timeDelta = Math.floor((currentTime - stream.lastWithdrawTime) / 1000)
    let due = BigInt(timeDelta) * stream.ratePerSecond
    due += stream.pausedAccrued
    
    const remaining = stream.remainingDeposit ?? stream.depositBalance
    if (due > remaining) {
      return remaining
    }
    return due
  }

  // Calculate runway
  const calculateRunway = (stream: StreamData): number => {
    if (stream.ratePerSecond === BigInt(0)) return Infinity
    const remaining = stream.remainingDeposit ?? stream.depositBalance
    return Number(remaining / stream.ratePerSecond)
  }

  // Stats
  const totalClaimable = filteredStreams
    .filter(s => getRole(s) === 'employee')
    .reduce((sum, s) => sum + calculateClaimable(s), BigInt(0))
  
  const totalStreaming = filteredStreams
    .filter(s => getRole(s) === 'employer')
    .reduce((sum, s) => sum + (s.remainingDeposit ?? s.depositBalance), BigInt(0))
  
  const activeStreamCount = filteredStreams.filter(s => !s.paused).length
  const pausedStreamCount = filteredStreams.filter(s => s.paused).length

  // Debug: Log stream IDs
  useEffect(() => {
    // Stream IDs loaded successfully
  }, [payerStreamIds, payeeStreamIds])

  const formatAmount = (amount: bigint, token?: string): string => {
    const { decimals } = getTokenMeta(token ?? VFIDE_TOKEN_ADDRESS)
    return Number(formatUnits(amount, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  const formatRate = (ratePerSecond: bigint, token?: string): string => {
    const { decimals } = getTokenMeta(token ?? VFIDE_TOKEN_ADDRESS)
    const monthlyRate = Number(ratePerSecond) * 30 * 24 * 60 * 60 / 10 ** decimals
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

  const selectedTokenMeta = getTokenMeta(createForm.token || VFIDE_TOKEN_ADDRESS)
  const primarySymbol = getTokenMeta(VFIDE_TOKEN_ADDRESS).symbol

  // Contract handlers are defined above (handleCreateStream, handleWithdraw, handlePauseStream, handleResumeStream, handleCancelStream, handleTopUp)

  return (
    <>
      <GlobalNav />
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {(isPending || isConfirming) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-8 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#00F0FF] animate-spin" />
              <div className="text-xl font-bold text-white">
                {isPending ? 'Confirm in Wallet...' : 'Processing Transaction...'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!IS_PAYROLL_DEPLOYED ? (
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
            <div className="text-center p-8 bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl">
                <h2 className="text-2xl font-bold text-white mb-4">Payroll Manager Not Deployed</h2>
                <p className="text-gray-400">The Payroll Manager contract is not yet available on this network.</p>
            </div>
        </div>
      ) : (
        <>
          {/* Premium background */}
          <div className="fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.08),transparent_50%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
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
              <SectionHeading
                badge="Salary Streaming"
                title="Get Paid Every Second"
                subtitle="Stream salaries continuously to your team. Employees can withdraw earned wages instantly - no more waiting for payday. Zero custody, full transparency."
                badgeColor="purple"
              />
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <AccentBadge label="Non-custodial" color="emerald" />
                <AccentBadge label="On-chain transparency" color="cyan" />
                <AccentBadge label="Real-time payouts" color="purple" />
              </div>
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
                  value: `${formatAmount(activeTab === 'receiving' ? totalClaimable : totalStreaming, VFIDE_TOKEN_ADDRESS)} ${primarySymbol}`, 
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
                >
                  <SurfaceCard
                    variant="muted"
                    className={`p-4 bg-gradient-to-br ${stat.gradient} border ${stat.border}`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} border ${stat.border} flex items-center justify-center mb-3`}>
                      <div className={stat.text}>{stat.icon}</div>
                    </div>
                    <p className={`text-2xl font-bold text-white ${stat.pulse ? 'animate-pulse' : ''}`}>{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </SurfaceCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="pb-12">
          <div className="container mx-auto px-4">
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
            
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create Stream
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 text-gray-300 rounded-xl font-semibold border border-white/10 hover:bg-white/10 transition-all"
                >
                  <Timer className="w-4 h-4" />
                  {showHistory ? 'Hide' : 'Show'} History
                </motion.button>
              </div>
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
                  <SurfaceCard variant="muted" interactive={false} className="inline-block px-8 py-6">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 inline-block mb-4">
                      <Wallet className="w-12 h-12 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                    <p className="text-gray-400">Connect your wallet to view and manage your salary streams</p>
                  </SurfaceCard>
                </motion.div>
              ) : isLoadingData ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {[0,1,2].map((i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 animate-pulse space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-4 bg-white/10 rounded" />
                        <div className="w-14 h-4 bg-white/10 rounded" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[0,1,2,3].map((j) => (
                          <div key={j} className="space-y-2">
                            <div className="w-16 h-3 bg-white/10 rounded" />
                            <div className="w-24 h-4 bg-white/10 rounded" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <div className="h-9 bg-white/10 rounded-lg w-24" />
                        <div className="h-9 bg-white/10 rounded-lg w-24" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : filteredStreams.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <SurfaceCard variant="muted" interactive={false} className="inline-block px-8 py-6 text-center">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 inline-block mb-4">
                      <Banknote className="w-12 h-12 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Streams Found</h3>
                    <p className="text-gray-400">
                      {activeTab === 'receiving' 
                        ? "You're not receiving any salary streams yet" 
                        : "You haven't created any salary streams yet"}
                    </p>
                    <div className="mt-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Create a Stream
                      </motion.button>
                    </div>
                  </SurfaceCard>
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
                    const isLowRunway = runway < 7 * 24 * 60 * 60 // Less than 7 days
                  
                    return (
                      <motion.div
                        key={stream.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.005, y: -2 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border transition-colors ${
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
                                    {role === 'employee' ? stream.payer : stream.payee}
                                  </p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Monthly Rate
                              </p>
                              <p className="text-white font-semibold">{formatRate(stream.ratePerSecond, stream.token)} {getTokenMeta(stream.token).symbol}</p>
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
                                  ? formatAmount(claimable, stream.token) 
                                  : formatAmount(stream.remainingDeposit ?? stream.depositBalance, stream.token)
                                } {getTokenMeta(stream.token).symbol}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1 flex items-center gap-1">
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
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleWithdraw(stream.id)}
                              disabled={actionLoading === `withdraw-${stream.id}` || claimable === BigInt(0)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `withdraw-${stream.id}` ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <ArrowDownToLine className="w-4 h-4" />
                              )}
                              Withdraw
                            </motion.button>
                          )}
                          
                          {role === 'employer' && (
                            <>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleTopUp(stream.id, '5000')}
                              disabled={actionLoading === `topup-${stream.id}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `topup-${stream.id}` ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              Top Up
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleCancelStream(stream.id)}
                              disabled={actionLoading === `cancel-${stream.id}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-red-400 rounded-xl font-medium border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `cancel-${stream.id}` ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                              Cancel
                            </motion.button>
                            </>
                          )}
                          
                          {stream.paused ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleResumeStream(stream.id)}
                              disabled={actionLoading === `resume-${stream.id}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-emerald-400 rounded-xl font-medium border border-emerald-500/30 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `resume-${stream.id}` ? (
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
                              onClick={() => handlePauseStream(stream.id)}
                              disabled={actionLoading === `pause-${stream.id}`}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-amber-400 rounded-xl font-medium border border-amber-500/30 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                            >
                              {actionLoading === `pause-${stream.id}` ? (
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
                            <span>{formatRunway(runway)} remaining</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${
                                isLowRunway ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </section>

      {/* History Section */}
      <AnimatePresence>
        {showHistory && streamHistory.length && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pb-20"
          >
            <div className="container mx-auto px-4">
              <SurfaceCard variant="muted" interactive={false} className="max-w-4xl mx-auto p-6">
                <h2 className="text-2xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                  Recent Activity
                </h2>
                
                <div className="space-y-3">
                  {streamHistory.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        event.type === 'created' ? 'bg-purple-500/20 text-purple-400' :
                        event.type === 'withdrawn' ? 'bg-emerald-500/20 text-emerald-400' :
                        event.type === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                        event.type === 'resumed' ? 'bg-cyan-500/20 text-cyan-400' :
                        event.type === 'topped-up' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {event.type === 'created' && <Plus className="w-5 h-5" />}
                        {event.type === 'withdrawn' && <ArrowDownToLine className="w-5 h-5" />}
                        {event.type === 'paused' && <Pause className="w-5 h-5" />}
                        {event.type === 'resumed' && <Play className="w-5 h-5" />}
                        {event.type === 'topped-up' && <TrendingUp className="w-5 h-5" />}
                        {event.type === 'cancelled' && <X className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-white font-medium capitalize">
                          {event.type.replace('-', ' ')} Stream #{event.streamId}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      
                      {event.amount && (
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatAmount(event.amount, VFIDE_TOKEN_ADDRESS)} {primarySymbol}
                          </p>
                        </div>
                      )}
                      
                      {event.txHash && (
                        <a
                          href={`https://basescan.org/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-sm"
                        >
                          View →
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              </SurfaceCard>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-white text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">How Streaming Works</h2>
          
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
              >
                <SurfaceCard
                  variant="muted"
                  className={`text-center bg-gradient-to-br ${step.gradient} border ${step.border} p-6`}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.gradient} border ${step.border} flex items-center justify-center mx-auto mb-4`}>
                    <div className={step.text}>{step.icon}</div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </SurfaceCard>
              </motion.div>
            ))}
          </div>
          
          {/* Benefits */}
          <div className="mt-16 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <motion.div 
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <SurfaceCard variant="muted" className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  For Employees
                </h3>
                <ul className="space-y-3 text-gray-400 text-sm">
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
              </SurfaceCard>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.01, y: -2 }}
            >
              <SurfaceCard variant="muted" className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-purple-400" />
                  For Employers
                </h3>
                <ul className="space-y-3 text-gray-400 text-sm">
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
              </SurfaceCard>
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
            >
              <SurfaceCard variant="default" interactive={false} className="relative overflow-hidden max-w-lg w-full">
                <h2 className="text-2xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">Create Salary Stream</h2>
                
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
                    <label className="block text-sm text-gray-400 mb-2">Monthly Rate ({selectedTokenMeta.symbol})</label>
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
                    <label className="block text-sm text-gray-400 mb-2">Initial Deposit ({selectedTokenMeta.symbol})</label>
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

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Token Address</label>
                    <input
                      type="text"
                      value={createForm.token}
                      onChange={e => setCreateForm(f => ({ ...f, token: e.target.value }))}
                      placeholder={VFIDE_TOKEN_ADDRESS}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {isAddress(createForm.token)
                        ? `Detected: ${selectedTokenMeta.symbol} · ${selectedTokenMeta.decimals} decimals`
                        : 'Enter a valid ERC20 address'}
                    </p>
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
                    disabled={actionLoading === 'create' || !createForm.payee || !createForm.rate || !createForm.deposit || !isAddress(createForm.token)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'create' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Start Streaming
                      </>
                    )}
                  </motion.button>
                </div>
              </SurfaceCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.main>
      </>
      )}
      <Footer />
    </>
  )
}
