'use client';
/**
 * /remittance — standalone entry point kept for test compatibility and direct links.
 * The full UI now lives in /wallet?tab=remittance via RemittanceTab.
 * This page renders the same content and also serves as the redirect target.
 */
import { RemittanceTab } from '@/app/wallet/components/RemittanceTab';
import { Footer } from '@/components/layout/Footer';
import { useT } from '@/lib/i18n';

export default function RemittancePage() {
  const t = useT();
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      <div className="container mx-auto px-4 max-w-3xl py-8">
        <RemittanceTab />
      </div>
      <Footer />
    </div>
  );
}
