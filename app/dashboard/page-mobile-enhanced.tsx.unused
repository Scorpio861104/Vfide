/**
 * Enhanced Dashboard Page with Mobile-First Responsive Design
 * Implements world-class UX for all screen sizes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { MobileDrawer } from '@/components/mobile/MobileDrawer';
import { MobileButton } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';

// Dashboard Sections
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { ProofScoreCard } from '@/components/dashboard/ProofScoreCard';
import { TransactionHistory } from '@/components/dashboard/TransactionHistory';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              V
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              VFIDE
            </h1>
          </div>
          
          <MobileDrawer>
            <nav className="space-y-2 px-4 py-6">
              <button
                onClick={() => setActiveTab('overview')}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('portfolio')}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                Portfolio
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                Alerts
              </button>
              <hr className="my-4 border-gray-200 dark:border-gray-700" />
              <a
                href="/settings"
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                Settings
              </a>
              <a
                href="/logout"
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
              >
                Logout
              </a>
            </nav>
          </MobileDrawer>
        </div>
      </header>

      <div className="flex flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 sticky top-0 h-screen overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                V
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  VFIDE
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dashboard
                </p>
              </div>
            </div>

            <nav className="space-y-2">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'portfolio', label: 'Portfolio', icon: '💼' },
                { id: 'transactions', label: 'Transactions', icon: '💸' },
                { id: 'alerts', label: 'Alerts', icon: '🔔' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <hr className="my-6 border-gray-200 dark:border-gray-700" />

            <div className="space-y-2">
              <a
                href="/settings"
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-xl">⚙️</span>
                <span>Settings</span>
              </a>
              <a
                href="/logout"
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <span className="text-xl">🚪</span>
                <span>Logout</span>
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          <ResponsiveContainer>
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className={`grid ${responsiveGrids.balanced} gap-4`}>
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && (
              <>
                {/* Page Header */}
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Welcome back! Here's your financial overview.
                  </p>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className={`grid ${responsiveGrids.balanced} gap-4`}>
                      <DashboardOverview />
                      <ProofScoreCard />
                      <PortfolioChart />
                    </div>

                    {/* Recent Alerts */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Recent Alerts
                      </h2>
                      <AlertsPanel limit={5} />
                    </div>
                  </div>
                )}

                {/* Portfolio Tab */}
                {activeTab === 'portfolio' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Portfolio
                      </h2>
                      <PortfolioChart />
                    </div>
                  </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Transaction History
                      </h2>
                      <TransactionHistory />
                    </div>
                  </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
                        All Alerts
                      </h2>
                      <AlertsPanel />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MobileButton
                    variant="primary"
                    fullWidth
                    className="text-base"
                  >
                    Send Transfer
                  </MobileButton>
                  <MobileButton
                    variant="secondary"
                    fullWidth
                    className="text-base"
                  >
                    Receive Funds
                  </MobileButton>
                </div>
              </>
            )}
          </ResponsiveContainer>
        </main>
      </div>
    </div>
  );
}

/**
 * Placeholder Components
 * These would be replaced with actual implementations
 */

function DashboardOverview() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm md:text-base font-semibold text-gray-600 dark:text-gray-400 mb-2">
        Total Balance
      </h3>
      <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
        $24,582.50
      </p>
      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
        ↑ 12.5% from last week
      </p>
    </div>
  );
}

function ProofScoreCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm md:text-base font-semibold text-gray-600 dark:text-gray-400 mb-2">
        ProofScore
      </h3>
      <p className="text-2xl md:text-3xl font-bold text-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
        8,450
      </p>
      <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
          style={{ width: '84.5%' }}
        />
      </div>
    </div>
  );
}

function PortfolioChart() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm md:text-base font-semibold text-gray-600 dark:text-gray-400 mb-4">
        Portfolio Distribution
      </h3>
      <div className="space-y-3">
        {[
          { name: 'Ethereum', value: 45, color: 'bg-blue-500' },
          { name: 'USDC', value: 30, color: 'bg-green-500' },
          { name: 'Bitcoin', value: 15, color: 'bg-yellow-600' },
          { name: 'Other', value: 10, color: 'bg-gray-500' },
        ].map((asset) => (
          <div key={asset.name} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-16">
              {asset.name}
            </span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${asset.color}`}
                style={{ width: `${asset.value}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white w-10 text-right">
              {asset.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionHistory() {
  const transactions = [
    { id: 1, type: 'sent', amount: 0.5, asset: 'ETH', date: '2 hours ago', status: 'completed' },
    { id: 2, type: 'received', amount: 100, asset: 'USDC', date: '1 day ago', status: 'completed' },
    { id: 3, type: 'sent', amount: 2, asset: 'BTC', date: '3 days ago', status: 'completed' },
  ];

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              tx.type === 'sent' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'
            }`}>
              <span className="text-lg">
                {tx.type === 'sent' ? '↑' : '↓'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {tx.type === 'sent' ? 'Sent' : 'Received'} {tx.asset}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tx.date}
              </p>
            </div>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <p className={`font-bold ${
              tx.type === 'sent' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {tx.type === 'sent' ? '−' : '+'}{tx.amount} {tx.asset}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsPanel({ limit }: { limit?: number }) {
  const alerts = [
    { id: 1, type: 'info', message: 'New features available', time: '1 hour ago' },
    { id: 2, type: 'warning', message: 'ProofScore update pending', time: '3 hours ago' },
    { id: 3, type: 'success', message: 'Transfer completed', time: '1 day ago' },
  ].slice(0, limit);

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-3 rounded-lg border-l-4 ${
            alert.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
              : alert.type === 'warning'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
              : 'bg-green-50 dark:bg-green-900/20 border-green-500'
          }`}
        >
          <p className="font-medium text-gray-900 dark:text-white">
            {alert.message}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {alert.time}
          </p>
        </div>
      ))}
    </div>
  );
}
