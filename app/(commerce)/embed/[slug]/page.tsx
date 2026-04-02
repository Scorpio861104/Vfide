/**
 * Embeddable Store Widget
 * 
 * Two distribution methods:
 * 
 * 1. iframe embed (simplest):
 *    <iframe src="https://vfide.io/embed/store/kofi-fabrics" width="100%" height="600" />
 * 
 * 2. Script tag (prettier):
 *    <div id="vfide-store" data-slug="kofi-fabrics"></div>
 *    <script src="https://vfide.io/embed/widget.js"></script>
 * 
 * This file is the iframe page that renders inside the embed.
 * It's a standalone page with no navigation, minimal chrome,
 * designed to be dropped into any website.
 */

import type { Metadata } from 'next';
import { EmbedClient } from './EmbedClient';

interface EmbedPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string; cols?: string; max?: string }>;
}

async function fetchMerchant(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/merchant/directory?slug=${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.merchant ?? null;
}

async function fetchProducts(slug: string, max: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/merchant/products?merchant_slug=${slug}&status=active&limit=${max}`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? [];
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `VFIDE Store — ${slug}`, robots: 'noindex' };
}

export default async function EmbedStorePage({ params, searchParams }: EmbedPageProps) {
  const { slug } = await params;
  const { theme = 'dark', cols = '2', max = '12' } = await searchParams;

  const [merchant, products] = await Promise.all([
    fetchMerchant(slug),
    fetchProducts(slug, parseInt(max) || 12),
  ]);

  if (!merchant) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>Store not found</p>
      </div>
    );
  }

  return (
    <html>
      <head>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: ${theme === 'light' ? '#ffffff' : '#09090b'};
            color: ${theme === 'light' ? '#18181b' : '#fafafa'};
          }
        `}</style>
      </head>
      <body>
        <EmbedClient
          merchant={merchant}
          products={products}
          slug={slug}
          columns={parseInt(cols) || 2}
          theme={theme as 'dark' | 'light'}
        />
      </body>
    </html>
  );
}
