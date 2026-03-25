/**
 * Merchant Directory — Browse and discover VFIDE merchants
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Star, MapPin, ShoppingBag, Package, Briefcase, Download } from 'lucide-react';

interface MerchantCard {
  merchant_address: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  logo_url: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  theme_color: string | null;
  featured: boolean;
  services_enabled: boolean;
  digital_goods_enabled: boolean;
  shipping_enabled: boolean;
  product_count: number;
  avg_rating: number | null;
  review_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function MerchantDirectoryPage() {
  const [merchants, setMerchants] = useState<MerchantCard[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const fetchMerchants = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('q', search.trim());
      if (featuredOnly) params.set('featured', 'true');

      const res = await fetch(`/api/merchant/directory?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMerchants(data.merchants ?? []);
        setPagination(data.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, featuredOnly]);

  useEffect(() => { fetchMerchants(1); }, [fetchMerchants]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMerchants(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Merchant Directory</h1>
          <p className="text-blue-100 text-lg mb-6">Discover merchants accepting VFIDE payments</p>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search merchants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-300 outline-none"
                maxLength={100}
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition"
            >
              Search
            </button>
          </form>

          <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="rounded"
            />
            Featured merchants only
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {pagination.total} merchant{pagination.total !== 1 ? 's' : ''} found
        </p>

        {loading && (
          <div className="text-center py-12 text-gray-500">Loading merchants...</div>
        )}

        {!loading && merchants.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No merchants found. Try a different search.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.map((m) => (
            <Link key={m.merchant_address} href={`/store/${m.slug}`}>
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                whileHover={{ y: -2 }}
              >
                {/* Color bar */}
                <div className="h-2" style={{ backgroundColor: m.theme_color || '#3B82F6' }} />

                <div className="p-5">
                  <div className="flex items-start gap-3">
                    {m.logo_url ? (
                      <Image src={m.logo_url} alt="" width={48} height={48} className="rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ backgroundColor: m.theme_color || '#3B82F6' }}
                      >
                        {m.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{m.display_name}</h3>
                        {m.featured && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded font-medium">
                            Featured
                          </span>
                        )}
                      </div>
                      {m.tagline && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">{m.tagline}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {m.avg_rating !== null && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        {m.avg_rating} ({m.review_count})
                      </span>
                    )}
                    {(m.city || m.country) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {[m.city, m.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      <Package className="w-3 h-3" /> {m.product_count} products
                    </span>
                    {m.shipping_enabled && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                        Ships
                      </span>
                    )}
                    {m.services_enabled && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> Services
                      </span>
                    )}
                    {m.digital_goods_enabled && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-1 rounded flex items-center gap-1">
                        <Download className="w-3 h-3" /> Digital
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchMerchants(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  p === pagination.page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
