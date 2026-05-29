'use client';

/**
 * MarketplaceEmptyState
 *
 * Shown when the marketplace has no products yet (testnet / early launch)
 * or when a search query returns zero results.
 *
 * Design intent:
 * - Don't let an empty DB make the product look broken. An empty marketplace
 *   on testnet is expected. The empty state should explain WHY it's empty
 *   and turn the visitor into a potential seller.
 * - Show demo "category tiles" so the visitor understands WHAT can be sold
 *   here — physical goods, digital products, services.
 * - Clear CTA: "List your first product" — this is how the marketplace fills.
 * - If the user searched for something specific, show a lighter "no results"
 *   state instead of the full launch CTA.
 */

import Link from 'next/link';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import {
  Store, ArrowRight, Package, Laptop, Wrench,
  Shirt, Music, Globe, Sparkles,
} from 'lucide-react';

const CATEGORY_TILES = [
  { icon: Shirt,   label: 'Fashion & apparel',     color: '#ec4899', example: 'Handmade clothing, accessories' },
  { icon: Laptop,  label: 'Digital products',       color: '#06b6d4', example: 'Templates, eBooks, software' },
  { icon: Wrench,  label: 'Services',               color: '#a78bfa', example: 'Freelance, consulting, tutoring' },
  { icon: Package, label: 'Physical goods',         color: '#f97316', example: 'Crafts, electronics, collectibles' },
  { icon: Music,   label: 'Art & media',            color: '#22c55e', example: 'Music, photography, design' },
  { icon: Globe,   label: 'Cross-border goods',     color: '#facc15', example: 'Import/export, specialty items' },
] as const;

interface Props {
  hasQuery: boolean;
}

export function MarketplaceEmptyState({ hasQuery }: Props) {
  if (hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package size={44} className="mb-4 text-zinc-600" aria-hidden="true" />
        <p className="text-lg font-semibold text-white mb-1">No results found</p>
        <p className="text-sm text-zinc-500 mb-6 max-w-sm">
          Nothing matched your search yet — the marketplace is still growing.
          Try a different term or browse everything.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-accent hover:underline"
        >
          Clear search
        </button>
      </div>
    );
  }

  return (
    <div className="py-8">

      {/* Testnet notice */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] px-6 py-5 flex items-start gap-4 max-w-2xl mx-auto"
      >
        <Sparkles size={20} className="text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-white mb-1">
            You&apos;re on the testnet — the marketplace opens at mainnet launch.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The first sellers to list here will be featured at the top of the live
            marketplace when we go live. Listing is free — sellers never pay a fee.
          </p>
        </div>
      </m.div>

      {/* What can be sold here */}
      <div className="mb-10">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">
          What can be sold on VFIDE
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
          {CATEGORY_TILES.map((tile, i) => {
            const Icon = tile.icon;
            return (
              <m.div
                key={tile.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                className="rounded-xl border border-white/8 bg-white/[0.02] p-4"
              >
                <div
                  className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${tile.color}18`, color: tile.color }}
                  aria-hidden="true"
                >
                  <Icon size={16} />
                </div>
                <p className="text-sm font-semibold text-white mb-0.5">{tile.label}</p>
                <p className="text-xs text-zinc-500">{tile.example}</p>
              </m.div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Link
          href="/merchant/setup"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-black hover:bg-accent/90 transition-colors"
          aria-label="List your first product as a seller"
        >
          <Store size={16} aria-hidden="true" />
          List your first product — free forever
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link
          href="/about"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          How selling works →
        </Link>
      </m.div>
    </div>
  );
}
