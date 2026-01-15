import type { Metadata, Viewport } from "next";
// Replaced Google Fonts with system font fallbacks for build compatibility
// import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/wallet/Web3Provider";
import { OnboardingManager } from "@/components/onboarding/OnboardingManager";
import { HelpCenter } from "@/components/onboarding/HelpCenter";
import { ToastProvider } from "@/components/ui/toast";
// Network-agnostic: Works on testnet and mainnet identically
import { NetworkSwitchOverlay } from "@/components/wallet/NetworkSwitchOverlay";
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
import CommandBar from "@/components/CommandBar";

// Use system font stacks as fallback (compatible with any environment)
// These provide excellent cross-platform compatibility without network requests
const inter = {
  variable: "--font-body",
  style: { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
};

const spaceGrotesk = {
  variable: "--font-display",
  style: { fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace' },
};

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
      <body 
        className="font-[family-name:var(--font-body)] antialiased bg-[#0F0F12]"
        style={{
          '--font-body': inter.style.fontFamily,
          '--font-display': spaceGrotesk.style.fontFamily,
        } as React.CSSProperties}
      >
        {isE2E ? (
          children
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
                <NetworkSwitchOverlay />
                <TestnetNotification />
                {/* Network detection handled by wallet connection */}
                <AchievementToastContainer />
                {children}
                <CommandBar />
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
