'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PlainHelp } from '@/components/common/PlainHelp';
import { MerchantContinuityCenter } from '@/components/merchant/MerchantContinuityCenter';
import { useMerchantContinuity } from '@/hooks/useMerchantContinuity';

function PageInner() {
  const c = useMerchantContinuity();
  return (
    <>
      <PlainHelp
        title="If something happens to you"
        whatIsThis="This is how you make sure your business keeps running — and who takes over — if you can't continue."
        whyYouNeedIt="Without it, a lost phone, an emergency, or worse could mean your store and customers are stranded."
        whatHappensNext="Choose who takes over the business, and optionally add people who can help in an emergency."
        status={{
          state: c.loading ? 'in-progress' : c.ready ? 'done' : 'not-started',
          label: c.loading ? 'Checking…' : c.ready ? 'Your business is protected' : 'Choose a successor to protect your business',
        }}
      />
      <MerchantContinuityCenter />
    </>
  );
}

export default function MerchantContinuityPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-white md:pt-[3.5rem]">
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent">
            <ArrowLeft size={16} aria-hidden="true" /> Back to your business
          </Link>
          <PageInner />
        </div>
      </div>
      <Footer />
    </>
  );
}
