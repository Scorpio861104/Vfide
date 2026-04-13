'use client';

import { useState, useEffect } from 'react';
import { Settings, Loader2, ShieldCheck, ShieldAlert, ShieldOff, AlertTriangle, BarChart2 } from 'lucide-react';

interface SeerAnalytics {
  total_events: number;
  allowed_events: number;
  warned_events: number;
  blocked_events: number;
  appeals_opened: number;
  appeals_resolved: number;
  score_set_events: number;
}

const WINDOW_OPTIONS = [
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
];

export function SettingsTab() {
  const [analytics, setAnalytics] = useState<SeerAnalytics | null>(null);
  const [window, setWindow] = useState(720);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/seer/analytics?windowHours=${window}`)
      .then((r) => r.json())
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, [window]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">SEER Event Pipeline</h3>
        </div>
        <div className="flex gap-1">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setWindow(opt.value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                window === opt.value
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="text-cyan-400 animate-spin" />
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Events', value: analytics.total_events, icon: <BarChart2 size={14} className="text-gray-400" /> },
              { label: 'Allowed', value: analytics.allowed_events, icon: <ShieldCheck size={14} className="text-green-400" /> },
              { label: 'Warned', value: analytics.warned_events, icon: <AlertTriangle size={14} className="text-yellow-400" /> },
              { label: 'Blocked', value: analytics.blocked_events, icon: <ShieldOff size={14} className="text-red-400" /> },
            ].map((s) => (
              <div key={s.label} className="bg-white/3 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">{s.icon}<p className="text-xs text-gray-400">{s.label}</p></div>
                <p className="text-2xl font-bold text-white">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={15} className="text-purple-400" />
              <h4 className="text-white font-medium text-sm">Appeals &amp; Scoring</h4>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Appeals opened</p>
              <p className="text-sm text-white font-semibold">{analytics.appeals_opened}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Appeals resolved</p>
              <p className="text-sm text-white font-semibold">{analytics.appeals_resolved}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Score updates</p>
              <p className="text-sm text-white font-semibold">{analytics.score_set_events}</p>
            </div>

            {analytics.total_events > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Allow rate</span>
                  <span>{((analytics.allowed_events / analytics.total_events) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-cyan-500"
                    style={{ width: `${(analytics.allowed_events / analytics.total_events) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-sm text-center py-6">No analytics available.</p>
      )}
    </div>
  );
}
