import { MetadataRoute } from 'next'

/**
 * Robots.txt configuration
 * Controls search engine crawling behavior
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NODE_ENV === 'production'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vfide.io'

  if (!isProduction) {
    // Block all crawlers in non-production environments
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  // Production robots.txt
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // Block API routes
          '/_next/',         // Block Next.js internals
          '/admin/',         // Block admin pages (if any)
          '/dashboard/',     // Block user dashboard (requires auth)
          '/vault/',         // Block vault pages (requires auth)
          '/settings/',      // Block settings (requires auth)
          '/wallet/',        // Block wallet hub (requires auth, key material flows)
          '/me/',            // Block personal user hub (requires auth)
          '/control-panel/', // Block admin control panel
          '/multisig/',      // Block multisig admin surface
          '/paper-wallet/',  // Block paper wallet (private-key generator, env-gated)
          '/hardware-wallet/', // Block hardware wallet setup (auth)
          '/profile/',       // Block user profile (auth)
          '/notifications/', // Block per-user notifications (auth)
          '/security-center/', // Block per-user security center (auth)
          '/inheritance/',   // Block inheritance flows (auth, sensitive)
          // Internal / dev / demo surfaces — not part of the user-facing nav.
          // Indexing these would surface non-product content in search and
          // could mislead users about what the live product offers.
          '/api-coverage/',  // Internal API endpoint coverage tracker
          '/live-demo/',     // Marketing demo (not a real product surface)
          '/demo/',          // Misc demo subroutes (e.g. /demo/crypto-social)
          '/testnet/',       // Testnet-only faucet hub (auto-redirects on mainnet)
          '/theme-showcase/',// Legacy designer showcase (now redirects to /theme)
          '/theme-manager/', // Legacy theme manager (now redirects to /theme)
          '/splitter/',      // Operator-only revenue splitter inspector
          '/agent/',         // Coming-soon placeholder (cash-agent operator workflow)
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',      // Block OpenAI crawler
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: '/',
      },
      {
        userAgent: 'CCBot',
        disallow: '/',      // Block Common Crawl
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
