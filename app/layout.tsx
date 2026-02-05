import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Web3Provider } from "@/components/wallet/Web3Provider";
import { OnboardingManager } from "@/components/onboarding/OnboardingManager";
import { HelpCenter } from "@/components/onboarding/HelpCenter";
import { ToastProvider } from "@/components/ui/toast";
// Network-agnostic: Works on testnet and mainnet identically
import { NetworkSwitchOverlay } from "@/components/wallet/NetworkSwitchOverlay";
import { EnhancedNetworkBanner } from "@/components/wallet/EnhancedNetworkBanner";
import { DemoModeBanner } from "@/components/layout/DemoModeBanner";
import { TestnetNotification } from "@/components/ui/TestnetNotification";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { PresenceManager } from "@/components/social/PresenceManager";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import { PerformanceProvider } from "@/components/performance/PerformanceProvider";
import { ErrorMonitoringProvider, DevErrorConsole } from "@/components/monitoring/ErrorMonitoringProvider";
import { AccessibilityProvider } from "@/components/accessibility/AccessibilityProvider";
import { AchievementToastContainer } from "@/components/gamification/AchievementToast";
import { PieMenu } from "@/components/navigation/PieMenu";
// Core integrations from PR #56
import { ServiceWorkerRegistration } from "@/components/core/ServiceWorkerRegistration";
import { ZustandHydration } from "@/components/core/ZustandHydration";
import { WebVitalsTracker } from "@/components/core/WebVitalsTracker";
import { MockServiceWorker } from "@/components/dev/MockServiceWorker";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isE2E = process.env.E2E === '1'

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-zinc-900">
        {isE2E ? (
          <main id="main-content" className="min-h-screen min-w-0 w-full" tabIndex={-1}>
            {children}
          </main>
        ) : (
          <ErrorBoundary>
            <AccessibilityProvider>
              <Web3Provider>
                <ToastProvider>
                  <SecurityProvider />
                  <PerformanceProvider />
                  <ErrorMonitoringProvider />
                  <PresenceManager />
                  <DevErrorConsole />
                  <DemoModeBanner />
                  <ServiceWorkerRegistration />
                  <MockServiceWorker />
                  <ZustandHydration />
                  <WebVitalsTracker />
                  <EnhancedNetworkBanner />
                  <NetworkSwitchOverlay />
                  <TestnetNotification />
                  {/* Network detection handled by wallet connection */}
                  <AchievementToastContainer />
                  <main id="main-content" className="min-h-screen min-w-0 w-full" tabIndex={-1}>
                    {children}
                  </main>
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
