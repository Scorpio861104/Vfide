import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seer Insights & Safety - VFIDE',
  description:
    'Review Seer risk insights, safety recommendations, appeals context, and protocol telemetry for safer VFIDE actions.',
  alternates: {
    canonical: '/seer-service',
  },
  keywords: [
    'Seer service',
    'VFIDE risk insights',
    'ProofScore safety',
    'appeals telemetry',
    'protocol analytics',
  ],
  openGraph: {
    title: 'Seer Insights & Safety - VFIDE',
    description:
      'Explore VFIDE safety signals, system analytics, and user-facing Seer guidance.',
    url: 'https://vfide.io/seer-service',
    siteName: 'VFIDE',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VFIDE Seer Service',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seer Insights & Safety - VFIDE',
    description:
      'Safety insights, appeals context, and protocol telemetry from VFIDE Seer.',
    images: ['/og-image.png'],
  },
};

export default function SeerServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
