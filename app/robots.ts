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
