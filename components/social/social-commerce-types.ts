export interface ShoppableProduct {
  id: string;
  name: string;
  price: string;
  compareAtPrice?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  merchantSlug: string;
  merchantName: string;
  merchantAddress: string;
  merchantProofScore?: number;
  productType?: 'physical' | 'digital' | 'service';
}

export interface ShareProductToFeedProps {
  product: ShoppableProduct;
  className?: string;
}

export interface ShoppablePostProps {
  product: ShoppableProduct;
  postedBy: {
    address: string;
    name: string;
    proofScore: number;
  };
  timestamp: number;
  caption?: string;
  likes?: number;
  comments?: number;
  className?: string;
}

export interface PurchaseProofEventProps {
  buyerAddress: string;
  buyerName?: string;
  merchantName: string;
  merchantSlug: string;
  productName: string;
  price: string;
  timestamp: number;
  txHash?: string;
  className?: string;
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
