import { Suspense } from 'react';
import { Footer } from '@/components/layout/Footer';
import { PayLinkContent } from './components/PayLinkContent';
import { DEFAULT_LOCALE } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function PayLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = DEFAULT_LOCALE;
  void locale;
  const { id } = await params;
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      }>
        <PayLinkContent linkId={id} />
      </Suspense>
      <Footer />
    </>
  );
}
