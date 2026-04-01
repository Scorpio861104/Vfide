/**
 * VFIDE Marketplace — Amazon-style product discovery
 * Full-text search, faceted filtering, sort, autocomplete, featured products
 */
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search, Package, X, ShoppingBag, Star, SlidersHorizontal,
  Grid3X3, List, ChevronRight, Zap, Heart, ArrowUpDown,
} from 'lucide-react';

/* ─── Types ─── */
interface Product {
  id: string; name: string; slug: string; description: string | null;
  short_description: string | null; price: string; compare_at_price: string | null;
  product_type: 'physical' | 'digital' | 'service'; images: Array<{ url: string; alt: string }>;
  tags: string[]; category_name: string | null; merchant_address: string;
  merchant_name?: string; merchant_slug?: string; inventory_count: number | null;
  track_inventory: boolean; sold_count: number; view_count: number; featured: boolean;
  avg_rating: number; review_count: number; created_at: string;
}

interface Pagination { page: number; limit: number; total: number; pages: number }
interface Facets { min_price: number; max_price: number; physical_count: number; digital_count: number; service_count: number }
interface Suggestion { name: string; slug: string; price: string; product_type: string; merchant_slug: string | null }
interface PlatformCategory {
  id: number; parent_id: number | null; name: string; slug: string;
  icon: string | null; product_count?: number; child_count: number;
  children?: PlatformCategory[];
}

interface FilterContentProps {
  platformCategories: PlatformCategory[];
  platformCategory: string;
  expandedCats: Set<string>;
  typeFilter: string;
  facets: Facets | null;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  applyFilter: (key: string, value: string) => void;
  toggleCatExpand: (slug: string) => void;
  setMinPrice: (value: string) => void;
  setMaxPrice: (value: string) => void;
}

const TYPE_LABELS: Record<string, string> = { physical: 'Physical', digital: 'Digital', service: 'Service' };
const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'best_selling', label: 'Best Selling' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Avg. Customer Review' },
  { value: 'newest', label: 'Newest Arrivals' },
];
const PRICE_RANGES = [
  { label: 'Under $25', min: 0, max: 25 },
  { label: '$25 to $50', min: 25, max: 50 },
  { label: '$50 to $100', min: 50, max: 100 },
  { label: '$100 to $200', min: 100, max: 200 },
  { label: '$200 & Above', min: 200, max: 0 },
];
const RATING_FILTERS = [4, 3, 2, 1];

/* ─── Helpers ─── */
function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

function pctOff(price: string, compare: string): number {
  const p = parseFloat(price), c = parseFloat(compare);
  return c > p && c > 0 ? Math.round(((c - p) / c) * 100) : 0;
}

function toggleWishlist(id: string): boolean {
  try {
    const list = JSON.parse(localStorage.getItem('vfide_wishlist') || '[]') as string[];
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1); else list.push(id);
    localStorage.setItem('vfide_wishlist', JSON.stringify(list));
    return idx < 0;
  } catch { return false; }
}

