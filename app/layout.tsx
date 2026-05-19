import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import '@/lib/ssr-animations.css';
import { CoreProviders } from '@/lib/providers/CoreProviders';

// JetBrains Mono backs every numeric value across the product via the
// <Numeric> component and the .font-numeric utility. Subsetted to latin
// to keep the bundle small. We expose it as a CSS variable so it's
// usable from Tailwind arbitrary values and from plain CSS.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-numeric',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://vfide.app'),
  title: 'VFIDE — Trust-Scored Payment Protocol',
  description: 'Zero merchant fees. Guardian-protected self-custody. Trust earned through real transactions.',
  openGraph: { title: 'VFIDE — Keep What You Earn', description: 'Decentralized payment protocol with zero merchant fees.', type: 'website' },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.svg',
  },
};

export const viewport: Viewport = { 
  width: 'device-width', 
  initialScale: 1, 
  themeColor: '#06b6d4',
  // Allow users to manually zoom, but prevent browser auto-zoom on input focus
  minimumScale: 1,
  // viewportFit covers safe area on notched phones (iPhone X+, Android notches)
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="en" suppressHydrationWarning data-csp-nonce={nonce || undefined} className={jetbrainsMono.variable}>
      <body className="bg-zinc-950 text-white antialiased">
        {/*
          CoreProviders already mounts ClientLayout (which itself mounts AppShell,
          RealtimeProvider, UserProvider, LiveProofScoreProvider). Do NOT wrap
          children in <ClientLayout> here — doing so renders the entire shell
          twice, including duplicate WebSocket connections and duplicate nav.
        */}
        <CoreProviders>{children}</CoreProviders>
      </body>
    </html>
  );
}
