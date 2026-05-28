'use client';
/**
 * /performance — thin wrapper for test compatibility and direct links.
 * Full UI lives in /insights?tab=performance.
 */
import PerformanceContent from '@/app/insights/components/PerformanceContent';
import { Footer } from '@/components/layout/Footer';

export default function PerformanceContentPage() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="container mx-auto px-4 max-w-4xl py-8">
        <PerformanceContent />
      </div>
      <Footer />
    </div>
  );
}
