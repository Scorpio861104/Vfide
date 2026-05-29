import { Suspense } from 'react';
import { Footer } from '@/components/layout/Footer';
const PayLinkContent = _dynamic(() => import('./components/PayLinkContent').then(m => ({ default: m.PayLinkContent })), { ssr: false });

export const dynamic = 'force-dynamic';
import _dynamic from 'next/dynamic';

export default async function PayLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      }>
        <PayLinkContent linkId={id} />
      </Suspense>
      <Footer />
    </>
  );
}
