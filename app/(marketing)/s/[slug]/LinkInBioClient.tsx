'use client';

import { useState } from 'react';
import { MessageCircle, Phone, Mail, ExternalLink, Package, QrCode, Shield, Share2, Copy, Check } from 'lucide-react';

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
  whatsapp?: string;
  phone?: string;
  email?: string;
}

interface LinkInBioClientProps {
  merchant: Merchant;
  products: Product[];
  slug: string;
  themeColor: string;
}

function getImageUrl(img: string | { url: string }): string {
  return typeof img === 'string' ? img : img.url;
}

export function LinkInBioClient({ merchant, products, slug, themeColor }: LinkInBioClientProps) {
  const [copied, setCopied] = useState(false);
  const storeUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${slug}` : `/store/${slug}`;
  const payUrl = typeof window !== 'undefined' ? `${window.location.origin}/pay/${slug}` : `/pay/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-sm mx-auto px-4 pb-12 space-y-4">
      {/* Action buttons */}
      <div className="space-y-2.5">
        {/* Full store */}
        <a href={storeUrl}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.01]"
          style={{ backgroundColor: themeColor }}>
          <ExternalLink size={18} /> View full store
        </a>

        {/* Pay directly */}
        <a href={payUrl}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all">
          <QrCode size={18} /> Pay now
        </a>

        {/* Contact */}
        {merchant.whatsapp && (
          <a href={`https://wa.me/${merchant.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all">
            <MessageCircle size={18} /> WhatsApp
          </a>
        )}

        {merchant.phone && (
          <a href={`tel:${merchant.phone}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white/5 border border-white/10 rounded-xl font-bold text-gray-300 hover:bg-white/10 transition-all">
            <Phone size={18} /> Call
          </a>
        )}

        {merchant.email && (
          <a href={`mailto:${merchant.email}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white/5 border border-white/10 rounded-xl font-bold text-gray-300 hover:bg-white/10 transition-all">
            <Mail size={18} /> Email
          </a>
        )}
      </div>

      {/* Products preview */}
      {products.length > 0 && (
        <div>
          <h2 className="text-white font-bold mb-3 flex items-center gap-2">
            <Package size={16} style={{ color: themeColor }} /> Products
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {products.slice(0, 6).map(product => (
              <a key={product.id} href={`${storeUrl}?product=${product.slug}`}
                className="bg-white/3 border border-white/5 rounded-xl overflow-hidden hover:border-white/15 transition-colors">
                <div className="aspect-square bg-white/5 overflow-hidden">
                  {product.images[0] ? (
                    <img src={getImageUrl(product.images[0])} alt={product.name}
                      className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <div className="text-white text-xs font-medium truncate">{product.name}</div>
                  <div className="text-sm font-bold font-mono mt-0.5" style={{ color: themeColor }}>
                    ${parseFloat(product.price).toFixed(2)}
                  </div>
                </div>
              </a>
            ))}
          </div>
          {products.length > 6 && (
            <a href={storeUrl} className="block text-center text-sm mt-3 py-2 text-gray-400 hover:text-white transition-colors">
              View all {products.length} products →
            </a>
          )}
        </div>
      )}

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-500">
        <Shield size={14} style={{ color: themeColor }} />
        Trust-scored payments by VFIDE • Zero merchant fees
      </div>

      {/* Share */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={copyLink}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-gray-400 text-xs hover:text-white transition-colors">
          {copied ? <><Check size={12} className="text-emerald-400" /> Copied!</> : <><Copy size={12} /> Copy link</>}
        </button>
        <button onClick={() => navigator.share?.({ url: window.location.href, title: merchant.display_name }).catch(() => {})}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-gray-400 text-xs hover:text-white transition-colors">
          <Share2 size={12} /> Share
        </button>
      </div>
    </div>
  );
}
