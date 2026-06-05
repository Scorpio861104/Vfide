'use client';

import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { OWNER_CONTROL_PANEL_ADDRESS, OWNER_CONTROL_PANEL_ABI } from '../config/contracts';

export function SystemStatusPanel() {
  const { data: systemStatus } = useReadContract({
    address: OWNER_CONTROL_PANEL_ADDRESS,
    abi: OWNER_CONTROL_PANEL_ABI,
    functionName: 'system_getStatus',
  });

  const systemStatusTuple = systemStatus as readonly [boolean, boolean, boolean, boolean, boolean, string] | undefined;

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-6">System Overview</h2>
        
        {systemStatusTuple && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatusCard
              title="Howey-Safe Mode"
              value={systemStatusTuple[0] ? 'ON' : 'OFF'}
              icon="🛡️"
              status={systemStatusTuple[0] ? 'success' : 'warning'}
            />
            <StatusCard
              title="Auto-Swap"
              value={systemStatusTuple[1] ? 'ENABLED' : 'DISABLED'}
              icon="🔄"
              status={systemStatusTuple[1] ? 'info' : 'default'}
            />
            <StatusCard
              title="Circuit Breaker"
              value={systemStatusTuple[2] ? 'ACTIVE' : 'INACTIVE'}
              icon="⚡"
              status={systemStatusTuple[2] ? 'error' : 'success'}
            />
            <StatusCard
              title="Vault-Only Mode"
              value={systemStatusTuple[3] ? 'ON' : 'OFF'}
              icon="🔒"
              status={systemStatusTuple[3] ? 'info' : 'default'}
            />
            <StatusCard
              title="Policy Locked"
              value={systemStatusTuple[4] ? 'YES' : 'NO'}
              icon="🔐"
              status={systemStatusTuple[4] ? 'warning' : 'default'}
            />
            <StatusCard
              title="Overall Status"
              value={systemStatusTuple[5] || 'Unknown'}
              icon="📊"
              status="info"
              fullWidth
            />
          </div>
        )}

        {!systemStatusTuple && (
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
            {/* Howey-safe mode is a compile-time constant — no runtime toggle exists */}
            <QuickActionButton
              icon="🔄"
              title="Configure Auto-Swap"
              description="Set up stablecoin payments"
              disabledReason="Auto-swap configuration UI isn't built yet. The SwapRouter contract address is configured in lib/contracts.ts."
            />
            <QuickActionButton
              icon="⚡"
              title="Production Setup"
              description="One-click deployment"
              disabledReason="Production deployment is a multi-step scripted process — see scripts/deploy/ and the deployment runbook."
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

      {/*
        F-NAV-02: Operator-only utility pages that aren't part of the
        public navigation. They live at stable URLs (/verifier, /splitter)
        but were previously undiscoverable unless an operator already
        knew the path. Surfacing them here keeps them off the public nav
        while making them reachable from the owner-gated control panel.
      */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-2">Operator Tools</h3>
        <p className="text-sm text-slate-400 mb-4">
          Standalone utility pages used by trusted operators. These are not part of the public navigation.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Link
            href="/splitter"
            className="flex items-start gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 transition-colors"
          >
            <span className="text-2xl" aria-hidden="true">💸</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold mb-0.5">Revenue Splitter Inspector</div>
              <div className="text-xs text-slate-400">
                Read payees and balance from any deployed RevenueSplitter address; trigger distribution.
              </div>
              <div className="text-xs text-purple-300 mt-1 font-mono">/splitter</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

type StatusCardStatus = 'success' | 'warning' | 'error' | 'info' | 'default';

type StatusCardProps = {
  title: string;
  value: string;
  icon: string;
  status: StatusCardStatus;
  fullWidth?: boolean;
};

function StatusCard({ title, value, icon, status, fullWidth = false }: StatusCardProps) {
  const statusColors: Record<StatusCardStatus, string> = {
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

type QuickActionButtonProps = {
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
  /** Tooltip explaining why the action isn't wired up (used when onClick is absent) */
  disabledReason?: string;
};

function QuickActionButton({ icon, title, description, onClick, disabledReason }: QuickActionButtonProps) {
  const isDisabled = !onClick;
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={isDisabled ? (disabledReason ?? 'Not wired up yet.') : undefined}
      className={`w-full p-4 rounded-lg border border-white/10 transition-colors text-left ${
        isDisabled
          ? 'bg-white/3 cursor-not-allowed opacity-60'
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
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

type ActivityStatus = 'success' | 'warning' | 'error';

type ActivityItemProps = {
  action: string;
  time: string;
  status: ActivityStatus;
};

function ActivityItem({ action, time, status }: ActivityItemProps) {
  const statusColors: Record<ActivityStatus, string> = {
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
