'use client';

import Link from 'next/link';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { FutureReleaseBanner } from '@/components/feedback/FutureReleaseBanner';

export const dynamic = 'force-dynamic';

export default function MerchantInstallmentsPage() {
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
                <CreditCard size={14} /> BNPL
              </div>
              <h1 className="text-4xl font-black tracking-tight">Installments & payment plans</h1>
            </div>

            <FutureReleaseBanner
              title="Installments are coming soon"
              description="Installments are not live yet. This remains a future release while risk policy, repayment safeguards, and dispute handling are finalized."
              requirements={[
                'Risk and eligibility policy for pay-over-time plans',
                'Repayment schedule enforcement and merchant protection rules',
                'Customer disclosure, reminders, and dispute-resolution safeguards',
              ]}
              alternative={{
                href: '/merchant/payment-links',
                label: 'Use Payment Links today',
                description: 'Collect one-off payments immediately while installments are in development.',
              }}
            />
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
