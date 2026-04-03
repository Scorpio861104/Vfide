'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function InvoicesSection({ merchantAddress }: { merchantAddress: string }) {
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
      const res = await fetch(url, );
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
        headers: { 'Content-Type': 'application/json' },
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
