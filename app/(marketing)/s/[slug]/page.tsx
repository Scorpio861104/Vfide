/**
 * Link-in-Bio Storefront — vfide.io/s/kofi
 * 
 * One URL. Works everywhere. No app needed.
 * 
 * This is what a merchant puts in their Instagram bio, WhatsApp status,
 * business card, market stall sign. It's their entire online presence:
 * - Store name + trust badge
 * - Product grid
 * - Contact links (WhatsApp, phone, email)
 * - QR code for in-person payments
 * - Social proof (recent purchases, endorsements)
 * 
 * Server-rendered for instant load + full SEO.
 * No wallet required to VIEW — only to BUY.
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { LinkInBioClient } from './LinkInBioClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchMerchantProfile(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/merchant/directory?slug=${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.merchant ?? null;
}

async function fetchProducts(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/merchant/products?merchant_slug=${slug}&status=active&limit=6`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const merchant = await fetchMerchantProfile(slug);
  if (!merchant) return { title: 'Not Found — VFIDE' };

  return {
    title: `${merchant.display_name} — VFIDE`,
    description: merchant.tagline || `Shop at ${merchant.display_name}. Zero fees. Trust-scored payments.`,
    openGraph: {
      title: merchant.display_name,
      description: merchant.tagline || `Shop on VFIDE — zero merchant fees`,
      type: 'profile',
      images: merchant.logo_url ? [{ url: merchant.logo_url, width: 400, height: 400 }] : [],
    },
    twitter: {
      card: 'summary',
      title: merchant.display_name,
      description: merchant.tagline || `Shop on VFIDE`,
    },
  };
}

export default async function LinkInBioPage({ params }: PageProps) {
  const { slug } = await params;
  const [merchant, products] = await Promise.all([
    fetchMerchantProfile(slug),
    fetchProducts(slug),
  ]);

  if (!merchant) notFound();

  const themeColor = merchant.theme_color || '#06b6d4';

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Server-rendered profile header — instant paint */}
      <div className="pt-24 pb-8 text-center px-4" style={{ background: `linear-gradient(to bottom, ${themeColor}15, transparent)` }}>
        {/* Avatar */}
        {merchant.logo_url ? (
          <Image src={merchant.logo_url} alt={merchant.display_name}
            className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 border-2 border-white/10 shadow-lg"
            style={{ boxShadow: `0 8px 32px ${themeColor}30` }}  width={48} height={48} />
        ) : (
          <div className="w-24 h-24 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white border-2 border-white/10"
            style={{ backgroundColor: themeColor, boxShadow: `0 8px 32px ${themeColor}30` }}>
            {merchant.display_name[0]?.toUpperCase()}
          </div>
        )}

        {/* Name */}
        <h1 className="text-2xl font-bold text-white mb-1">{merchant.display_name}</h1>
        {merchant.tagline && <p className="text-gray-400 text-sm max-w-xs mx-auto">{merchant.tagline}</p>}

        {/* Location */}
        {(merchant.city || merchant.country) && (
          <p className="text-gray-500 text-xs mt-2">
            {[merchant.city, merchant.country].filter(Boolean).join(', ')}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
          {merchant.avg_rating && (
            <span className="flex items-center gap-1">
              <span className="text-amber-400">★</span> {merchant.avg_rating}
            </span>
          )}
          <span>{products.length} products</span>
          {merchant.proof_score && <span>ProofScore {merchant.proof_score.toLocaleString()}</span>}
        </div>
      </div>

      {/* Client island for interactive bits */}
      <LinkInBioClient
        merchant={merchant}
        products={products}
        slug={slug}
        themeColor={themeColor}
      />
    </div>
  );
}
