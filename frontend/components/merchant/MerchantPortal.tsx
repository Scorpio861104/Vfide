/**
 * Advanced Merchant Portal Component
 * Payment requests, revenue analytics, bulk payments, and API key management
 * 
 * Features:
 * - Payment request interface
 * - Revenue charts by product/time period
 * - Bulk payment CSV upload and processing
 * - API key generation and management
 * - Transaction history and settlement
 * - Mobile-responsive design
 */

'use client';

import React, { useState } from 'react';
import { MobileButton, MobileInput, MobileSelect } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';

// ==================== TYPES ====================

interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  description: string;
  recipientEmail: string;
  status: 'pending' | 'sent' | 'completed' | 'expired';
  expiresAt: number;
  createdAt: number;
  paymentLink: string;
}

interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
  volume: number;
}

interface ApiKey {
  id: string;
  key: string;
  maskedKey: string;
  name: string;
  createdAt: number;
  lastUsed: number | null;
  permissions: string[];
  status: 'active' | 'inactive' | 'revoked';
}

interface BulkPaymentJob {
  id: string;
  filename: string;
  uploadedAt: number;
  status: 'processing' | 'completed' | 'failed';
  totalRows: number;
  successCount: number;
  failureCount: number;
  totalAmount: number;
}

// ==================== MOCK DATA ====================

function generateMockPaymentRequests(): PaymentRequest[] {
  return [
    {
      id: 'pr-001',
      amount: 1500,
      currency: 'USDC',
      description: 'Monthly Retainer - Web Development',
      recipientEmail: 'dev@example.com',
      status: 'pending',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      paymentLink: 'https://vfide.io/pay/pr-001',
    },
    {
      id: 'pr-002',
      amount: 500,
      currency: 'ETH',
      description: 'Consulting Services',
      recipientEmail: 'consultant@example.com',
      status: 'completed',
      expiresAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      paymentLink: 'https://vfide.io/pay/pr-002',
    },
    {
      id: 'pr-003',
      amount: 2000,
      currency: 'USDC',
      description: 'Product License',
      recipientEmail: 'vendor@example.com',
      status: 'sent',
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
      createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      paymentLink: 'https://vfide.io/pay/pr-003',
    },
  ];
}

function generateMockRevenueData(): RevenueData[] {
  const data: RevenueData[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Math.floor(Math.random() * 50000 + 10000),
      transactions: Math.floor(Math.random() * 500 + 50),
      volume: Math.floor(Math.random() * 1000000 + 100000),
    });
  }
  return data;
}

function generateMockApiKeys(): ApiKey[] {
  return [
    {
      id: 'key-001',
      key: 'sk_live_51234567890abcdefghijklmnop',
      maskedKey: 'sk_live_...nop',
      name: 'Production API Key',
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      lastUsed: Date.now() - 1 * 60 * 60 * 1000,
      permissions: ['read:payments', 'write:payments', 'read:transactions'],
      status: 'active',
    },
    {
      id: 'key-002',
      key: 'sk_test_51234567890abcdefghijklmnop',
      maskedKey: 'sk_test_...nop',
      name: 'Development API Key',
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      lastUsed: Date.now() - 2 * 60 * 60 * 1000,
      permissions: ['read:payments', 'read:transactions'],
      status: 'active',
    },
    {
      id: 'key-003',
      key: 'sk_test_old_key_revoked',
      maskedKey: 'sk_test_...revoked',
      name: 'Old Test Key',
      createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
      lastUsed: null,
      permissions: [],
      status: 'revoked',
    },
  ];
}

function generateMockBulkJobs(): BulkPaymentJob[] {
  return [
    {
      id: 'job-001',
      filename: 'payroll_january_2024.csv',
      uploadedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      status: 'completed',
      totalRows: 150,
      successCount: 148,
      failureCount: 2,
      totalAmount: 75000,
    },
    {
      id: 'job-002',
      filename: 'contractors_december_2024.csv',
      uploadedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      status: 'completed',
      totalRows: 45,
      successCount: 45,
      failureCount: 0,
      totalAmount: 32500,
    },
    {
      id: 'job-003',
      filename: 'vendors_january_2024.csv',
      uploadedAt: Date.now() - 1 * 60 * 60 * 1000,
      status: 'processing',
      totalRows: 78,
      successCount: 45,
      failureCount: 0,
      totalAmount: 125000,
    },
  ];
}

