import { useQuery } from '@tanstack/react-query';
import { getCachePolicy } from '@/lib/cache/cacheInvalidationPolicy';

/**
 * useENS - Resolves ENS names for Ethereum addresses.
 * Uses centralized cache policy for consistent stale/gc times.
 */
export function useENS(address: string | undefined) {
  const ensCachePolicy = getCachePolicy('reactQuery:ens');

  return useQuery({
    queryKey: ensCachePolicy.queryKey ?? ['ens', address],
    queryFn: async () => {
      if (!address) return null;
      // ENS resolution would happen here via a provider
      return null;
    },
    enabled: Boolean(address),
    staleTime: ensCachePolicy.ttlMs,
    gcTime: ensCachePolicy.gcMs,
  });
}

export default useENS;
