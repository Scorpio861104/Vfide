'use client';

export const dynamic = 'force-dynamic';

/**
 * /onboarding — wizard launcher page.
 *
 * Provides a stable URL the user can bookmark or return to to relaunch
 * the setup wizard, regardless of whether they previously turned it off.
 * The page itself is a brief landing card; the wizard overlay handles
 * everything else (it auto-mounts via WizardMount in ClientLayout).
 */

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Power, ExternalLink, Smartphone, Key, ShieldCheck } from 'lucide-react';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { useAccount } from 'wagmi';

import { Footer } from '@/components/layout/Footer';
import { useWizardState } from '@/components/wizard';
import { CHAPTERS } from '@/components/wizard';
import { useLocale } from '@/hooks/useLocale';
import { ONBOARDING_TRANSLATIONS, pickLocaleCopy } from '@/lib/i18n';
import { PageSkeleton } from '@/components/layout/PageSkeleton';

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected } = useAccount();
  const wizard = useWizardState();

  // If the URL already has ?wizard=1 we don't need to do anything special —
  // WizardMount will render the wizard on top of this page automatically.
  // Otherwise, clicking "Open wizard" updates the URL so the param is set.
  useEffect(() => {
    if (searchParams?.get('wizard') === '1' && !wizard.state.enabled) {
      // User came back via the launch URL; turn the wizard back on.
      wizard.setEnabled(true);
    }
  }, [searchParams, wizard]);

  const handleLaunch = () => {
    wizard.setEnabled(true);
    router.replace('/onboarding?wizard=1');
  };

  const handleReset = () => {
    wizard.reset();
    router.replace('/onboarding?wizard=1');
  };

  const completedCount = wizard.state.completedChapters.length;
  const totalChapters = CHAPTERS.length - 2; // exclude welcome + done
  const hasProgress = completedCount > 0 || wizard.state.skippedChapters.length > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-zinc-950 md:pt-[3.5rem] relative overflow-hidden"
      >
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 left-1/3 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(0,240,255,0.08), transparent 65%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.07), transparent 65%)', filter: 'blur(70px)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />

        <div className="container mx-auto max-w-3xl px-4 pt-16 pb-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-premium p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-violet-500/20 border border-accent/20 p-3">
                <Sparkles className="text-accent" size={24} aria-hidden />
              </div>
              <div>
                <div className="badge-live mb-1 w-fit"><Sparkles size={10} /> Setup Wizard</div>
                <h1 className="text-2xl font-black text-white tracking-tight">Setup Wizard</h1>
                <p className="text-sm text-zinc-400">
                  A chapter-by-chapter walk through everything your vault needs.
                </p>
              </div>
            </div>

            {!isConnected ? (
              <div className="space-y-5">
                <p className="text-sm text-zinc-400">
                  VFIDE uses a crypto wallet instead of a username and password — your
                  wallet IS your account. You hold your own keys; no company controls your money.
                </p>

                {/* No wallet yet? 3-step explainer */}
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    No wallet yet? Takes 2 minutes.
                  </p>
                  {[
                    { icon: Smartphone, step: '1', text: 'Install Coinbase Wallet or MetaMask on your phone or browser.' },
                    { icon: Key,        step: '2', text: 'Open the app and tap "Create new wallet". Write down your 12-word phrase and keep it safe.' },
                    { icon: ShieldCheck, step: '3', text: "Come back here and tap \"Connect wallet\" below. That's it — no email, no KYC." },
                  ].map(({ icon: Icon, step, text }) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                        {step}
                      </span>
                      <div className="flex items-start gap-2">
                        <Icon size={14} className="text-zinc-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-sm text-zinc-300">{text}</p>
                      </div>
                    </div>
                  ))}
                  <a
                    href="https://www.coinbase.com/wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-1"
                  >
                    <ExternalLink size={11} aria-hidden="true" />
                    Get Coinbase Wallet (free)
                  </a>
                </div>

                <VfideConnectButton size="md" />
              </div>
            ) : (
              <div className="space-y-4">
                {hasProgress && (
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-accent">
                    <p className="font-semibold text-white">Resuming where you left off</p>
                    <p className="mt-1 text-zinc-400">
                      {completedCount} of {totalChapters} chapters completed
                      {wizard.state.skippedChapters.length > 0
                        ? `, ${wizard.state.skippedChapters.length} skipped`
                        : ''}.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleLaunch}
                    className="btn-premium-primary flex items-center justify-center gap-2"
                  >
                    {hasProgress ? 'Resume Wizard' : 'Open Wizard'}
                    <ArrowRight size={16} aria-hidden />
                  </button>
                  {hasProgress && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="btn-premium-ghost flex items-center justify-center gap-2"
                    >
                      <Power size={14} aria-hidden /> Start Over
                    </button>
                  )}
                </div>

                {!wizard.state.enabled && (
                  <p className="text-xs text-zinc-500">
                    The wizard is currently turned off. Launching here will re-enable it.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
      <Footer />
    </>
  );
}

export default function OnboardingPage() {
  const [locale] = useLocale();
  const _copy = pickLocaleCopy(ONBOARDING_TRANSLATIONS, locale); // onboarding page i18n
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OnboardingPageContent />
    </Suspense>
  );
}
