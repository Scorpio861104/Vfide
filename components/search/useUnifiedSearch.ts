'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { type SearchGroup, type MerchantResult, type ProductSuggestion, RECENT_KEY, MAX_RECENT, DEBOUNCE_MS } from './unified-search-types';

export function useUnifiedSearch(containerRef: React.RefObject<HTMLDivElement | null>) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGroup>({ merchants: [], products: [] });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[];
      setRecentSearches(stored.slice(0, MAX_RECENT));
    } catch { /* ignore */ }
  }, []);

  const saveRecent = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, [recentSearches]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [containerRef]);

  const fetchResults = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) { setResults({ merchants: [], products: [] }); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [merchantRes, productRes] = await Promise.all([
        fetch(`/api/merchant/directory?q=${encodeURIComponent(searchTerm)}&limit=3`),
        fetch(`/api/merchant/products?suggest=${encodeURIComponent(searchTerm)}`),
      ]);
      const [merchantData, productData] = await Promise.all([
        merchantRes.ok ? merchantRes.json() : { merchants: [] },
        productRes.ok ? productRes.json() : { suggestions: [] },
      ]);
      setResults({ merchants: (merchantData.merchants ?? []).slice(0, 3), products: (productData.suggestions ?? []).slice(0, 5) });
    } catch { setResults({ merchants: [], products: [] }); }
    setIsLoading(false);
  }, []);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length >= 2) {
      setIsLoading(true);
      setIsOpen(true);
      debounceRef.current = setTimeout(() => fetchResults(value), DEBOUNCE_MS);
    } else {
      setResults({ merchants: [], products: [] });
      setIsOpen(value.length === 0 && recentSearches.length > 0);
      setIsLoading(false);
    }
  }, [fetchResults, recentSearches.length]);

  const goToSearch = useCallback((term: string) => { saveRecent(term); setIsOpen(false); router.push(`/marketplace?q=${encodeURIComponent(term)}`); }, [router, saveRecent]);
  const goToMerchant = useCallback((slug: string) => { setIsOpen(false); router.push(`/store/${slug}`); }, [router]);
  const goToProduct = useCallback((merchantSlug: string | null, productSlug: string) => {
    setIsOpen(false);
    router.push(merchantSlug ? `/store/${merchantSlug}?product=${productSlug}` : `/marketplace?q=${encodeURIComponent(productSlug)}`);
  }, [router]);

  const navItems = [
    ...results.merchants.map(m => ({ type: 'merchant' as const, data: m })),
    ...results.products.map(p => ({ type: 'product' as const, data: p })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setIsOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, navItems.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < navItems.length) {
        const item = navItems[activeIndex];
        if (!item) return;
        if (item.type === 'merchant') goToMerchant((item.data as MerchantResult).slug);
        else goToProduct((item.data as ProductSuggestion).merchant_slug, (item.data as ProductSuggestion).slug);
      } else if (query.trim()) {
        goToSearch(query.trim());
      }
    }
  };

  const clearQuery = () => { setQuery(''); setResults({ merchants: [], products: [] }); setIsOpen(false); inputRef.current?.focus(); };
  const hasResults = results.merchants.length > 0 || results.products.length > 0;
  const showDropdown = isOpen && (hasResults || isLoading || (query.length === 0 && recentSearches.length > 0));

  return {
    inputRef, query, results, recentSearches, isOpen, isLoading, activeIndex, navItems,
    hasResults, showDropdown,
    setIsOpen, handleInput, handleKeyDown, clearQuery,
    goToSearch, goToMerchant, goToProduct,
  };
}
