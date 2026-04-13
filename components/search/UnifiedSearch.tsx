/**
 * UnifiedSearch — Searches merchants + products in one bar
 */
'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Store, Package, Star, MapPin, ArrowRight, Clock } from 'lucide-react';
import { useUnifiedSearch } from './useUnifiedSearch';

export function UnifiedSearch({
  className = '',
  placeholder = 'Search merchants, products, services...',
  autoFocus = false,
  size = 'md' as 'sm' | 'md' | 'lg',
}: {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    inputRef,
    query,
    results,
    recentSearches,
    isLoading,
    activeIndex,
    showDropdown,
    hasResults,
    setIsOpen,
    handleInput,
    handleKeyDown,
    clearQuery,
    goToSearch,
    goToMerchant,
    goToProduct,
  } = useUnifiedSearch(containerRef);

  const sizeClasses = { sm: 'py-2.5 pl-10 pr-10 text-sm', md: 'py-3.5 pl-12 pr-12 text-base', lg: 'py-5 pl-14 pr-14 text-lg' };
  const iconSizes = { sm: 16, md: 20, lg: 22 };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={iconSizes[size]} />
        <input ref={inputRef} type="text" value={query} onChange={(e) =>  handleInput(e.target.value)}
          onFocus={() => setIsOpen(true)} onKeyDown={handleKeyDown} autoFocus={autoFocus}
          className={`w-full ${sizeClasses[size]} bg-white/5 border border-white/10 rounded-2xl text-white  focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all`} />
        {query && (
          <button onClick={clearQuery} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors">
            <X size={iconSizes[size] - 4} />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-2 w-full bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden max-h-[70vh] overflow-y-auto">

            {/* Recent */}
            {query.length === 0 && recentSearches.length > 0 && (
              <div className="p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5"><Clock size={12} /> Recent searches</div>
                {recentSearches.map((term) => (
                  <button key={term} onClick={() => { handleInput(term); goToSearch(term); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-cyan-400 transition-colors flex items-center gap-2">
                    <Search size={14} className="text-gray-600" />{term}
                  </button>
                ))}
              </div>
            )}

            {/* Merchants */}
            {results.merchants.length > 0 && (
              <div className="p-3 border-b border-white/5">
                <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5"><Store size={12} /> Merchants</div>
                {results.merchants.map((m, i) => (
                  <button key={m.merchant_address} onClick={() => goToMerchant(m.slug)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex items-center gap-3 ${activeIndex === i ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent'}`}>
                    {m.logo_url ? <Image src={m.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"  width={48} height={48} /> : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: m.theme_color || '#3B82F6' }}>{m.display_name[0]?.toUpperCase()}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{m.display_name}</div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        {m.avg_rating && <span className="flex items-center gap-0.5"><Star size={10} className="text-amber-400 fill-amber-400" />{m.avg_rating} ({m.review_count})</span>}
                        {(m.city || m.country) && <span className="flex items-center gap-0.5"><MapPin size={10} />{[m.city, m.country].filter(Boolean).join(', ')}</span>}
                        <span className="flex items-center gap-0.5"><Package size={10} />{m.product_count} products</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-gray-600" />
                  </button>
                ))}
              </div>
            )}

            {/* Products */}
            {results.products.length > 0 && (
              <div className="p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5"><Package size={12} /> Products</div>
                {results.products.map((p, i) => {
                  const gi = results.merchants.length + i;
                  return (
                    <button key={`${p.slug}-${i}`} onClick={() => goToProduct(p.merchant_slug, p.slug)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3 ${activeIndex === gi ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent'}`}>
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-gray-400" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm truncate">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.merchant_slug ? `by ${p.merchant_slug}` : p.product_type}</div>
                      </div>
                      <div className="text-cyan-400 font-mono text-sm font-medium">${parseFloat(p.price).toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {query.trim().length >= 2 && (
              <button onClick={() => goToSearch(query.trim())}
                className="w-full px-4 py-3 border-t border-white/5 text-sm text-cyan-400 hover:bg-cyan-500/5 transition-colors flex items-center justify-center gap-2">
                <Search size={14} />Search all results for &ldquo;{query.trim()}&rdquo;<ArrowRight size={14} />
              </button>
            )}

            {isLoading && !hasResults && <div className="px-4 py-8 text-center text-gray-500 text-sm">Searching...</div>}
            {!isLoading && query.length >= 2 && !hasResults && <div className="px-4 py-8 text-center text-gray-500 text-sm">No merchants or products found for &ldquo;{query}&rdquo;</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
