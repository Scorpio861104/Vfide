'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, RotateCcw, Check, X, Package, Clock, AlertCircle } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

interface ReturnItem {
  product_id?: string;
  name?: string;
  quantity: number;
  reason?: string;
}

interface ReturnRequest {
  id: string;
  order_id: string;
  customer_address: string;
  items: ReturnItem[];
  type: string;
  reason: string | null;
  status: string;
  refund_amount: string | null;
  credit_amount: string | null;
  created_at: string;
}

export default function MerchantReturnsPage() {
  const { address } = useAccount();
  const { formatCurrency, formatDate } = useLocale();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadReturns = useCallback(async () => {
    if (!address) return;

    try {
      const suffix = filter === 'all' ? '' : `&status=${filter}`;
      const response = await fetch(`/api/merchant/returns?merchant=${address}${suffix}`);
      const data = await response.json().catch(() => ({ returns: [] }));
      if (response.ok) {
        setReturns(Array.isArray(data.returns) ? data.returns : []);
      }
    } finally {
      setLoading(false);
    }
  }, [address, filter]);

  useEffect(() => {
    void loadReturns();
  }, [loadReturns]);

  const handleAction = useCallback(async (returnId: string, status: 'approved' | 'rejected') => {
    if (!address) return;

    await fetch('/api/merchant/returns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnId, merchantAddress: address, status }),
    });

    await loadReturns();
  }, [address, loadReturns]);

  const shortAddress = (value: string) => value ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'Unknown';
  const pendingCount = returns.filter((entry) => entry.status === 'requested').length;

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 text-white">
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold">
                <RotateCcw className="text-cyan-400" /> Returns & exchanges
                {pendingCount > 0 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">{pendingCount}</span>}
              </h1>
              <p className="mt-2 text-gray-400">Review requests, approve exchanges, and keep inventory aligned after accepted returns.</p>
            </div>
            <div className="flex gap-2">
              {['all', 'requested', 'approved', 'completed'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${filter === value ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-white/10 bg-white/5 text-gray-400'}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {!address ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
              Connect the merchant wallet to review return requests.
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-400">Loading returns…</div>
          ) : returns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
              <RotateCcw className="mx-auto mb-3 text-gray-600" />
              No return requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {returns.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs font-semibold capitalize text-cyan-200">{entry.status}</span>
                      <span className="text-xs text-gray-500">Order {entry.order_id}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Clock size={12} /> {formatDate(entry.created_at, 'medium')}</span>
                  </div>

                  <div className="mb-2 text-sm text-gray-400">
                    Customer: {shortAddress(entry.customer_address)} · Type: <span className="capitalize text-white">{entry.type}</span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-500">
                    {entry.items.map((item, index) => (
                      <div key={`${entry.id}-${index}`} className="flex items-center gap-2">
                        <Package size={12} /> {item.name || 'Item'} × {item.quantity}{item.reason ? ` — ${item.reason}` : ''}
                      </div>
                    ))}
                  </div>

                  {entry.reason && (
                    <p className="mt-3 text-xs text-gray-500">
                      <AlertCircle size={12} className="mr-1 inline" /> {entry.reason}
                    </p>
                  )}

                  {entry.status === 'requested' && (
                    <div className="mt-4 flex gap-2 border-t border-white/5 pt-3">
                      <button type="button" onClick={() => void handleAction(entry.id, 'approved')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 py-2 text-sm font-semibold text-emerald-300">
                        <Check size={14} /> Approve
                      </button>
                      <button type="button" onClick={() => void handleAction(entry.id, 'rejected')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500/10 py-2 text-sm font-semibold text-red-300">
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}

                  {entry.refund_amount && (
                    <div className="mt-3 text-xs text-emerald-300">Refunded: {formatCurrency(entry.refund_amount)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
