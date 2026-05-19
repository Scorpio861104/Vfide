import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import '@/lib/ssr-animations.css';
// FIX PERF-2: RainbowKit CSS must be imported once at the root layout.
// Without this import, the modal has no base styles and re-injects them
// at runtime as inline <style> tags, causing a flash of unstyled content
// and layout reflow on first wallet-connect click.
import '@rainbow-me/rainbowkit/styles.css';
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
        {/* Skip-to-content: accessibility — visible on focus for keyboard users */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        {/* Hidden live region for screen-reader route announcements */}
        <div id="global-live-region" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
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
