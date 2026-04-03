import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/lib/ssr-animations.css';
import { CoreProviders } from '@/lib/providers/CoreProviders';

export const metadata: Metadata = {
  title: 'VFIDE — Trust-Scored Payment Protocol',
  description: 'Zero merchant fees. Non-custodial vaults. Trust earned through real transactions. For everyone the platforms forgot.',
  openGraph: {
    title: 'VFIDE — Keep What You Earn',
    description: 'Decentralized payment protocol with zero merchant fees.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#06b6d4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-zinc-950 text-white antialiased">
        <CoreProviders>
          {children}
        </CoreProviders>
      </body>
    </html>
  );
}
