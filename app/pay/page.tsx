'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Footer } from '@/components/layout/Footer';
import { PayContent } from './components/PayContent';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useLocale } from '@/hooks/useLocale';
import { PAY_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';

function PayFallback() {
  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );
}

export default function PayPage() {
  const [locale] = useLocale();
  const copy = pickLocaleCopy(PAY_TRANSLATIONS, locale); // pay page i18n
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<PayFallback />}>
          <PayContent />
        </Suspense>
      </ErrorBoundary>
      <Footer />
    </>
  );
}
