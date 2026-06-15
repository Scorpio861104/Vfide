import { notFound } from 'next/navigation';
import { HeadquartersEnvironment } from '@/components/headquarters/HeadquartersEnvironment';
import { HEADQUARTERS, HQ_ORDER, type DomainId } from '@/lib/headquarters/model';

export function generateStaticParams() {
  return HQ_ORDER.map((domain) => ({ domain }));
}

export default async function HeadquartersPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!(domain in HEADQUARTERS)) notFound();
  return <HeadquartersEnvironment domain={domain as DomainId} />;
}
