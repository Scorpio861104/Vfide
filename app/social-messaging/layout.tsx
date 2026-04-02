import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Social Hub - VFIDE',
  description:
    'Use VFIDE Social Hub for encrypted messaging, friend circles, group coordination, and on-chain trust building.',
  alternates: {
    canonical: '/social-messaging',
  },
  keywords: [
    'encrypted messaging',
    'web3 social',
    'VFIDE social hub',
    'friend circles',
    'on-chain trust',
  ],
  openGraph: {
    title: 'Social Hub - VFIDE',
    description:
      'Private wallet-based messaging, trusted groups, and social coordination for the VFIDE ecosystem.',
    url: 'https://vfide.io/social-messaging',
    siteName: 'VFIDE',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VFIDE Social Hub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Social Hub - VFIDE',
    description:
      'Encrypted wallet-native messaging and group coordination on VFIDE.',
    images: ['/og-image.png'],
  },
};

export default function SocialMessagingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
