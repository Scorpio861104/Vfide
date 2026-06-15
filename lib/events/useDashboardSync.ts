'use client';

/**
 * useDashboardSync (Wave 49, Priority 4) — the event → dashboard refresh path.
 *
 * Wave 48 found there was NO path from an event to a dashboard refresh: dashboards read state via
 * their own hooks (pull), nothing pushed them to update. This closes that gap for the React-Query /
 * wagmi-backed reads: when a relevant ecosystem event fires, it invalidates the query cache so any
 * mounted dashboard reading that state refetches and reflects the change automatically.
 *
 * SCOPE / HONESTY: this refreshes data that flows through the shared React-Query cache (wagmi
 * `useReadContract`, `useQuery`). Hooks that hold state in local `useState` + a one-shot `fetch`
 * (several merchant pages) won't auto-refresh from cache invalidation alone — they need their own
 * loader re-invoked. So this makes the *contract/trust/continuity-backed* dashboards event-driven;
 * the remaining fetch-state pages are a follow-up (re-run their `load()` on the same events). It is a
 * real improvement, not a universal one — and it never fabricates data, it only triggers a refetch
 * of real sources.
 *
 * Mount once, high in the tree (it's wired into the EcosystemActivity surface / can be mounted in a
 * provider). Invalidation is broad-but-cheap: React Query only refetches queries that are actually
 * mounted and observed.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEcosystemSignal } from '@/lib/events/EventProvider';
import type { VfideEventType } from '@/lib/events/eventTypes';

// Events that change state a dashboard would show. (Pure UI events like COURSE_COMPLETED are
// included because the Nexus/preparedness surfaces read from them too.)
const DASHBOARD_RELEVANT: VfideEventType[] = [
  'VAULT_PROTECTED', 'VAULT_RECOVERED',
  'RECOVERY_CONFIGURED', 'RECOVERY_COMPLETED', 'GUARDIAN_ASSIGNED', 'SUCCESSOR_ASSIGNED',
  'CONTINUITY_PLAN_CREATED', 'EMERGENCY_OPERATOR_ASSIGNED', 'MERCHANT_SUCCESSION_CONFIGURED',
  'BUSINESS_TRANSFER_INITIATED',
  'STORE_CREATED', 'MERCHANT_ACTIVATED', 'MERCHANT_VERIFIED',
  'PAYMENT_RECEIVED', 'PAYMENT_SENT', 'INVOICE_PAID', 'SUBSCRIPTION_STARTED',
  'TRUST_VERIFICATION_COMPLETED', 'CONTACT_VERIFIED', 'GOVERNANCE_PARTICIPATED',
];

export function useDashboardSync() {
  const queryClient = useQueryClient();

  useEcosystemSignal(() => {
    // Refetch all mounted/observed queries — wagmi contract reads (ProofScore, merchant health,
    // continuity status) and any React-Query data the dashboards observe. Cheap: only active queries
    // actually refetch.
    void queryClient.invalidateQueries();
  }, DASHBOARD_RELEVANT);
}

/**
 * Mountable form of useDashboardSync. Place INSIDE the wallet/query tree (below QueryClientProvider),
 * e.g. in WalletClientLayout — NOT in EventProvider, which sits above the QueryClientProvider.
 */
export function DashboardSync() {
  useDashboardSync();
  return null;
}
