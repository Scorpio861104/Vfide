'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  FileText,
  Plus,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Mail,
  Trash2,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

// ── Types ───────────────────────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_address?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  token: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number;
  status: InvoiceStatus;
  memo?: string | null;
  due_date?: string | null;
  payment_link_id?: string | null;
  tx_hash?: string | null;
  created_at: string;
  currency_display?: string | null;
}

interface InvoiceSummary {
  status: InvoiceStatus;
  count: string;
  total_value: string;
}

const STATUS_META: Record<InvoiceStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  draft:     { label: 'Draft',     icon: FileText,      color: 'text-zinc-300',    bg: 'bg-zinc-700/30 border-zinc-600/30' },
  sent:      { label: 'Sent',      icon: Mail,          color: 'text-blue-300',    bg: 'bg-blue-500/10 border-blue-500/30' },
  viewed:    { label: 'Viewed',    icon: Clock,         color: 'text-accent',    bg: 'bg-cyan-500/10 border-accent/30' },
  paid:      { label: 'Paid',      icon: CheckCircle2,  color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  overdue:   { label: 'Overdue',   icon: AlertTriangle, color: 'text-amber-300',   bg: 'bg-amber-500/10 border-amber-500/30' },
  cancelled: { label: 'Cancelled', icon: XCircle,       color: 'text-zinc-400',    bg: 'bg-zinc-800/40 border-zinc-700/40' },
  refunded:  { label: 'Refunded',  icon: AlertTriangle, color: 'text-purple-300',  bg: 'bg-purple-500/10 border-purple-500/30' },
};

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// ── Page ────────────────────────────────────────────────────────────────────

