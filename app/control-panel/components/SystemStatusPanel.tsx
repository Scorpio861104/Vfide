'use client';

import { useReadContract } from 'wagmi';
import { OWNER_CONTROL_PANEL_ADDRESS, OWNER_CONTROL_PANEL_ABI } from '../config/contracts';

export function SystemStatusPanel() {
  const { data: systemStatus } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'system_getStatus',
  });

  const statusColors = {
    'Production Ready - All Systems Safe': 'bg-green-500',
    'Warning - Howey-safe mode disabled': 'bg-yellow-500',
    'Circuit Breaker Active': 'bg-red-500',
  };

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-6">System Overview</h2>
        
        {systemStatus && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatusCard
              title="Howey-Safe Mode"
              value={systemStatus[0] ? 'ON' : 'OFF'}
              icon="🛡️"
              status={systemStatus[0] ? 'success' : 'warning'}
            />
            <StatusCard
              title="Auto-Swap"
              value={systemStatus[1] ? 'ENABLED' : 'DISABLED'}
              icon="🔄"
              status={systemStatus[1] ? 'info' : 'default'}
            />
            <StatusCard
              title="Circuit Breaker"
              value={systemStatus[2] ? 'ACTIVE' : 'INACTIVE'}
              icon="⚡"
              status={systemStatus[2] ? 'error' : 'success'}
            />
            <StatusCard
              title="Vault-Only Mode"
              value={systemStatus[3] ? 'ON' : 'OFF'}
              icon="🔒"
              status={systemStatus[3] ? 'info' : 'default'}
            />
            <StatusCard
              title="Policy Locked"
              value={systemStatus[4] ? 'YES' : 'NO'}
              icon="🔐"
              status={systemStatus[4] ? 'warning' : 'default'}
            />
            <StatusCard
              title="Overall Status"
              value={systemStatus[5] || 'Unknown'}
              icon="📊"
              status="info"
              fullWidth
            />
          </div>
        )}

        {!systemStatus && (
          <div className="text-center py-12 text-slate-400">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p>Loading system status...</p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <QuickActionButton
              icon="🛡️"
              title="Enable All Howey-Safe Mode"
              description="Protect all contracts"
            />
            <QuickActionButton
              icon="🔄"
              title="Configure Auto-Swap"
              description="Set up stablecoin payments"
            />
            <QuickActionButton
              icon="⚡"
              title="Production Setup"
              description="One-click deployment"
            />
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <ActivityItem
              action="Howey-Safe Mode Enabled"
              time="2 hours ago"
              status="success"
            />
            <ActivityItem
              action="Auto-Swap Configured"
              time="5 hours ago"
              status="success"
            />
            <ActivityItem
              action="Fee Policy Updated"
              time="1 day ago"
              status="success"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, value, icon, status, fullWidth = false }: any) {
  const statusColors = {
    success: 'border-green-500/50 bg-green-500/10',
    warning: 'border-yellow-500/50 bg-yellow-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    info: 'border-blue-500/50 bg-blue-500/10',
    default: 'border-white/10 bg-white/5',
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]} ${fullWidth ? 'md:col-span-3' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-white font-bold text-lg">{value}</div>
    </div>
  );
}

function QuickActionButton({ icon, title, description }: any) {
  return (
    <button className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-white font-medium">{title}</div>
          <div className="text-slate-400 text-sm">{description}</div>
        </div>
      </div>
    </button>
  );
}

function ActivityItem({ action, time, status }: any) {
  const statusColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      <div className="flex-1">
        <div className="text-white text-sm">{action}</div>
        <div className="text-slate-400 text-xs">{time}</div>
      </div>
    </div>
  );
}
