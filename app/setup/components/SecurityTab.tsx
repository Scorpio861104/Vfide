'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Shield, LogIn, AlertTriangle, XCircle, Info, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';

interface SecurityLog {
  id: string;
  ts: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details?: Record<string, unknown>;
  user_agent?: string;
  location?: string;
  device_id?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn size={14} />,
  '2fa': <ShieldCheck size={14} />,
  suspicious: <AlertTriangle size={14} />,
  failed: <XCircle size={14} />,
  default: <Info size={14} />,
};

const SEVERITY_CLASSES: Record<string, string> = {
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  warning: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export function SecurityTab() {
  const { address } = useAccount();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch('/api/security/logs?limit=30')
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => setError('Failed to load security events'))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShieldOff size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view security events.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Events</p>
          <p className="text-2xl font-bold text-white">{logs.length}</p>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-yellow-400">{logs.filter((l) => l.severity === 'warning').length}</p>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-400">{logs.filter((l) => l.severity === 'critical').length}</p>
        </div>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Security Event Log</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-6">{error}</p>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShieldCheck size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">No security events recorded.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {logs.map((log) => {
              const icon = TYPE_ICONS[log.type] ?? TYPE_ICONS.default;
              const severityClass = SEVERITY_CLASSES[log.severity] ?? SEVERITY_CLASSES.info;
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-white/3 rounded-lg">
                  <span className={`mt-0.5 flex-shrink-0 p-1.5 rounded-md border ${severityClass}`}>{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-white font-medium">{log.message}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${severityClass} capitalize`}>{log.severity}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs text-gray-500">{new Date(log.ts).toLocaleString()}</p>
                      {log.location && <p className="text-xs text-gray-500">{log.location}</p>}
                      {log.type && <p className="text-xs text-gray-600 capitalize">{log.type}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
