import { Suspense } from 'react';
import { Footer } from '@/components/layout/Footer';
import { PayLinkContent } from './components/PayLinkContent';

export const dynamic = 'force-dynamic';

export default async function PayLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-zinc-950 pt-[4.5rem] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      }>
        <PayLinkContent linkId={id} />
      </Suspense>
      <Footer />
    </>
  );
}
