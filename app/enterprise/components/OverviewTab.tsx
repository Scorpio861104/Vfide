'use client';

import { Building2, CreditCard, Globe, Shield, TrendingUp } from 'lucide-react';

export function OverviewTab() {
  const features = [
    {
      icon: Globe,
      title: 'Enterprise Gateway',
      description: 'High-volume payment processing with batch settlements and custom oracles',
      status: 'Active',
      colorClass: 'text-cyan-400'
    },
    {
      icon: CreditCard,
      title: 'Fiat On/Off Ramp',
      description: 'Seamless conversion between fiat and VFIDE through verified providers',
      status: 'Active',
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
