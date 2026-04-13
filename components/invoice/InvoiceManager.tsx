/**
 * Invoice System — Create, send, and track invoices
 * 
 * A hairstylist invoices a client. A freelancer bills a project.
 * A farmer invoices a restaurant for wholesale produce.
 * 
 * Invoices are stored on-chain as payment requests with metadata.
 * Payment auto-marks the invoice as paid via event listener.
 */
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Send, Check, Clock, AlertCircle, X, Copy, ExternalLink, Download, Search, Filter } from 'lucide-react';
import { useLocale } from '@/lib/locale/LocaleProvider';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;          // INV-001, auto-incremented
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  customerName: string;
  customerAddress?: string; // Wallet address
  customerEmail?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
  dueDate: number;         // Timestamp
  createdAt: number;
  paidAt?: number;
  txHash?: string;
  paymentLink: string;     // Shareable pay link
}

// ── Invoice List ────────────────────────────────────────────────────────────

interface InvoiceManagerProps {
  merchantAddress: string;
  invoices?: Invoice[];
  onCreateInvoice?: (invoice: Omit<Invoice, 'id' | 'number' | 'status' | 'createdAt' | 'paymentLink'>) => void;
  onSendInvoice?: (invoiceId: string, method: 'link' | 'whatsapp' | 'email') => void;
  onCancelInvoice?: (invoiceId: string) => void;
}

