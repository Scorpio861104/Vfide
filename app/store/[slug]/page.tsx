/**
 * Store/[slug] — Public merchant storefront
 *
 * Server component shell for SEO + fast first paint.
 * Client islands for cart/buy interactions only.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StoreClient } from '@/app/(commerce)/store/[slug]/components/StoreClient';

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

async function fetchMerchant(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/merchant/directory?slug=${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.merchant ?? null;
}

async function fetchProducts(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/merchant/products?merchant_slug=${slug}&status=active`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? [];
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  const merchant = await fetchMerchant(slug);
  if (!merchant) return { title: 'Store Not Found — VFIDE' };

  return {
    title: `${merchant.display_name} — VFIDE Store`,
    description: merchant.tagline || `Shop at ${merchant.display_name} on VFIDE. Trust-scored payments. Zero merchant fees.`,
    openGraph: {
      title: merchant.display_name,
      description: merchant.tagline || 'Shop on VFIDE',
      images: merchant.logo_url ? [{ url: merchant.logo_url }] : [],
    },
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const [merchant, products] = await Promise.all([
    fetchMerchant(slug),
    fetchProducts(slug),
  ]);

  if (!merchant) notFound();

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-white/5">
        <div className="container mx-auto px-4 max-w-6xl py-8 pt-24">
          <div className="flex items-center gap-5">
            {merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={merchant.display_name}
                className="w-20 h-20 rounded-2xl object-cover border border-white/10"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white border border-white/10"
                style={{ backgroundColor: merchant.theme_color || '#3B82F6' }}
              >
                {merchant.display_name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">{merchant.display_name}</h1>
              {merchant.tagline && (
                <p className="text-gray-400 mt-1">{merchant.tagline}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                {(merchant.city || merchant.country) && (
                  <span>{[merchant.city, merchant.country].filter(Boolean).join(', ')}</span>
                )}
                <span>{products.length} products</span>
                {merchant.avg_rating && (
                  <span className="text-amber-400">★ {merchant.avg_rating}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <StoreClient
        merchant={merchant}
        initialProducts={products}
        slug={slug}
      />
    </div>
  );
}
