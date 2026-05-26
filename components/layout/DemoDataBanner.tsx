/**
 * DemoDataBanner — persistent disclosure strip shown on all demo / preview pages.
 *
 * Why it exists:
 *   - VFIDE is pre-mainnet. Any statistics, transaction histories, or live
 *     activity shown on demo pages are simulated / synthetic — not drawn from
 *     a live blockchain.
 *   - The Seer Constitution mandates honest disclosure: users must never
 *     mistake rehearsal data for production behaviour.
 *
 * Placement: render at the top of any demo page, BELOW TopNav (the nav is
 * fixed, so add mt-14 or place inside the page's own pt-20 container).
 */

import { FlaskConical } from 'lucide-react';

interface DemoDataBannerProps {
  /** Optionally override the default message */
  message?: string;
}

export function DemoDataBanner({
  message = 'This page uses simulated data for demonstration purposes only. All figures, scores, and activity are synthetic — no real transactions have occurred.',
}: DemoDataBannerProps) {
  return (
    <div
      role="note"
      aria-label="Simulated data disclosure"
      className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-start gap-2.5 text-amber-300 text-xs"
    >
      <FlaskConical
        size={14}
        className="mt-0.5 shrink-0 text-amber-400"
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}
