'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

type MarketplaceFilters = {
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

type FilterContentProps = {
  filters: MarketplaceFilters;
  setFilters: React.Dispatch<React.SetStateAction<MarketplaceFilters>>;
  onClose: () => void;
};

const categories = ['all', 'fashion', 'electronics', 'services', 'collectibles'];
const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
];

export function FilterContent({ filters, setFilters, onClose }: FilterContentProps) {
  const updateFilter = (key: keyof MarketplaceFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <motion.aside
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-white"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Filters</h2>
        <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label htmlFor="marketplace-category-filter" className="mb-2 block text-sm text-gray-300">Category</label>
          <select
            id="marketplace-category-filter"
            value={filters.category}
            onChange={(event) => updateFilter('category', event.target.value === 'all' ? '' : event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All categories' : category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="marketplace-min-price-filter" className="mb-2 block text-sm text-gray-300">Min price</label>
          <input
            id="marketplace-min-price-filter"
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={(event) => updateFilter('minPrice', event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
            placeholder="0"
          />
        </div>

        <div>
          <label htmlFor="marketplace-max-price-filter" className="mb-2 block text-sm text-gray-300">Max price</label>
          <input
            id="marketplace-max-price-filter"
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={(event) => updateFilter('maxPrice', event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
            placeholder="1000"
          />
        </div>

        <div>
          <label htmlFor="marketplace-sort-filter" className="mb-2 block text-sm text-gray-300">Sort</label>
          <select
            id="marketplace-sort-filter"
            value={filters.sort}
            onChange={(event) => updateFilter('sort', event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </motion.aside>
  );
}
