'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { MerchantProfileWizard } from '@/components/merchant/MerchantProfileWizard';

export default function MerchantProfileSetupPage() {
  const router = useRouter();

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white">
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link
            href="/merchant"
            className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
          >
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <MerchantProfileWizard
            onComplete={() => {
              // Wait a beat so the success state is visible, then route on.
              setTimeout(() => router.push('/merchant'), 2000);
            }}
          />
        </div>
      </div>
      <Footer />
    </>
  );
}
