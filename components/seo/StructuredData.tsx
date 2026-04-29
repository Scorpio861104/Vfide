'use client';

import Script from 'next/script';

/** Serialize JSON-LD safely: prevent `</script>` injection in tag content. */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Strip characters and keywords that could be used to inject misleading
 * schema.org structured data into JSON-LD (e.g. fake ratings, @type overrides).
 * This is applied to all merchant/product-supplied strings before serialisation.
 */
function sanitizeJsonLdString(value: string): string {
  // Remove JSON-LD control characters and schema injection keywords
  return value
    .replace(/@context|@type|@id|aggregateRating|offers|priceRange/gi, '')
    .replace(/[<>"\\]/g, '')
    .trim()
    .slice(0, 512); // hard cap length for schema fields
}
// Organization structured data
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VFIDE',
  url: 'https://vfide.io',
  logo: 'https://vfide.io/branding/vfide-lockup-horizontal.svg',
  description: 'Decentralized payment protocol with trust scoring and ProofScore verification.',
  sameAs: [
    'https://twitter.com/vfide',
    'https://github.com/vfide',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: 'https://vfide.io/support',
  },
};

// WebApplication structured data
const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'VFIDE',
  url: 'https://vfide.io',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Crypto payments acceptance',
    'Trust scoring with ProofScore',
    'Decentralized vault storage',
    'Merchant POS system',
    'Governance participation',
    'Community endorsements',
  ],
};

// SoftwareApplication for app stores
const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'VFIDE',
  applicationCategory: 'Finance',
  operatingSystem: 'iOS, Android, Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export function StructuredData() {
  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(organizationSchema),
        }}
      />
      <Script
        id="web-application-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(webApplicationSchema),
        }}
      />
      <Script
        id="software-application-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(softwareApplicationSchema),
        }}
      />
    </>
  );
}

// Dynamic page structured data for specific pages
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function PageBreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLd(breadcrumbSchema),
      }}
    />
  );
}

// FAQ Schema for documentation pages
interface FAQItem {
  question: string;
  answer: string;
}

interface MerchantStructuredDataProps {
  name: string;
  description: string;
  url: string;
  serviceArea?: string;
  category?: string;
}

interface ProductStructuredDataProps {
  name: string;
  description: string;
  url: string;
  price?: number;
  priceCurrency?: string;
  availability?: 'https://schema.org/InStock' | 'https://schema.org/OutOfStock' | 'https://schema.org/PreOrder';
  brand?: string;
}

export function FAQSchema({ faqs }: { faqs: FAQItem[] }) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    // N-L32 FIX: sanitize question and answer strings to prevent merchants from
    // injecting misleading schema.org subtypes or breaking the JSON-LD block.
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: sanitizeJsonLdString(faq.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: sanitizeJsonLdString(faq.answer),
      },
    })),
  };

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLd(faqSchema),
      }}
    />
  );
}

export function MerchantStructuredData({
  name,
  description,
  url,
  serviceArea = 'Global',
  category = 'Financial Technology',
}: MerchantStructuredDataProps) {
  const merchantSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: sanitizeJsonLdString(name),
    description: sanitizeJsonLdString(description),
    url: sanitizeJsonLdString(url),
    areaServed: sanitizeJsonLdString(serviceArea),
    category: sanitizeJsonLdString(category),
    provider: {
      '@type': 'Organization',
      name: 'VFIDE',
      url: 'https://vfide.io',
    },
  };

  return (
    <Script
      id="merchant-service-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLd(merchantSchema),
      }}
    />
  );
}

export function ProductStructuredData({
  name,
  description,
  url,
  price,
  priceCurrency = 'USD',
  availability = 'https://schema.org/InStock',
  brand = 'VFIDE',
}: ProductStructuredDataProps) {
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: sanitizeJsonLdString(name),
    description: sanitizeJsonLdString(description),
    brand: {
      '@type': 'Brand',
      name: sanitizeJsonLdString(brand),
    },
    offers: {
      '@type': 'Offer',
      url: sanitizeJsonLdString(url),
      price: typeof price === 'number' ? price.toFixed(2) : undefined,
      priceCurrency,
      availability,
    },
  };

  return (
    <Script
      id="product-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLd(productSchema),
      }}
    />
  );
}
