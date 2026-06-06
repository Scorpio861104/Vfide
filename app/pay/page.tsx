'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Footer } from '@/components/layout/Footer';
import { PayContent } from './components/PayContent';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function PayPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" /></div>}>
        <PayContent />
      </Suspense>
      <Footer />
    </>
  );
}
