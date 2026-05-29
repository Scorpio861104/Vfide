'use client';
/**
 * /leaderboard — thin wrapper for test compatibility and direct links.
 * Full UI lives in /rewards-hub?tab=leaderboard.
 */
import LeaderboardContent from '@/app/rewards-hub/components/LeaderboardContent';
import { Footer } from '@/components/layout/Footer';
import { useT } from '@/lib/i18n';

export default function LeaderboardContentPage() {
  const t = useT();
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="container mx-auto px-4 max-w-4xl py-8">
        <LeaderboardContent />
      </div>
      <Footer />
    </div>
  );
}
