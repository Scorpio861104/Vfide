'use client';

import { Footer } from '@/components/layout/Footer';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Grid, List, X, Loader2, Package } from 'lucide-react';

import { FilterContent } from './components/FilterContent';
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
    setLoading(true);
    fetch(`/api/merchant/products?q=${query}&status=active`)
      .then(r => r.ok ? r.json() : { products: [] })
      .then(d => { setProducts(d.products || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [query]);

  const toggleWishlist = (id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-7xl py-8">
          <h1 className="text-4xl font-bold text-white mb-6">Marketplace</h1>

          {/* Search bar */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input type="text" value={query} onChange={e =>  setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white  focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border font-bold ${showFilters ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
              <SlidersHorizontal size={20} />
            </button>
            <div className="flex border border-white/10 rounded-xl overflow-hidden">
              <button onClick={() => setView('grid')} className={`p-3 ${view === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}><Grid size={18} /></button>
              <button onClick={() => setView('list')} className={`p-3 ${view === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}><List size={18} /></button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && <FilterContent filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}
          </AnimatePresence>

          {/* Results */}
          {loading ? (
            <div className="text-center py-16"><Loader2 size={32} className="text-cyan-400 animate-spin mx-auto" /></div>
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
