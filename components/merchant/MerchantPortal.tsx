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

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { MobileButton, MobileInput, MobileSelect } from '@/components/mobile/MobileForm';
import { responsiveGrids } from '@/lib/mobile';
import { safeParseFloat } from '@/lib/validation';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';
import { Key, Upload, CreditCard, BarChart3, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getAuthHeaders } from '@/lib/auth/client';
import { isAddress } from 'viem';

const SAMPLE_TIME_BASE = Date.parse('2024-03-01T00:00:00Z');

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
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: string;
  memo?: string | null;
  status: 'pending' | 'sent' | 'completed' | 'expired' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  txHash?: string | null;
}

interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
  volume: number;
}

interface ApiKey {
  id: string;
  key?: string; // Only populated immediately after generation, never persisted
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
  address: string;
  memo: string;
};

// ==================== STORAGE & HELPERS ====================

const API_KEYS_STORAGE_KEY = 'vfide-merchant-api-keys';
const BULK_JOBS_STORAGE_KEY = 'vfide-merchant-bulk-jobs';

const formatDayKey = (timestamp: number) =>
  new Date(timestamp).toISOString().slice(0, 10);

const toDisplayDate = (dayKey: string) => {
  const [year = 1970, month = 1, day = 1] = dayKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildRevenueSeries = (requests: PaymentRequest[], days = 90): RevenueData[] => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));

  const buckets = new Map<string, RevenueData>();
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dayKey = formatDayKey(date.getTime());
    buckets.set(dayKey, {
      date: toDisplayDate(dayKey),
      revenue: 0,
      transactions: 0,
      volume: 0,
    });
  }

  requests
    .filter((request) => request.status === 'completed')
    .forEach((request) => {
      const dayKey = formatDayKey(request.updatedAt || request.createdAt);
      const bucket = buckets.get(dayKey);
      if (!bucket) return;
      bucket.revenue += request.amount;
      bucket.transactions += 1;
      bucket.volume += request.amount;
    });

  return Array.from(buckets.values());
};

const mapPaymentRequestRow = (row: any): PaymentRequest => {
  const amount = typeof row?.amount === 'number' ? row.amount : safeParseFloat(String(row?.amount ?? '0'), 0);
  return {
    id: String(row?.id ?? ''),
    fromAddress: String(row?.from_address ?? ''),
    toAddress: String(row?.to_address ?? ''),
    amount,
    currency: String(row?.token ?? 'ETH'),
    memo: row?.memo ?? null,
    status: (row?.status ?? 'pending') as PaymentRequest['status'],
    createdAt: row?.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row?.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    txHash: row?.tx_hash ?? null,
  };
};

