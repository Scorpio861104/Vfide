'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Grid, List, Loader2, Package } from 'lucide-react';

import { FilterContent } from './components/FilterContent';
import { ProductGridCard } from './components/ProductGridCard';
import { ProductListCard } from './components/ProductListCard';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { buildMerchantRank, orderProductsByMerchantRank } from '@/lib/marketplace/discoveryOrdering';

export default function MarketplacePage() {
  const { locale } = useLocale();
  void locale;

  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [filters, setFilters] = useState({ category: '', minPrice: '', maxPrice: '', sort: 'relevance' });
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  // Fair-ranking signal from the certified discovery engine (/api/discovery): a merchantAddress → rank map,
  // where a lower rank index = higher fair standing. Discovery ranks RELEVANCE-FIRST with NO wealth/holdings/
  // paid input (audited in Commerce Phase 5). We use it to order the product grid by merchant standing when the
  // user sorts by relevance — activating the fair ranking buyers should see, instead of an arbitrary product order.
  const [merchantRank, setMerchantRank] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setDegraded(false);

    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    params.set('status', 'active');

    fetch(`/api/merchant/products?${params.toString()}`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : `Products request failed (${r.status})`);
        }
        return data;
      })
      .then((d) => {
        setProducts(Array.isArray(d.products) ? d.products : []);
        setDegraded(Boolean(d.degraded));
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setProducts([]);
        setLoadError(error instanceof Error ? error.message : 'Unable to load products');
      })
      .finally(() => setLoading(false));

    // In parallel, fetch the fair discovery ranking (merchant standing). Best-effort: if it fails or is
    // unavailable, the grid simply falls back to its default order — discovery only ever *re-orders*, never
    // gates, so a discovery outage can never hide products.
    const discoveryParams = new URLSearchParams();
    if (query.trim()) discoveryParams.set('q', query.trim());
    fetch(`/api/discovery?${discoveryParams.toString()}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setMerchantRank(buildMerchantRank(d?.results));
      })
      .catch(() => {
        /* discovery is advisory ordering only — ignore failures, keep default order */
      });

    return () => controller.abort();
  }, [query]);

  const toggleWishlist = (id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = products;
    if (filters.category) result = result.filter((p: any) => p.category === filters.category);
    if (filters.minPrice) result = result.filter((p: any) => parseFloat(p.price) >= parseFloat(filters.minPrice));
    if (filters.maxPrice) result = result.filter((p: any) => parseFloat(p.price) <= parseFloat(filters.maxPrice));
    if (filters.sort === 'price-asc') result = [...result].sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));
    if (filters.sort === 'price-desc') result = [...result].sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price));
    // Relevance (the default): order by the certified fair discovery ranking of each product's merchant. Lower
    // rank index = higher fair standing; products whose merchant isn't ranked fall to the end. Stable sort keeps
    // the server's within-merchant order. If discovery returned nothing (outage/empty), this is a no-op and the
    // grid keeps its default order — discovery re-orders, never hides.
    if (filters.sort === 'relevance') {
      result = orderProductsByMerchantRank(result, merchantRank);
    }
    return result;
  }, [products, filters, merchantRank]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative container mx-auto px-4 max-w-7xl py-8">
          <div className="mb-6">
            <div className="badge-live mb-3">
              <Package size={12} /> Live Market
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">Marketplace</span>
            </h1>
          </div>

          {/* Search bar */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                value={query}
                onChange={e =>  setQuery(e.target.value)}
                aria-label="Search marketplace products"
                placeholder="Search products"
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white  focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              aria-label={showFilters ? 'Hide marketplace filters' : 'Show marketplace filters'}
              aria-expanded={showFilters}
              aria-controls="marketplace-filters"
              className={`px-4 py-3 rounded-xl border font-bold ${showFilters ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}
            >
              <SlidersHorizontal size={20} />
            </button>
            <div className="flex border border-white/10 rounded-xl overflow-hidden" role="group" aria-label="Marketplace view mode">
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-label="Show products in grid view"
                aria-pressed={view === 'grid'}
                className={`p-3 ${view === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}
              >
                <Grid size={18} />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="Show products in list view"
                aria-pressed={view === 'list'}
                className={`p-3 ${view === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && <FilterContent filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}
          </AnimatePresence>

          {/* Results */}
          {loading ? (
            <div className="text-center py-16"><Loader2 size={32} className="text-cyan-400 animate-spin mx-auto" /></div>
          ) : loadError ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-300 font-semibold">Marketplace temporarily unavailable</p>
              <p className="text-gray-500 text-sm mt-2">{loadError}</p>
            </div>
          ) : degraded ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-300 font-semibold">Marketplace catalog unavailable in this environment</p>
              <p className="text-gray-500 text-sm mt-2">Connect the database to browse live products.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><Package size={48} className="mx-auto mb-4 text-gray-600" /><p className="text-gray-400">No products found</p></div>
          ) : (
            <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-3'}>
              {filtered.map((product: any) => view === 'grid'
                ? <ProductGridCard key={product.id} product={product} wishlisted={wishlist.has(product.id)} onWishlist={toggleWishlist} />
                : <ProductListCard key={product.id} product={product} wishlisted={wishlist.has(product.id)} onWishlist={toggleWishlist} />
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
