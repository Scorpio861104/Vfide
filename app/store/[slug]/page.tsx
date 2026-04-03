'use client';

import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ProductsTab } from './components/ProductsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { AboutTab } from './components/AboutTab';

type TabId = 'products' | 'reviews' | 'about';

const TAB_LABELS: Record<TabId, string> = { 'products': 'Products', 'reviews': 'Reviews', 'about': 'About' };
const TAB_IDS: TabId[] = ['products', 'reviews', 'about'];

export default function StorefrontPage() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [activeTab, setActiveTab] = useState<TabId>('products');

  if (!slug) {
    return (
      <>
        <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Merchant not found</h1>
            <p className="text-gray-400 mb-6">We couldn&apos;t find that merchant storefront.</p>
            <Link href="/merchants" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4">
              Back to directory
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const displayName = slug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white mb-2">{displayName || 'Merchant Storefront'}</motion.h1>
          <p className="text-white/60 mb-8">Public storefront preview for @{slug}</p>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {TAB_IDS.map(id => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}>
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
          {activeTab === 'about' && <AboutTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}