export default function MerchantInvoicesPage() {
  const { address } = useAccount();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch('/api/merchant/invoices');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load invoices');
      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      setSummary(Array.isArray(data.summary) ? data.summary : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { void load(); }, [load]);

  const totalsByStatus = useMemo(() => {
    const map = new Map<InvoiceStatus, { count: number; value: number }>();
    summary.forEach((s) => {
      map.set(s.status, { count: Number(s.count) || 0, value: Number(s.total_value) || 0 });
    });
    return map;
  }, [summary]);

  const updateStatus = useCallback(async (id: number, status: InvoiceStatus) => {
    try {
      const response = await fetch('/api/merchant/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update invoice');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update invoice');
    }
  }, [load]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
          <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
        </div>
        <section className="py-12 relative">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent text-sm">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="badge-live"><span className="badge-live-dot" />Invoicing</span>
                </div>
                <h1 className="text-4xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                    <FileText size={32} className="text-accent" />Send invoices, get paid in VFIDE
                  </span>
                </h1>
                <p className="mt-2 max-w-3xl text-white/50">
                  Create itemized invoices, share a payment link with the customer, and track from draft → sent → paid.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                disabled={!address}
                className="px-5 py-3 bg-gradient-to-r from-accent to-blue-500 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                <Plus size={18} /> New invoice
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {!address && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to view and create invoices.
              </div>
            )}

            {address && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {(['draft', 'sent', 'paid', 'overdue'] as InvoiceStatus[]).map((s) => {
                    const meta = STATUS_META[s];
                    const Icon = meta.icon;
                    const data = totalsByStatus.get(s) ?? { count: 0, value: 0 };
                    return (
                      <div key={s} className={`rounded-xl border p-4 ${meta.bg}`}>
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400 mb-2">
                          <span>{meta.label}</span>
                          <Icon size={14} className={meta.color} />
                        </div>
                        <div className="text-2xl font-bold">{data.count}</div>
                        <div className="text-xs text-zinc-400 mt-1">{data.value.toFixed(2)} VFIDE</div>
                      </div>
                    );
                  })}
                </div>

                {/* List */}
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  {loading ? (
                    <div className="p-12 text-center text-zinc-400">Loading invoices…</div>
                  ) : invoices.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400">
                      No invoices yet. Click <span className="text-accent">New invoice</span> to create your first.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {invoices.map((inv) => (
                        <InvoiceRow key={inv.id} invoice={inv} onMarkPaid={() => updateStatus(inv.id, 'paid')} onCancel={() => updateStatus(inv.id, 'cancelled')} onSend={() => updateStatus(inv.id, 'sent')} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {showCreate && address && (
        <CreateInvoiceModal
          merchantAddress={address}
          onClose={() => setShowCreate(false)}
          creating={creating}
          setCreating={setCreating}
          onCreated={async () => { setShowCreate(false); await load(); }}
          onError={(msg) => setError(msg)}
        />
      )}

      <Footer />
    </>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

function InvoiceRow({ invoice, onMarkPaid, onCancel, onSend }: { invoice: Invoice; onMarkPaid: () => void; onCancel: () => void; onSend: () => void }) {
  const meta = STATUS_META[invoice.status];
  const Icon = meta.icon;
  return (
    <div className="p-4 hover:bg-white/5 transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-zinc-300">{invoice.invoice_number}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${meta.bg} ${meta.color}`}>
              <Icon size={11} />
              {meta.label}
            </span>
          </div>
          <div className="text-sm text-zinc-400">
            {invoice.customer_name ?? invoice.customer_email ?? invoice.customer_address ?? 'No recipient'}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {invoice.items.length} item{invoice.items.length === 1 ? '' : 's'} ·{' '}
            <span className="text-zinc-300">{Number(invoice.total).toFixed(2)} VFIDE</span>
            {invoice.due_date && <> · due {new Date(invoice.due_date).toLocaleDateString()}</>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {invoice.payment_link_id && (
            <a
              href={`/pay?merchant=${invoice.payment_link_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 border border-white/10 rounded hover:bg-white/5 inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> Open link
            </a>
          )}
          {invoice.status === 'draft' && (
            <button onClick={onSend} className="text-xs px-3 py-1.5 border border-blue-500/30 bg-blue-500/10 text-blue-300 rounded hover:bg-blue-500/20">
              Send
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'overdue') && (
            <button onClick={onMarkPaid} className="text-xs px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 rounded hover:bg-emerald-500/20">
              Mark paid
            </button>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button onClick={onCancel} className="text-xs px-3 py-1.5 border border-zinc-700 text-zinc-400 rounded hover:bg-white/5">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create modal ────────────────────────────────────────────────────────────

const VFIDE_TOKEN_PLACEHOLDER = '0x0000000000000000000000000000000000000000';

function CreateInvoiceModal({
  merchantAddress: _merchantAddress,
  onClose,
  creating,
  setCreating,
  onCreated,
  onError,
}: {
  merchantAddress: string;
  onClose: () => void;
  creating: boolean;
  setCreating: (b: boolean) => void;
  onCreated: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [customer, setCustomer] = useState({ name: '', email: '', address: '' });
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [memo, setMemo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [token, _setToken] = useState<string>(
    process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS ?? VFIDE_TOKEN_PLACEHOLDER,
  );
  const [sendImmediately, setSendImmediately] = useState(true);

  const subtotal = useMemo(() => items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unit_price)), 0), [items]);
  const taxAmount = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = subtotal + taxAmount;

  const canSubmit =
    items.length > 0 &&
    items.every((it) => it.description.trim() && Number(it.quantity) > 0 && Number(it.unit_price) > 0) &&
    ADDRESS_REGEX.test(token) &&
    !creating;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const response = await fetch('/api/merchant/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customer.name.trim() || undefined,
          customer_email: customer.email.trim() || undefined,
          customer_address: customer.address.trim() ? customer.address.trim().toLowerCase() : undefined,
          token: token.toLowerCase(),
          items: items.map((it) => ({
            description: it.description.trim(),
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
          })),
          tax_rate: taxRate || undefined,
          memo: memo.trim() || undefined,
          due_date: dueDate || undefined,
          send_immediately: sendImmediately,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create invoice');
      await onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  }, [canSubmit, customer, items, taxRate, memo, dueDate, token, sendImmediately, setCreating, onCreated, onError]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={-1}
    >
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">New invoice</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          {/* Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Customer name</span>
              <input type="text" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="Acme Co." className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Email (optional)</span>
              <input type="email" autoComplete="email" inputMode="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} placeholder="billing@acme.co" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-zinc-400 mb-1 block">Customer wallet (optional)</span>
              <input type="text" value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} placeholder="0x…" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-accent outline-none" />
            </label>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Line items</span>
              <button
                onClick={() => setItems((i) => [...i, { description: '', quantity: 1, unit_price: 0 }])}
                className="text-xs text-accent hover:text-accent inline-flex items-center gap-1"
              >
                <Plus size={12} /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={it.description}
                    onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                    placeholder="Description"
                    className="col-span-6 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                  />
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={it.quantity}
                    onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))}
                    placeholder="Qty"
                    className="col-span-2 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                  />
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={it.unit_price}
                    onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))}
                    placeholder="Unit"
                    className="col-span-3 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                  />
                  <button
                    onClick={() => setItems((arr) => arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr)}
                    disabled={items.length <= 1}
                    className="col-span-1 text-zinc-400 hover:text-red-400 disabled:opacity-30"
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax + Memo + Due */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Tax rate (%)</span>
              <input type="number" min={0} max={100} step={0.01} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Due date (optional)</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Memo (optional)</span>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none resize-none" />
          </label>

          {/* Totals */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 text-sm space-y-1">
            <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{subtotal.toFixed(2)} VFIDE</span></div>
            <div className="flex justify-between text-zinc-400"><span>Tax ({taxRate}%)</span><span>{taxAmount.toFixed(2)} VFIDE</span></div>
            <div className="flex justify-between text-white font-semibold pt-2 border-t border-white/10"><span>Total</span><span>{total.toFixed(2)} VFIDE</span></div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} className="accent-cyan-500" />
            <span>Send immediately (otherwise saves as draft)</span>
          </label>

          <button onClick={submit} disabled={!canSubmit} className="w-full px-5 py-3 bg-gradient-to-r from-accent to-blue-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {creating ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
