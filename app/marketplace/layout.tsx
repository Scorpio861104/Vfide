import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace - VFIDE',
  description:
    'Discover products, services, and merchants in the VFIDE marketplace with wallet-native checkout and trust-aware commerce.',
  alternates: {
    canonical: '/marketplace',
  },
  keywords: [
    'VFIDE marketplace',
    'web3 commerce',
    'crypto checkout',
    'merchant discovery',
    'digital marketplace',
  ],
  openGraph: {
    title: 'Marketplace - VFIDE',
    description:
      'Browse trusted merchants, products, and services with streamlined VFIDE payments.',
    url: 'https://vfide.io/marketplace',
    siteName: 'VFIDE',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VFIDE Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketplace - VFIDE',
    description:
      'Discover wallet-native products and services in the VFIDE marketplace.',
    images: ['/og-image.png'],
  },
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
