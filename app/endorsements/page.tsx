'use client';
/**
 * /endorsements — thin wrapper for test compatibility and direct links.
 * Full UI lives in /rewards-hub?tab=endorsements.
 */
import EndorsementsContent from '@/app/rewards-hub/components/EndorsementsContent';
import { Footer } from '@/components/layout/Footer';

export default function EndorsementsContentPage() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="container mx-auto px-4 max-w-4xl py-8">
        <EndorsementsContent />
      </div>
      <Footer />
    </div>
  );
}
