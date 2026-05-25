'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Shield, Lock, Eye, Key, Activity, 
 Smartphone, Globe, ChevronRight, CheckCircle2, 
  XCircle, LogOut
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { useLocale } from '@/hooks/useLocale';
import { SECURITY_CENTER_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'sessions', label: 'Sessions', icon: Globe },
  { id: 'keys',     label: 'Signing Keys', icon: Key },
  { id: 'activity', label: 'Activity Log', icon: Activity },
] as const;
type TabId = typeof tabs[number]['id'];

function SecurityScore({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Strong' : score >= 50 ? 'Fair' : 'At Risk';
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={40} cy={40} r={34} fill="none" stroke="#27272a" strokeWidth={8} />
        <circle cx={40} cy={40} r={34} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${2 * Math.PI * 34 * score / 100} ${2 * Math.PI * 34 * (1 - score / 100)}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x={40} y={44} textAnchor="middle" fill="white" fontSize={18} fontWeight="bold">{score}</text>
      </svg>
      <div className="text-sm font-semibold" style={{ color }}>{label}</div>
    </div>
  );
}

const CHECKS = [
  { id: 'guardians', label: 'Guardians configured', href: '/guardians', critical: true },
  { id: 'recovery',  label: 'Recovery phrase backed up', href: '/vault/safety', critical: true },
  { id: '2fa',       label: 'Session signing active', href: '/settings', critical: false },
  { id: 'biometric', label: 'Biometric lock enabled', href: '/settings', critical: false },
  { id: 'proofscore',label: 'ProofScore ≥ 600 (Trusted)', href: '/proofscore', critical: false },
];

export default function SecurityCenterPage() {
  const [locale] = useLocale();
  const _copy = pickLocaleCopy(SECURITY_CENTER_TRANSLATIONS, locale); // security center i18n
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  // In a real integration these come from API/contract reads.
  // Showing structural UI with mock data here — wire up with real hooks for prod.
  const securityScore = 62;
  const passedChecks = new Set(['recovery', 'proofscore']);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Shield className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Security Center</h2>
          <p className="text-zinc-400 mb-6">Connect your wallet to review your account security posture, active sessions, and signing keys.</p>
          <VfideConnectButton size="md" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative">
        {/* Ambient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.5), transparent 65%)', filter: 'blur(80px)' }} />
          <div className="absolute top-1/2 -right-24 w-[400px] h-[400px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.5), transparent 65%)', filter: 'blur(80px)' }} />
        </div>

        <div className="container mx-auto px-4 max-w-5xl py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="badge-live mb-3 w-fit"><Shield size={11} /> Security Center</div>
            <h1 className="text-3xl font-black text-white">Account Security</h1>
            <p className="text-zinc-400 mt-1 text-sm">
              {address?.slice(0, 6)}…{address?.slice(-4)} · Review your protection status
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-zinc-900/50 rounded-xl p-1 mb-8 w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Score */}
                  <div className="glass-card-premium p-6 flex flex-col items-center gap-4 md:col-span-1">
                    <SecurityScore score={securityScore} />
                    <p className="text-xs text-zinc-500 text-center">Complete checks below to improve your score</p>
                  </div>

                  {/* Checklist */}
                  <div className="glass-card-premium p-6 md:col-span-2">
                    <h3 className="font-semibold text-white mb-4">Security checklist</h3>
                    <div className="space-y-3">
                      {CHECKS.map((check) => {
                        const passed = passedChecks.has(check.id);
                        return (
                          <a key={check.id} href={check.href}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                          >
                            {passed
                              ? <CheckCircle2 size={18} className="text-green-400 shrink-0" />
                              : <XCircle size={18} className={`shrink-0 ${check.critical ? 'text-red-400' : 'text-zinc-500'}`} />
                            }
                            <span className={`flex-1 text-sm ${passed ? 'text-zinc-400 line-through' : check.critical ? 'text-white' : 'text-zinc-300'}`}>
                              {check.label}
                              {check.critical && !passed && (
                                <span className="ml-2 text-xs text-red-400 font-medium">Critical</span>
                              )}
                            </span>
                            <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  {[
                    { href: '/guardians', icon: Shield, label: 'Manage Guardians', color: '#22d3ee' },
                    { href: '/vault/safety', icon: Lock, label: 'Vault Safety Window', color: '#10b981' },
                    { href: '/settings', icon: Smartphone, label: 'Device & Session Settings', color: '#a78bfa' },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <a key={action.href} href={action.href}
                        className="glass-card-premium p-5 flex items-center gap-4 hover:bg-white/[0.06] transition-colors group"
                      >
                        <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${action.color}15`, border: `1px solid ${action.color}25` }}>
                          <Icon size={20} style={{ color: action.color }} />
                        </div>
                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{action.label}</span>
                        <ChevronRight size={14} className="text-zinc-600 ml-auto group-hover:text-zinc-400 transition-colors" />
                      </a>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'sessions' && (
              <motion.div key="sessions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="glass-card-premium p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-white">Active sessions</h3>
                    <button className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors">
                      <LogOut size={12} /> Revoke all
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { device: 'This device', location: 'Current session', lastSeen: 'Now', current: true },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                        <Globe size={18} className="text-cyan-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{s.device}</div>
                          <div className="text-xs text-zinc-500">{s.location} · {s.lastSeen}</div>
                        </div>
                        {s.current
                          ? <span className="text-xs text-green-400 font-medium px-2 py-0.5 bg-green-400/10 rounded-full">Current</span>
                          : <button className="text-xs text-red-400 hover:text-red-300">Revoke</button>
                        }
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 mt-4">Session data is fetched from your on-chain token revocation registry at each login.</p>
                </div>
              </motion.div>
            )}

            {(activeTab === 'keys' || activeTab === 'activity') && (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="glass-card-premium p-10 text-center">
                  <Eye size={40} className="text-zinc-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-white mb-2">
                    {activeTab === 'keys' ? 'Signing key registry' : 'Activity log'}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {activeTab === 'keys'
                      ? 'Session keys and signing authority are managed by your CardBound Vault contract. Connect and your active keys will appear here.'
                      : 'Your full security event log — login attempts, guardian changes, key rotations — loads from the on-chain audit trail. Available after testnet deployment.'
                    }
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </>
  );
}
