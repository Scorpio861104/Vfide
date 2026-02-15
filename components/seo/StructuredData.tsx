import Script from 'next/script';
import { headers } from 'next/headers';
import { serializeStructuredData } from '@/lib/optimization/seoOptimization';

// Organization structured data
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VFIDE',
  url: 'https://vfide.io',
  logo: 'https://vfide.io/logo.png',
  description: 'Crypto payment protocol with trust scoring and ProofScore verification on Base Sepolia testnet.',
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
    'Non-custodial vault storage',
    'Merchant POS system',
    'Governance participation',
    'Community endorsements',
  ],
};

export async function StructuredData() {
  const headerList = await headers();
  const nonce = headerList.get('x-nonce') || undefined;
  return (
    <>
      <Script
        id="organization-schema"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(organizationSchema),
        }}
      />
      <Script
        id="web-application-schema"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(webApplicationSchema),
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

export async function PageBreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const headerList = await headers();
  const nonce = headerList.get('x-nonce') || undefined;
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
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: serializeStructuredData(breadcrumbSchema),
      }}
    />
  );
}

// FAQ Schema for documentation pages
interface FAQItem {
  question: string;
  answer: string;
}

export async function FAQSchema({ faqs }: { faqs: FAQItem[] }) {
  const headerList = await headers();
  const nonce = headerList.get('x-nonce') || undefined;
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
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
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: serializeStructuredData(faqSchema),
      }}
    />
  );
}
