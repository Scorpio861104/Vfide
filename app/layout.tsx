import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import "@/lib/ssr-animations.css";
import { StructuredData } from "@/components/seo/StructuredData";
import { getHtmlLang, normalizeLocale } from "@/lib/i18n";
import { AppFeatureProviders, CoreProviders, Web3Providers } from "@/lib/providers";

// Fonts are self-hosted via @fontsource in globals.css

export const metadata: Metadata = {
  metadataBase: new URL("https://vfide.io"),
  title: "VFIDE - Decentralized Payment Protocol",
  description: "Accept crypto payments. Build trust. No merchant processor fees. Network burn fees + gas apply.",
  keywords: "crypto payments, VFIDE, trust scoring, ProofScore, Web3 commerce, DeFi, stablecoin payments",
  authors: [{ name: "VFIDE Protocol" }],
  creator: "VFIDE",
  publisher: "VFIDE Protocol",
  robots: "index, follow",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vfide.io",
    siteName: "VFIDE",
    title: "VFIDE - Decentralized Payment Protocol",
    description: "Accept crypto payments. Build trust. No processor fees*.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VFIDE Protocol",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VFIDE - Decentralized Payment Protocol",
    description: "Accept crypto payments. Build trust. No processor fees*.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F0F12",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isE2E = process.env.E2E === '1'
  const requestHeaders = await headers()
  const cookieStore = await cookies()
  const nonce = requestHeaders.get('x-nonce') ?? ''
  const locale = normalizeLocale(cookieStore.get('vfide_locale')?.value ?? requestHeaders.get('accept-language'))

  return (
    <html lang={getHtmlLang(locale)} data-locale={locale}>
      <head>
        {/* CSP nonce exposed for getClientNonce() in lib/security.ts. The matching
          nonce is set in the Content-Security-Policy header by middleware.ts. */}
        {nonce && <meta property="csp-nonce" content={nonce} />}
      </head>
      <body className="font-sans antialiased bg-zinc-900">
        <StructuredData />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        <header role="banner" className="sr-only">
          <span>VFIDE</span>
        </header>
        <div id="global-live-region" className="sr-only" aria-live="polite" aria-atomic="true" />
        {isE2E ? (
          <main id="main-content" className="min-h-screen min-w-0 w-full" tabIndex={-1}>
            {children}
          </main>
        ) : (
          <CoreProviders>
            <Web3Providers>
              <AppFeatureProviders>
                <main id="main-content" className="min-h-screen min-w-0 w-full" tabIndex={-1}>
                  {children}
                </main>
              </AppFeatureProviders>
            </Web3Providers>
          </CoreProviders>
        )}
      </body>
    </html>
  );
}
