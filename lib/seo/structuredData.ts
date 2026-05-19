/**
 * Structured-data (JSON-LD) helpers.
 *
 * Tier 3 Round 18 (2026-05-17). Before this round, the codebase had
 * `metadata` (title/description/OG) on most pages but zero JSON-LD
 * structured data — so Google's SERPs had no hook for rich snippets
 * (FAQ accordions, breadcrumbs, product cards, knowledge panel).
 *
 * Pattern: each helper returns a JS object matching a schema.org type.
 * Render in a page/layout with:
 *
 *   import { organizationJsonLd } from '@/lib/seo/structuredData';
 *
 *   <script
 *     type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
 *   />
 *
 * dangerouslySetInnerHTML is intentional — JSON.stringify produces safe
 * output for the script tag (no script-injection vectors since we're
 * embedding pure data, no user-controlled HTML).
 *
 * What this enables once Google re-crawls:
 *   - Organization sitelinks in the SERP knowledge panel
 *   - "About this result" attribution
 *   - FAQ accordions inline on /docs queries
 *   - Breadcrumb trails on deep pages
 *   - Software application metadata (operating system, app category)
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vfide.app';

/**
 * Organization schema. Place on the home page (app/page.tsx or root layout).
 * Tells Google what VFIDE *is* — the product, the org behind it, social profiles.
 *
 * Knowledge-panel candidates: name, alternateName, url, logo, sameAs links.
 */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'VFIDE',
    alternateName: 'Veritas + Fides',
    url: BASE_URL,
    logo: `${BASE_URL}/og-image.svg`,
    description:
      'Trust-scored DeFi payment protocol with zero merchant fees and guardian-protected self-custody.',
    foundingDate: '2024',
    sameAs: [
      // Add socials when public. Empty by design — better to omit than to
      // claim a profile that doesn't exist yet (Google may flag).
    ],
  };
}

/**
 * WebSite schema. Place on the home page. Enables the sitelinks search
 * box in Google SERPs (the inline search field under your knowledge panel).
 */
export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'VFIDE',
    publisher: { '@id': `${BASE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/explorer?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'en-US',
  };
}

/**
 * SoftwareApplication schema. Place on landing pages that pitch VFIDE
 * itself as a product (merchants, developer, enterprise). Triggers the
 * software/app rich result with category, operating system, and price.
 */
export function softwareApplicationJsonLd(args?: {
  applicationCategory?: string;
  /** Pitch the audience-specific name, e.g. "VFIDE for Merchants". */
  name?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: args?.name ?? 'VFIDE',
    operatingSystem: 'Web',
    applicationCategory: args?.applicationCategory ?? 'FinanceApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      'Zero merchant fees. Guardian-protected self-custody. Trust earned through real transactions.',
    url: BASE_URL,
    creator: { '@id': `${BASE_URL}/#organization` },
  };
}

/**
 * FAQPage schema for /docs and similar Q&A pages. Each entry becomes an
 * accordion item in the FAQ rich result. Don't list more than 6 — Google
 * only renders the first few and over-stuffing risks demotion.
 */
export function faqPageJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/**
 * BreadcrumbList schema. Place on deep pages so Google renders the
 * breadcrumb chain in the SERP instead of the URL. Items are 1-indexed.
 *
 * Usage:
 *   breadcrumbJsonLd([
 *     { name: 'Home', path: '/' },
 *     { name: 'Sanctum', path: '/sanctum' },
 *     { name: 'Charities', path: '/sanctum/charities' },
 *   ])
 */
export function breadcrumbJsonLd(crumbs: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${BASE_URL}${c.path}`,
    })),
  };
}

/**
 * Renders one or many JSON-LD objects as a single inline <script>.
 *
 * Combining multiple schemas in a single @graph array is the recommended
 * pattern: it lets Google understand that the Organization and WebSite
 * on the home page are related entities, not two separate orgs.
 */
export function renderJsonLd(schemas: Record<string, unknown> | Record<string, unknown>[]): string {
  const body = Array.isArray(schemas)
    ? { '@context': 'https://schema.org', '@graph': schemas }
    : schemas;
  return JSON.stringify(body);
}
