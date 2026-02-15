import { MetadataRoute } from 'next'

/**
 * Sitemap generation for SEO
 * Lists all public pages for search engine indexing
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vfide.io'
  const currentDate = new Date()

  // Static pages that should be indexed
  const routes = [
    '',                    // Homepage
    '/about',             // About page
    '/docs',              // Documentation
    '/legal',             // Legal/Terms
    '/token-launch',      // Token launch info
    '/merchant',          // Merchant portal
    '/governance',        // Governance overview
    '/guardians',         // Guardians info
    '/crypto-social' // Crypto-social
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : 0.8,
  }))
}
