'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import { Search, SlidersHorizontal, Grid, List, Loader2, Package, Store, ArrowRight, Sparkles } from 'lucide-react';

import { FilterContent } from './components/FilterContent';
import { MarketplaceEmptyState } from './components/MarketplaceEmptyState';
import { ProductGridCard } from './components/ProductGridCard';
import { ProductListCard } from './components/ProductListCard';

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', minPrice: '', maxPrice: '', sort: 'relevance' });
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/merchant/products?q=${query}&status=active`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then(d => { if (!cancelled) { setProducts(d.products || []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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
    return result;
  }, [products, filters]);

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
              <span className="bg-gradient-to-r from-white to-accent-light bg-clip-text text-transparent">Marketplace</span>
            </h1>
          </div>

          {/* Search bar */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input type="text" value={query} onChange={e =>  setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white  focus:border-accent/50 focus:outline-none" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border font-bold ${showFilters ? 'bg-accent/20 text-accent border-accent/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
              <SlidersHorizontal size={20} />
            </button>
            <div className="flex border border-white/10 rounded-xl overflow-hidden">
              <button onClick={() => setView('grid')} className={`p-3 ${view === 'grid' ? 'bg-accent/20 text-accent' : 'text-gray-500'}`}><Grid size={18} /></button>
              <button onClick={() => setView('list')} className={`p-3 ${view === 'list' ? 'bg-accent/20 text-accent' : 'text-gray-500'}`}><List size={18} /></button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && <FilterContent filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}
          </AnimatePresence>

          {/* Results */}
          {loading ? (
            <div className="text-center py-16"><Loader2 size={32} className="text-accent animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <MarketplaceEmptyState hasQuery={!!query} />
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
