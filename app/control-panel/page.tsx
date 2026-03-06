'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { SystemStatusPanel } from './components/SystemStatusPanel';
import { HoweySafeModePanel } from './components/HoweySafeModePanel';
import { AutoSwapPanel } from './components/AutoSwapPanel';
import { TokenManagementPanel } from './components/TokenManagementPanel';
import { FeeManagementPanel } from './components/FeeManagementPanel';
import { EcosystemPanel } from './components/EcosystemPanel';
import { GovernancePanel } from './components/GovernancePanel';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Owner Control Panel</h1>
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
          <div className="flex gap-2 overflow-x-auto py-4">
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
