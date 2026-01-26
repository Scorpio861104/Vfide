'use client';

import { Footer } from "@/components/layout/Footer";
import { useVfidePrice } from "@/hooks/usePriceHooks";
import {
    ArrowUpDown,
    Building2,
    CreditCard,
    FileText,
    Globe,
    Shield,
    TrendingUp,
    Zap
} from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";

type TabType = 'overview' | 'gateway' | 'fiat' | 'finance';

export default function EnterprisePage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Building2 },
    { id: 'gateway' as const, label: 'Enterprise Gateway', icon: Globe },
    { id: 'fiat' as const, label: 'Fiat On/Off Ramp', icon: CreditCard },
    { id: 'finance' as const, label: 'Treasury Finance', icon: TrendingUp },
  ];

  return (
    <>
      <main className="min-h-screen bg-zinc-950 pt-24 pb-16">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-100 mb-4">
              Enterprise Solutions
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Enterprise-grade payment processing, fiat integration, and treasury management
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'gateway' && <GatewayTab isConnected={isConnected} />}
          {activeTab === 'fiat' && <FiatTab isConnected={isConnected} />}
          {activeTab === 'finance' && <FinanceTab />}
        </div>
      </main>
      <Footer />
    </>
  );
}

function OverviewTab() {
  const features = [
    {
      icon: Globe,
      title: 'Enterprise Gateway',
      description: 'High-volume payment processing with batch settlements and custom oracles',
      status: 'Coming Soon',
      colorClass: 'text-cyan-400'
    },
    {
      icon: CreditCard,
      title: 'Fiat On/Off Ramp',
      description: 'Seamless conversion between fiat and VFIDE through verified providers',
      status: 'Coming Soon',
      colorClass: 'text-teal-400'
    },
    {
      icon: TrendingUp,
      title: 'Treasury Finance',
      description: 'Protocol treasury management and multi-token balance tracking',
      status: 'Active',
      colorClass: 'text-amber-400'
    },
    {
      icon: Shield,
      title: 'Compliance Ready',
      description: 'KYC/AML integration, transaction limits, and audit trails',
      status: 'Active',
      colorClass: 'text-violet-400'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4 sm:p-6 md:p-8 text-center">
        <Building2 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-4">Enterprise-Grade Infrastructure</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          VFIDE provides institutional-quality payment infrastructure with zero protocol fees,
          instant settlements, and seamless fiat integration for businesses of all sizes.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <div key={feature.title} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <feature.icon size={32} className={feature.colorClass} />
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                feature.status === 'Active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {feature.status}
              </span>
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">{feature.title}</h3>
            <p className="text-zinc-400">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-cyan-400">0%</div>
          <div className="text-sm text-zinc-400">Protocol Fees</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-green-400">&lt;2s</div>
          <div className="text-sm text-zinc-400">Settlement Time</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-purple-400">99.9%</div>
          <div className="text-sm text-zinc-400">Uptime SLA</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-yellow-400">24/7</div>
          <div className="text-sm text-zinc-400">Operations</div>
        </div>
      </div>
    </div>
  );
}

function GatewayTab({ isConnected }: { isConnected: boolean }) {
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [metadata, setMetadata] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const recentOrders = [
    { id: 'ORD-001', amount: '5,000 VFIDE', status: 'settled', time: '2 hours ago' },
    { id: 'ORD-002', amount: '12,500 VFIDE', status: 'pending', time: '5 hours ago' },
    { id: 'ORD-003', amount: '3,200 VFIDE', status: 'settled', time: '1 day ago' },
  ];

  const handleCreateOrder = async () => {
    if (!orderId || !amount) return;
    setIsCreating(true);
    try {
      // Call enterprise gateway API
      const response = await fetch('/api/enterprise/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, metadata }),
      });
      if (response.ok) {
        setOrderId('');
        setAmount('');
        setMetadata('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Gateway Overview */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Globe className="w-12 h-12 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Enterprise Gateway</h2>
            <p className="text-zinc-400">High-volume payment processing with batch settlements</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-cyan-400">247</div>
            <div className="text-sm text-zinc-400">Orders Processed</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">1.2M</div>
            <div className="text-sm text-zinc-400">VFIDE Volume</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">98.5%</div>
            <div className="text-sm text-zinc-400">Settlement Rate</div>
          </div>
        </div>
      </div>

      {/* Create Order */}
      {isConnected ? (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-zinc-100 mb-6">Create Order</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter unique order ID"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Amount (VFIDE)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm text-zinc-400 mb-2 block">Metadata (optional)</label>
            <input
              type="text"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder="Order reference, customer ID, etc."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
          <button 
            onClick={handleCreateOrder}
            disabled={isCreating || !orderId || !amount}
            className="w-full bg-cyan-400 hover:bg-cyan-500 text-zinc-950 font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      ) : (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 sm:p-6 md:p-8 text-center">
          <p className="text-zinc-400">Connect wallet to create orders</p>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Recent Orders</h3>
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-4">
                <FileText className="text-zinc-400" size={20} />
                <div>
                  <div className="text-zinc-100 font-bold">{order.id}</div>
                  <div className="text-xs text-zinc-400">{order.time}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-cyan-400 font-bold">{order.amount}</div>
                <div className={`text-xs ${order.status === 'settled' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {order.status === 'settled' ? 'Settled' : 'Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LivePriceDisplay() {
  const { priceUsd, source, isLoading } = useVfidePrice();
  
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
      <h3 className="text-xl font-bold text-zinc-100 mb-4">Current Rate</h3>
      <div className="text-center py-4">
        <div className="text-3xl sm:text-4xl font-bold text-cyan-400">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `1 VFIDE = $${priceUsd.toFixed(2)}`
          )}
        </div>
        <div className="text-sm text-zinc-400 mt-2">
          {isLoading ? 'Fetching price...' : `Live from ${source === 'calculated' ? 'market data' : source}`}
        </div>
      </div>
    </div>
  );
}

function FiatTab({ isConnected: _isConnected }: { isConnected: boolean }) {
  const [rampType, setRampType] = useState<'on' | 'off'>('on');

  const providers = [
    { name: 'Bank Transfer', fee: '0.5%', time: '1-3 days', status: 'Coming Soon' },
    { name: 'Card Payment', fee: '2.5%', time: 'Instant', status: 'Coming Soon' },
    { name: 'Wire Transfer', fee: '0.1%', time: '1-2 days', status: 'Coming Soon' },
  ];

  return (
    <div className="space-y-8">
      {/* Fiat Overview */}
      <div className="bg-gradient-to-br from-green-900/20 to-teal-900/20 border border-green-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <CreditCard className="w-12 h-12 text-green-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Fiat On/Off Ramp</h2>
            <p className="text-zinc-400">Convert between fiat currencies and VFIDE</p>
          </div>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-400 text-sm font-bold">Coming Soon</p>
          <p className="text-zinc-400 text-sm">Fiat integration is under development. Expected Q2 2026.</p>
        </div>
      </div>

      {/* Ramp Type Toggle */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setRampType('on')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            rampType === 'on'
              ? 'bg-green-600 text-white'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          <ArrowUpDown className="inline mr-2" size={18} />
          Buy VFIDE (On-Ramp)
        </button>
        <button
          onClick={() => setRampType('off')}
          className={`px-6 py-3 rounded-lg font-bold transition-all ${
            rampType === 'off'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          <ArrowUpDown className="inline mr-2" size={18} />
          Sell VFIDE (Off-Ramp)
        </button>
      </div>

      {/* Providers */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Available Providers</h3>
        <div className="space-y-4">
          {providers.map((provider, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg opacity-50">
              <div>
                <div className="text-zinc-100 font-bold">{provider.name}</div>
                <div className="text-xs text-zinc-400">Fee: {provider.fee} | Time: {provider.time}</div>
              </div>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                {provider.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Price Info */}
      <LivePriceDisplay />
    </div>
  );
}

function FinanceTab() {
  const treasuryAssets = [
    { token: 'VFIDE', balance: '100,000,000', value: '$7,000,000' },
    { token: 'USDC', balance: '2,500,000', value: '$2,500,000' },
    { token: 'ETH', balance: '500', value: '$1,750,000' },
  ];

  return (
    <div className="space-y-8">
      {/* Finance Overview */}
      <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-6">
          <TrendingUp className="w-12 h-12 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Treasury Finance</h2>
            <p className="text-zinc-400">Protocol treasury management and multi-token tracking</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">$11.25M</div>
            <div className="text-sm text-zinc-400">Total Treasury Value</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-zinc-100">3</div>
            <div className="text-sm text-zinc-400">Token Types</div>
          </div>
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">DAO</div>
            <div className="text-sm text-zinc-400">Controlled By</div>
          </div>
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Treasury Assets</h3>
        <div className="space-y-4">
          {treasuryAssets.map((asset, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {asset.token.charAt(0)}
                </div>
                <div>
                  <div className="text-zinc-100 font-bold">{asset.token}</div>
                  <div className="text-xs text-zinc-400">{asset.balance}</div>
                </div>
              </div>
              <div className="text-cyan-400 font-bold">{asset.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Treasury Actions */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-zinc-100 mb-6">Treasury Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-900 rounded-lg">
            <Zap className="text-cyan-400 mb-3" size={24} />
            <div className="text-zinc-100 font-bold mb-1">Send VFIDE</div>
            <div className="text-xs text-zinc-400 mb-3">DAO-approved disbursements</div>
            <button className="w-full bg-zinc-700 text-zinc-500 font-bold py-2 rounded-lg cursor-not-allowed">
              DAO Only
            </button>
          </div>
          <div className="p-4 bg-zinc-900 rounded-lg">
            <Shield className="text-purple-400 mb-3" size={24} />
            <div className="text-zinc-100 font-bold mb-1">Rescue Tokens</div>
            <div className="text-xs text-zinc-400 mb-3">Recover accidentally sent tokens</div>
            <button className="w-full bg-zinc-700 text-zinc-500 font-bold py-2 rounded-lg cursor-not-allowed">
              DAO Only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
