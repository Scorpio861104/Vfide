/**
 * SEO Optimization Utilities
 * 
 * Enhanced SEO utilities for better search engine visibility:
 * - Dynamic meta tag generation
 * - Structured data (JSON-LD)
 * - Open Graph optimization
 * - Twitter Card optimization
 * - Sitemap generation helpers
 */

import type { Metadata } from 'next';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

/**
 * Generate comprehensive metadata for a page
 * Includes all SEO best practices
 * 
 * @example
 * export const metadata = generateMetadata({
 *   title: 'Dashboard',
 *   description: 'View your VFIDE dashboard',
 *   keywords: ['crypto', 'payments', 'dashboard'],
 * });
 */
export function generateMetadata(config: SEOConfig): Metadata {
  const baseUrl = 'https://vfide.io';
  const canonical = config.canonical || '';
  const fullUrl = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return {
    title: `${config.title} | VFIDE`,
    description: config.description,
    keywords: config.keywords?.join(', '),
    authors: config.author ? [{ name: config.author }] : [{ name: 'VFIDE Protocol' }],
    robots: config.noindex ? 'noindex, nofollow' : 'index, follow',
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title: config.title,
      description: config.description,
      url: fullUrl,
      siteName: 'VFIDE',
      type: config.ogType || 'website',
      images: [
        {
          url: config.ogImage || '/og-image.png',
          width: 1200,
          height: 630,
          alt: config.title,
        },
      ],
      locale: 'en_US',
      ...(config.publishedTime && { publishedTime: config.publishedTime }),
      ...(config.modifiedTime && { modifiedTime: config.modifiedTime }),
    },
    twitter: {
      card: config.twitterCard || 'summary_large_image',
      title: config.title,
      description: config.description,
      images: [config.ogImage || '/og-image.png'],
      creator: '@vfideprotocol',
    },
  };
}

/**
 * Generate JSON-LD structured data for rich snippets
 * Helps search engines understand page content
 * 
 * @example
 * <script type="application/ld+json" dangerouslySetInnerHTML={{
 *   __html: JSON.stringify(generateStructuredData('organization'))
 * }} />
 */
export function generateStructuredData(type: 'organization' | 'website' | 'breadcrumb' | 'article', data?: Record<string, unknown>) {
  const baseUrl = 'https://vfide.io';

  const schemas = {
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'VFIDE Protocol',
      url: baseUrl,
      logo: `${baseUrl}/branding/vfide-lockup-horizontal.svg`,
      sameAs: [
        'https://twitter.com/vfideprotocol',
        'https://github.com/vfide',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Support',
        email: 'support@vfide.io',
      },
    },
    website: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'VFIDE',
      url: baseUrl,
      description: 'Decentralized Payment Protocol',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: data?.items || [],
    },
    article: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: data?.title,
      description: data?.description,
      author: {
        '@type': 'Organization',
        name: 'VFIDE Protocol',
      },
      publisher: {
        '@type': 'Organization',
        name: 'VFIDE Protocol',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/branding/vfide-lockup-horizontal.svg`,
        },
      },
      datePublished: data?.publishedTime,
      dateModified: data?.modifiedTime,
      image: data?.image || `${baseUrl}/og-image.png`,
    },
  };

  return schemas[type];
}

/**
 * Generate breadcrumb JSON-LD
 * Improves navigation in search results
 */
export function generateBreadcrumbs(items: Array<{ name: string; url: string }>) {
  const baseUrl = 'https://vfide.io';
  
  const breadcrumbItems = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${baseUrl}${item.url}`,
  }));

  return generateStructuredData('breadcrumb', { items: breadcrumbItems });
}

/**
 * Generate sitemap entry data
 * Helper for creating sitemap.xml
 */
export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function generateSitemapEntry(entry: SitemapEntry): string {
  const baseUrl = 'https://vfide.io';
  const url = `${baseUrl}${entry.url}`;
  const lastmod = entry.lastModified ? entry.lastModified.toISOString().split('T')[0] : '';
  
  return `
  <url>
    <loc>${url}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    ${entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${entry.priority}</priority>` : ''}
  </url>`;
}

/**
 * Common sitemap entries for VFIDE
 */
export const SITEMAP_ENTRIES: SitemapEntry[] = [
  { url: '/', changeFrequency: 'daily', priority: 1.0 },
  { url: '/dashboard', changeFrequency: 'daily', priority: 0.9 },
  { url: '/vault', changeFrequency: 'weekly', priority: 0.8 },
  { url: '/rewards', changeFrequency: 'daily', priority: 0.8 },
  { url: '/social', changeFrequency: 'hourly', priority: 0.7 },
  { url: '/governance', changeFrequency: 'daily', priority: 0.7 },
  { url: '/docs', changeFrequency: 'weekly', priority: 0.6 },
  { url: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { url: '/legal', changeFrequency: 'yearly', priority: 0.3 },
];

/**
 * Generate robots.txt rules
 */
export function generateRobotsTxt(): string {
  const baseUrl = 'https://vfide.io';
  
  return `# VFIDE Protocol - Robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_next/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (be nice to servers)
Crawl-delay: 1
`;
}

/**
 * Preload critical resources for SEO
 * Improves Lighthouse scores
 */
export function preloadSEOResources() {
  if (typeof window === 'undefined') return;

  const resources = [
    { href: '/og-image.png', as: 'image' },
    { href: '/branding/vfide-mark-primary.svg', as: 'image' },
  ];

  resources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as;
    document.head.appendChild(link);
  });
}
