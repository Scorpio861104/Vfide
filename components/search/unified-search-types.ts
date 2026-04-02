export interface MerchantResult {
  merchant_address: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  theme_color: string | null;
  avg_rating: number | null;
  review_count: number;
  product_count: number;
}

export interface ProductSuggestion {
  name: string;
  slug: string;
  price: string;
  product_type: string;
  merchant_slug: string | null;
  merchant_name?: string;
}

export interface SearchGroup {
  merchants: MerchantResult[];
  products: ProductSuggestion[];
}

export const RECENT_KEY = 'vfide.recent-searches';
export const MAX_RECENT = 5;
export const DEBOUNCE_MS = 250;
