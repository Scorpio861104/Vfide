'use client';

import { Footer } from '@/components/layout/Footer';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Heart, Star, Share2, ChevronLeft, ChevronRight, Package, ArrowLeft, Shield, Truck, Download, Clock, Minus, Plus, Check, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { MerchantTrustBadge } from '@/components/merchant/MerchantTrustBadge';

import { StarRating } from './components/StarRating';
import { ProductGallery } from './components/ProductGallery';
import { ProductInfo } from './components/ProductInfo';
import { RelatedProducts } from './components/RelatedProducts';

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
  const params = useParams();
  const productId = params?.id as string | undefined;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/merchant/products?id=${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setProduct(d?.product || null); setRelated(d?.related || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center">
        <Loader2 size={32} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg">Product not found</p>
          <Link href="/marketplace" className="mt-4 text-cyan-400 flex items-center gap-2 mx-auto w-fit">
            <ArrowLeft size={16} /> Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/marketplace" className="hover:text-cyan-400">Marketplace</Link>
            <span>/</span>
            {product.merchant_slug && <Link href={`/store/${product.merchant_slug}`} className="hover:text-cyan-400">{product.merchant_name}</Link>}
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
