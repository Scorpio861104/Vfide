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
import { Key, Upload, CreditCard, BarChart3, Bell, FileText, Repeat, Package, ShoppingCart, Star, Calendar, Download } from 'lucide-react';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getAuthHeaders } from '@/lib/auth/client';
import { isAddress } from 'viem';

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

const generateApiKeyRequestId = () => {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(10);
    window.crypto.getRandomValues(bytes);
    return `req_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `req_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
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
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<{ name: string; requestId: string } | null>(null);
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
      const requestId = generateApiKeyRequestId();
      const newKey: ApiKey = {
        id: `key-${Date.now()}`,
        maskedKey: `pending_${requestId.slice(-8)}`,
        name: newApiKeyName,
        createdAt: Date.now(),
        lastUsed: null,
        permissions: ['read:payments', 'write:payments'],
        status: 'inactive',
      };

      // Display request receipt only; actual secrets must be generated server-side.
      setNewlyGeneratedKey({ name: newApiKeyName, requestId });
      setApiKeys([newKey, ...apiKeys]);
      setNewApiKeyName('');
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
          { id: 'products', label: 'Products', icon: Package },
          { id: 'orders', label: 'Orders', icon: ShoppingCart },
          { id: 'invoices', label: 'Invoices', icon: FileText },
          { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
          { id: 'reviews', label: 'Reviews', icon: Star },
          { id: 'bookings', label: 'Bookings', icon: Calendar },
          { id: 'digital', label: 'Digital Goods', icon: Download },
          { id: 'webhooks', label: 'Webhooks', icon: Bell },
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

          {activeTab === 'products' && address && (
            <ProductsSection merchantAddress={address} />
          )}

          {activeTab === 'orders' && address && (
            <OrdersSection merchantAddress={address} />
          )}

          {activeTab === 'invoices' && address && (
            <InvoicesSection merchantAddress={address} />
          )}

          {activeTab === 'subscriptions' && address && (
            <SubscriptionsSection merchantAddress={address} />
          )}

          {activeTab === 'reviews' && address && (
            <ReviewsSection merchantAddress={address} />
          )}

          {activeTab === 'bookings' && address && (
            <BookingsSection merchantAddress={address} />
          )}

          {activeTab === 'digital' && address && (
            <DigitalGoodsSection merchantAddress={address} />
          )}

          {activeTab === 'webhooks' && address && (
            <WebhooksSection merchantAddress={address} />
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

      {/* API Key Request Modal */}
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
                  API Key Request Submitted
                </h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  🔒 Keys are issued by backend services and never generated in browser memory.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Key Name:</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">{newlyGeneratedKey.name}</p>

              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Request ID:</p>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-600">
                <code className="text-sm font-mono text-gray-900 dark:text-white break-all">
                  {newlyGeneratedKey.requestId}
                </code>
              </div>
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                Use this request ID to track issuance with your backend admin flow. Your live secret is never shown in this browser.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-800 dark:text-red-300">
                <strong>Security Notice:</strong> Retrieve the issued key only from a secure backend workflow.
                Never generate, store, or export live API secrets from browser state.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setNewlyGeneratedKey(null)}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
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
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 24 * 60 * 60 * 1000,
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
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
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
      createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
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
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 table-responsive"
        role="region"
        aria-label="Revenue report table"
        tabIndex={0}
      >
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
          uploadedAt: Date.now() - 2 * 60 * 60 * 1000,
          status: 'processing' as const,
          totalRows: 120,
          successCount: 84,
          failureCount: 2,
          totalAmount: 54250,
        },
        {
          id: 'sample-job-2',
          filename: 'payouts_february_2024.csv',
          uploadedAt: Date.now() - 24 * 60 * 60 * 1000,
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
      name: 'Production Key (Issued)',
      maskedKey: 'issued_live_************',
      status: 'active' as const,
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      lastUsed: Date.now() - 2 * 60 * 60 * 1000,
      permissions: ['read:payments', 'write:payments'],
    },
    {
      id: 'sample-key-2',
      name: 'Staging Key (Issued)',
      maskedKey: 'issued_stage_***********',
      status: 'inactive' as const,
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      lastUsed: Date.now() - 24 * 60 * 60 * 1000,
      permissions: ['read:payments'],
    },
    {
      id: 'sample-key-3',
      name: 'Old Test Key',
      key: 'vfide_live_test_1122334455',
      maskedKey: 'vfide_live_****************',
      status: 'revoked' as const,
      createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
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
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Submit a key request here, then retrieve the issued secret from your secure backend credential process.
        </p>
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
            animate={{ opacity: 0.85 }}
          >
            {apiKey.maskedKey}
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

// ==================== NEW FEATURE SECTIONS ====================

interface WebhookEndpoint {
  id: number;
  url: string;
  events: string[];
  description: string;
  status: string;
  failure_count: number;
  created_at: string;
}

function WebhooksSection({ merchantAddress }: { merchantAddress: string }) {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['payment.completed']);
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shownSecret, setShownSecret] = useState<string | null>(null);

  const allEventTypes = [
    'payment.completed', 'payment.failed', 'refund.initiated', 'refund.completed',
    'escrow.created', 'escrow.funded', 'escrow.released', 'escrow.disputed',
    'invoice.created', 'invoice.paid', 'invoice.overdue',
    'subscription.created', 'subscription.renewed', 'subscription.cancelled',
    'merchant.suspended', 'merchant.reinstated',
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/merchant/webhooks', {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setEndpoints(data.endpoints || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [merchantAddress]);

  const handleCreate = async () => {
    if (!newUrl || newEvents.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ url: newUrl, events: newEvents, description: newDescription }),
      });
      if (res.ok) {
        const data = await res.json();
        setShownSecret(data.secret);
        setEndpoints(prev => [data.endpoint, ...prev]);
        setNewUrl('');
        setNewDescription('');
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch('/api/merchant/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setEndpoints(prev => prev.filter(e => e.id !== id));
      }
    } catch { /* ignore */ }
  };

  const toggleEvent = (event: string) => {
    setNewEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      {/* Create Webhook */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Add Webhook Endpoint
        </h2>
        <div className="space-y-4">
          <MobileInput
            label="Endpoint URL (HTTPS)"
            placeholder="https://your-server.com/webhook"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <MobileInput
            label="Description"
            placeholder="Order fulfillment webhook"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</p>
            <div className="flex flex-wrap gap-2">
              {allEventTypes.map(event => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    newEvents.includes(event)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <MobileButton onClick={handleCreate} disabled={submitting || !newUrl}>
            {submitting ? 'Creating...' : 'Create Endpoint'}
          </MobileButton>
        </div>
      </div>

      {/* Shown Secret (one-time) */}
      {shownSecret && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-300 dark:border-yellow-700">
          <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300 mb-2">
            Webhook Signing Secret (shown once — copy now!)
          </p>
          <code className="text-sm font-mono break-all text-yellow-900 dark:text-yellow-200">
            {shownSecret}
          </code>
          <div className="mt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(shownSecret);
                setShownSecret(null);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Copy & Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Endpoints List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Webhook Endpoints ({endpoints.length})
        </h2>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && endpoints.length === 0 && (
          <p className="text-sm text-gray-500">No webhook endpoints configured.</p>
        )}
        <div className="space-y-3">
          {endpoints.map(ep => (
            <div key={ep.id} className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{ep.url}</p>
                  {ep.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ep.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ep.events.map(e => (
                      <span key={e} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {e}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Status: {ep.status} · Failures: {ep.failure_count}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ep.id)}
                  className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_address: string;
  status: string;
  total: number;
  currency_display: string;
  payment_link_id: string;
  created_at: string;
  due_date: string | null;
}

function InvoicesSection({ merchantAddress }: { merchantAddress: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customer_name: '',
    customer_address: '',
    token: 'VFIDE',
    memo: '',
    tax_rate: '0',
    items: [{ description: '', quantity: '1', unit_price: '' }],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async () => {
    try {
      const url = statusFilter
        ? `/api/merchant/invoices?status=${statusFilter}`
        : '/api/merchant/invoices';
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, [merchantAddress, statusFilter]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const items = newInvoice.items
        .filter(i => i.description && i.unit_price)
        .map(i => ({
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price),
        }));
      const res = await fetch('/api/merchant/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          customer_name: newInvoice.customer_name,
          customer_address: newInvoice.customer_address || undefined,
          token: newInvoice.token,
          memo: newInvoice.memo || undefined,
          tax_rate: Number(newInvoice.tax_rate) || 0,
          items,
          send_immediately: true,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewInvoice({
          customer_name: '', customer_address: '', token: 'VFIDE', memo: '', tax_rate: '0',
          items: [{ description: '', quantity: '1', unit_price: '' }],
        });
        fetchInvoices();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const addLineItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: '1', unit_price: '' }],
    }));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    sent: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
    viewed: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300',
    paid: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
    overdue: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300',
    cancelled: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2">
          {['', 'draft', 'sent', 'paid', 'overdue'].map(s => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <MobileButton onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Invoice'}
        </MobileButton>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Invoice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <MobileInput label="Customer Name" value={newInvoice.customer_name}
              onChange={(e) => setNewInvoice(prev => ({ ...prev, customer_name: e.target.value }))} />
            <MobileInput label="Customer Wallet (optional)" placeholder="0x..."
              value={newInvoice.customer_address}
              onChange={(e) => setNewInvoice(prev => ({ ...prev, customer_address: e.target.value }))} />
            <MobileInput label="Tax Rate (%)" type="number" value={newInvoice.tax_rate}
              onChange={(e) => setNewInvoice(prev => ({ ...prev, tax_rate: e.target.value }))} />
            <MobileInput label="Memo" value={newInvoice.memo}
              onChange={(e) => setNewInvoice(prev => ({ ...prev, memo: e.target.value }))} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Line Items</h3>
          {newInvoice.items.map((item, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <MobileInput placeholder="Description" value={item.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)} />
              <MobileInput placeholder="Qty" type="number" value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
              <MobileInput placeholder="Unit Price" type="number" value={item.unit_price}
                onChange={(e) => updateItem(i, 'unit_price', e.target.value)} />
            </div>
          ))}
          <button onClick={addLineItem} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-4">
            + Add Line Item
          </button>
          <MobileButton fullWidth onClick={handleCreate} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create & Send Invoice'}
          </MobileButton>
        </div>
      )}

      {/* Invoices List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Invoices ({invoices.length})
        </h2>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && invoices.length === 0 && (
          <p className="text-sm text-gray-500">No invoices found.</p>
        )}
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {inv.invoice_number} · {inv.customer_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {inv.total} {inv.currency_display}
                    {inv.due_date && ` · Due ${new Date(inv.due_date).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[inv.status] || ''}`}>
                    {inv.status}
                  </span>
                  {inv.payment_link_id && (
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/checkout/${inv.payment_link_id}`)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Copy Payment Link
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  token: string;
  amount: number;
  interval: string;
  trial_days: number;
  max_subscribers: number | null;
  active_subscribers: number;
  status: string;
  created_at: string;
}

function SubscriptionsSection({ merchantAddress }: { merchantAddress: string }) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '', description: '', token: 'VFIDE', amount: '',
    interval: 'monthly', trial_days: '0', max_subscribers: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/merchant/subscriptions', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, [merchantAddress]);

  const handleCreate = async () => {
    if (!newPlan.name || !newPlan.amount) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/merchant/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: newPlan.name,
          description: newPlan.description || undefined,
          token: newPlan.token,
          amount: Number(newPlan.amount),
          interval: newPlan.interval,
          trial_days: Number(newPlan.trial_days) || 0,
          max_subscribers: newPlan.max_subscribers ? Number(newPlan.max_subscribers) : undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewPlan({ name: '', description: '', token: 'VFIDE', amount: '', interval: 'monthly', trial_days: '0', max_subscribers: '' });
        fetchPlans();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleArchive = async (id: number) => {
    try {
      await fetch('/api/merchant/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id, status: 'archived' }),
      });
      fetchPlans();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <MobileButton onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Plan'}
        </MobileButton>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create Subscription Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MobileInput label="Plan Name" placeholder="Pro Plan" value={newPlan.name}
              onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))} />
            <MobileInput label="Amount" type="number" placeholder="10" value={newPlan.amount}
              onChange={(e) => setNewPlan(prev => ({ ...prev, amount: e.target.value }))} />
            <MobileSelect label="Interval"
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
              value={newPlan.interval}
              onChange={(e) => setNewPlan(prev => ({ ...prev, interval: e.target.value }))} />
            <MobileInput label="Trial Days" type="number" value={newPlan.trial_days}
              onChange={(e) => setNewPlan(prev => ({ ...prev, trial_days: e.target.value }))} />
            <MobileInput label="Max Subscribers (empty = unlimited)" type="number" value={newPlan.max_subscribers}
              onChange={(e) => setNewPlan(prev => ({ ...prev, max_subscribers: e.target.value }))} />
            <MobileInput label="Description" value={newPlan.description}
              onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))} />
          </div>
          <MobileButton fullWidth onClick={handleCreate} disabled={submitting} className="mt-4">
            {submitting ? 'Creating...' : 'Create Plan'}
          </MobileButton>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Subscription Plans ({plans.length})
        </h2>
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {!loading && plans.length === 0 && (
          <p className="text-sm text-gray-500">No subscription plans yet.</p>
        )}
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white">{plan.name}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      plan.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-400'
                    }`}>{plan.status}</span>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plan.description}</p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {plan.amount} {plan.token} / {plan.interval}
                    {plan.trial_days > 0 && ` · ${plan.trial_days}d trial`}
                    {' · '}{plan.active_subscribers}{plan.max_subscribers ? `/${plan.max_subscribers}` : ''} subscribers
                  </p>
                </div>
                {plan.status === 'active' && (
                  <button
                    onClick={() => handleArchive(plan.id)}
                    className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Products Section ─── */
function ProductsSection({ merchantAddress }: { merchantAddress: string }) {
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: string; status: string; product_type: string; inventory_count: number | null; sold_count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', description: '', product_type: 'physical', platform_category_id: '' });
  const [platformCategories, setPlatformCategories] = useState<Array<{ id: number; name: string; slug: string; children?: Array<{ id: number; name: string; slug: string }> }>>([]);

  useEffect(() => {
    fetch(`/api/merchant/products?merchant=${encodeURIComponent(merchantAddress)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.products) setProducts(d.products); })
      .finally(() => setLoading(false));
    // Fetch platform categories for the dropdown
    fetch('/api/platform/categories')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.categories) setPlatformCategories(d.categories); })
      .catch(() => {});
  }, [merchantAddress]);

  const addProduct = async () => {
    if (!form.name || !form.price) return;
    const payload: Record<string, unknown> = { ...form, price: Number(form.price) };
    if (form.platform_category_id) payload.platform_category_id = Number(form.platform_category_id);
    else delete payload.platform_category_id;
    const res = await fetch('/api/merchant/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const d = await res.json();
      setProducts(prev => [d.product, ...prev]);
      setForm({ name: '', price: '', description: '', product_type: 'physical', platform_category_id: '' });
      setShowAdd(false);
    }
  };

  const archiveProduct = async (id: string) => {
    const res = await fetch(`/api/merchant/products?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) setProducts(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading products...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Product Catalog ({products.length})</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Add Product
        </button>
      </div>
      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <input placeholder="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <select value={form.product_type} onChange={e => setForm(f => ({ ...f, product_type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
            <option value="service">Service</option>
          </select>
          <select value={form.platform_category_id} onChange={e => setForm(f => ({ ...f, platform_category_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="">Marketplace Category (optional)</option>
            {platformCategories.map(cat => (
              <optgroup key={cat.id} label={cat.name}>
                <option value={cat.id}>{cat.name} (All)</option>
                {cat.children?.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button onClick={addProduct} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Save Product</button>
        </div>
      )}
      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
              <span className="ml-2 text-sm text-gray-500">${parseFloat(p.price).toFixed(2)}</span>
              <span className="ml-2 text-xs text-gray-400">{p.product_type}</span>
              {p.sold_count > 0 && <span className="ml-2 text-xs text-green-600">{p.sold_count} sold</span>}
            </div>
            <button onClick={() => archiveProduct(p.id)} className="text-xs text-red-500 hover:text-red-700">Archive</button>
          </div>
        ))}
        {products.length === 0 && <p className="text-center text-gray-400 py-4">No products yet</p>}
      </div>
    </div>
  );
}

/* ─── Orders Section ─── */
function OrdersSection({ merchantAddress }: { merchantAddress: string }) {
  const [orders, setOrders] = useState<Array<{ id: string; order_number: string; status: string; payment_status: string; total_amount: string; customer_address: string; created_at: string; items: Array<{ product_name: string; quantity: number }> }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/merchant/orders?role=merchant`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.orders) setOrders(d.orders); })
      .finally(() => setLoading(false));
  }, [merchantAddress]);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch('/api/merchant/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ order_id: id, status }),
    });
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    processing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
    shipped: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };

  const nextStatus: Record<string, string> = {
    pending: 'confirmed',
    confirmed: 'processing',
    processing: 'shipped',
    shipped: 'delivered',
    delivered: 'completed',
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading orders...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Orders ({orders.length})</h3>
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-mono font-medium text-gray-900 dark:text-white text-sm">{order.order_number}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>{order.status}</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">${parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {order.customer_address.slice(0, 6)}...{order.customer_address.slice(-4)} · {new Date(order.created_at).toLocaleDateString()}
            </p>
            <div className="text-xs text-gray-500 mb-2">
              {order.items?.map((item, i) => <span key={i}>{i > 0 && ', '}{item.product_name} ×{item.quantity}</span>)}
            </div>
            {(() => {
              const next = nextStatus[order.status];
              if (!next) return null;
              return (
                <button
                  onClick={() => updateStatus(order.id, next)}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Mark {next}
                </button>
              );
            })()}
          </div>
        ))}
        {orders.length === 0 && <p className="text-center text-gray-400 py-4">No orders yet</p>}
      </div>
    </div>
  );
}

/* ─── Reviews Section ─── */
function ReviewsSection({ merchantAddress }: { merchantAddress: string }) {
  const [reviews, setReviews] = useState<Array<{ id: string; rating: number; title: string | null; body: string | null; reviewer_address: string; merchant_reply: string | null; created_at: string; product_name?: string }>>([]);
  const [stats, setStats] = useState<{ avg_rating: number; total_reviews: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/merchant/reviews?merchant=${encodeURIComponent(merchantAddress)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.reviews) setReviews(d.reviews);
        if (d?.stats) setStats(d.stats);
      })
      .finally(() => setLoading(false));
  }, [merchantAddress]);

  const submitReply = async (reviewId: string) => {
    const reply = replyText[reviewId];
    if (!reply?.trim()) return;
    const res = await fetch('/api/merchant/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ review_id: reviewId, merchant_reply: reply }),
    });
    if (res.ok) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, merchant_reply: reply } : r));
      setReplyText(prev => { const n = { ...prev }; delete n[reviewId]; return n; });
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading reviews...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reviews</h3>
        {stats && (
          <span className="text-sm text-gray-500">
            ★ {stats.avg_rating.toFixed(1)} · {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {reviews.map(review => (
          <div key={review.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex">{[1,2,3,4,5].map(s => <span key={s} className={s <= review.rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>)}</div>
              <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
            </div>
            {review.title && <p className="font-medium text-gray-900 dark:text-white text-sm">{review.title}</p>}
            {review.body && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{review.body}</p>}
            <p className="text-xs text-gray-400 mt-1">{review.reviewer_address.slice(0, 6)}...{review.reviewer_address.slice(-4)}</p>
            {review.merchant_reply ? (
              <div className="mt-2 pl-3 border-l-2 border-blue-300 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Your Reply</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{review.merchant_reply}</p>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  placeholder="Write a reply..."
                  value={replyText[review.id] || ''}
                  onChange={e => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                  className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button onClick={() => submitReply(review.id)} className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Reply</button>
              </div>
            )}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-center text-gray-400 py-4">No reviews yet</p>}
      </div>
    </div>
  );
}

/* ─── Bookings Section ─── */
function BookingsSection({ merchantAddress }: { merchantAddress: string }) {
  const [bookings, setBookings] = useState<Array<{ id: string; customer_address: string; service_name: string; slot_date: string; start_time: string; end_time: string; status: string; notes: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/merchant/bookings?role=merchant`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.bookings) setBookings(d.bookings); })
      .finally(() => setLoading(false));
  }, [merchantAddress]);

  const updateBookingStatus = async (id: string, status: string) => {
    const res = await fetch('/api/merchant/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ booking_id: id, status }),
    });
    if (res.ok) setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading bookings...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bookings ({bookings.length})</h3>
      <div className="space-y-3">
        {bookings.map(b => (
          <div key={b.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-white text-sm">{b.service_name || 'Appointment'}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                b.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                b.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
              }`}>{b.status}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(b.slot_date).toLocaleDateString()} · {b.start_time} – {b.end_time}
            </p>
            <p className="text-xs text-gray-400 mt-1">{b.customer_address.slice(0, 6)}...{b.customer_address.slice(-4)}</p>
            {b.notes && <p className="text-xs text-gray-500 mt-1 italic">{b.notes}</p>}
            {b.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Confirm</button>
                <button onClick={() => updateBookingStatus(b.id, 'cancelled')} className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Cancel</button>
              </div>
            )}
          </div>
        ))}
        {bookings.length === 0 && <p className="text-center text-gray-400 py-4">No bookings yet</p>}
      </div>
    </div>
  );
}

/* ─── Digital Goods Section ─── */
function DigitalGoodsSection({ merchantAddress }: { merchantAddress: string }) {
  const [assets, setAssets] = useState<Array<{ id: string; product_name: string; file_name: string; file_size: number; license_keys_remaining: number; total_deliveries: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ product_id: '', file_name: '', file_url: '', file_size: '', license_keys: '' });

  useEffect(() => {
    fetch(`/api/merchant/digital?role=merchant`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.assets) setAssets(d.assets); })
      .finally(() => setLoading(false));
  }, [merchantAddress]);

  const addAsset = async () => {
    if (!form.product_id || !form.file_name || !form.file_url) return;
    const body: Record<string, unknown> = {
      product_id: form.product_id,
      file_name: form.file_name,
      file_url: form.file_url,
      file_size: parseInt(form.file_size) || 0,
    };
    if (form.license_keys.trim()) {
      body.license_keys = form.license_keys.split('\n').map(k => k.trim()).filter(Boolean);
    }
    const res = await fetch('/api/merchant/digital', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setAssets(prev => [d.asset, ...prev]);
      setForm({ product_id: '', file_name: '', file_url: '', file_size: '', license_keys: '' });
      setShowAdd(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-gray-500">Loading digital goods...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Digital Assets ({assets.length})</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Add Asset
        </button>
      </div>
      {showAdd && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
          <input placeholder="Product ID" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <input placeholder="File name" value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <input placeholder="File URL" value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <input placeholder="File size (bytes)" type="number" value={form.file_size} onChange={e => setForm(f => ({ ...f, file_size: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          <textarea placeholder="License keys (one per line)" value={form.license_keys} onChange={e => setForm(f => ({ ...f, license_keys: e.target.value }))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={3} />
          <button onClick={addAsset} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Save Asset</button>
        </div>
      )}
      <div className="space-y-2">
        {assets.map(a => (
          <div key={a.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">{a.product_name || a.file_name}</span>
              <span className="ml-2 text-xs text-gray-400">{(a.file_size / 1024).toFixed(0)} KB</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {a.license_keys_remaining > 0 && <span>{a.license_keys_remaining} keys left</span>}
              <span>{a.total_deliveries} delivered</span>
            </div>
          </div>
        ))}
        {assets.length === 0 && <p className="text-center text-gray-400 py-4">No digital assets yet</p>}
      </div>
    </div>
  );
}