export function InvoiceManager({ merchantAddress, invoices = [], onCreateInvoice, onSendInvoice, onCancelInvoice }: InvoiceManagerProps) {
  const { formatCurrency, formatDate } = useLocale();
  const [view, setView] = useState<'list' | 'create'>('list');
  const [filter, setFilter] = useState<'all' | Invoice['status']>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = invoices;
    if (filter !== 'all') result = result.filter(i => i.status === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.customerName.toLowerCase().includes(q) || i.number.toLowerCase().includes(q));
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [invoices, filter, search]);

  const stats = useMemo(() => ({
    total: invoices.reduce((s, i) => s + i.total, 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    outstanding: invoices.filter(i => ['sent', 'viewed', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total, 0),
    overdue: invoices.filter(i => i.status === 'overdue').length,
  }), [invoices]);

  if (view === 'create') {
    return <CreateInvoiceForm onSubmit={(data) => { onCreateInvoice?.(data); setView('list'); }} onCancel={() => setView('list')} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Invoiced" value={formatCurrency(stats.total)} color="cyan" />
        <StatCard label="Paid" value={formatCurrency(stats.paid)} color="emerald" />
        <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} color="amber" />
        <StatCard label="Overdue" value={String(stats.overdue)} color="red" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input type="text" value={search} onChange={e =>  setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm  focus:border-cyan-500/50 focus:outline-none" />
        </div>
        <select value={filter} onChange={e =>  setFilter(e.target.value as any)}
          className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm">
          <option value="all">All</option>
          <option value="draft">Drafts</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <button onClick={() => setView('create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-sm">
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {/* Invoice list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">{search ? 'No invoices match your search' : 'No invoices yet'}</p>
          </div>
        ) : filtered.map(invoice => (
          <InvoiceRow key={invoice.id} invoice={invoice} formatCurrency={formatCurrency} formatDate={formatDate}
            onSend={onSendInvoice} onCancel={onCancelInvoice} />
        ))}
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, formatCurrency, formatDate, onSend, onCancel }: {
  invoice: Invoice; formatCurrency: (n: number) => string; formatDate: (n: number, s?: any) => string;
  onSend?: (id: string, method: 'link' | 'whatsapp' | 'email') => void; onCancel?: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400', sent: 'bg-cyan-500/20 text-cyan-400', viewed: 'bg-blue-500/20 text-blue-400',
    paid: 'bg-emerald-500/20 text-emerald-400', overdue: 'bg-red-500/20 text-red-400', cancelled: 'bg-gray-500/20 text-gray-500',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white/3 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <FileText size={18} className="text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm">{invoice.number}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${statusColors[invoice.status]}`}>{invoice.status}</span>
          </div>
          <div className="text-gray-500 text-xs">{invoice.customerName} · Due {formatDate(invoice.dueDate, 'short')}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-white font-mono font-bold">{formatCurrency(invoice.total)}</span>
        {invoice.status === 'draft' && (
          <button onClick={() => onSend?.(invoice.id, 'link')} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold">
            <Send size={12} className="inline mr-1" /> Send
          </button>
        )}
      </div>
    </div>
  );
}

// ── Create Invoice Form ─────────────────────────────────────────────────────

function CreateInvoiceForm({ onSubmit, onCancel }: {
  onSubmit: (data: any) => void; onCancel: () => void;
}) {
  const { formatCurrency } = useLocale();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [dueInDays, setDueInDays] = useState(7);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = field === 'description' ? value : parseFloat(value) || 0;
    setItems(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">New Invoice</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X size={20} /></button>
      </div>

      {/* Customer */}
      <div className="bg-white/3 border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Customer</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="text" value={customerName} onChange={e =>  setCustomerName(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white  focus:border-cyan-500/50 focus:outline-none" />
          <input type="tel" value={customerPhone} onChange={e =>  setCustomerPhone(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white  focus:border-cyan-500/50 focus:outline-none" />
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white/3 border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Items</h3>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <input type="text" value={item.description} onChange={e =>  updateItem(i, 'description', e.target.value)}
              className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm  focus:border-cyan-500/50 focus:outline-none" />
            <input type="number" value={item.quantity || ''} onChange={e =>  updateItem(i, 'quantity', e.target.value)} min="1"
              className="w-20 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-center focus:border-cyan-500/50 focus:outline-none" />
            <input type="number" value={item.unitPrice || ''} onChange={e =>  updateItem(i, 'unitPrice', e.target.value)} step="0.01"
              className="w-28 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-right font-mono focus:border-cyan-500/50 focus:outline-none" />
            <span className="w-24 text-right text-cyan-400 font-mono text-sm">{formatCurrency(item.quantity * item.unitPrice)}</span>
            {items.length > 1 && <button onClick={() => removeItem(i)} className="text-gray-500 hover:text-red-400"><X size={16} /></button>}
          </div>
        ))}
        <button onClick={addItem} className="text-cyan-400 text-sm font-bold hover:text-cyan-300">+ Add item</button>
      </div>

      {/* Totals + settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tax rate (%)</label>
            <input type="number" value={taxRate || ''} onChange={e =>  setTaxRate(parseFloat(e.target.value) || 0)} min="0" max="30" step="0.1"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500/50 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Due in (days)</label>
            <select value={dueInDays} onChange={e =>  setDueInDays(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
              <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea value={notes} onChange={e =>  setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm  resize-none focus:border-cyan-500/50 focus:outline-none" />
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3 self-start">
          <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="text-white">{formatCurrency(subtotal)}</span></div>
          {taxRate > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Tax ({taxRate}%)</span><span className="text-white">{formatCurrency(tax)}</span></div>}
          <div className="border-t border-white/10 pt-3 flex justify-between"><span className="text-white font-bold">Total</span><span className="text-cyan-400 font-bold text-xl font-mono">{formatCurrency(total)}</span></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 border border-white/10 text-gray-400 rounded-xl font-bold">Cancel</button>
        <button onClick={() => onSubmit({ customerName, customerPhone, items, subtotal, tax, taxRate, total, notes, dueDate: Date.now() + dueInDays * 86400000 })}
          disabled={!customerName || items.every(i => !i.description)}
          className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          <FileText size={18} /> Create Invoice
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`bg-${color}-500/5 border border-${color}-500/15 rounded-xl p-4`}>
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className={`text-${color}-400 font-bold text-lg font-mono`}>{value}</div>
    </div>
  );
}
