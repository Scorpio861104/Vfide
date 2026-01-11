/**
 * Custom Reactions Configuration
 * 
 * Define custom reaction images that users can use in messages.
 * These can be brand emojis, community-specific reactions, or fun images.
 */

export interface CustomReaction {
  id: string;
  name: string;
  url: string;
  category?: string;
  tags?: string[];
}

// Example custom reactions for VFIDE
export const VFIDE_CUSTOM_REACTIONS: CustomReaction[] = [
  {
    id: 'vfide_rocket',
    name: 'VFIDE Rocket',
    url: '/images/reactions/vfide-rocket.png',
    category: 'brand',
    tags: ['launch', 'success', 'growth']
  },
  {
    id: 'proof_verified',
    name: 'Proof Verified',
    url: '/images/reactions/proof-verified.png',
    category: 'verification',
    tags: ['verified', 'trust', 'proof']
  },
  {
    id: 'dao_vote',
    name: 'DAO Vote',
    url: '/images/reactions/dao-vote.png',
    category: 'governance',
    tags: ['vote', 'governance', 'dao']
  },
  {
    id: 'web3_king',
    name: 'Web3 King',
    url: '/images/reactions/web3-king.png',
    category: 'achievement',
    tags: ['king', 'champion', 'winner']
  },
  {
    id: 'based',
    name: 'Based',
    url: '/images/reactions/based.png',
    category: 'community',
    tags: ['based', 'cool', 'agree']
  },
  {
    id: 'gm',
    name: 'GM',
    url: '/images/reactions/gm.png',
    category: 'greetings',
    tags: ['gm', 'morning', 'hello']
  },
  {
    id: 'wagmi',
    name: 'WAGMI',
    url: '/images/reactions/wagmi.png',
    category: 'community',
    tags: ['wagmi', 'together', 'optimism']
  },
  {
    id: 'ngmi',
    name: 'NGMI',
    url: '/images/reactions/ngmi.png',
    category: 'community',
    tags: ['ngmi', 'warning', 'skeptical']
  }
];

/**
 * Get custom reactions by category
 */
export function getReactionsByCategory(category: string): CustomReaction[] {
  return VFIDE_CUSTOM_REACTIONS.filter(r => r.category === category);
}

/**
 * Get all reaction categories
 */
export function getReactionCategories(): string[] {
  return [...new Set(VFIDE_CUSTOM_REACTIONS.map(r => r.category).filter(Boolean))] as string[];
}

/**
 * Search reactions by name or tags
 */
export function searchReactions(query: string): CustomReaction[] {
  const lowerQuery = query.toLowerCase();
  return VFIDE_CUSTOM_REACTIONS.filter(r => 
    r.name.toLowerCase().includes(lowerQuery) ||
    r.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
