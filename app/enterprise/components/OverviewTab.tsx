'use client';

import { Building2, CreditCard, Globe, Shield, TrendingUp, Clock } from 'lucide-react';

type FeatureStatus = 'Active' | 'Future Release';

export function OverviewTab() {
  const features: {
    icon: typeof Building2;
    title: string;
    description: string;
    status: FeatureStatus;
    colorClass: string;
  }[] = [
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
      description: 'Seamless conversion between fiat and VFIDE through a regulated payments partner',
      status: 'Future Release',
      colorClass: 'text-teal-400'
    },
    {
      icon: TrendingUp,
      title: 'Treasury Finance',
      description: 'Protocol treasury overview and multi-token balance tracking',
      status: 'Active',
      colorClass: 'text-amber-400'
    },
    {
      icon: Shield,
      title: 'Compliance Ready',
      description: 'KYC/AML integration via partner provider, transaction limits, and audit trails',
      status: 'Future Release',
      colorClass: 'text-violet-400'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-cyan-900/20 to-violet-900/20 border border-accent/30 rounded-xl p-4 sm:p-6 md:p-8 text-center">
        <Building2 className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-4">Enterprise-Grade Infrastructure</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          VFIDE provides institutional-quality payment infrastructure with zero protocol fees
          and instant on-chain settlements. Fiat ramp + compliance modules ship once partner
          integrations are signed.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => {
          const isActive = feature.status === 'Active';
          return (
            <div key={feature.title} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4 gap-3">
                <feature.icon size={32} className={feature.colorClass} />
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-200 border border-amber-400/40'
                }`}>
                  {!isActive && <Clock size={11} />}
                  {feature.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">{feature.title}</h3>
              <p className="text-zinc-400">{feature.description}</p>
            </div>
          );
        })}
      </div>

      {/* Stats — only the honest ones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-cyan-400">0%</div>
          <div className="text-sm text-zinc-400">Merchant Protocol Fee</div>
          <div className="text-xs text-zinc-500 mt-1">Hardcoded in MerchantPortal</div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400">~2s</div>
          <div className="text-sm text-zinc-400">Base Block Time</div>
          <div className="text-xs text-zinc-500 mt-1">On-chain settlement</div>
        </div>
      </div>
    </div>
  );
}
