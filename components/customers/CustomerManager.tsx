/**
 * Customer Management — Track buyers, purchase history, lifetime value
 * 
 * Every merchant needs to know their customers. Who buys the most.
 * Who hasn't been back in a while. Who to text when new inventory arrives.
 * 
 * Built on wallet addresses + optional names. No PII stored by VFIDE —
 * merchant stores customer names locally in their browser/vault.
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Plus, Star, Clock, DollarSign, MessageCircle, Tag, TrendingUp, UserPlus } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export interface Customer {
  id: string;
  walletAddress: string;
  name: string | null;
  phone: string | null;
  tags: string[];
  totalSpent: number;
  orderCount: number;
  lastOrderAt: number;
  firstOrderAt: number;
  proofScore: number;
  notes: string;
  isFavorite: boolean;
  favoriteProduct?: string | null;
}

export interface CustomerOrder {
  id: number | string;
  orderNumber?: string | null;
  total: number;
  status: string;
  createdAt: number;
  items: Array<{ name: string; quantity: number }>;
}

export function CustomerManager({ customers = [], customerOrders = {}, isLoadingOrders = false, onSelectCustomer, onAddNote, onAddTag, onToggleFavorite }: {
  customers: Customer[];
  customerOrders?: Record<string, CustomerOrder[]>;
  isLoadingOrders?: boolean;
  onSelectCustomer?: (customerId: string) => void;
  onAddNote?: (customerId: string, note: string) => void;
  onAddTag?: (customerId: string, tag: string) => void;
  onToggleFavorite?: (customerId: string) => void;
}) {
  const { formatCurrency, formatDate } = useLocale();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'spent' | 'recent' | 'orders' | 'score'>('spent');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const allTags = useMemo(() => [...new Set(customers.flatMap(c => c.tags))], [customers]);

  const filtered = useMemo(() => {
    let result = customers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(q) || c.walletAddress.toLowerCase().includes(q) || c.tags.some(t => t.includes(q)));
    }
    if (selectedTag) result = result.filter(c => c.tags.includes(selectedTag));

    return result.sort((a, b) => {
      if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
      if (sortBy === 'recent') return b.lastOrderAt - a.lastOrderAt;
      if (sortBy === 'orders') return b.orderCount - a.orderCount;
      return b.proofScore - a.proofScore;
    });
  }, [customers, search, sortBy, selectedTag]);

  const stats = useMemo(() => ({
    total: customers.length,
    totalRevenue: customers.reduce((s, c) => s + c.totalSpent, 0),
    avgOrderValue: customers.length > 0 ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.reduce((s, c) => s + c.orderCount, 0) : 0,
    repeatRate: customers.length > 0 ? (customers.filter(c => c.orderCount > 1).length / customers.length * 100) : 0,
  }), [customers]);

  const detail = selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null;
  const selectedOrders = detail ? customerOrders[detail.id] ?? [] : [];

  useEffect(() => {
    setNoteDraft(detail?.notes ?? '');
  }, [detail?.id, detail?.notes]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Customers</div>
          <div className="text-cyan-400 font-bold text-lg">{stats.total}</div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Total Revenue</div>
          <div className="text-emerald-400 font-bold text-lg font-mono">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Avg Order</div>
          <div className="text-amber-400 font-bold text-lg font-mono">{formatCurrency(stats.avgOrderValue)}</div>
        </div>
        <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Repeat Rate</div>
          <div className="text-purple-400 font-bold text-lg">{stats.repeatRate.toFixed(0)}%</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" value={search} onChange={e =>  setSearch(e.target.value)} placeholder="Search customers..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none" />
        </div>
        <select value={sortBy} onChange={e =>  setSortBy(e.target.value as any)}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm">
          <option value="spent">Most Spent</option><option value="recent">Most Recent</option>
          <option value="orders">Most Orders</option><option value="score">ProofScore</option>
        </select>
        {allTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto">
            {allTags.map(tag => (
              <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${selectedTag === tag ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400'}`}>
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {filtered.map(customer => (
          <button key={customer.id} onClick={() => {
            setSelectedCustomer(customer.id);
            onSelectCustomer?.(customer.id);
          }}
            className={`w-full flex items-center justify-between p-4 bg-white/3 border rounded-xl text-left transition-colors ${
              selectedCustomer === customer.id ? 'border-cyan-500/30' : 'border-white/5 hover:border-white/10'
            }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-white font-bold text-sm">
                {customer.name?.[0]?.toUpperCase() || customer.walletAddress.slice(2, 4).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">{customer.name || `${customer.walletAddress.slice(0, 8)}...`}</span>
                  {customer.isFavorite && <Star size={12} className="text-amber-400 fill-amber-400" />}
                </div>
                <div className="text-gray-500 text-xs">
                  {customer.orderCount} orders · Last {formatDate(customer.lastOrderAt, 'relative')}
                  {customer.favoriteProduct ? ` · Likes ${customer.favoriteProduct}` : ''}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-cyan-400 font-mono font-bold text-sm">{formatCurrency(customer.totalSpent)}</div>
              <div className="flex gap-1 mt-0.5">
                {customer.tags.slice(0, 2).map(t => (
                  <span key={t} className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-500">{t}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No customers yet. They&apos;ll appear here after their first purchase.</p>
        </div>
      )}

      {detail && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{detail.name || 'Customer profile'}</h3>
                <p className="text-xs text-gray-500">{detail.walletAddress}</p>
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite?.(detail.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300"
              >
                <Star size={12} className={detail.isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
                {detail.isFavorite ? 'VIP' : 'Mark VIP'}
              </button>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-400"><DollarSign size={12} /> Lifetime spend</div>
                <div className="font-mono text-lg font-bold text-emerald-400">{formatCurrency(detail.totalSpent)}</div>
              </div>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-400"><TrendingUp size={12} /> Order count</div>
                <div className="text-lg font-bold text-cyan-400">{detail.orderCount}</div>
              </div>
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-400"><Clock size={12} /> Last order</div>
                <div className="text-sm font-semibold text-white">{formatDate(detail.lastOrderAt, 'relative')}</div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-gray-400"><UserPlus size={12} /> Favorite product</div>
                <div className="text-sm font-semibold text-white">{detail.favoriteProduct || 'No pattern yet'}</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-300"><Tag size={14} /> Tags</div>
              <div className="flex flex-wrap gap-2">
                {detail.tags.length === 0 ? (
                  <span className="text-xs text-gray-500">No tags yet.</span>
                ) : detail.tags.map(tag => (
                  <span key={tag} className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-cyan-300">{tag}</span>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const tag = typeof window === 'undefined' ? '' : window.prompt('Add a tag for this customer', 'vip') || '';
                    if (tag.trim()) onAddTag?.(detail.id, tag.trim());
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-300"
                >
                  <Plus size={12} /> Add tag
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-300"><MessageCircle size={14} /> Private merchant notes</div>
              <textarea
                value={noteDraft}
                onChange={e =>  setNoteDraft(e.target.value)}
                rows={4}
                placeholder="Prefers blue fabrics. Birthday in March. Sends referrals..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onAddNote?.(detail.id, noteDraft)}
                className="mt-3 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black"
              >
                Save note
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-3 text-lg font-semibold text-white">Order history</h3>
            {isLoadingOrders ? (
              <p className="text-sm text-gray-400">Loading order history…</p>
            ) : selectedOrders.length === 0 ? (
              <p className="text-sm text-gray-400">Select a customer to view recent orders.</p>
            ) : (
              <div className="space-y-3">
                {selectedOrders.map(order => (
                  <div key={String(order.id)} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">{order.orderNumber || `Order #${order.id}`}</div>
                        <div className="text-xs text-gray-500">{formatDate(order.createdAt, 'relative')} · {order.status}</div>
                      </div>
                      <div className="font-mono text-sm font-bold text-emerald-400">{formatCurrency(order.total)}</div>
                    </div>
                    {order.items.length > 0 && (
                      <div className="mt-2 text-xs text-gray-400">
                        {order.items.map(item => `${item.quantity}× ${item.name}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
