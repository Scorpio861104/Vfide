import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

// NOTE: Noto Sans SC (Simplified Chinese) and Noto Sans Thai are available
// through the main Noto_Sans with lang:zh or lang:th subsets, not as separate exports.
// For a dedicated Chinese/Thai version with better glyphs, we use Noto_Sans with
// explicit script/lang settings in the config below.

// CJK & Thai fonts — loaded with display:swap so Latin text renders immediately.
// Each font is subsetted to its script only, keeping bundle size minimal.
const notoSansJP = localFont({
  src: [
    { path: './fonts/noto-sans-jp-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/noto-sans-jp-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/noto-sans-jp-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-ja',
  preload: false, // Only preload when locale is ja-JP
});

// Noto Sans for Simplified Chinese (SC) — uses Noto_Sans with lang:zh
const notoSansSC = localFont({
  src: [
    { path: './fonts/noto-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/noto-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/noto-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-zh',
  preload: false,
  // Self-hosted latin subset; CJK glyphs fall back to system fonts (matches prior subsets:['latin'])
});

// Noto Sans for Thai — uses Noto_Sans with Thai script support
const notoSansThai = localFont({
  src: [
    { path: './fonts/noto-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/noto-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/noto-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-th',
  preload: false,
  // Self-hosted latin subset; Thai glyphs fall back to system fonts (matches prior subsets:['latin'])
});
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import './globals.css';
import '@/lib/ssr-animations.css';
// FIX PERF-2: RainbowKit CSS must be imported once at the root layout.
// Without this import, the modal has no base styles and re-injects them
// at runtime as inline <style> tags, causing a flash of unstyled content
// and layout reflow on first wallet-connect click.
import '@rainbow-me/rainbowkit/styles.css';
import { CoreProviders } from '@/lib/providers/CoreProviders';
import { getHtmlLang, normalizeLocale } from '@/lib/i18n';

// JetBrains Mono backs every numeric value across the product via the
// <Numeric> component and the .font-numeric utility. Subsetted to latin
// to keep the bundle small. We expose it as a CSS variable so it's
// usable from Tailwind arbitrary values and from plain CSS.
const jetbrainsMono = localFont({
  src: [
    { path: './fonts/jetbrains-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/jetbrains-mono-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-numeric',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://vfide.app'),
  title: 'VFIDE — Self-custodial payments and commerce on Base',
  description:
    'VFIDE is a self-custodial payments + commerce protocol on Base, with zero merchant fees and a reputation system that rewards honest users.',
  openGraph: {
    title: 'VFIDE — Self-custodial payments and commerce on Base',
    description:
      'Zero merchant fees. You hold your keys. A reputation that lowers your fees the more you use it.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'VFIDE — Zero merchant fees. You hold your keys.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VFIDE — Self-custodial payments and commerce on Base',
    description: 'Zero merchant fees. You hold your keys. A reputation that lowers your fees the more you use it.',
    images: ['/og-image.png'],
  },
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
  // Resolve locale server-side from cookie for correct initial <html lang>
  // Falls back to 'en' if cookie is absent or invalid.
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('vfide_locale')?.value ?? '';
  const serverLang = getHtmlLang(normalizeLocale(localeCookie));
  // RTL direction: Arabic is the only RTL locale currently supported
  const serverDir = serverLang === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={serverLang} dir={serverDir} suppressHydrationWarning data-csp-nonce={nonce || undefined} className={`${jetbrainsMono.variable} ${notoSansJP.variable} ${notoSansSC.variable} ${notoSansThai.variable}`}>
      <body className="bg-zinc-950 text-white antialiased">
        {/* Skip-to-content: accessibility — visible on focus for keyboard users */}
        <a href="#main" className="skip-to-content">
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
