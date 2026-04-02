'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function addProductToCart(product: { id: string; name: string; price: string; merchant_slug: string | null }, qty: number): void {
  try {
    const existing = JSON.parse(localStorage.getItem('vfide_cart') || '[]') as Array<{
      id: string; name: string; price: string; qty: number; merchantSlug: string | null;
    }>;
    const idx = existing.findIndex(i => i.id === product.id);
    if (idx >= 0) {
      const entry = existing[idx];
      if (entry) entry.qty += qty;
    } else {
      existing.push({ id: product.id, name: product.name, price: product.price, qty, merchantSlug: product.merchant_slug });
    }
    localStorage.setItem('vfide_cart', JSON.stringify(existing));
  } catch { /* ignore storage errors */ }
}
