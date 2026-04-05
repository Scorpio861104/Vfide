/**
 * Seed Content — The app must never feel empty
 *
 * When a new user opens VFIDE for the first time, every page should
 * look like a thriving community. This isn't fake data — it's
 * demonstrative content that shows what the app does.
 *
 * Rules:
 *   - Names and stories come from the target demographic regions
 *   - Amounts are realistic for market sellers ($5-$500 range)
 *   - ProofScores follow a natural distribution
 *   - Seed data is clearly labeled and replaced by real data
 *   - Products reflect actual market goods
 */

import { useEffect, useState } from 'react';
import type { TrustEvent } from '@/components/social/TrustEventCard';
import type { MarketStoryData } from '@/components/social/MarketStory';

export const SEED_MERCHANTS = [
  { address: '0xd3m0...1a01', name: 'Kofi Textiles', proofScore: 8200, location: 'Makola Market, Accra', category: 'fabrics',
    products: [{ name: 'Kente Cloth (yard)', price: 25, currency: '$' }, { name: 'Ankara Print', price: 12 }, { name: 'Adinkra Stamps', price: 8 }] },
  { address: '0xd3m0...2b02', name: 'Amara\'s Kitchen', proofScore: 7600, location: 'Balogun Market, Lagos', category: 'food',
    products: [{ name: 'Jollof Rice (plate)', price: 3, currency: '$' }, { name: 'Suya Skewers', price: 2 }, { name: 'Chin Chin (bag)', price: 5 }] },
  { address: '0xd3m0...3c03', name: 'Fatima Tailoring', proofScore: 7100, location: 'Gikomba, Nairobi', category: 'clothing',
    products: [{ name: 'Custom Dress', price: 35, currency: '$' }, { name: 'Shirt Alteration', price: 8 }, { name: 'School Uniform', price: 15 }] },
  { address: '0xd3m0...4d04', name: 'Abdul Electronics', proofScore: 6800, location: 'Computer Village, Lagos', category: 'electronics',
    products: [{ name: 'Phone Screen Repair', price: 20, currency: '$' }, { name: 'Charger (USB-C)', price: 5 }, { name: 'Phone Case', price: 3 }] },
  { address: '0xd3m0...5e05', name: 'Nana\'s Shea', proofScore: 8500, location: 'Kumasi Central, Ghana', category: 'beauty',
    products: [{ name: 'Raw Shea Butter (1kg)', price: 12, currency: '$' }, { name: 'Black Soap (bar)', price: 3 }, { name: 'Hair Oil', price: 7 }] },
  { address: '0xd3m0...6f06', name: 'Yaa Beads', proofScore: 6500, location: 'Kejetia Market, Kumasi', category: 'jewelry',
    products: [{ name: 'Waist Beads (set)', price: 8, currency: '$' }, { name: 'Brass Bracelet', price: 15 }, { name: 'Coral Necklace', price: 25 }] },
];

export function generateSeedTrustEvents(): TrustEvent[] {
  const now = Date.now();
  return [
    {
      id: 'seed_1', type: 'badge_earned', timestamp: now - 1800000,
      actor: { address: '0xd3m0...1a01', name: 'Kofi Textiles', proofScore: 8200 },
      data: { badgeName: 'Elite Merchant', badgeRarity: 'rare', scoreBoost: 75 },
    },
    {
      id: 'seed_2', type: 'loan_repaid', timestamp: now - 3600000,
      actor: { address: '0xd3m0...3c03', name: 'Fatima', proofScore: 7100 },
      target: { address: '0xd3m0...5e05', name: 'Nana' },
      data: { amount: '500', onTime: 'true' },
    },
    {
      id: 'seed_3', type: 'first_sale', timestamp: now - 7200000,
      actor: { address: '0xd3m0...6f06', name: 'Yaa Beads', proofScore: 6500 },
      data: {},
    },
    {
      id: 'seed_4', type: 'milestone', timestamp: now - 14400000,
      actor: { address: '0xd3m0...5e05', name: 'Nana\'s Shea', proofScore: 8500 },
      data: { score: 8500 },
    },
    {
      id: 'seed_5', type: 'endorsement', timestamp: now - 21600000,
      actor: { address: '0xd3m0...2b02', name: 'Amara\'s Kitchen', proofScore: 7600 },
      target: { address: '0xd3m0...4d04', name: 'Abdul' },
      data: { count: 1, reason: 'Reliable supplier, always fair pricing' },
    },
    {
      id: 'seed_6', type: 'sanctum_donation', timestamp: now - 43200000,
      actor: { address: '0x0000...0000', name: 'VFIDE Community', proofScore: 10000 },
      data: { amount: '5000', currency: '$', campaign: 'Accra Schools Fund', charityName: 'Ghana Education Trust' },
    },
    {
      id: 'seed_7', type: 'streak', timestamp: now - 86400000,
      actor: { address: '0xd3m0...1a01', name: 'Kofi Textiles', proofScore: 8200 },
      data: { days: 45 },
    },
    {
      id: 'seed_8', type: 'guardian_added', timestamp: now - 172800000,
      actor: { address: '0xd3m0...2b02', name: 'Amara', proofScore: 7600 },
      target: { address: '0xd3m0...3c03', name: 'Fatima' },
      data: {},
    },
  ];
}

