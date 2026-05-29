'use client';
import _dynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { SystemStatusPanel } from './components/SystemStatusPanel';
import { HoweySafeModePanel } from './components/HoweySafeModePanel';
const AutoSwapPanel = _dynamic(() => import('./components/AutoSwapPanel').then(m => ({ default: m.AutoSwapPanel })), { ssr: false });
import { TokenManagementPanel } from './components/TokenManagementPanel';
import { FeeManagementPanel } from './components/FeeManagementPanel';
import { EcosystemPanel } from './components/EcosystemPanel';
const GovernancePanel = _dynamic(() => import('./components/GovernancePanel').then(m => ({ default: m.GovernancePanel })), { ssr: false });
import { EmergencyPanel } from './components/EmergencyPanel';
import { ProductionSetupPanel } from './components/ProductionSetupPanel';
import { TransactionHistory } from './components/TransactionHistory';
import { ConnectWalletPrompt } from './components/ConnectWalletPrompt';
import { OwnerGuard } from './components/SecurityComponents';

export default function ControlPanelPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('overview');

  if (!isConnected) {
    return <ConnectWalletPrompt />;
  }

  const tabs = [
    { id: 'overview', label: 'System Overview', icon: '📊' },
    { id: 'howey', label: 'Compliance', icon: '🛡️' },
    { id: 'autoswap', label: 'Auto-Swap', icon: '🔄' },
    { id: 'token', label: 'Token Management', icon: '🪙' },
    { id: 'fees', label: 'Fee Management', icon: '💰' },
    { id: 'ecosystem', label: 'Ecosystem', icon: '🌿' },
    { id: 'governance', label: 'Governance', icon: '⏱️' },
    { id: 'emergency', label: 'Emergency', icon: '🚨' },
    { id: 'setup', label: 'Quick Setup', icon: '⚡' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)' }} />
      </div>
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="badge-live mb-2">
                ⚙️ Protocol Admin
              </div>
              <h1 className="text-3xl font-black text-white mb-1 tracking-tight">Owner Control Panel</h1>
              <p className="text-slate-400">Unified interface for VFIDE protocol management</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">Connected as</div>
              <div className="text-white font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-white/10 bg-black/10 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <OwnerGuard>
            {activeTab === 'overview' && <SystemStatusPanel />}
            {activeTab === 'howey' && <HoweySafeModePanel />}
            {activeTab === 'autoswap' && <AutoSwapPanel />}
            {activeTab === 'token' && <TokenManagementPanel />}
            {activeTab === 'fees' && <FeeManagementPanel />}
            {activeTab === 'ecosystem' && <EcosystemPanel />}
            {activeTab === 'governance' && <GovernancePanel />}
            {activeTab === 'emergency' && <EmergencyPanel />}
            {activeTab === 'setup' && <ProductionSetupPanel />}
            {activeTab === 'history' && <TransactionHistory />}
          </OwnerGuard>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
          <p>VFIDE Owner Control Panel v1.0</p>
          <p className="mt-2">⚠️ This interface provides full administrative control. Use with caution.</p>
        </div>
      </div>
    </div>
  );
}
