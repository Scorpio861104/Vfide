import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/wallet/Web3Provider";
import { OnboardingManager } from "@/components/onboarding/OnboardingManager";
import { HelpCenter } from "@/components/onboarding/HelpCenter";
import { ToastProvider } from "@/components/ui/toast";
import { NetworkSwitchOverlay } from "@/components/wallet/NetworkSwitchOverlay";
import { EnhancedNetworkBanner } from "@/components/wallet/EnhancedNetworkBanner";
import { TestnetNotification } from "@/components/ui/TestnetNotification";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { PresenceManager } from "@/components/social/PresenceManager";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import { CsrfFetchProvider } from "@/components/security/CsrfFetchProvider";
import { PerformanceProvider } from "@/components/performance/PerformanceProvider";
import { ErrorMonitoringProvider, DevErrorConsole } from "@/components/monitoring/ErrorMonitoringProvider";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import { AchievementToastContainer } from "@/components/gamification/AchievementToast";
import { PieMenu } from "@/components/navigation/PieMenu";
// Core integrations from PR #56
import { ServiceWorkerRegistration } from "@/components/core/ServiceWorkerRegistration";
import { ZustandHydration } from "@/components/core/ZustandHydration";
import { WebVitalsTracker } from "@/components/core/WebVitalsTracker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://vfide.io"),
  title: "VFIDE - Crypto Payment Protocol",
  description: "Accept crypto payments. Build trust. No merchant processor fees. Network burn fees + gas apply. Currently on Base Sepolia testnet.",
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
    title: "VFIDE - Crypto Payment Protocol",
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
    title: "VFIDE - Crypto Payment Protocol",
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
  const headerList = await headers();
  const nonce = headerList.get('x-nonce') || '';

  return (
    <html lang="en">
      <head>
        <meta property="csp-nonce" content={nonce} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-zinc-900`}>
        {isE2E ? (
          children
        ) : (
          <ErrorBoundary>
            <AccessibilityProvider>
              <Web3Provider>
                <ToastProvider>
                  <CsrfFetchProvider />
                  <SecurityProvider />
                  <PerformanceProvider />
                  <ErrorMonitoringProvider />
                  <PresenceManager />
                  <DevErrorConsole />
                  <ServiceWorkerRegistration />
                  <ZustandHydration />
                  <WebVitalsTracker />
                  <EnhancedNetworkBanner />
                  <NetworkSwitchOverlay />
                  <TestnetNotification />
                  <AchievementToastContainer />
                  {children}
                  <PieMenu />
                  <OnboardingManager />
                  <HelpCenter />
                </ToastProvider>
              </Web3Provider>
          </AccessibilityProvider>
          </ErrorBoundary>
        )}
      </body>
    </html>
  );
}
