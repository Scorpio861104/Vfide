'use client';

import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Package, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { MerchantTrustBadge } from '@/components/merchant/MerchantTrustBadge';

import { ProductGallery } from './components/ProductGallery';
import { ProductInfo } from './components/ProductInfo';
import { RelatedProducts } from './components/RelatedProducts';
import { useLocale } from '@/lib/locale/LocaleProvider';

interface ProductImage { url: string; alt?: string }
interface Product {
  id: string; name: string; slug: string; price: string; compare_at_price: string | null;
  description: string | null; long_description: string | null;
  images: ProductImage[]; product_type: 'physical' | 'digital' | 'service';
  variants: { id: string; label: string; price_override: string | null }[] | null;
  merchant_slug: string | null; merchant_name: string; merchant_address: string;
  merchant_proof_score: number; avg_rating: number | null; review_count: number;
  track_inventory: boolean; inventory_count: number | null;
}

export default function ProductDetailPage() {
  const { locale } = useLocale();
  void locale;

  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!productId) return;
    setLoading(true);
    fetch(`/api/merchant/products?id=${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (cancelled) return; setProduct(d?.product || null); setRelated(d?.related || []); setLoading(false); })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
    }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
        <Loader2 size={32} className="text-accent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg">Product not found</p>
          <button onClick={() => router.back()} className="mt-4 text-accent flex items-center gap-2 mx-auto">
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/marketplace" className="hover:text-accent">Marketplace</Link>
            <span>/</span>
            {product.merchant_slug && <Link href={`/store/${product.merchant_slug}`} className="hover:text-accent">{product.merchant_name}</Link>}
            {product.merchant_slug && <span>/</span>}
            <span className="text-gray-300">{product.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ProductGallery images={product.images} name={product.name} compareAtPrice={product.compare_at_price} price={product.price} />
            <ProductInfo product={product} />
          </div>

          {/* Trust badge */}
          <div className="mt-8">
            <MerchantTrustBadge merchantAddress={product.merchant_address as `0x${string}`} variant="full" />
          </div>

          {/* Related */}
          {related.length > 0 && <RelatedProducts products={related} />}
        </div>
      </div>
      <Footer />
    </>
  );
}
