'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { MerchantAnalytics } from '@/components/analytics/MerchantAnalytics';
import { useAccount } from 'wagmi';

export default function MerchantAnalyticsPage() {
  const { address } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Merchant Analytics</h1>
            <p className="text-white/60">Revenue, order flow, and product performance for your storefront.</p>
          </div>

          {address ? (
            <MerchantAnalytics merchantAddress={address} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
              <h2 className="text-xl font-semibold text-white">Connect your merchant wallet</h2>
              <p className="text-gray-400 mt-2">Sign in with the wallet linked to your store to view live analytics.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
