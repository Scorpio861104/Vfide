'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ProductsSection({ merchantAddress }: { merchantAddress: string }) {
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
      headers: { 'Content-Type': 'application/json' },
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
