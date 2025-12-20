'use client'

import { useState } from 'react'
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
  Info,
  DollarSign,
  User,
  Calendar,
  Hash,
  Eye,
  Lock,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { GlobalNav } from '@/components/layout/GlobalNav'
import { Footer } from '@/components/layout/Footer'

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

// TODO: Replace with actual deployed address
const ESCROW_MANAGER_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const VFIDE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

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
  [EscrowState.CREATED]: 'text-amber-400 bg-amber-500/20',
  [EscrowState.RELEASED]: 'text-emerald-400 bg-emerald-500/20',
  [EscrowState.REFUNDED]: 'text-blue-400 bg-blue-500/20',
  [EscrowState.DISPUTED]: 'text-red-400 bg-red-500/20'
}

// Mock escrow data
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

const mockEscrows: EscrowData[] = [
  {
    id: 1,
    buyer: '0x1234...5678',
    merchant: '0x8765...4321',
    token: 'VFIDE',
    amount: BigInt(5000 * 1e18),
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    releaseTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
    state: EscrowState.CREATED,
    orderId: 'ORD-2024-001'
  },
  {
    id: 2,
    buyer: '0x1234...5678',
    merchant: '0xABCD...EFGH',
    token: 'VFIDE',
    amount: BigInt(1500 * 1e18),
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    releaseTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
    state: EscrowState.RELEASED,
    orderId: 'ORD-2024-002'
  },
  {
    id: 3,
    buyer: '0x1234...5678',
    merchant: '0x9999...1111',
    token: 'VFIDE',
    amount: BigInt(12000 * 1e18),
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    releaseTime: Date.now() + 13 * 24 * 60 * 60 * 1000,
    state: EscrowState.DISPUTED,
    orderId: 'ORD-2024-003'
  }
]

type TabId = 'active' | 'completed' | 'disputed'