export function generateSeedStories(): MarketStoryData[] {
  const now = Date.now();
  return SEED_MERCHANTS.slice(0, 4).map((merchant, index) => ({
    id: `story_seed_${index}`,
    merchant: {
      address: merchant.address,
      name: merchant.name,
      proofScore: merchant.proofScore,
      location: merchant.location,
    },
    products: merchant.products.map((product, productIndex) => ({
      id: `prod_${index}_${productIndex}`,
      name: product.name,
      price: product.price,
      currency: product.currency || '$',
      inStock: true,
    })),
    caption: [
      'Fresh stock just arrived! Come see the new patterns.',
      'Today\'s special — buy 2 get 1 free!',
      'Market is busy today. Come early for best picks.',
      'New phone cases and chargers in stock.',
    ][index] ?? 'Fresh products are available today.',
    imageUrl: '',
    postedAt: now - index * 3600000,
    expiresAt: now + (24 - index) * 3600000,
    views: 45 + index * 23,
  }));
}

export const SEED_LOAN_OFFERS = [
  { id: 1, lender: '0xd3m0...5e05', lenderName: 'Nana\'s Shea', lenderScore: 8500,
    principal: 500, interestBps: 500, durationDays: 14, state: 'OPEN' },
  { id: 2, lender: '0xd3m0...1a01', lenderName: 'Kofi Textiles', lenderScore: 8200,
    principal: 200, interestBps: 300, durationDays: 7, state: 'OPEN' },
  { id: 3, lender: '0xd3m0...2b02', lenderName: 'Amara\'s Kitchen', lenderScore: 7600,
    principal: 1000, interestBps: 800, durationDays: 30, state: 'OPEN' },
];

export const SEED_REVIEWS = [
  { id: 'rev_1', reviewer: { address: '0xd3m0...3c03', name: 'Fatima', proofScore: 7100 },
    merchant: { address: '0xd3m0...1a01', name: 'Kofi Textiles' },
    rating: 5, content: 'Best kente in Makola. Fair prices and Kofi always delivers on time. I send all my customers here.',
    verifiedPurchase: true, timestamp: Date.now() - 86400000 * 3, helpful: 12 },
  { id: 'rev_2', reviewer: { address: '0xd3m0...5e05', name: 'Nana', proofScore: 8500 },
    merchant: { address: '0xd3m0...2b02', name: 'Amara\'s Kitchen' },
    rating: 5, content: 'The jollof is always perfect. I order for my shop workers every Friday. Never disappoints.',
    verifiedPurchase: true, timestamp: Date.now() - 86400000 * 7, helpful: 8 },
  { id: 'rev_3', reviewer: { address: '0xd3m0...6f06', name: 'Yaa', proofScore: 6500 },
    merchant: { address: '0xd3m0...4d04', name: 'Abdul Electronics' },
    rating: 4, content: 'Fixed my phone screen in 30 minutes. Good work. Slightly expensive but quality is there.',
    verifiedPurchase: true, timestamp: Date.now() - 86400000 * 14, helpful: 5 },
];

export const SEED_PROTOCOL_STATS = {
  totalUsers: 1247,
  totalMerchants: 89,
  totalTransactions: 15634,
  totalVolume: '847,230',
  totalBurned: '2,541',
  totalDonated: '1,694',
  averageProofScore: 6200,
  activeLenders: 23,
  activeLoans: 8,
  defaultRate: 0.02,
};

export const SEED_TRENDING_MERCHANTS = [
  { address: '0xd3m0...5e05', name: 'Nana\'s Shea', proofScore: 8500, sales7d: 145, salesGrowth: 32, endorsements7d: 7 },
  { address: '0xd3m0...1a01', name: 'Kofi Textiles', proofScore: 8200, sales7d: 89, salesGrowth: 15, endorsements7d: 4 },
  { address: '0xd3m0...2b02', name: 'Amara\'s Kitchen', proofScore: 7600, sales7d: 234, salesGrowth: 8, endorsements7d: 3 },
];

export const SEED_TRENDING_PRODUCTS = [
  { id: 'tp1', name: 'Raw Shea Butter (1kg)', merchant: 'Nana\'s Shea', merchantAddress: '0xd3m0...5e05', price: 12, currency: '$', purchases7d: 67 },
  { id: 'tp2', name: 'Kente Cloth (yard)', merchant: 'Kofi Textiles', merchantAddress: '0xd3m0...1a01', price: 25, currency: '$', purchases7d: 43 },
  { id: 'tp3', name: 'Jollof Rice (plate)', merchant: 'Amara\'s Kitchen', merchantAddress: '0xd3m0...2b02', price: 3, currency: '$', purchases7d: 312 },
];

export const SEED_CANDIDATES = [
  { address: '0xd3m0...5e05', name: 'Nana Osei', proofScore: 8500, voteCount: 34, votePower: 245000,
    badges: ['Elite Merchant', 'Pioneer', 'Peacemaker'],
    platform: 'I want to expand VFIDE to rural markets. Every village seller deserves zero-fee payments.' },
  { address: '0xd3m0...1a01', name: 'Kofi Mensah', proofScore: 8200, voteCount: 28, votePower: 198000,
    badges: ['Verified Merchant', 'Community Builder'],
    platform: 'Focus on merchant tools. We need better inventory management and multi-location support.' },
  { address: '0xd3m0...2b02', name: 'Amara Diallo', proofScore: 7600, voteCount: 19, votePower: 134000,
    badges: ['Active Trader', 'Headhunter'],
    platform: 'Social commerce is the future. Let\'s make buying from the feed seamless.' },
];

export function useSeedData<T>(fetchRealData: () => Promise<T[]>, seedData: T[]): {
  data: T[];
  loading: boolean;
  isSeeded: boolean;
} {
  const [data, setData] = useState<T[]>(seedData);
  const [loading, setLoading] = useState(true);
  const [isSeeded, setIsSeeded] = useState(true);

  useEffect(() => {
    fetchRealData()
      .then(realData => {
        if (realData.length > 0) {
          setData(realData);
          setIsSeeded(false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchRealData]);

  return { data, loading, isSeeded };
}
