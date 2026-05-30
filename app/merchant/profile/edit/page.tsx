'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { MerchantProfileWizard } from '@/components/merchant/MerchantProfileWizard';
import { useMerchantProfile } from '@/hooks/useMerchantProfile';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLocale } from '@/lib/locale/LocaleProvider';

interface FetchedProfile {
  name: string;
  bio?: string;
  category?: string;
  avatar?: string;
  links?: Array<{ label: string; url: string }>;
}

export default function MerchantProfileEditPage() {
  const { locale } = useLocale();
  void locale;

  const router = useRouter();
  const { address } = useAccount();
  const { currentMetaHash, registrationStatus } = useMerchantProfile();

  const [initialValues, setInitialValues] = useState<FetchedProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Fetch the FULL canonical profile JSON (the identity hook only exposes
  // displayName + avatar; the wizard needs bio + links too).
  useEffect(() => {
    if (!currentMetaHash) {
      setInitialValues(null);
      setIsLoadingProfile(false);
      return;
    }
    let cancelled = false;
    setIsLoadingProfile(true);
    fetch(`/api/profile?hash=${encodeURIComponent(currentMetaHash)}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<FetchedProfile>;
      })
      .then((p) => {
        if (cancelled) return;
        setInitialValues(p);
      })
      .catch(() => {
        if (cancelled) return;
        setInitialValues(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentMetaHash]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white">
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link
            href="/merchant"
            className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
          >
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          {!address ? (
            <GlassCard hover={false} className="p-6 text-center text-gray-400">
              Connect your wallet to edit your merchant profile.
            </GlassCard>
          ) : registrationStatus === 'unknown' || isLoadingProfile ? (
            <GlassCard hover={false} className="p-6 text-center text-gray-400">
              Loading your profile…
            </GlassCard>
          ) : registrationStatus === 'none' ? (
            <GlassCard gradient="gold" hover={false} className="p-6 text-center text-amber-200">
              You&apos;re not registered as a merchant yet.{' '}
              <Link href="/merchant/profile/setup" className="underline hover:text-amber-100">
                Set up your profile
              </Link>{' '}
              to get started.
            </GlassCard>
          ) : (
            <MerchantProfileWizard
              introTitle="Edit your business profile"
              introBody="Update what customers see when they pay you. Changes are recorded on-chain."
              initialValues={initialValues ? {
                name: initialValues.name,
                bio: initialValues.bio,
                category: initialValues.category,
                avatarUrl: initialValues.avatar ?? null,
                links: initialValues.links,
              } : undefined}
              onComplete={() => {
                setTimeout(() => router.push('/merchant'), 2000);
              }}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
