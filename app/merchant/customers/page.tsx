'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, Users } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { CustomerManager, type Customer, type CustomerOrder } from '@/components/customers/CustomerManager';

export default function MerchantCustomersPage() {
  const { address } = useAccount();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ordersByCustomer, setOrdersByCustomer] = useState<Record<string, CustomerOrder[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingOrdersFor, setLoadingOrdersFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customerLookup = useMemo(
    () => Object.fromEntries(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const loadCustomers = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    try {
      const response = await fetch('/api/merchant/customers');
      const data = await response.json().catch(() => ({ customers: [] }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load customers');
      }

      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const handleSelectCustomer = useCallback(async (customerId: string) => {
    if (ordersByCustomer[customerId]) return;

    setLoadingOrdersFor(customerId);
    try {
      const response = await fetch(`/api/merchant/orders?role=merchant&customer_address=${encodeURIComponent(customerId)}&limit=20`);
      const data = await response.json().catch(() => ({ orders: [] }));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load order history');
      }

      const orders: CustomerOrder[] = Array.isArray(data.orders)
        ? data.orders.map((order: Record<string, unknown>) => ({
            id: String(order.id ?? ''),
            orderNumber: typeof order.order_number === 'string' ? order.order_number : null,
            total: Number(order.total ?? 0),
            status: typeof order.status === 'string' ? order.status : 'unknown',
            createdAt: order.created_at ? new Date(String(order.created_at)).getTime() : Date.now(),
            items: Array.isArray(order.items)
              ? order.items.map((item: Record<string, unknown>) => ({
                  name: typeof item.name === 'string' ? item.name : 'Item',
                  quantity: Number(item.quantity ?? 1),
                }))
              : [],
          }))
        : [];

      setOrdersByCustomer((current) => ({ ...current, [customerId]: orders }));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load order history');
    } finally {
      setLoadingOrdersFor((current) => (current === customerId ? null : current));
    }
  }, [ordersByCustomer]);

  const saveCustomerMeta = useCallback(async (customerId: string, updates: { notes?: string; tags?: string[] }) => {
    const current = customerLookup[customerId];
    if (!current) return;

    const response = await fetch('/api/merchant/customers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerAddress: current.walletAddress,
        notes: updates.notes ?? current.notes ?? '',
        tags: updates.tags ?? current.tags ?? [],
      }),
    });

    const data = await response.json().catch(() => ({ note: null }));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save customer notes');
    }

    setCustomers((existing) => existing.map((customer) => (
      customer.id === customerId
        ? {
            ...customer,
            notes: typeof data.note?.notes === 'string' ? data.note.notes : (updates.notes ?? customer.notes),
            tags: Array.isArray(data.note?.tags) ? data.note.tags : (updates.tags ?? customer.tags),
            isFavorite: Array.isArray(data.note?.tags)
              ? data.note.tags.includes('vip') || customer.isFavorite
              : customer.isFavorite,
          }
        : customer
    )));
  }, [customerLookup]);

  const handleAddNote = useCallback(async (customerId: string, note: string) => {
    try {
      await saveCustomerMeta(customerId, { notes: note });
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save note');
    }
  }, [saveCustomerMeta]);

  const handleAddTag = useCallback(async (customerId: string, tag: string) => {
    const current = customerLookup[customerId];
    if (!current) return;

    try {
      const nextTags = Array.from(new Set([...current.tags, tag.trim().toLowerCase()].filter(Boolean)));
      await saveCustomerMeta(customerId, { tags: nextTags });
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save tag');
    }
  }, [customerLookup, saveCustomerMeta]);

  const handleToggleFavorite = useCallback(async (customerId: string) => {
    const current = customerLookup[customerId];
    if (!current) return;

    try {
      const hasVipTag = current.tags.includes('vip');
      const nextTags = hasVipTag
        ? current.tags.filter((tag) => tag !== 'vip')
        : [...current.tags, 'vip'];

      await saveCustomerMeta(customerId, { tags: nextTags });
      setCustomers((existing) => existing.map((customer) => (
        customer.id === customerId
          ? { ...customer, isFavorite: !hasVipTag }
          : customer
      )));
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update VIP status');
    }
  }, [customerLookup, saveCustomerMeta]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                <Users size={14} /> Customer list and order history
              </div>
              <h1 className="text-4xl font-bold">Know your repeat buyers</h1>
              <p className="mt-3 max-w-3xl text-gray-400">
                Track top customers, see their order history, and save private CRM notes for follow-up and retention.
              </p>
            </div>

            {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to view customer insights.
              </div>
            ) : loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-400">Loading customer analytics…</div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <CustomerManager
                  customers={customers}
                  customerOrders={ordersByCustomer}
                  isLoadingOrders={Boolean(loadingOrdersFor)}
                  onSelectCustomer={handleSelectCustomer}
                  onAddNote={handleAddNote}
                  onAddTag={handleAddTag}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