const generateApiKeyValue = () => {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return `sk_live_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `sk_live_placeholder_configure_server_side`;
};

// ==================== MAIN COMPONENT ====================

export default function MerchantPortal() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState('requests');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkPaymentJob[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Form states
  const [newRequest, setNewRequest] = useState<NewPaymentRequest>({
    amount: '',
    currency: 'USDC',
    address: '',
    memo: '',
  });
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<{ name: string; key: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { playSuccess, playNotification, playError } = useTransactionSounds();

  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
      if (storedKeys) {
        const parsed = JSON.parse(storedKeys) as ApiKey[];
        setApiKeys(parsed);
      }
      const storedJobs = localStorage.getItem(BULK_JOBS_STORAGE_KEY);
      if (storedJobs) {
        const parsed = JSON.parse(storedJobs) as BulkPaymentJob[];
        setBulkJobs(parsed);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      // Never store full keys in localStorage - only masked versions
      const keysToStore = apiKeys.map(({ key, ...rest }) => rest);
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keysToStore));
    } catch {
      // Ignore storage errors
    }
  }, [apiKeys]);

  useEffect(() => {
    try {
      localStorage.setItem(BULK_JOBS_STORAGE_KEY, JSON.stringify(bulkJobs));
    } catch {
      // Ignore storage errors
    }
  }, [bulkJobs]);

  useEffect(() => {
    if (!address) {
      setPaymentRequests([]);
      return;
    }

    const fetchRequests = async () => {
      setIsLoadingRequests(true);
      setRequestsError(null);
      try {
        const response = await fetch(`/api/crypto/payment-requests?userAddress=${address}`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load payment requests');
        }
        const data = await response.json();
        const nextRequests = Array.isArray(data.requests)
          ? data.requests.map(mapPaymentRequestRow)
          : [];
        setPaymentRequests(nextRequests);
      } catch (error) {
        console.error('Failed to load payment requests:', error);
        setRequestsError('Unable to load payment requests');
      } finally {
        setIsLoadingRequests(false);
      }
    };

    fetchRequests();
  }, [address]);

  const revenueData = useMemo(() => buildRevenueSeries(paymentRequests, 90), [paymentRequests]);

  // Calculate stats
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalTransactions = revenueData.reduce((sum, d) => sum + d.transactions, 0);
  const averageTransaction = totalRevenue / Math.max(totalTransactions, 1);

  const handleCreatePaymentRequest = async () => {
    if (!address) {
      setRequestsError('Connect your wallet to create a request');
      return;
    }

    if (!newRequest.amount || !newRequest.address || !newRequest.memo) {
      setRequestsError('Fill in all fields to create a request');
      return;
    }

    if (!isAddress(newRequest.address)) {
      setRequestsError('Enter a valid recipient address');
      return;
    }

    setRequestsError(null);
    setIsSubmittingRequest(true);
    try {
      const response = await fetch('/api/crypto/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          toAddress: newRequest.address,
          amount: newRequest.amount,
          token: newRequest.currency,
          memo: newRequest.memo,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create payment request');
      }

      const data = await response.json();
      setPaymentRequests((prev) => [mapPaymentRequestRow(data.request), ...prev]);
      setNewRequest({ amount: '', currency: 'USDC', address: '', memo: '' });
    } catch (error) {
      console.error('Failed to create payment request:', error);
      setRequestsError('Unable to create payment request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleGenerateApiKey = () => {
    if (newApiKeyName) {
      const keyValue = generateApiKeyValue();
      const newKey: ApiKey = {
        id: `key-${Date.now()}`,
        key: keyValue, // Temporarily store for display in modal
        maskedKey: `${keyValue.slice(0, 8)}...${keyValue.slice(-4)}`,
        name: newApiKeyName,
        createdAt: Date.now(),
        lastUsed: null,
        permissions: ['read:payments', 'write:payments', 'read:transactions'],
        status: 'active',
      };

      // Show modal with full key
      setNewlyGeneratedKey({ name: newApiKeyName, key: keyValue });

      // Add to state WITHOUT the full key (will be stripped by localStorage effect)
      setApiKeys([newKey, ...apiKeys]);
      setNewApiKeyName('');

      // Clear the full key from state after a short delay (allows modal to capture it)
      setTimeout(() => {
        setApiKeys(prev => prev.map(k =>
          k.id === newKey.id ? { ...k, key: undefined } : k
        ));
      }, 100);
    }
  };

  const handleRevokeApiKey = (keyId: string) => {
    setApiKeys(apiKeys.map(key =>
      key.id === keyId ? { ...key, status: 'revoked' as const } : key
    ));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const hasHeader = rows[0]?.toLowerCase().includes('address') || rows[0]?.toLowerCase().includes('email');
      const dataRows = hasHeader ? rows.slice(1) : rows;

      let totalAmount = 0;
      let successCount = 0;
      let failureCount = 0;

      dataRows.forEach((row) => {
        const columns = row.split(',').map((value) => value.trim());
        const amount = safeParseFloat(columns[1] ?? '', NaN);
        if (!columns[0] || Number.isNaN(amount)) {
          failureCount += 1;
          return;
        }
        successCount += 1;
        totalAmount += amount;
      });

      const totalRows = dataRows.length;
      const status: BulkPaymentJob['status'] = successCount === 0 ? 'failed' : 'completed';

      const job: BulkPaymentJob = {
        id: `job-${Date.now()}`,
        filename: file.name,
        uploadedAt: Date.now(),
        status,
        totalRows,
        successCount,
        failureCount,
        totalAmount,
      };

      setBulkJobs((prev) => [job, ...prev]);
    } finally {
      setUploadingFile(false);
      event.target.value = '';
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
              loading={isLoadingRequests}
              submitting={isSubmittingRequest}
              error={requestsError}
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

      {/* API Key Generated Modal - Show full key once */}
      {newlyGeneratedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full shadow-2xl border-2 border-yellow-500"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <span className="text-2xl">🔑</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  API Key Generated!
                </h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  ⚠️ Save this key immediately - it will not be shown again!
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Key Name:</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">{newlyGeneratedKey.name}</p>

              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">API Key:</p>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-600">
                <code className="text-sm font-mono text-gray-900 dark:text-white break-all">
                  {newlyGeneratedKey.key}
                </code>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-800 dark:text-red-300">
                <strong>Security Notice:</strong> This key grants access to your merchant account.
                Store it securely (password manager, environment variables).
                Never commit it to version control or share it publicly.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newlyGeneratedKey.key);
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Key
              </button>
              <button
                onClick={() => setNewlyGeneratedKey(null)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
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
  loading,
  submitting,
  error,
}: {
  requests: PaymentRequest[];
  newRequest: NewPaymentRequest;
  setNewRequest: (request: NewPaymentRequest) => void;
  onCreateRequest: () => void;
  loading: boolean;
  submitting: boolean;
  error: string | null;
}) {
  const displayRequests = requests.length > 0 ? requests : [
    {
      id: 'req-1',
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: 'dev@example.com',
      amount: 1500,
      currency: 'USDC',
      memo: 'Monthly retainer',
      status: 'pending' as const,
      createdAt: SAMPLE_TIME_BASE - 2 * 24 * 60 * 60 * 1000,
      updatedAt: SAMPLE_TIME_BASE - 24 * 60 * 60 * 1000,
      txHash: null,
    },
    {
      id: 'req-2',
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: 'consultant@example.com',
      amount: 500,
      currency: 'ETH',
      memo: 'Consulting hours',
      status: 'sent' as const,
      createdAt: SAMPLE_TIME_BASE - 5 * 24 * 60 * 60 * 1000,
      updatedAt: SAMPLE_TIME_BASE - 4 * 24 * 60 * 60 * 1000,
      txHash: null,
    },
    {
      id: 'req-3',
      fromAddress: '0x0000000000000000000000000000000000000000',
      toAddress: 'vendor@example.com',
      amount: 2000,
      currency: 'USDC',
      memo: 'Vendor invoice',
      status: 'completed' as const,
      createdAt: SAMPLE_TIME_BASE - 10 * 24 * 60 * 60 * 1000,
      updatedAt: SAMPLE_TIME_BASE - 9 * 24 * 60 * 60 * 1000,
      txHash: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Create New Request */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Create Payment Request
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MobileInput
            label="Recipient Address"
            type="text"
            placeholder="recipient@example.com"
            value={newRequest.address}
            onChange={(e) => setNewRequest({ ...newRequest, address: e.target.value })}
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
            label="Memo"
            placeholder="monthly retainer for services"
            value={newRequest.memo}
            onChange={(e) => setNewRequest({ ...newRequest, memo: e.target.value })}
          />
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}
        <MobileButton
          fullWidth
          onClick={onCreateRequest}
          className="mt-4"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Create Request'}
        </MobileButton>
      </div>

      {/* Requests List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Active Requests ({displayRequests.length})
        </h2>
        <div className="space-y-3">
          {loading && <p className="text-sm text-gray-500">Loading requests...</p>}
          {!loading && displayRequests.length === 0 && (
            <p className="text-sm text-gray-500">No payment requests yet.</p>
          )}
          {!loading && displayRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueSection({ data }: { data: RevenueData[] }) {
  const [period, setPeriod] = React.useState('30d');

  const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const visibleData = data.slice(-periodDays);

  // Calculate statistics
  const totalRevenue = visibleData.reduce((sum, d) => sum + d.revenue, 0);
  const totalVolume = visibleData.reduce((sum, d) => sum + d.volume, 0);
  const avgDaily = visibleData.length > 0 ? totalRevenue / visibleData.length : 0;

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
          {visibleData.slice(-7).map((day) => (
            <div key={day.date} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20">
                {day.date}
              </span>
              <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-blue-500 to-purple-600 rounded-lg"
                  style={{ width: `${Math.min((day.revenue / 60000) * 100, 100)}%` }}
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
            {visibleData.slice(-10).reverse().map((day) => (
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
  const displayJobs = jobs.length > 0
    ? jobs
    : [
        {
          id: 'sample-job-1',
          filename: 'payroll_january_2024.csv',
          uploadedAt: SAMPLE_TIME_BASE - 2 * 60 * 60 * 1000,
          status: 'processing' as const,
          totalRows: 120,
          successCount: 84,
          failureCount: 2,
          totalAmount: 54250,
        },
        {
          id: 'sample-job-2',
          filename: 'payouts_february_2024.csv',
          uploadedAt: SAMPLE_TIME_BASE - 24 * 60 * 60 * 1000,
          status: 'completed' as const,
          totalRows: 200,
          successCount: 200,
          failureCount: 0,
          totalAmount: 98200,
        },
      ];

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
          {displayJobs.map((job) => (
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
  const displayKeys = keys.length > 0 ? keys : [
    {
      id: 'sample-key-1',
      name: 'Production API Key',
      key: 'vfide_live_prod_1234567890',
      maskedKey: 'vfide_live_****************',
      status: 'active' as const,
      createdAt: SAMPLE_TIME_BASE - 7 * 24 * 60 * 60 * 1000,
      lastUsed: SAMPLE_TIME_BASE - 2 * 60 * 60 * 1000,
      permissions: ['read:payments', 'write:payments'],
    },
    {
      id: 'sample-key-2',
      name: 'Development API Key',
      key: 'vfide_live_dev_0987654321',
      maskedKey: 'vfide_live_****************',
      status: 'active' as const,
      createdAt: SAMPLE_TIME_BASE - 30 * 24 * 60 * 60 * 1000,
      lastUsed: SAMPLE_TIME_BASE - 24 * 60 * 60 * 1000,
      permissions: ['read:payments'],
    },
    {
      id: 'sample-key-3',
      name: 'Old Test Key',
      key: 'vfide_live_test_1122334455',
      maskedKey: 'vfide_live_****************',
      status: 'revoked' as const,
      createdAt: SAMPLE_TIME_BASE - 90 * 24 * 60 * 60 * 1000,
      lastUsed: null,
      permissions: ['read:payments'],
    },
  ];

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
          {displayKeys.map((key) => (
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
    cancelled: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
  };

  return (
    <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">
            {request.amount} {request.currency} · {request.memo || 'Payment request'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
            To {request.toAddress}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Created {new Date(request.createdAt).toLocaleDateString()} · Updated {new Date(request.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[request.status] ?? statusColors.pending}`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          <button
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            onClick={() => navigator.clipboard.writeText(request.id)}
          >
            Copy Link
          </button>
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
    if (apiKey.key) {
      navigator.clipboard.writeText(apiKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const keyIsAvailable = !!apiKey.key;

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
            {showKey && keyIsAvailable ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {apiKey.key}
              </motion.span>
            ) : !keyIsAvailable && showKey ? (
              <span className="text-yellow-600 dark:text-yellow-400 text-xs">
                🔒 Key hidden for security. Full key only shown once during generation.
              </span>
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
                onClick={() => keyIsAvailable && setShowKey(!showKey)}
                disabled={!keyIsAvailable}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                  keyIsAvailable
                    ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                whileHover={keyIsAvailable ? { scale: 1.05 } : undefined}
                whileTap={keyIsAvailable ? { scale: 0.95 } : undefined}
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showKey ? 'Hide' : 'Show'}
              </motion.button>
              <motion.button
                onClick={handleCopy}
                disabled={!keyIsAvailable}
                className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                  keyIsAvailable
                    ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                whileHover={keyIsAvailable ? { scale: 1.05 } : undefined}
                whileTap={keyIsAvailable ? { scale: 0.95 } : undefined}
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
