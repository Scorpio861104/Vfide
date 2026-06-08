'use client';

import Link from 'next/link';
import { ArrowLeft, Repeat } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { FutureReleaseBanner } from '@/components/feedback/FutureReleaseBanner';

export const dynamic = 'force-dynamic';

export default function MerchantSubscriptionsPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white">
        <section className="py-12">
          <div className="container mx-auto max-w-4xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8">
              <div className="badge-live mb-3">
                <Repeat size={14} /> Recurring billing
              </div>
              <h1 className="text-4xl font-black tracking-tight">Subscription plans</h1>
            </div>

            <FutureReleaseBanner
              title="Subscriptions are coming soon"
              description="Recurring billing is planned but not live yet. We are shipping this as a future release so merchants are never asked to rely on unfinished payment flows."
              requirements={[
                'Recurring billing execution and settlement safeguards',
                'Merchant controls for pause, resume, and cancellation windows',
                'Customer-facing consent, notifications, and dispute controls',
              ]}
              alternative={{
                href: '/merchant/payment-links',
                label: 'Use Payment Links today',
                description: 'Accept one-off payments now with shareable links and QR flows.',
              }}
            />
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
