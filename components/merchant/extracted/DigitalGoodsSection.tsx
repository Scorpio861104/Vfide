'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function DigitalGoodsSection({ merchantAddress }: { merchantAddress: string }) {
  const [assets, setAssets] = useState<Array<{ id: string; product_name: string; file_name: string; file_size: number; license_keys_remaining: number; total_deliveries: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ product_id: '', file_name: '', file_url: '', file_size: '', license_keys: '' });

  useEffect(() => {
    fetch(`/api/merchant/digital?role=merchant`, )
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
      headers: { 'Content-Type': 'application/json' },
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
