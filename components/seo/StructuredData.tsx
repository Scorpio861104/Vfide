'use client';

import Script from 'next/script';

// Organization structured data
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VFIDE',
  url: 'https://vfide.io',
  logo: 'https://vfide.io/logo.png',
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
  // Using Next.js Script component with JSON.stringify is safe for structured data
  // as the data is statically defined and not user-generated
  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
        strategy="beforeInteractive"
      />
      <Script
        id="web-application-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
        strategy="beforeInteractive"
      />
      <Script
        id="software-application-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
        strategy="beforeInteractive"
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
  // Sanitize breadcrumb items to prevent XSS
  const sanitizedItems = items.map(item => ({
    name: String(item.name).slice(0, 100), // Limit length
    url: String(item.url).slice(0, 200), // Limit length
  }));

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: sanitizedItems.map((item, index) => ({
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
        __html: JSON.stringify(breadcrumbSchema),
      }}
      strategy="beforeInteractive"
    />
  );
}

// FAQ Schema for documentation pages
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ faqs }: { faqs: FAQItem[] }) {
  // Sanitize FAQ content to prevent XSS
  const sanitizedFaqs = faqs.map(faq => ({
    question: String(faq.question).slice(0, 200), // Limit length
    answer: String(faq.answer).slice(0, 1000), // Limit length
  }));

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sanitizedFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqSchema),
      }}
      strategy="beforeInteractive"
    />
  );
}
