'use client';
/**
 * /budgets — thin wrapper for test compatibility and direct links.
 * Full UI lives in /insights?tab=budgets.
 */
import BudgetsContent from '@/app/insights/components/BudgetsContent';
import { Footer } from '@/components/layout/Footer';

export default function BudgetsContentPage() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="container mx-auto px-4 max-w-4xl py-8">
        <BudgetsContent />
      </div>
      <Footer />
    </div>
  );
}
