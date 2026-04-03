'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original store/[slug] page

export function ProductsTab() {
  return (
    <div className="space-y-6">
      <div>
  {/* In-store search bar */}
  <div className="mb-4 relative max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
    type="text"
    placeholder="Search products in this store..."
    value={productSearch}
    onChange={e => setProductSearch(e.target.value)}
    className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
    maxLength={100}
    />
    {productSearch && (
    <button onClick={() => setProductSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
    <X className="w-4 h-4" />
    </button>
    )}
  </div>

  <div className="flex gap-6">
  {/* Categories sidebar */}
  {profile.categories && profile.categories.length > 0 && (
    <div className="hidden md:block w-48 flex-shrink-0">
    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Categories</h3>
    <button
    onClick={() => setSelectedCategory(null)}
    className={`block w-full text-left px-3 py-1.5 text-sm rounded transition ${
    !selectedCategory ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
    >
    All
    </button>
    {profile.categories.map(cat => (
    <button
    key={cat.id}
    onClick={() => setSelectedCategory(cat.name)}
    className={`block w-full text-left px-3 py-1.5 text-sm rounded transition ${
    selectedCategory === cat.name ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
    >
    {cat.name}
    </button>
    ))}
    </div>
  )}

  {/* Product grid */}
  <div className="flex-1">
    {filteredProducts.length === 0 ? (
    <div className="text-center py-12 text-gray-500">
    <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
    <p>No products available</p>
    </div>
    ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {filteredProducts.map(product => (
    <motion.div
    key={product.id}
    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
    whileHover={{ y: -2 }}
    >
    {product.images?.[0] ? (
    <div className="relative w-full h-40 overflow-hidden">
    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
    </div>
    ) : (
    <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
    <Package className="w-8 h-8 text-gray-400" />
    </div>
    )}
    <div className="p-4">
    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{product.name}</h3>
    {product.description && (
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{product.description}</p>
    )}
    <div className="flex items-center justify-between mt-3">
    <div>
    <span className="text-lg font-bold" style={{ color: themeColor }}>
    ${parseFloat(product.price).toFixed(2)}
    </span>
    {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
    <span className="text-sm text-gray-400 line-through ml-2">
    ${parseFloat(product.compare_at_price).toFixed(2)}
    </span>
    )}
    </div>
    <button
    onClick={() => addToCart(product)}
    className="p-2 rounded-lg text-white transition hover:opacity-90"
    style={{ backgroundColor: themeColor }}
    disabled={product.track_inventory && (product.inventory_count ?? 0) <= 0}
    >
    <Plus className="w-4 h-4" />
    </button>
    </div>
    {product.track_inventory && (product.inventory_count ?? 0) <= 0 && (
    <p className="text-xs text-red-500 mt-1">Out of stock</p>
    )}
    {product.category_name && (
    <span className="text-xs text-gray-400 mt-1 inline-block">{product.category_name}</span>
    )}
    </div>
    </motion.div>
    ))}
    </div>
    )}
  </div>
  </div>
  </div>
    </div>
  );
}