// ==================== MAIN COMPONENT ====================

export default function MerchantPortal() {
  const [activeTab, setActiveTab] = useState('requests');
  const [paymentRequests, setPaymentRequests] = useState(generateMockPaymentRequests());
  const [revenueData, setRevenueData] = useState(generateMockRevenueData());
  const [apiKeys, setApiKeys] = useState(generateMockApiKeys());
  const [bulkJobs, setBulkJobs] = useState(generateMockBulkJobs());

  // Form states
  const [newRequest, setNewRequest] = useState({ amount: '', currency: 'USDC', email: '', description: '' });
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Calculate stats
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalTransactions = revenueData.reduce((sum, d) => sum + d.transactions, 0);
  const averageTransaction = totalRevenue / Math.max(totalTransactions, 1);

  const handleCreatePaymentRequest = () => {
    if (newRequest.amount && newRequest.email && newRequest.description) {
      const request: PaymentRequest = {
        id: `pr-${Date.now()}`,
        amount: parseFloat(newRequest.amount),
        currency: newRequest.currency,
        description: newRequest.description,
        recipientEmail: newRequest.email,
        status: 'pending',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
        paymentLink: `https://vfide.io/pay/pr-${Date.now()}`,
      };
      setPaymentRequests([request, ...paymentRequests]);
      setNewRequest({ amount: '', currency: 'USDC', email: '', description: '' });
    }
  };

  const handleGenerateApiKey = () => {
    if (newApiKeyName) {
      const newKey: ApiKey = {
        id: `key-${Date.now()}`,
        key: `sk_live_${Math.random().toString(36).slice(2)}`,
        maskedKey: `sk_live_...${Math.random().toString(36).slice(2).slice(-3)}`,
        name: newApiKeyName,
        createdAt: Date.now(),
        lastUsed: null,
        permissions: ['read:payments', 'write:payments', 'read:transactions'],
        status: 'active',
      };
      setApiKeys([newKey, ...apiKeys]);
      setNewApiKeyName('');
    }
  };

  const handleRevokeApiKey = (keyId: string) => {
    setApiKeys(apiKeys.map(key =>
      key.id === keyId ? { ...key, status: 'revoked' as const } : key
    ));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingFile(true);
      setTimeout(() => {
        const job: BulkPaymentJob = {
          id: `job-${Date.now()}`,
          filename: file.name,
          uploadedAt: Date.now(),
          status: 'processing',
          totalRows: Math.floor(Math.random() * 100 + 50),
          successCount: 0,
          failureCount: 0,
          totalAmount: Math.floor(Math.random() * 500000 + 50000),
        };
        setBulkJobs([job, ...bulkJobs]);
        setUploadingFile(false);
      }, 1500);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Merchant Portal
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage payments, revenue, and API integrations
        </p>
      </div>

      {/* Key Metrics */}
      <div className={`grid ${responsiveGrids.balanced} gap-4`}>
        <MetricCard
          label="Total Revenue (30d)"
          value={totalRevenue}
          type="currency"
          icon="💰"
        />
        <MetricCard
          label="Total Transactions"
          value={totalTransactions}
          type="number"
          icon="📊"
        />
        <MetricCard
          label="Average Transaction"
          value={averageTransaction}
          type="currency"
          icon="📈"
        />
        <MetricCard
          label="Pending Requests"
          value={paymentRequests.filter(r => r.status === 'pending').length}
          type="number"
          icon="⏳"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 md:gap-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'requests', label: 'Payment Requests', icon: '💳' },
          { id: 'revenue', label: 'Revenue', icon: '📈' },
          { id: 'bulk', label: 'Bulk Payments', icon: '📦' },
          { id: 'api', label: 'API Keys', icon: '🔑' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 md:px-6 py-3 whitespace-nowrap font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span className="hidden sm:inline">{tab.icon} {tab.label}</span>
            <span className="sm:hidden">{tab.icon}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' && (
        <PaymentRequestsSection
          requests={paymentRequests}
          newRequest={newRequest}
          setNewRequest={setNewRequest}
          onCreateRequest={handleCreatePaymentRequest}
        />
      )}

      {activeTab === 'revenue' && (
        <RevenueSection data={revenueData} />
      )}

      {activeTab === 'bulk' && (
        <BulkPaymentsSection
          jobs={bulkJobs}
          onUpload={handleFileUpload}
          uploading={uploadingFile}
        />
      )}

      {activeTab === 'api' && (
        <ApiKeysSection
          keys={apiKeys}
          newKeyName={newApiKeyName}
          setNewKeyName={setNewApiKeyName}
          onGenerateKey={handleGenerateApiKey}
          onRevokeKey={handleRevokeApiKey}
        />
      )}
    </div>
  );
}

