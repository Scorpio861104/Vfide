export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  price: string;
  compare_at_price: string | null;
  description: string | null;
  long_description: string | null;
  images: (string | { url: string; alt?: string })[];
  product_type: 'physical' | 'digital' | 'service';
  variants: ProductVariant[] | null;
  merchant_slug: string;
  merchant_name: string;
  merchant_address: string;
  merchant_proof_score: number;
  avg_rating: number | null;
  review_count: number;
  track_inventory: boolean;
  inventory_count: number | null;
  tags: string[];
}

export interface ProductVariant {
  id: string;
  label: string;
  price_override: string | null;
  in_stock: boolean;
}

export interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  merchant_slug: string;
}

export interface ProductDetailModalProps {
  productId: string;
  onClose: () => void;
  onAddToCart?: (productId: string, quantity: number, variantId?: string) => void;
}
