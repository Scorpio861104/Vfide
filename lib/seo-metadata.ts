import { Metadata } from 'next';

interface PageMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
}

/**
 * Generate consistent metadata for pages
 * Ensures all pages have proper SEO tags
 */
export function generatePageMetadata({
  title,
  description,
  keywords = [],
  ogImage = '/og-image.png',
  noIndex = false,
}: PageMetadata): Metadata {
  const fullTitle = `${title} - VFIDE`;
  const defaultKeywords = [
    'VFIDE',
    'crypto payments',
    'Web3',
    'DeFi',
    'trust scoring',
    'decentralized payment',
  ];
  
  return {
    title: fullTitle,
    description,
    keywords: [...defaultKeywords, ...keywords].join(', '),
    robots: noIndex ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      title: fullTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
      siteName: 'VFIDE',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://vfide.io`,
    },
  };
}

/**
 * Common page metadata configurations
 */
export const pageMetadata = {
  dashboard: generatePageMetadata({
    title: 'Dashboard',
    description: 'Manage your VFIDE vault, view your ProofScore, and track your transactions.',
    keywords: ['dashboard', 'vault', 'ProofScore', 'crypto wallet'],
  }),
  
  vault: generatePageMetadata({
    title: 'Vault',
    description: 'Your non-custodial vault for secure crypto storage. You control your funds, always.',
    keywords: ['vault', 'wallet', 'non-custodial', 'crypto storage', 'security'],
  }),
  
  merchant: generatePageMetadata({
    title: 'Merchant Portal',
    description: 'Accept crypto payments with zero processing fees. Start accepting payments in seconds.',
    keywords: ['merchant', 'accept payments', 'crypto merchant', 'payment processing', 'zero fees'],
  }),
  
  governance: generatePageMetadata({
    title: 'Governance',
    description: 'Participate in VFIDE DAO governance. Vote on proposals and shape the protocol.',
    keywords: ['governance', 'DAO', 'voting', 'proposals', 'decentralized governance'],
  }),
  
  docs: generatePageMetadata({
    title: 'Documentation',
    description: 'Complete documentation for using VFIDE. Learn about vaults, payments, and governance.',
    keywords: ['documentation', 'guide', 'tutorial', 'help', 'FAQ'],
  }),
  
  about: generatePageMetadata({
    title: 'About',
    description: 'Learn about VFIDE - a decentralized payment protocol built on integrity, not wealth.',
    keywords: ['about', 'mission', 'team', 'vision', 'open source'],
  }),
  
  legal: generatePageMetadata({
    title: 'Legal & Terms',
    description: 'VFIDE legal information, terms of service, and privacy policy.',
    keywords: ['legal', 'terms', 'privacy', 'disclaimer'],
  }),
  
  tokenLaunch: generatePageMetadata({
    title: 'Token Launch',
    description: 'Learn about the VFIDE token launch, presale, and tokenomics.',
    keywords: ['token', 'presale', 'ICO', 'tokenomics', 'launch'],
  }),
  
  social: generatePageMetadata({
    title: 'Social Hub',
    description: 'Connect with the VFIDE community. Social features, messaging, and payments.',
    keywords: ['social', 'community', 'messaging', 'social payments'],
  }),
  
  rewards: generatePageMetadata({
    title: 'Milestones',
    description: 'Complete milestones to build your ProofScore and unlock protocol features.',
    keywords: ['milestones', 'achievements', 'protocol', 'ProofScore'],
  }),
  
  quests: generatePageMetadata({
    title: 'Quests',
    description: 'Complete quests and build your ProofScore.',
    keywords: ['quests', 'challenges', 'missions', 'gamification'],
  }),
  
  leaderboard: generatePageMetadata({
    title: 'Leaderboard',
    description: 'View top users by ProofScore and activity.',
    keywords: ['leaderboard', 'ranking', 'top users', 'competition'],
  }),
};
