export type CacheId =
  | 'balanceCache'
  | 'networkLatencyCache'
  | 'gasEstimateCache'
  | 'walletIconCache'
  | 'reactQuery:vfide-price'
  | 'reactQuery:ens'
  | 'reactQuery:wallet-state';

export type CacheKind = 'memory-map' | 'react-query';

export type CachePolicy = {
  id: CacheId;
  kind: CacheKind;
  ttlMs: number;
  gcMs?: number;
  queryKey?: readonly string[];
  invalidationTriggers: readonly string[];
};

const CACHE_INVALIDATION_POLICIES: readonly CachePolicy[] = [
  {
    id: 'balanceCache',
    kind: 'memory-map',
    ttlMs: 30_000,
    invalidationTriggers: [
      'wallet:account-changed',
      'wallet:chain-changed',
      'wallet:disconnect',
      'payment:confirmed',
      'manual:clear',
    ],
  },
  {
    id: 'networkLatencyCache',
    kind: 'memory-map',
    ttlMs: 30_000,
    invalidationTriggers: [
      'network:rpc-changed',
      'network:chain-changed',
      'manual:clear',
    ],
  },
  {
    id: 'gasEstimateCache',
    kind: 'memory-map',
    ttlMs: 30_000,
    invalidationTriggers: [
      'network:rpc-changed',
      'network:chain-changed',
      'transaction:submitted',
      'manual:clear',
    ],
  },
  {
    id: 'walletIconCache',
    kind: 'memory-map',
    ttlMs: 24 * 60 * 60 * 1000,
    invalidationTriggers: [
      'wallet:icon-updated',
      'cache:max-size-eviction',
      'manual:clear',
    ],
  },
  {
    id: 'reactQuery:vfide-price',
    kind: 'react-query',
    ttlMs: 30_000,
    gcMs: 5 * 60 * 1000,
    queryKey: ['vfide-price'],
    invalidationTriggers: [
      'market:price-tick',
      'window:focus',
      'timer:60s',
      'manual:invalidate',
    ],
  },
  {
    id: 'reactQuery:ens',
    kind: 'react-query',
    ttlMs: 60 * 60 * 1000,
    queryKey: ['ens'],
    invalidationTriggers: [
      'address:changed',
      'manual:invalidate',
    ],
  },
  {
    id: 'reactQuery:wallet-state',
    kind: 'react-query',
    ttlMs: 30_000,
    invalidationTriggers: [
      'wallet:account-changed',
      'wallet:chain-changed',
      'window:focus',
      'manual:invalidate',
    ],
  },
] as const;

export function getCachePolicy(cacheId: CacheId): CachePolicy {
  const match = CACHE_INVALIDATION_POLICIES.find((policy) => policy.id === cacheId);
  if (!match) {
    throw new Error(`Unknown cache policy id: ${cacheId}`);
  }
  return match;
}

export function listCachePolicies(): readonly CachePolicy[] {
  return CACHE_INVALIDATION_POLICIES;
}

export function getPoliciesByTrigger(trigger: string): readonly CachePolicy[] {
  return CACHE_INVALIDATION_POLICIES.filter((policy) =>
    policy.invalidationTriggers.includes(trigger)
  );
}
