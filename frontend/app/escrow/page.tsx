'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  DollarSign,
  User,
  Calendar,
  Hash,
  Eye,
  Lock,
  Loader2
} from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'
import { useToast } from '@/components/ui/toast'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import { SurfaceCard, AccentBadge, SectionHeading } from '@/components/ui/primitives'

// EscrowManager ABI
const ESCROW_MANAGER_ABI = [
  { name: 'createEscrow', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'seller', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'timeout', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'release', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'refund', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'claimTimeout', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'raiseDispute', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'uint256' }], outputs: [] },
  { name: 'checkTimeout', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'isNearTimeout', type: 'bool' }, { name: 'timeRemaining', type: 'uint256' }] },
  { name: 'escrows', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: 'buyer', type: 'address' }, { name: 'seller', type: 'address' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'state', type: 'uint8' }] },
  { name: 'nextId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

import { ZERO_ADDRESS } from '@/lib/constants';

// Contract addresses from centralized config
const ESCROW_MANAGER_ADDRESS = CONTRACT_ADDRESSES.VFIDECommerce;
const VFIDE_TOKEN_ADDRESS = CONTRACT_ADDRESSES.VFIDEToken;

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

const stateColors: Record<EscrowState, string> = {
  [EscrowState.CREATED]: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  [EscrowState.RELEASED]: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
  [EscrowState.REFUNDED]: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  [EscrowState.DISPUTED]: 'text-red-400 bg-red-500/20 border-red-500/30'
}

// Escrow data interface
interface EscrowData {
  id: number
  buyer: string
  merchant: string
  token: string
  amount: bigint
  createdAt: number
  releaseTime: number
  state: EscrowState
  orderId: string
}

// Demo mode flag: when contract not deployed, disable actions and show empty state
const DEMO_MODE = !CONTRACT_ADDRESSES.VFIDECommerce || CONTRACT_ADDRESSES.VFIDECommerce === ZERO_ADDRESS

// No demo escrows; we show an empty state when contract is missing
const demoEscrows: EscrowData[] = []

type TabId = 'active' | 'completed' | 'disputed'

export default function EscrowPage() {
  const { isConnected } = useAccount()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string>('')
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    merchant: '',
    amount: '',
    orderId: '',
    timeout: '7' // days
  })

  // Contract write hooks
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && lastAction) {
      const actionMessages: Record<string, { title: string; description: string }> = {
        'create': { title: 'Escrow Created', description: 'Your escrow has been created successfully.' },
        'release': { title: 'Funds Released', description: 'Funds have been released to the seller.' },
        'refund': { title: 'Refund Processed', description: 'Funds have been refunded to the buyer.' },
        'dispute': { title: 'Dispute Raised', description: 'Your dispute has been submitted for review.' },
        'timeout': { title: 'Timeout Claimed', description: 'Funds have been returned due to timeout.' },
      }
      const message = actionMessages[lastAction] || { title: 'Transaction Successful', description: 'Your transaction has been confirmed.' }
      toast({
        title: message.title,
        description: message.description,
        variant: "default",
      });
      setActionLoading(null);
      setLastAction('');
    }
  }, [isSuccess, toast, lastAction]);

  // Read next escrow ID
  const { data: nextId } = useReadContract({
    address: ESCROW_MANAGER_ADDRESS,
    abi: ESCROW_MANAGER_ABI,
    functionName: 'nextId',
    query: {
      enabled: !DEMO_MODE,
    }
  });

  // Contract action handlers
  const handleCreateEscrow = () => {
    if (DEMO_MODE) {
      toast({ title: 'Demo Mode', description: 'Escrow contract not deployed yet.', variant: 'destructive' });
      return;
    }
    if (!isAddress(createForm.merchant)) return;
    setActionLoading('create');
    setLastAction('create');
    const amount = parseUnits(createForm.amount, 18);
    const timeout = BigInt(parseInt(createForm.timeout) * 24 * 60 * 60);
    
    writeContract({
      address: ESCROW_MANAGER_ADDRESS,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'createEscrow',
      args: [createForm.merchant as `0x${string}`, VFIDE_TOKEN_ADDRESS, amount, timeout],
    });
  };

  const handleRelease = (id: number) => {
    if (DEMO_MODE) {
      toast({ title: 'Demo Mode', description: 'Escrow contract not deployed yet.', variant: 'destructive' });
      return;
    }
    setActionLoading(`release-${id}`);
    setLastAction('release');
    writeContract({
      address: ESCROW_MANAGER_ADDRESS,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'release',
      args: [BigInt(id)],
    });
  };

  const handleRefund = (id: number) => {
    if (DEMO_MODE) {
      toast({ title: 'Demo Mode', description: 'Escrow contract not deployed yet.', variant: 'destructive' });
      return;
    }
    setActionLoading(`refund-${id}`);
    setLastAction('refund');
    writeContract({
      address: ESCROW_MANAGER_ADDRESS,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'refund',
      args: [BigInt(id)],
    });
  };

  const handleDispute = (id: number) => {
    if (DEMO_MODE) {
      toast({ title: 'Demo Mode', description: 'Escrow contract not deployed yet.', variant: 'destructive' });
      return;
    }
    setActionLoading(`dispute-${id}`);
    setLastAction('dispute');
    writeContract({
      address: ESCROW_MANAGER_ADDRESS,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'raiseDispute',
      args: [BigInt(id)],
    });
  };

  const handleClaimTimeout = (id: number) => {
    if (DEMO_MODE) {
      toast({ title: 'Demo Mode', description: 'Escrow contract not deployed yet.', variant: 'destructive' });
      return;
    }
    setActionLoading(`timeout-${id}`);
    setLastAction('timeout');
    writeContract({
      address: ESCROW_MANAGER_ADDRESS,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'claimTimeout',
      args: [BigInt(id)],
    });
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'active', label: 'Active', icon: <Clock className="w-4 h-4" /> },
    { id: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'disputed', label: 'Disputed', icon: <AlertTriangle className="w-4 h-4" /> }
  ]

  // Filter escrows based on tab
  const filteredEscrows = demoEscrows.filter(e => {
    switch (activeTab) {
      case 'active':
        return e.state === EscrowState.CREATED
      case 'completed':
        return e.state === EscrowState.RELEASED || e.state === EscrowState.REFUNDED
      case 'disputed':
        return e.state === EscrowState.DISPUTED
      default:
        return true
    }
  })

  // Stats - use demoEscrows (defined above with demo data)
  const totalInEscrow = demoEscrows
    .filter(e => e.state === EscrowState.CREATED)
    .reduce((sum, e) => sum + e.amount, BigInt(0))
  const activeCount = demoEscrows.filter(e => e.state === EscrowState.CREATED).length
  const completedCount = demoEscrows.filter(e => e.state === EscrowState.RELEASED || e.state === EscrowState.REFUNDED).length
  const disputedCount = demoEscrows.filter(e => e.state === EscrowState.DISPUTED).length

  const formatAmount = (amount: bigint): string => {
    return parseFloat(formatUnits(amount, 18)).toLocaleString()
  }

  const formatTimeRemaining = (releaseTime: number): string => {
    const now = Date.now()
    const diff = releaseTime - now
    if (diff <= 0) return 'Ready to claim'
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    
    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }

  // Old mock handlers removed - contract handlers are defined above

  return (
    <>
      <GlobalNav />
      
      {/* Premium background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,197,94,0.08),transparent_50%)]" />
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
            <SectionHeading
              badge="Safe Buy Protection"
              badgeIcon={<Shield className="w-4 h-4" />}
              title={<>Buyer Protection <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400">Escrow</span></>}
              subtitle="Secure your transactions with smart contract escrow. Funds are held safely until delivery is confirmed, with dispute resolution backed by the DAO."
            />
            {DEMO_MODE && (
              <p className="mt-3 text-amber-300 text-sm font-semibold text-center">
                Escrow contract is not deployed in this environment. Actions are disabled until deployment.
              </p>
            )}
          
            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-12 max-w-5xl mx-auto"
            >
              {[
                { label: 'Total Escrows', value: nextId ? nextId.toString() : '0', icon: <Hash className="w-5 h-5" />, color: 'purple' as const },
                { label: 'Total Value', value: `${formatAmount(totalInEscrow)} VFIDE`, icon: <DollarSign className="w-5 h-5" />, color: 'cyan' as const },
                { label: 'Active', value: activeCount.toString(), icon: <Clock className="w-5 h-5" />, color: 'amber' as const },
                { label: 'Completed', value: completedCount.toString(), icon: <CheckCircle2 className="w-5 h-5" />, color: 'emerald' as const },
                { label: 'Disputed', value: disputedCount.toString(), icon: <Scale className="w-5 h-5" />, color: 'red' as const },
              ].map((stat, idx) => (
              <SurfaceCard
                key={stat.label}
                interactive
                className="p-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-3">
                    <AccentBadge color={stat.color} className="w-5 h-5">{stat.icon}</AccentBadge>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </motion.div>
              </SurfaceCard>
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
                </motion.div>
              ) : (
                <motion.div 
                  key="escrows"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {filteredEscrows.map((escrow, idx) => (
                    <SurfaceCard
                      key={escrow.id}
                      interactive
                      className="p-6"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Left: Order Info */}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <AccentBadge 
                                  color={escrow.state === EscrowState.CREATED ? 'amber' : escrow.state === EscrowState.RELEASED ? 'emerald' : escrow.state === EscrowState.REFUNDED ? 'cyan' : 'red'}
                                >
                                  {stateLabels[escrow.state]}
                                </AccentBadge>
                                <span className="text-gray-500 text-sm flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {escrow.orderId}
                                </span>
                              </div>
                              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors group" title="View Details">
                                <Eye className="w-4 h-4 text-gray-400 group-hover:text-white" />
                              </button>
                            </div>
                        
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 mb-1 flex items-center gap-1">
                                  <User className="w-3 h-3" /> Merchant
                                </p>
                                <p className="text-white font-mono">{escrow.merchant}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1 flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" /> Amount
                                </p>
                                <p className="text-white font-semibold">{formatAmount(escrow.amount)} {escrow.token}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Created
                                </p>
                                <p className="text-white">{new Date(escrow.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1 flex items-center gap-1">
                                  <Timer className="w-3 h-3" /> Release
                                </p>
                                <p className={`font-medium ${
                                  escrow.releaseTime <= Date.now() + 24 * 60 * 60 * 1000 
                                    ? 'text-amber-400' 
                                    : 'text-white'
                                }`}>
                                  {formatTimeRemaining(escrow.releaseTime)}
                                </p>
                              </div>
                            </div>
                          </div>
                      
                          {/* Right: Actions */}
                          {escrow.state === EscrowState.CREATED && (
                            <div className="flex gap-3 lg:flex-col">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleRelease(escrow.id)}
                                disabled={!!actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50"
                              >
                                {actionLoading === `release-${escrow.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                                Release
                              </motion.button>
                              
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleRefund(escrow.id)}
                                disabled={!!actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-blue-400 rounded-xl font-medium border border-blue-500/30 hover:bg-blue-500/10 transition-all disabled:opacity-50"
                              >
                                {actionLoading === `refund-${escrow.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                                Refund
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleDispute(escrow.id)}
                                disabled={!!actionLoading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-red-400 rounded-xl font-medium border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50"
                              >
                                {actionLoading === `dispute-${escrow.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4" />
                                )}
                                Dispute
                              </motion.button>

                              {escrow.releaseTime <= Date.now() && (
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleClaimTimeout(escrow.id)}
                                  disabled={!!actionLoading}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-amber-400 rounded-xl font-medium border border-amber-500/30 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                                >
                                  {actionLoading === `timeout-${escrow.id}` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Clock className="w-4 h-4" />
                                  )}
                                  Timeout
                                </motion.button>
                              )}
                            </div>
                          )}
                      
                          {escrow.state === EscrowState.DISPUTED && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                              <Scale className="w-5 h-5 text-red-400" />
                              <span className="text-red-300 text-sm">Awaiting Arbiter Decision</span>
                            </div>
                          )}
                      
                          {(escrow.state === EscrowState.RELEASED || escrow.state === EscrowState.REFUNDED) && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                              <FileCheck className="w-5 h-5 text-emerald-400" />
                              <span className="text-emerald-300 text-sm">
                                {escrow.state === EscrowState.RELEASED ? 'Funds Released' : 'Funds Refunded'}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </SurfaceCard>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container mx-auto px-4">
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
              <SurfaceCard
                key={step.step}
                interactive
                className="text-center p-6"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.15 }}
                >
                  <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <div className={step.text}>{step.icon}</div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </motion.div>
              </SurfaceCard>
            ))}
          </div>
          
          {/* Trust-based release times */}
          <div className="mt-16 max-w-3xl mx-auto">
            <SurfaceCard interactive className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-cyan-400" />
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
            </SurfaceCard>
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
            <SurfaceCard className="max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
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
                  disabled={actionLoading === 'create' || !createForm.merchant || !createForm.amount || !createForm.orderId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'create' ? (
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
            </SurfaceCard>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.main>
      <Footer />
    </>
  )
}
