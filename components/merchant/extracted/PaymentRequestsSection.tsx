'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function PaymentRequestsSection({
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
  const displayRequests = requests;

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
