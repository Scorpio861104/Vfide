'use client';

import { Footer } from '@/components/layout/Footer';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Grid, List, Loader2, Package } from 'lucide-react';

import { FilterContent } from './components/FilterContent';
import { ProductGridCard } from './components/ProductGridCard';
import { ProductListCard } from './components/ProductListCard';

type MarketplaceProduct = {
  id: string;
  name: string;
  price: string | number;
  category?: string;
  category_slug?: string;
  merchant_name?: string;
  compare_at_price?: string | number;
  images?: Array<{ url: string; alt?: string }>;
};

type MarketplacePagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type MarketplaceFacets = {
  min_price?: string | number | null;
  max_price?: string | number | null;
};

const PAGE_SIZE = 24;

function buildMarketplaceQuery(query: string, filters: { category: string; minPrice: string; maxPrice: string; sort: string }, page: number) {
  const params = new URLSearchParams();
  params.set('status', 'active');
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
  params.set('sort', filters.sort || 'relevance');

  if (query.trim()) params.set('q', query.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.minPrice) params.set('min_price', filters.minPrice);
  if (filters.maxPrice) params.set('max_price', filters.maxPrice);

  return params.toString();
}

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<MarketplacePagination | null>(null);
  const [facets, setFacets] = useState<MarketplaceFacets | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category: '', minPrice: '', maxPrice: '', sort: 'relevance' });
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const requestQuery = useMemo(
    () => buildMarketplaceQuery(query, filters, page),
    [filters, page, query]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/merchant/products?${requestQuery}`)
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load marketplace products.');
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const nextProducts = Array.isArray(data?.products) ? data.products as MarketplaceProduct[] : [];
        setProducts((current) => page === 1 ? nextProducts : [
          ...current,
          ...nextProducts.filter((product) => !current.some((existing) => existing.id === product.id)),
        ]);
        setPagination(data?.pagination ?? null);
        setFacets(data?.facets ?? null);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setProducts((current) => page === 1 ? [] : current);
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load marketplace products.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, requestQuery]);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleProducts = useMemo(() => products, [products]);
  const totalResults = pagination?.total ?? visibleProducts.length;
  const hasMore = pagination ? page < pagination.pages : false;

  const updateFilters: React.Dispatch<React.SetStateAction<typeof filters>> = (value) => {
    setPage(1);
    setFilters(value);
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <h1 className="mb-2 text-4xl font-bold text-white">Marketplace</h1>
          <p className="mb-6 text-sm text-gray-400">Browse live merchant listings, filter by price, and sort the catalog in real time.</p>

          <div className="mb-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setPage(1);
                  setQuery(event.target.value);
                }}
                placeholder="Search products..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-label={showFilters ? 'Hide filters' : 'Show filters'}
              className={`rounded-xl border px-4 py-3 font-bold ${showFilters ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-400' : 'border-white/10 bg-white/5 text-gray-400'}`}
            >
              <SlidersHorizontal size={20} />
            </button>
            <div className="flex overflow-hidden rounded-xl border border-white/10">
              <button onClick={() => setView('grid')} aria-label="Grid view" className={`p-3 ${view === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}><Grid size={18} /></button>
              <button onClick={() => setView('list')} aria-label="List view" className={`p-3 ${view === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}><List size={18} /></button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters ? <FilterContent filters={filters} setFilters={updateFilters} onClose={() => setShowFilters(false)} /> : null}
          </AnimatePresence>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-gray-300">
              Showing <span className="font-semibold text-white">{visibleProducts.length}</span> of <span className="font-semibold text-white">{totalResults}</span> live marketplace results
            </div>
            {facets?.min_price != null && facets?.max_price != null ? (
              <div className="text-gray-400">
                Live price range: <span className="text-cyan-300">${Number(facets.min_price).toFixed(2)} – ${Number(facets.max_price).toFixed(2)}</span>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {loading && page === 1 ? (
            <div className="py-16 text-center"><Loader2 size={32} className="mx-auto animate-spin text-cyan-400" /></div>
          ) : visibleProducts.length === 0 ? (
            <div className="py-16 text-center"><Package size={48} className="mx-auto mb-4 text-gray-600" /><p className="text-gray-400">No products found</p></div>
          ) : (
            <>
              <div className={view === 'grid' ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4' : 'space-y-3'}>
                {visibleProducts.map((product) => view === 'grid'
                  ? <ProductGridCard key={product.id} product={product} wishlisted={wishlist.has(product.id)} onWishlist={toggleWishlist} />
                  : <ProductListCard key={product.id} product={product} wishlisted={wishlist.has(product.id)} onWishlist={toggleWishlist} />
                )}
              </div>

              {hasMore ? (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setPage((current) => current + 1)}
                    disabled={loading}
                    className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                  >
                    {loading ? 'Loading…' : 'Load more products'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
