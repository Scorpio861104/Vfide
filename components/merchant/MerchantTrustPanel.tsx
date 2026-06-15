'use client';

/**
 * MerchantTrustPanel — customer-facing trust panel (Wave 76 Priority 1).
 *
 * Surfaces the merchant Transparency Panel (buildTransparencyPanel) on the public storefront so a
 * CUSTOMER can answer, before buying: who is this merchant, can I trust them, will they deliver, what
 * happens if something goes wrong. Reads the public GET /api/merchant/[address]/transparency. Before this,
 * the transparency engine had 0 UI consumers — customers couldn't see any of it.
 */

import { useEffect, useState } from 'react';
import { ShieldCheck, Truck, Scale, LifeBuoy } from 'lucide-react';

interface TransparencyPanel {
  displayName: string;
  verified: boolean;
  yearsActive: string;
  trustLabel: 'building' | 'established' | 'strong';
  deliveryLabel: string;
  disputeSummary: string;
  protections: string[];
  plainSummary: string;
}

const TRUST_STYLE: Record<string, string> = {
  strong: 'text-emerald-300',
  established: 'text-cyan-300',
  building: 'text-zinc-400',
};

export function MerchantTrustPanel({ merchantAddress }: { merchantAddress: string }) {
  const [panel, setPanel] = useState<TransparencyPanel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/merchant/${merchantAddress}/transparency`);
        if (!res.ok) { if (!cancelled) setLoading(false); return; }
        const json = await res.json();
        if (!cancelled) { setPanel(json); setLoading(false); }
      } catch { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [merchantAddress]);

  if (loading) return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">Loading merchant trust…</div>;
  if (!panel) return null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-4 w-4 ${TRUST_STYLE[panel.trustLabel] ?? 'text-zinc-400'}`} />
          <h3 className="text-sm font-medium text-zinc-200">Merchant trust</h3>
        </div>
        {panel.verified && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-300">Verified business</span>}
      </div>

      {/* Plain grandmother answer */}
      <p className="mt-3 text-sm text-zinc-300">{panel.plainSummary}</p>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-zinc-500">Trust</dt>
          <dd className={`text-sm capitalize ${TRUST_STYLE[panel.trustLabel] ?? 'text-zinc-300'}`}>{panel.trustLabel}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-zinc-500"><Truck className="h-3 w-3" /> Delivery</dt>
          <dd className="text-sm capitalize text-zinc-300">{panel.deliveryLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Active</dt>
          <dd className="text-sm text-zinc-300">{panel.yearsActive}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-start gap-2 border-t border-zinc-800 pt-3">
        <Scale className="mt-0.5 h-3.5 w-3.5 text-zinc-500" />
        <p className="text-sm text-zinc-400">{panel.disputeSummary}</p>
      </div>

      {panel.protections.length > 0 && (
        <div className="mt-3 flex items-start gap-2">
          <LifeBuoy className="mt-0.5 h-3.5 w-3.5 text-zinc-500" />
          <div className="text-sm text-zinc-400">
            <span className="text-zinc-500">If something goes wrong: </span>
            {panel.protections.join(' ')}
          </div>
        </div>
      )}
    </section>
  );
}
