import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support Center - VFIDE',
  description:
    'Get help with wallets, payments, vault recovery, security, and protocol support through the VFIDE support center.',
  alternates: {
    canonical: '/support',
  },
  keywords: [
    'VFIDE support',
    'wallet help',
    'crypto payment support',
    'vault recovery',
    'ProofScore help',
  ],
  openGraph: {
    title: 'Support Center - VFIDE',
    description:
      'Find answers, troubleshoot wallet and payment issues, and contact VFIDE support with confidence.',
    url: 'https://vfide.io/support',
    siteName: 'VFIDE',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VFIDE Support Center',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support Center - VFIDE',
    description:
      'Wallet help, payment guidance, and security answers from the VFIDE support center.',
    images: ['/og-image.png'],
  },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