// ==================== SECTION COMPONENTS ====================

function PaymentRequestsSection({
  requests,
  newRequest,
  setNewRequest,
  onCreateRequest,
}: {
  requests: PaymentRequest[];
  newRequest: any;
  setNewRequest: any;
  onCreateRequest: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Create New Request */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Create Payment Request
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MobileInput
            label="Recipient Email"
            type="email"
            placeholder="recipient@example.com"
            value={newRequest.email}
            onChange={(e) => setNewRequest({ ...newRequest, email: e.target.value })}
          />
          <MobileInput
            label="Amount"
            type="number"
            placeholder="1500"
            value={newRequest.amount}
            onChange={(e) => setNewRequest({ ...newRequest, amount: e.target.value })}
          />
          <MobileSelect
            label="Currency"
            options={[
              { value: 'USDC', label: 'USDC' },
              { value: 'ETH', label: 'Ethereum' },
              { value: 'BTC', label: 'Bitcoin' },
              { value: 'DAI', label: 'DAI' },
            ]}
            value={newRequest.currency}
            onChange={(value) => setNewRequest({ ...newRequest, currency: value })}
          />
          <MobileInput
            label="Description"
            placeholder="Monthly retainer for services..."
            value={newRequest.description}
            onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
          />
        </div>
        <MobileButton
          fullWidth
          onClick={onCreateRequest}
          className="mt-4"
        >
          Create Request
        </MobileButton>
      </div>

      {/* Requests List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Active Requests ({requests.length})
        </h2>
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueSection({ data }: { data: RevenueData[] }) {
  const [period, setPeriod] = React.useState('30d');

  // Calculate statistics
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);
  const avgDaily = totalRevenue / data.length;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {['7d', '30d', '90d'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className={`grid ${responsiveGrids.balanced} gap-4`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400 mb-2">
            Total Revenue
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            ${totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400 mb-2">
            Total Volume
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            ${totalVolume.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-400 mb-2">
            Daily Average
          </p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            ${avgDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Revenue Chart (Text-based since we have Recharts already) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Revenue Trend
        </h2>
        <div className="space-y-2">
          {data.slice(-7).map((day) => (
            <div key={day.date} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20">
                {day.date}
              </span>
              <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"
                  style={{ width: `${(day.revenue / 60000) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-28 text-right">
                ${day.revenue.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Revenue Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Detailed Revenue Report
        </h2>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Revenue</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Transactions</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">Volume</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(-10).reverse().map((day) => (
              <tr key={day.date} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-4 text-gray-900 dark:text-white">{day.date}</td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white font-medium">
                  ${day.revenue.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  {day.transactions}
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  ${day.volume.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkPaymentsSection({
  jobs,
  onUpload,
  uploading,
}: {
  jobs: BulkPaymentJob[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Upload Bulk Payments
        </h2>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            📁 Drop CSV file or click to upload
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={onUpload}
            disabled={uploading}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className={`
            block w-full min-h-[48px] text-base font-semibold rounded-lg
            transition-all active:scale-95 cursor-pointer text-center
            px-4 py-3 bg-[#00F0FF] text-[#1A1A1D] hover:bg-[#00D4FF]
            ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
          `}>
            {uploading ? '⏳ Uploading...' : '📤 Choose File'}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            CSV format: email, amount, currency, description
          </p>
        </div>
      </div>

      {/* Upload History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Upload History
        </h2>
        <div className="space-y-3">
          {jobs.map((job) => (
            <BulkJobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiKeysSection({
  keys,
  newKeyName,
  setNewKeyName,
  onGenerateKey,
  onRevokeKey,
}: {
  keys: ApiKey[];
  newKeyName: string;
  setNewKeyName: (name: string) => void;
  onGenerateKey: () => void;
  onRevokeKey: (keyId: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Generate New Key */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Generate New API Key
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <MobileInput
            label="Key Name"
            placeholder="Production API Key"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1"
          />
          <div className="pt-6">
            <MobileButton onClick={onGenerateKey}>
              Generate
            </MobileButton>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Your API Keys
        </h2>
        <div className="space-y-3">
          {keys.map((key) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onRevoke={() => onRevokeKey(key.id)}
            />
          ))}
        </div>
      </div>

      {/* API Documentation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 md:p-6 border border-blue-200 dark:border-blue-700">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">📚 API Documentation</h3>
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
          Learn how to integrate VFIDE API into your application
        </p>
        <a
          href="/docs/api"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          View Documentation
        </a>
      </div>
    </div>
  );
}

// ==================== CARD COMPONENTS ====================

function MetricCard({
  label,
  value,
  type,
  icon,
}: {
  label: string;
  value: number;
  type: 'currency' | 'number';
  icon: string;
}) {
  const formatted = type === 'currency'
    ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : value.toLocaleString();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
            {formatted}
          </p>
        </div>
        <span className="text-2xl md:text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function RequestCard({ request }: { request: PaymentRequest }) {
  const statusColors = {
    pending: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300',
    sent: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300',
    completed: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300',
    expired: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300',
  };

  const daysUntilExpiry = Math.ceil((request.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));

  return (
    <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">
            {request.amount} {request.currency} · {request.description}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
            {request.recipientEmail}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Created {new Date(request.createdAt).toLocaleDateString()}
            {request.status !== 'completed' && ` · Expires in ${daysUntilExpiry} days`}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[request.status]}`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          {request.status === 'pending' && (
            <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Copy Link
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkJobCard({ job }: { job: BulkPaymentJob }) {
  const progress = (job.successCount / job.totalRows) * 100;

  return (
    <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">
            📄 {job.filename}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {job.successCount} of {job.totalRows} processed · Total: ${job.totalAmount.toLocaleString()}
          </p>
          {job.status === 'processing' && (
            <div className="mt-2 w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            job.status === 'processing'
              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
              : job.status === 'completed'
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
          }`}>
            {job.status === 'processing' ? '⏳ Processing' : job.status === 'completed' ? '✅ Completed' : '❌ Failed'}
          </span>
        </div>
      </div>
    </div>
  );
}

function ApiKeyCard({
  apiKey,
  onRevoke,
}: {
  apiKey: ApiKey;
  onRevoke: () => void;
}) {
  const [showKey, setShowKey] = React.useState(false);

  return (
    <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-bold text-gray-900 dark:text-white">
              {apiKey.name}
            </p>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              apiKey.status === 'active'
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-300'
            }`}>
              {apiKey.status}
            </span>
          </div>
          <p className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all">
            {showKey ? apiKey.key : apiKey.maskedKey}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Created {new Date(apiKey.createdAt).toLocaleDateString()}
            {apiKey.lastUsed && ` · Last used ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          {apiKey.status === 'active' && (
            <>
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={onRevoke}
                className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Revoke
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
