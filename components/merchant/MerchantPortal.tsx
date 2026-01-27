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
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { MobileButton, MobileInput, MobileSelect } from '@/components/mobile/MobileForm';
import { responsiveGrids } from '@/lib/mobile';
import { safeParseFloat } from '@/lib/validation';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { Key, Upload, CreditCard, BarChart3, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

// Animated counter
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    const num = Math.round(latest);
    return num.toLocaleString();
  });
  const [displayValue, setDisplayValue] = useState('0');
  
  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, ease: 'easeOut' });
    return controls.stop;
  }, [value, count]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [rounded]);
  
  return <motion.span>{prefix}{displayValue}{suffix}</motion.span>;
}

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

type NewPaymentRequest = {
  amount: string;
  currency: string;
  email: string;
  description: string;
};

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
      key: 'sk_test_example1234567890abcdefghijklmnop',
      maskedKey: 'sk_test_...nop',
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
  const [revenueData, _setRevenueData] = useState(generateMockRevenueData());
  const [apiKeys, setApiKeys] = useState(generateMockApiKeys());
  const [bulkJobs, setBulkJobs] = useState(generateMockBulkJobs());

  // Form states
  const [newRequest, setNewRequest] = useState<NewPaymentRequest>({
    amount: '',
    currency: 'USDC',
    email: '',
    description: '',
  });
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const { playSuccess, playNotification, playError } = useTransactionSounds();

  // Calculate stats
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalTransactions = revenueData.reduce((sum, d) => sum + d.transactions, 0);
  const averageTransaction = totalRevenue / Math.max(totalTransactions, 1);

  const handleCreatePaymentRequest = () => {
    if (newRequest.amount && newRequest.email && newRequest.description) {
      const request: PaymentRequest = {
        id: `pr-${Date.now()}`,
        amount: safeParseFloat(newRequest.amount, 0),
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
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Merchant Portal
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage payments, revenue, and API integrations
        </p>
      </motion.div>

      {/* Key Metrics */}
      <div className={`grid ${responsiveGrids.balanced} gap-4`}>
        {[
          { label: 'Total Revenue (30d)', value: totalRevenue, type: 'currency', icon: '💰' },
          { label: 'Total Transactions', value: totalTransactions, type: 'number', icon: '📊' },
          { label: 'Average Transaction', value: averageTransaction, type: 'currency', icon: '📈' },
          { label: 'Pending Requests', value: paymentRequests.filter(r => r.status === 'pending').length, type: 'number', icon: '⏳' }
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <MetricCard
              label={metric.label}
              value={metric.value}
              type={metric.type as 'currency' | 'number'}
              icon={metric.icon}
            />
          </motion.div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 md:gap-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'requests', label: 'Payment Requests', icon: CreditCard },
          { id: 'revenue', label: 'Revenue', icon: BarChart3 },
          { id: 'bulk', label: 'Bulk Payments', icon: Upload },
          { id: 'api', label: 'API Keys', icon: Key },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              playNotification();
            }}
            className={`px-4 md:px-6 py-3 whitespace-nowrap font-medium border-b-2 relative ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 border-transparent'
            }`}
            whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
            {activeTab === tab.id && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                layoutId="activeTab"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'requests' && (
            <PaymentRequestsSection
              requests={paymentRequests}
              newRequest={newRequest}
              setNewRequest={setNewRequest}
              onCreateRequest={() => {
                handleCreatePaymentRequest();
                playSuccess();
              }}
            />
          )}

          {activeTab === 'revenue' && (
            <RevenueSection data={revenueData} />
          )}

          {activeTab === 'bulk' && (
            <BulkPaymentsSection
              jobs={bulkJobs}
              onUpload={(e) => {
                handleFileUpload(e);
                playNotification();
              }}
              uploading={uploadingFile}
            />
          )}

          {activeTab === 'api' && (
            <ApiKeysSection
              keys={apiKeys}
              newKeyName={newApiKeyName}
              setNewKeyName={setNewApiKeyName}
              onGenerateKey={() => {
                handleGenerateApiKey();
                playSuccess();
              }}
              onRevokeKey={(id) => {
                handleRevokeApiKey(id);
                playError();
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
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
  newRequest: NewPaymentRequest;
  setNewRequest: (request: NewPaymentRequest) => void;
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
            onChange={(e) => setNewRequest({ ...newRequest, currency: e.target.value })}
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
                  className="h-full bg-linear-to-r from-blue-500 to-purple-600 rounded-lg"
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
            block w-full min-h-12 text-base font-semibold rounded-lg
            transition-all active:scale-95 cursor-pointer text-center
            px-4 py-3 bg-cyan-400 text-zinc-900 hover:bg-cyan-400
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
          href="/docs"
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
  const _formatted = type === 'currency'
    ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : value.toLocaleString();

  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      whileHover={{ scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.5)' }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
            <AnimatedCounter value={value} prefix={type === 'currency' ? '$' : ''} />
          </p>
        </div>
        <motion.span 
          className="text-2xl md:text-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
        >
          {icon}
        </motion.span>
      </div>
    </motion.div>
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
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: 'rgba(59, 130, 246, 0.5)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-bold text-gray-900 dark:text-white">
              {apiKey.name}
            </p>
            <motion.span 
              className={`px-2 py-1 rounded text-xs font-medium ${
                apiKey.status === 'active'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-300'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {apiKey.status}
            </motion.span>
          </div>
          <motion.p 
            className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all"
            animate={{ opacity: showKey ? 1 : 0.7 }}
          >
            {showKey ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {apiKey.key}
              </motion.span>
            ) : (
              apiKey.maskedKey
            )}
          </motion.p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Created {new Date(apiKey.createdAt).toLocaleDateString()}
            {apiKey.lastUsed && ` · Last used ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          {apiKey.status === 'active' && (
            <>
              <motion.button
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showKey ? 'Hide' : 'Show'}
              </motion.button>
              <motion.button
                onClick={handleCopy}
                className="px-3 py-1 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex items-center gap-1"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </motion.button>
              <motion.button
                onClick={onRevoke}
                className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Revoke
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
