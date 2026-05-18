/**
 * EmbedClient — Lightweight product grid for iframe embedding
 * 
 * No framer-motion, no wallet provider, minimal JS.
 * Clicking a product opens the full store in a new tab.
 */
'use client';

import { Package, ExternalLink, Shield } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  images: (string | { url: string })[];
}

interface Merchant {
  display_name: string;
  merchant_address: string;
  theme_color: string | null;
}

interface EmbedClientProps {
  merchant: Merchant;
  products: Product[];
  slug: string;
  columns: number;
  theme: 'dark' | 'light';
}

function getImageUrl(img: string | { url: string }): string {
  return typeof img === 'string' ? img : img.url;
}

export function EmbedClient({ merchant, products, slug, columns, theme }: EmbedClientProps) {
  const isDark = theme === 'dark';
  const storeUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/store/${slug}`;

  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#fafafa' : '#18181b';
  const textSecondary = isDark ? '#a1a1aa' : '#71717a';
  const accent = merchant.theme_color || '#06b6d4';

  return (
    <div style={{ padding: '16px', maxWidth: '100%' }}>
      {/* Header */}
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', marginBottom: '16px',
          background: cardBg, border: `1px solid ${cardBorder}`,
          borderRadius: '12px', textDecoration: 'none', color: textPrimary,
        }}
      >
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 'bold', fontSize: '18px',
        }}>
          {merchant.display_name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{merchant.display_name}</div>
          <div style={{ fontSize: '12px', color: textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Powered by VFIDE • Zero merchant fees
          </div>
        </div>
        <ExternalLink size={16} color={textSecondary} />
      </a>

      {/* Product Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: '12px',
      }}>
        {products.map(product => (
          <a
            key={product.id}
            href={`${storeUrl}?product=${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textDecoration: 'none', color: textPrimary,
              background: cardBg, border: `1px solid ${cardBorder}`,
              borderRadius: '12px', overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = cardBorder)}
          >
            <div style={{ aspectRatio: '1', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              {product.images[0] ? (
                <img
                  src={getImageUrl(product.images[0])}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={24} color={textSecondary} />
                </div>
              )}
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {product.name}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: accent, fontFamily: 'monospace', marginTop: '4px' }}>
                ${parseFloat(product.price).toFixed(2)}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          marginTop: '16px', padding: '10px',
          fontSize: '12px', color: textSecondary, textDecoration: 'none',
        }}
      >
        <Shield size={12} />
        Trust-scored payments by VFIDE
      </a>
    </div>
  );
}
