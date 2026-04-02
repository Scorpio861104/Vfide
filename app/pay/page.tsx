'use client';

import { Suspense } from 'react';
import { Footer } from '@/components/layout/Footer';
import { PayContent } from './components/PayContent';

export default function PayPage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" /></div>}>
        <PayContent />
      </Suspense>
      <Footer />
    </>
  );
}