export default function EscrowPage() {
  const { address, isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Create form state
  const [createForm, setCreateForm] = useState({
    merchant: '',
    amount: '',
    orderId: '',
    timeout: '7' // days
  })

  // Contract write hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read next escrow ID
  const { data: nextId } = useReadContract({
    address: ESCROW_MANAGER_ADDRESS,
    abi: ESCROW_MANAGER_ABI,
    functionName: 'nextId',
  });

  // Contract action handlers
  const handleCreateEscrow = () => {
    if (!isAddress(createForm.merchant)) return;
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
    writeContract({
      address: ESCROW_MANAGER_ADDRESS,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'release',
      args: [BigInt(id)],
    });
  };

  const handleRefund = (id: number) => {
    writeContract({
      address: ESCROW_MANAGER_ADDRESS,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'refund',
      args: [BigInt(id)],
    });
  };

  const handleDispute = (id: number) => {
    writeContract({
      address: ESCROW_MANAGER_ADDRESS,
      abi: ESCROW_MANAGER_ABI,
      functionName: 'raiseDispute',
      args: [BigInt(id)],
    });
  };

  const handleClaimTimeout = (id: number) => {
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
  const filteredEscrows = mockEscrows.filter(e => {
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

  // Stats
  const totalInEscrow = mockEscrows
    .filter(e => e.state === EscrowState.CREATED)
    .reduce((sum, e) => sum + e.amount, BigInt(0))
  const activeCount = mockEscrows.filter(e => e.state === EscrowState.CREATED).length
  const completedCount = mockEscrows.filter(e => e.state === EscrowState.RELEASED || e.state === EscrowState.REFUNDED).length
  const disputedCount = mockEscrows.filter(e => e.state === EscrowState.DISPUTED).length

  const formatAmount = (amount: bigint): string => {
    return (Number(amount) / 1e18).toLocaleString()
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
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,136,0.08),transparent_60%)]" />
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-300">Safe Buy Protection</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Buyer Protection <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Escrow</span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Secure your transactions with smart contract escrow. Funds are held safely 
              until delivery is confirmed, with dispute resolution backed by the DAO.
            </p>
          </motion.div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
            {[
              { label: 'Total in Escrow', value: `${formatAmount(totalInEscrow)} VFIDE`, icon: <DollarSign className="w-5 h-5" />, color: 'from-cyan-500 to-cyan-600' },
              { label: 'Active Escrows', value: activeCount.toString(), icon: <Clock className="w-5 h-5" />, color: 'from-amber-500 to-amber-600' },
              { label: 'Completed', value: completedCount.toString(), icon: <CheckCircle2 className="w-5 h-5" />, color: 'from-emerald-500 to-emerald-600' },
              { label: 'In Dispute', value: disputedCount.toString(), icon: <Scale className="w-5 h-5" />, color: 'from-red-500 to-red-600' }
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
                <p className="text-2xl font-bold text-white">{stat.value}</p>
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
                      ? 'bg-emerald-500 text-white'
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
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Escrow
            </button>
          </div>

          {/* Escrow List */}
          {!isConnected ? (
            <div className="text-center py-16">
              <Wallet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
              <p className="text-slate-400">Connect your wallet to view and manage your escrows</p>
            </div>
          ) : filteredEscrows.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Escrows Found</h3>
              <p className="text-slate-400">You don&apos;t have any {activeTab} escrows yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEscrows.map((escrow, idx) => (
                <motion.div
                  key={escrow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Order Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${stateColors[escrow.state]}`}>
                            {stateLabels[escrow.state]}
                          </span>
                          <span className="text-slate-500 text-sm flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {escrow.orderId}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 mb-1 flex items-center gap-1">
                              <User className="w-3 h-3" /> Merchant
                            </p>
                            <p className="text-white font-mono">{escrow.merchant}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-1 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> Amount
                            </p>
                            <p className="text-white font-semibold">{formatAmount(escrow.amount)} {escrow.token}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Created
                            </p>
                            <p className="text-white">{new Date(escrow.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-1 flex items-center gap-1">
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
                          <button
                            onClick={() => handleRelease(escrow.id)}
                            disabled={actionLoading === `release-${escrow.id}`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `release-${escrow.id}` ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Release Funds
                          </button>
                          <button
                            onClick={() => handleDispute(escrow.id)}
                            disabled={actionLoading === `dispute-${escrow.id}`}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `dispute-${escrow.id}` ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            Raise Dispute
                          </button>
                        </div>
                      )}
                      
                      {escrow.state === EscrowState.DISPUTED && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <Scale className="w-5 h-5 text-red-400" />
                          <span className="text-red-300 text-sm">Awaiting Arbiter Decision</span>
                        </div>
                      )}
                      
                      {(escrow.state === EscrowState.RELEASED || escrow.state === EscrowState.REFUNDED) && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <FileCheck className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-300 text-sm">
                            {escrow.state === EscrowState.RELEASED ? 'Funds Released' : 'Funds Refunded'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-white text-center mb-12">How Escrow Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Create Escrow',
                description: 'Buyer deposits funds into the smart contract escrow',
                icon: <Plus className="w-6 h-6" />,
                color: 'from-cyan-500 to-cyan-600'
              },
              {
                step: '2',
                title: 'Merchant Delivers',
                description: 'Merchant ships the product or provides the service',
                icon: <Package className="w-6 h-6" />,
                color: 'from-blue-500 to-blue-600'
              },
              {
                step: '3',
                title: 'Buyer Confirms',
                description: 'Buyer confirms receipt and releases funds to merchant',
                icon: <CheckCircle2 className="w-6 h-6" />,
                color: 'from-emerald-500 to-emerald-600'
              },
              {
                step: '4',
                title: 'Or Dispute',
                description: 'If issues arise, DAO arbiter resolves the dispute fairly',
                icon: <Scale className="w-6 h-6" />,
                color: 'from-amber-500 to-amber-600'
              }
            ].map((step, idx) => (
              <motion.div
                key={step.step}
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
          
          {/* Trust-based release times */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Dynamic Release Times</h3>
                  <p className="text-slate-400 mb-4">
                    Lock periods are based on the merchant&apos;s ProofScore:
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-emerald-400 font-semibold">High Trust (80%+)</p>
                      <p className="text-white">3 days</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-amber-400 font-semibold">Medium Trust (60%+)</p>
                      <p className="text-white">7 days</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-slate-400 font-semibold">Default</p>
                      <p className="text-white">14 days</p>
                    </div>
                  </div>
                </div>
              </div>
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
              <h2 className="text-2xl font-bold text-white mb-6">Create Escrow</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Merchant Address</label>
                  <input
                    type="text"
                    value={createForm.merchant}
                    onChange={e => setCreateForm(f => ({ ...f, merchant: e.target.value }))}
                    placeholder="0x..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Amount (VFIDE)</label>
                  <input
                    type="number"
                    value={createForm.amount}
                    onChange={e => setCreateForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="1000"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Order ID</label>
                  <input
                    type="text"
                    value={createForm.orderId}
                    onChange={e => setCreateForm(f => ({ ...f, orderId: e.target.value }))}
                    placeholder="ORD-2024-XXX"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
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
                  onClick={handleCreateEscrow}
                  disabled={actionLoading === 'create' || !createForm.merchant || !createForm.amount || !createForm.orderId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'create' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Create Escrow
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
