import { MetadataRoute } from 'next'

/**
 * Sitemap generation for SEO
 * Lists all public pages for search engine indexing.
 *
 * Auth-gated routes are excluded (already disallowed in robots.ts):
 *   /admin, /dashboard, /vault, /settings, plus per-user surfaces.
 *
 * Testnet-only routes (/testnet) are excluded — that page self-redirects
 * away on mainnet chains and shouldn't be advertised in search results.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vfide.io'
  const currentDate = new Date()

  // Public landing / informational routes that should be indexed.
  // Priority tiers:
  //   1.0  homepage
  //   0.9  primary product surfaces (about, docs, merchant, governance)
  //   0.8  secondary public surfaces
  //   0.6  legal / supporting content
  const routes: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '',                priority: 1.0, changeFrequency: 'daily' },

    // Primary product surfaces
    { path: '/about',          priority: 0.9, changeFrequency: 'weekly' },
    { path: '/docs',           priority: 0.9, changeFrequency: 'weekly' },
    { path: '/merchant',       priority: 0.9, changeFrequency: 'weekly' },
    { path: '/governance',     priority: 0.9, changeFrequency: 'weekly' },
    { path: '/token-launch',   priority: 0.9, changeFrequency: 'weekly' },

    // Secondary public surfaces
    { path: '/guardians',      priority: 0.8, changeFrequency: 'weekly' },
    { path: '/sanctum',        priority: 0.8, changeFrequency: 'weekly' },
    { path: '/lending',        priority: 0.8, changeFrequency: 'weekly' },
    { path: '/marketplace',    priority: 0.8, changeFrequency: 'weekly' },
    { path: '/merchants',      priority: 0.8, changeFrequency: 'weekly' },
    { path: '/leaderboard',    priority: 0.8, changeFrequency: 'daily'  },
    { path: '/explorer',       priority: 0.8, changeFrequency: 'daily'  },
    { path: '/proofscore',     priority: 0.8, changeFrequency: 'weekly' },
    { path: '/seer-academy',   priority: 0.8, changeFrequency: 'weekly' },
    { path: '/seer-service',   priority: 0.8, changeFrequency: 'weekly' },
    { path: '/dao-hub',        priority: 0.8, changeFrequency: 'weekly' },
    { path: '/treasury',       priority: 0.8, changeFrequency: 'daily'  },
    { path: '/staking',        priority: 0.8, changeFrequency: 'weekly' },
    { path: '/cross-chain',    priority: 0.8, changeFrequency: 'weekly' },
    { path: '/remittance',     priority: 0.8, changeFrequency: 'weekly' },
    { path: '/enterprise',     priority: 0.8, changeFrequency: 'weekly' },
    { path: '/developer',      priority: 0.8, changeFrequency: 'weekly' },
    { path: '/feed',           priority: 0.7, changeFrequency: 'daily'  },
    { path: '/social-hub',     priority: 0.7, changeFrequency: 'weekly' },

    // Legal / support
    { path: '/legal',          priority: 0.6, changeFrequency: 'monthly' },
    { path: '/support',        priority: 0.6, changeFrequency: 'monthly' },
  ]

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified: currentDate,
    changeFrequency,
    priority,
  }))
}
