'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, TrendingUp, Users, Activity, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const ETHEREUM_ADDRESS_LENGTH = 42

export default function ExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  // Mock data for recent activity
  const recentActivity = [
    {
      id: '1',
      type: 'payment',
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
      amount: '50.00',
      timestamp: '2 minutes ago',
      status: 'completed'
    },
    {
      id: '2',
      type: 'endorsement',
      from: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      amount: '+5',
      timestamp: '5 minutes ago',
      status: 'completed'
    },
    {
      id: '3',
      type: 'payment',
      from: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      to: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      amount: '125.50',
      timestamp: '15 minutes ago',
      status: 'completed'
    }
  ]

  const topAddresses = [
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      proofScore: 850,
      transactions: 1234
    },
    {
      address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
      proofScore: 720,
      transactions: 892
    },
    {
      address: '0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678',
      proofScore: 680,
      transactions: 756
    }
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.startsWith('0x') && searchQuery.length === ETHEREUM_ADDRESS_LENGTH) {
      router.push(`/explorer/${searchQuery}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            VFIDE Explorer
          </h1>
          <p className="text-gray-400 text-lg">
            Explore transactions, addresses, and activity on the VFIDE network
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSearch}
          className="max-w-3xl mx-auto mb-12"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by address (0x...)"
              className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            />
          </div>
        </motion.form>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Total Transactions</h3>
            </div>
            <p className="text-3xl font-bold text-white">12,453</p>
            <p className="text-sm text-cyan-400 mt-2">+15% this week</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Active Addresses</h3>
            </div>
            <p className="text-3xl font-bold text-white">3,847</p>
            <p className="text-sm text-purple-400 mt-2">+8% this week</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Total Volume</h3>
            </div>
            <p className="text-3xl font-bold text-white">$1.2M</p>
            <p className="text-sm text-green-400 mt-2">+22% this week</p>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 mb-8"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      activity.type === 'payment' 
                        ? 'bg-cyan-500/20 text-cyan-400' 
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {activity.type}
                    </span>
                    <span className="text-xs text-gray-500">{activity.timestamp}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
                    <Link
                      href={`/explorer/${activity.from}`}
                      className="text-gray-400 hover:text-cyan-400 truncate max-w-[200px]"
                    >
                      {activity.from}
                    </Link>
                    <ArrowRight className="w-4 h-4 text-gray-600 hidden md:block" />
                    <Link
                      href={`/explorer/${activity.to}`}
                      className="text-gray-400 hover:text-cyan-400 truncate max-w-[200px]"
                    >
                      {activity.to}
                    </Link>
                  </div>
                </div>
                <div className="mt-2 md:mt-0 text-right">
                  <p className="text-lg font-bold text-white">
                    {activity.type === 'payment' ? '$' : ''}{activity.amount}
                    {activity.type === 'endorsement' ? ' ProofScore' : ''}
                  </p>
                  <p className="text-xs text-green-400 capitalize">{activity.status}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Top Addresses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            Top Addresses
          </h2>
          <div className="space-y-4">
            {topAddresses.map((addr, index) => (
              <motion.div
                key={addr.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-500">#{index + 1}</div>
                  <Link
                    href={`/explorer/${addr.address}`}
                    className="text-cyan-400 hover:text-cyan-300 truncate max-w-[300px]"
                  >
                    {addr.address}
                  </Link>
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-gray-500">ProofScore</p>
                    <p className="font-bold text-white">{addr.proofScore}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Transactions</p>
                    <p className="font-bold text-white">{addr.transactions}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
