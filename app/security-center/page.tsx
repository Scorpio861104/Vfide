'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { Footer } from '@/components/layout/Footer';
import { m as motion, AnimatePresence } from 'framer-motion';
import { BiometricSetup } from '@/components/security/BiometricSetup';
import { SecurityLogsDashboard } from '@/components/security/SecurityLogsDashboard';
import { ThreatDetectionPanel } from '@/components/security/ThreatDetectionPanel';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useSecurityLogs } from '@/hooks/useSecurityLogs';
import { useThreatDetection } from '@/hooks/useThreatDetection';
import { Shield, Fingerprint, FileText, AlertTriangle, LayoutDashboard, ChevronRight, Search, Lock } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { TabTrigger } from '@/components/ui/TabTrigger';

type TabView = 'overview' | 'biometric' | 'logs' | 'threats';

const TABS = [
  { id: 'overview' as TabView, label: 'Overview', icon: LayoutDashboard },
  { id: 'biometric' as TabView, label: 'Biometric', icon: Fingerprint },
  { id: 'logs' as TabView, label: 'Security Logs', icon: FileText },
  { id: 'threats' as TabView, label: 'Threat Detection', icon: AlertTriangle },
];

export default function SecurityCenterPage() {
  const { locale } = useLocale();
  void locale;

  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const biometric = useBiometricAuth();
  const logs = useSecurityLogs();
  const threats = useThreatDetection();

  const threatColor = threats.threatLevel === 'none' || threats.threatLevel === 'low'
    ? 'text-emerald-400'
    : threats.threatLevel === 'medium'
    ? 'text-amber-400'
    : 'text-red-400';

  const threatBg = threats.threatLevel === 'none' || threats.threatLevel === 'low'
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : threats.threatLevel === 'medium'
    ? 'bg-amber-500/10 border-amber-500/20'
    : 'bg-red-500/10 border-red-500/20';

  return (
    <>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden"
      >
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.07), transparent 65%)', filter: 'blur(60px)' }} />
          <div className="absolute top-1/2 -left-24 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.06), transparent 65%)', filter: 'blur(70px)' }} />
          <div className="absolute bottom-0 right-1/3 w-[350px] h-[350px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.04), transparent 65%)', filter: 'blur(80px)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

        {/* Header */}
        <section className="py-10 relative z-10">
          <div className="container mx-auto px-4 max-w-6xl">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="badge-live mb-3 w-fit"><Shield size={11} /> Security Center</div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                Security Center
              </h1>
              <p className="text-zinc-400 max-w-2xl">
                Manage authentication methods, monitor threats, and review your security activity log.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Sticky tab bar */}
        <section
          className="border-b border-white/8 sticky top-7 md:top-[5.25rem] z-40"
          style={{ background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(24px)' }}
        >
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide" role="tablist">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <TabTrigger
                    key={tab.id}
                    active={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
                      isActive ? 'tab-pill-active' : 'tab-pill-inactive'
                    }`}
                  >
                    <tab.icon size={15} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabTrigger>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tab content */}
        <div className="container mx-auto px-4 max-w-6xl py-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
            >
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Status grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* 2FA */}
                    <div className="analytics-card p-5">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/8 flex items-center justify-center mb-3">
                        <Lock size={18} className="text-zinc-500" />
                      </div>
                      <div className="font-semibold text-white text-sm mb-1">Two-Factor Auth</div>
                      <div className="text-xs text-zinc-500">Coming soon</div>
                    </div>

                    {/* Biometric */}
                    <div className={`analytics-card p-5 border ${biometric.isEnabled ? 'border-emerald-500/25 bg-emerald-500/5' : ''}`}>
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${
                        biometric.isEnabled ? 'bg-emerald-500/15 border-emerald-500/25' : 'bg-zinc-800 border-white/8'
                      }`}>
                        <Fingerprint size={18} className={biometric.isEnabled ? 'text-emerald-400' : 'text-zinc-500'} />
                      </div>
                      <div className="font-semibold text-white text-sm mb-1">Biometric Auth</div>
                      <div className="text-xs text-zinc-500">
                        {biometric.isEnabled ? `${biometric.credentials.length} credential${biometric.credentials.length !== 1 ? 's' : ''}` : 'Not enrolled'}
                      </div>
                      {!biometric.isEnabled && (
                        <button
                          onClick={() => setActiveTab('biometric')}
                          className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                        >
                          Enroll <ChevronRight size={11} />
                        </button>
                      )}
                    </div>

                    {/* Threat level */}
                    <div className={`analytics-card p-5 border ${threatBg}`}>
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${threatBg}`}>
                        <Shield size={18} className={threatColor} />
                      </div>
                      <div className="font-semibold text-white text-sm mb-1">Threat Level</div>
                      <div className={`text-xs font-bold uppercase ${threatColor}`}>
                        {threats.threatLevel} ({threats.riskScore}/100)
                      </div>
                      {threats.activeThreats.length > 0 && (
                        <button
                          onClick={() => setActiveTab('threats')}
                          className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        >
                          {threats.activeThreats.length} threat{threats.activeThreats.length !== 1 ? 's' : ''} <ChevronRight size={11} />
                        </button>
                      )}
                    </div>

                    {/* Logs */}
                    <div className="analytics-card p-5">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                        <FileText size={18} className="text-blue-400" />
                      </div>
                      <div className="font-semibold text-white text-sm mb-1">Security Logs</div>
                      <div className="text-xs text-zinc-500">
                        {logs.logs.length} event{logs.logs.length !== 1 ? 's' : ''} recorded
                      </div>
                      <button
                        onClick={() => setActiveTab('logs')}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        View logs <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="glass-card-premium p-5">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Search size={15} className="text-cyan-400" /> Quick Actions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button
                        disabled
                        className="p-4 text-left glass-card-premium opacity-50 cursor-not-allowed"
                      >
                        <Lock className="text-zinc-500 mb-2" size={20} />
                        <div className="font-semibold text-white text-sm mb-1">Configure 2FA</div>
                        <div className="text-xs text-zinc-500">Coming in a future release</div>
                      </button>
                      <button
                        onClick={() => setActiveTab('biometric')}
                        className="p-4 text-left glass-card-premium hover:border-cyan-500/30 transition-all"
                      >
                        <Fingerprint className="text-cyan-400 mb-2" size={20} />
                        <div className="font-semibold text-white text-sm mb-1">Manage Biometrics</div>
                        <div className="text-xs text-zinc-500">Add fingerprint or face ID</div>
                      </button>
                      <button
                        onClick={() => { threats.detectAnomalies(); setActiveTab('threats'); }}
                        className="p-4 text-left glass-card-premium hover:border-amber-500/30 transition-all"
                      >
                        <AlertTriangle className="text-amber-400 mb-2" size={20} />
                        <div className="font-semibold text-white text-sm mb-1">Run Security Scan</div>
                        <div className="text-xs text-zinc-500">Check for threats and anomalies</div>
                      </button>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="glass-card-premium p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-white flex items-center gap-2">
                        <FileText size={15} className="text-blue-400" /> Recent Activity
                      </h2>
                      <button
                        onClick={() => setActiveTab('logs')}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                      >
                        View all <ChevronRight size={11} />
                      </button>
                    </div>
                    {logs.logs.length === 0 ? (
                      <p className="text-center py-8 text-zinc-500 text-sm">No recent activity</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.logs.slice(-5).reverse().map((log) => (
                          <div key={log.id} className="analytics-card p-3 flex items-center justify-between">
                            <span className="text-sm text-zinc-300 font-medium">{log.message}</span>
                            <span className="text-xs text-zinc-600">{log.timestamp.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'biometric' && <BiometricSetup />}
              {activeTab === 'logs' && <SecurityLogsDashboard />}
              {activeTab === 'threats' && <ThreatDetectionPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>
      <Footer />
    </>
  );
}
