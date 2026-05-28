'use client';
/**
 * /taxes — thin wrapper for test compatibility and direct links.
 * Full UI lives in /insights?tab=taxes.
 */
import TaxesContent from '@/app/insights/components/TaxesContent';
import { Footer } from '@/components/layout/Footer';

export default function TaxesContentPage() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="container mx-auto px-4 max-w-4xl py-8">
        <TaxesContent />
      </div>
      <Footer />
    </div>
  );
}