/* ─── FilterContent Component (shared between desktop & mobile) ─── */
function FilterContent({
  platformCategories,
  platformCategory,
  expandedCats,
  typeFilter,
  facets,
  minPrice,
  maxPrice,
  minRating,
  applyFilter,
  toggleCatExpand,
  setMinPrice,
  setMaxPrice,
}: FilterContentProps) {
  return (
    <div className="space-y-6">
      {/* Platform Categories */}
      {platformCategories.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Department</h3>
          <button
            onClick={() => applyFilter('platform_category', '')}
            className={`block w-full text-left py-1 text-sm transition ${!platformCategory ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
          >
            All Departments
          </button>
          {platformCategories.map(cat => {
            const isActive = platformCategory === cat.slug;
            const hasChildren = cat.children && cat.children.length > 0;
            const isExpanded = expandedCats.has(cat.slug) || isActive || (cat.children?.some(c => c.slug === platformCategory));
            return (
              <div key={cat.slug}>
                <div className="flex items-center">
                  {hasChildren && (
                    <button onClick={() => toggleCatExpand(cat.slug)} className="p-0.5 text-gray-400 hover:text-gray-600">
                      <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={() => applyFilter('platform_category', isActive ? '' : cat.slug)}
                    className={`flex-1 text-left py-1 text-sm transition truncate ${isActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'} ${!hasChildren ? 'pl-4' : ''}`}
                  >
                    {cat.name}
                    {cat.product_count != null && cat.product_count > 0 && (
                      <span className="text-xs text-gray-400 ml-1">({cat.product_count})</span>
                    )}
                  </button>
                </div>
                {hasChildren && isExpanded && (
                  <div className="pl-4">
                    {cat.children!.map(sub => {
                      const subActive = platformCategory === sub.slug;
                      return (
                        <button
                          key={sub.slug}
                          onClick={() => applyFilter('platform_category', subActive ? '' : sub.slug)}
                          className={`block w-full text-left py-0.5 text-xs transition truncate ${subActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                          {sub.name}
                          {sub.product_count != null && sub.product_count > 0 && (
                            <span className="text-gray-400 ml-1">({sub.product_count})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Product Type */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Product Type</h3>
        {(['', 'physical', 'digital', 'service'] as const).map(t => (
          <label key={t} className="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <input
              type="radio" name="type" checked={typeFilter === t}
              onChange={() => applyFilter('type', t)}
              className="accent-blue-600"
            />
            <span>{t ? TYPE_LABELS[t] : 'All Types'}</span>
            {t && facets && (
              <span className="text-xs text-gray-400 ml-auto">
                ({t === 'physical' ? facets.physical_count : t === 'digital' ? facets.digital_count : facets.service_count})
              </span>
            )}
          </label>
        ))}
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Price</h3>
        {PRICE_RANGES.map(pr => {
          const active = minPrice === String(pr.min) && maxPrice === String(pr.max);
          return (
            <button
              key={pr.label}
              onClick={() => {
                if (active) { applyFilter('min_price', ''); applyFilter('max_price', ''); }
                else { applyFilter('min_price', String(pr.min)); applyFilter('max_price', pr.max ? String(pr.max) : ''); }
              }}
              className={`block w-full text-left py-1 text-sm transition ${active ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
            >
              {pr.label}
            </button>
          );
        })}
        {/* Custom range */}
        <div className="flex items-center gap-1 mt-2">
          <input
            type="number" placeholder="Min" min="0"
            value={minPrice} onChange={e => setMinPrice(e.target.value)}
            className="w-16 px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <span className="text-gray-400 text-xs">—</span>
          <input
            type="number" placeholder="Max" min="0"
            value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
            className="w-16 px-2 py-1 text-xs border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <button
            onClick={() => { applyFilter('min_price', minPrice); applyFilter('max_price', maxPrice); }}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >Go</button>
        </div>
      </div>

      {/* Customer Reviews */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Customer Review</h3>
        {RATING_FILTERS.map(r => {
          const active = minRating === String(r);
          return (
            <button
              key={r}
              onClick={() => applyFilter('min_rating', active ? '' : String(r))}
              className={`flex items-center gap-1.5 w-full py-1 text-sm transition ${active ? 'font-bold' : 'hover:text-gray-900 dark:hover:text-white'}`}
            >
              <StarRow rating={r} />
              <span className="text-gray-600 dark:text-gray-400">& Up</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filters from URL
  const initialQ = searchParams?.get('q') || '';
  const initialType = searchParams?.get('type') || '';
  const initialSort = searchParams?.get('sort') || '';
  const initialMinPrice = searchParams?.get('min_price') || '';
  const initialMaxPrice = searchParams?.get('max_price') || '';
  const initialMinRating = searchParams?.get('min_rating') || '';
  const initialPlatformCategory = searchParams?.get('platform_category') || '';

  // State
  const [searchInput, setSearchInput] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [sortBy, setSortBy] = useState(initialSort);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [minRating, setMinRating] = useState(initialMinRating);
  const [platformCategory, setPlatformCategory] = useState(initialPlatformCategory);
  const [platformCategories, setPlatformCategories] = useState<PlatformCategory[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 24, total: 0, pages: 0 });
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const suggestTimeout = useRef<NodeJS.Timeout>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  // Build URL params from current filters
  const buildParams = useCallback((overrides: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    const vals: Record<string, string> = { q: query, type: typeFilter, sort: sortBy, min_price: minPrice, max_price: maxPrice, min_rating: minRating, platform_category: platformCategory, ...overrides };
    Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p;
  }, [query, typeFilter, sortBy, minPrice, maxPrice, minRating, platformCategory]);

  // Fetch products
  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = buildParams();
      params.set('page', String(page));
      params.set('limit', '24');
      const res = await fetch(`/api/merchant/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products ?? []);
        setPagination(data.pagination ?? { page: 1, limit: 24, total: 0, pages: 0 });
        if (data.facets) setFacets(data.facets);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [buildParams]);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  // Fetch platform categories
  useEffect(() => {
    fetch('/api/platform/categories')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.categories) setPlatformCategories(data.categories); })
      .catch((err: unknown) => { console.warn('[marketplace] categories fetch failed:', err); });
  }, []);

  // Load wishlist state
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('vfide_wishlist') || '[]') as string[];
      setWishlistedIds(new Set(list));
    } catch { /* ignore */ }
  }, []);

  // Autocomplete
  const handleInputChange = (value: string) => {
    setSearchInput(value);
    if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
    if (value.length >= 2) {
      suggestTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/merchant/products?suggest=${encodeURIComponent(value)}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data.suggestions ?? []);
            setShowSuggestions(true);
          }
        } catch { /* ignore */ }
      }, 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applySearch = (q?: string) => {
    const newQ = q ?? searchInput;
    setQuery(newQ);
    setShowSuggestions(false);
    const params = buildParams({ q: newQ });
    router.push(`/marketplace?${params.toString()}`);
  };

  const applyFilter = (key: string, value: string) => {
    const setters: Record<string, (v: string) => void> = { type: setTypeFilter, sort: setSortBy, min_price: setMinPrice, max_price: setMaxPrice, min_rating: setMinRating, platform_category: setPlatformCategory };
    setters[key]?.(value);
    setTimeout(() => {
      const params = buildParams({ [key]: value });
      router.push(`/marketplace?${params.toString()}`);
    }, 0);
  };

  const clearAllFilters = () => {
    setSearchInput(''); setQuery(''); setTypeFilter(''); setSortBy('');
    setMinPrice(''); setMaxPrice(''); setMinRating(''); setPlatformCategory('');
    router.push('/marketplace');
  };

  const handleWishlist = (id: string) => {
    const added = toggleWishlist(id);
    setWishlistedIds(prev => {
      const next = new Set(prev);
      if (added) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const hasFilters = query || typeFilter || sortBy || minPrice || maxPrice || minRating || platformCategory;

  const toggleCatExpand = (slug: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ═══ Top Search Bar ═══ */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-xl font-bold text-blue-600 dark:text-blue-400 hidden sm:block flex-shrink-0">VFIDE</Link>

          {/* Search bar with autocomplete */}
          <div ref={searchRef} className="flex-1 relative max-w-2xl">
            <form onSubmit={e => { e.preventDefault(); applySearch(); }} className="flex">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products, brands, categories..."
                  value={searchInput}
                  onChange={e => handleInputChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-sm"
                  maxLength={100}
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-gray-900 font-medium rounded-r-lg transition text-sm"
              >
                Search
              </button>
            </form>

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setSearchInput(s.name); applySearch(s.name); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition"
                    >
                      <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 truncate">{s.name}</span>
                      <span className="text-xs text-gray-400">{TYPE_LABELS[s.product_type] || ''}</span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">${parseFloat(s.price).toFixed(2)}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nav links */}
          <Link href="/merchants" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hidden md:block">Merchants</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* ═══ Results Info Bar ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? 'Searching...' : (
              <>
                <span className="font-semibold text-gray-900 dark:text-white">{pagination.total.toLocaleString()}</span> result{pagination.total !== 1 ? 's' : ''}
                {query && <> for <strong className="text-gray-900 dark:text-white">&quot;{query}&quot;</strong></>}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => applyFilter('sort', e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* View toggle */}
            <div className="hidden sm:flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
              ><Grid3X3 className="w-4 h-4" /></button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
              ><List className="w-4 h-4" /></button>
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {query && <FilterChip label={`"${query}"`} onRemove={() => { setSearchInput(''); applySearch(''); }} />}
            {typeFilter && <FilterChip label={TYPE_LABELS[typeFilter] ?? typeFilter} onRemove={() => applyFilter('type', '')} />}
            {(minPrice || maxPrice) && <FilterChip label={`$${minPrice || '0'} – $${maxPrice || '∞'}`} onRemove={() => { applyFilter('min_price', ''); applyFilter('max_price', ''); }} />}
            {minRating && <FilterChip label={`${minRating}★ & up`} onRemove={() => applyFilter('min_rating', '')} />}
            {platformCategory && <FilterChip label={platformCategories.flatMap(c => [c, ...(c.children || [])]).find(c => c.slug === platformCategory)?.name || platformCategory} onRemove={() => applyFilter('platform_category', '')} />}
            <button onClick={clearAllFilters} className="text-xs text-blue-600 hover:underline ml-1">Clear all</button>
          </div>
        )}

        <div className="flex gap-6">
          {/* ═══ Desktop Filter Sidebar ═══ */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <FilterContent
              platformCategories={platformCategories}
              platformCategory={platformCategory}
              expandedCats={expandedCats}
              typeFilter={typeFilter}
              facets={facets}
              minPrice={minPrice}
              maxPrice={maxPrice}
              minRating={minRating}
              applyFilter={applyFilter}
              toggleCatExpand={toggleCatExpand}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
            />
          </aside>

          {/* ═══ Mobile Filter Drawer ═══ */}
          <AnimatePresence>
            {showMobileFilters && (
              <>
                <motion.div className="fixed inset-0 bg-black/40 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMobileFilters(false)} />
                <motion.div
                  className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-800 z-50 shadow-xl p-5 overflow-y-auto lg:hidden"
                  initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-900 dark:text-white">Filters</h2>
                    <button onClick={() => setShowMobileFilters(false)}><X className="w-5 h-5" /></button>
                  </div>
                  <FilterContent
              platformCategories={platformCategories}
              platformCategory={platformCategory}
              expandedCats={expandedCats}
              typeFilter={typeFilter}
              facets={facets}
              minPrice={minPrice}
              maxPrice={maxPrice}
              minRating={minRating}
              applyFilter={applyFilter}
              toggleCatExpand={toggleCatExpand}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
            />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ═══ Product Results ═══ */}
          <main className="flex-1 min-w-0">
            {/* Empty state */}
            {!loading && products.length === 0 && (
              <div className="text-center py-20">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {query ? `No results for "${query}"` : 'No products listed yet'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {query ? 'Try different keywords, check spelling, or use fewer filters' : 'Merchants will list products here'}
                </p>
                {hasFilters && (
                  <button onClick={clearAllFilters} className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-lg text-sm font-medium">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3'}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Grid View ── */}
            {!loading && viewMode === 'grid' && products.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(product => (
                  <ProductGridCard key={product.id} product={product} wishlisted={wishlistedIds.has(product.id)} onWishlist={handleWishlist} />
                ))}
              </div>
            )}

            {/* ── List View ── */}
            {!loading && viewMode === 'list' && products.length > 0 && (
              <div className="space-y-3">
                {products.map(product => (
                  <ProductListCard key={product.id} product={product} wishlisted={wishlistedIds.has(product.id)} onWishlist={handleWishlist} />
                ))}
              </div>
            )}

            {/* ── Pagination ── */}
            {!loading && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-8">
                {pagination.page > 1 && (
                  <button onClick={() => fetchProducts(pagination.page - 1)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                    ← Previous
                  </button>
                )}
                {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                  let page: number;
                  if (pagination.pages <= 7) page = i + 1;
                  else if (pagination.page <= 4) page = i + 1;
                  else if (pagination.page >= pagination.pages - 3) page = pagination.pages - 6 + i;
                  else page = pagination.page - 3 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => fetchProducts(page)}
                      className={`px-3 py-2 text-sm rounded-lg font-medium transition ${
                        page === pagination.page
                          ? 'bg-amber-400 text-gray-900 font-bold'
                          : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                {pagination.page < pagination.pages && (
                  <button onClick={() => fetchProducts(pagination.page + 1)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                    Next →
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter Chip ─── */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-blue-900 dark:hover:text-blue-200"><X className="w-3 h-3" /></button>
    </span>
  );
}

/* ─── Product Grid Card ─── */
function ProductGridCard({ product, wishlisted, onWishlist }: { product: Product; wishlisted: boolean; onWishlist: (id: string) => void }) {
  const saving = product.compare_at_price ? pctOff(product.price, product.compare_at_price) : 0;
  const lowStock = product.track_inventory && (product.inventory_count ?? 0) > 0 && (product.inventory_count ?? 0) <= 5;

  return (
    <motion.div
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow relative"
      whileHover={{ y: -3 }}
    >
      {/* Wishlist button */}
      <button
        onClick={e => { e.preventDefault(); onWishlist(product.id); }}
        className={`absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 shadow-sm transition ${
          wishlisted ? 'text-red-500' : 'text-gray-400 opacity-0 group-hover:opacity-100'
        }`}
      >
        <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-500' : ''}`} />
      </button>

      <Link href={`/product/${product.id}`}>
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
          {product.images?.[0]?.url ? (
            <Image src={product.images[0].url} alt={product.images[0].alt || product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-300 dark:text-gray-500" />
            </div>
          )}
          {/* Badges */}
          {saving > 0 && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{saving}%</span>
          )}
          {product.featured && (
            <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> Best Seller
            </span>
          )}
        </div>

        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Rating */}
          {Number(product.review_count) > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <StarRow rating={product.avg_rating} />
              <span className="text-[11px] text-blue-600 dark:text-blue-400">{product.review_count}</span>
            </div>
          )}

          {/* Sold count */}
          {product.sold_count > 20 && (
            <p className="text-[10px] text-gray-500 mt-0.5">{product.sold_count.toLocaleString()}+ bought last month</p>
          )}

          {/* Price */}
          <div className="mt-1.5">
            <span className="text-lg font-bold text-gray-900 dark:text-white">${parseFloat(product.price).toFixed(2)}</span>
            {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
              <span className="text-xs text-gray-400 line-through ml-1.5">
                ${parseFloat(product.compare_at_price).toFixed(2)}
              </span>
            )}
          </div>

          {/* Shipping / merchant */}
          {product.merchant_name && (
            <p className="text-[11px] text-gray-500 mt-1 truncate">by {product.merchant_name}</p>
          )}

          {/* Stock warnings */}
          {lowStock && (
            <p className="text-[10px] text-orange-600 font-medium mt-1">Only {product.inventory_count} left in stock</p>
          )}
          {product.track_inventory && (product.inventory_count ?? 0) <= 0 && (
            <p className="text-[10px] text-red-500 font-medium mt-1">Out of stock</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Product List Card ─── */
function ProductListCard({ product, wishlisted, onWishlist }: { product: Product; wishlisted: boolean; onWishlist: (id: string) => void }) {
  const saving = product.compare_at_price ? pctOff(product.price, product.compare_at_price) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/product/${product.id}`} className="flex gap-4 p-4">
        {/* Image */}
        <div className="w-40 h-40 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
          {product.images?.[0]?.url ? (
            <Image src={product.images[0].url} alt={product.images[0].alt || product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {saving > 0 && (
            <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{saving}%</span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 text-sm md:text-base">{product.name}</h3>

          {Number(product.review_count) > 0 && (
            <div className="flex items-center gap-1.5 mt-1">
              <StarRow rating={product.avg_rating} />
              <span className="text-xs text-blue-600 dark:text-blue-400">{product.review_count} rating{Number(product.review_count) !== 1 ? 's' : ''}</span>
            </div>
          )}

          {product.sold_count > 20 && (
            <p className="text-xs text-gray-500 mt-0.5">{product.sold_count.toLocaleString()}+ bought</p>
          )}

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900 dark:text-white">${parseFloat(product.price).toFixed(2)}</span>
            {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
              <>
                <span className="text-sm text-gray-400 line-through">${parseFloat(product.compare_at_price).toFixed(2)}</span>
                <span className="text-sm text-red-600 font-medium">({saving}% off)</span>
              </>
            )}
          </div>

          {product.short_description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{product.short_description}</p>
          )}

          {product.merchant_name && (
            <p className="text-xs text-gray-500 mt-1.5">
              by <span className="text-blue-600 dark:text-blue-400">{product.merchant_name}</span>
            </p>
          )}

          {product.track_inventory && (product.inventory_count ?? 0) <= 5 && (product.inventory_count ?? 0) > 0 && (
            <p className="text-xs text-orange-600 font-medium mt-1">Only {product.inventory_count} left in stock — order soon</p>
          )}
        </div>

        {/* Right: wishlist */}
        <button
          onClick={e => { e.preventDefault(); onWishlist(product.id); }}
          className={`self-start p-2 rounded-lg transition ${wishlisted ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
        >
          <Heart className={`w-5 h-5 ${wishlisted ? 'fill-red-500' : ''}`} />
        </button>
      </Link>
    </div>
  );
}
