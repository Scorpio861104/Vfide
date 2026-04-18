'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { TwoFactorSetup } from '@/components/security/TwoFactorSetup';
import { BiometricSetup } from '@/components/security/BiometricSetup';
import { SecurityLogsDashboard } from '@/components/security/SecurityLogsDashboard';
import { ThreatDetectionPanel } from '@/components/security/ThreatDetectionPanel';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useSecurityLogs } from '@/hooks/useSecurityLogs';
import { useThreatDetection } from '@/hooks/useThreatDetection';

type TabView = 'overview' | '2fa' | 'biometric' | 'logs' | 'threats';

export default function SecurityCenterPage() {
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const twoFactor = useTwoFactorAuth();
  const biometric = useBiometricAuth();
  const logs = useSecurityLogs();
  const threats = useThreatDetection();

  const tabs: Array<{ id: TabView; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: '2fa', label: 'Two-Factor Auth', icon: '🔐' },
    { id: 'biometric', label: 'Biometric', icon: '👤' },
    { id: 'logs', label: 'Security Logs', icon: '📝' },
    { id: 'threats', label: 'Threat Detection', icon: '🛡️' }
  ];

  return (
    <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-12" style={{ maxWidth: '1280px' }}>
      <div className="py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Security Center
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account security, authentication methods, and monitor threats
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Security Status Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Security Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 2FA Status */}
                <div className={`p-6 rounded-lg border-2 ${
                  twoFactor.isEnabled
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                }`}>
                  <div className="text-3xl mb-3">{twoFactor.isEnabled ? '✅' : '⚠️'}</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Two-Factor Auth
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {twoFactor.isEnabled ? `Enabled (${twoFactor.method})` : 'Not enabled'}
                  </div>
                  {!twoFactor.isEnabled && (
                    <button
                      onClick={() => setActiveTab('2fa')}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Set up now →
                    </button>
                  )}
                </div>

                {/* Biometric Status */}
                <div className={`p-6 rounded-lg border-2 ${
                  biometric.isEnabled
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                }`}>
                  <div className="text-3xl mb-3">{biometric.isEnabled ? '✅' : '⚠️'}</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Biometric Auth
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {biometric.isEnabled 
                      ? `${biometric.credentials.length} credential${biometric.credentials.length !== 1 ? 's' : ''}`
                      : 'Not enrolled'
                    }
                  </div>
                  {!biometric.isEnabled && (
                    <button
                      onClick={() => setActiveTab('biometric')}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Enroll now →
                    </button>
                  )}
                </div>

                {/* Threat Level */}
                <div className={`p-6 rounded-lg border-2 ${
                  threats.threatLevel === 'none' || threats.threatLevel === 'low'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : threats.threatLevel === 'medium'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                }`}>
                  <div className="text-3xl mb-3">
                    {threats.threatLevel === 'none' || threats.threatLevel === 'low' ? '🛡️' : '🚨'}
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Threat Level
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {threats.threatLevel.toUpperCase()} ({threats.riskScore}/100)
                  </div>
                  {threats.activeThreats.length > 0 && (
                    <button
                      onClick={() => setActiveTab('threats')}
                      className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      View {threats.activeThreats.length} threat{threats.activeThreats.length !== 1 ? 's' : ''} →
                    </button>
                  )}
                </div>

                {/* Security Logs */}
                <div className="p-6 rounded-lg border-2 bg-blue-50 dark:bg-blue-900/20 border-blue-500">
                  <div className="text-3xl mb-3">📝</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Security Logs
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {logs.logs.length} event{logs.logs.length !== 1 ? 's' : ''} recorded
                  </div>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View logs →
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('2fa')}
                  className="p-4 text-left border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="text-2xl mb-2">🔐</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Configure 2FA
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Set up two-factor authentication
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('biometric')}
                  className="p-4 text-left border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="text-2xl mb-2">👤</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Manage Biometrics
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Add fingerprint or face ID
                  </div>
                </button>
                <button
                  onClick={() => {
                    threats.detectAnomalies();
                    setActiveTab('threats');
                  }}
                  className="p-4 text-left border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Run Security Scan
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Check for threats and anomalies
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Recent Security Activity
                </h2>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all →
                </button>
              </div>
              {logs.logs.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.logs.slice(-5).reverse().map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{log.message}</span>
                        <span className="text-xs text-gray-500">{log.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === '2fa' && <TwoFactorSetup />}
        {activeTab === 'biometric' && <BiometricSetup />}
        {activeTab === 'logs' && <SecurityLogsDashboard />}
        {activeTab === 'threats' && <ThreatDetectionPanel />}
      </div>
    </div>
  );
}
