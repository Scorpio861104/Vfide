'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PlainHelp } from '@/components/common/PlainHelp';
import { SeerCommandCenter } from '@/components/seer/SeerCommandCenter';
import { SeerStandingExplainer } from '@/components/seer/SeerStandingExplainer';
import { SeerLendingTerms } from '@/components/seer/SeerLendingTerms';

export const dynamic = 'force-dynamic';

export default function SeerPage() {
  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-white md:pt-[3.5rem]">
        <div className="container mx-auto max-w-5xl px-4 pb-16">
          <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent">
            <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
          </Link>
          <PlainHelp
            title="The Seer"
            whatIsThis="One place that shows how you stand in the ecosystem — your trust, your contribution, your protection — and what the system is doing for you."
            whyYouNeedIt="It turns dozens of separate numbers into one clear picture, and tells you what's worth doing next."
            whatHappensNext="Review your standing below. The Seer only ever adjusts VFIDE's own services — it never touches your tokens."
          />
          <SeerCommandCenter />
          <SeerStandingExplainer />
          {/* Wave 83: surface the personalized lending advice the Seer already computes (was invisible). */}
          <div className="mt-8">
            <SeerLendingTerms />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
