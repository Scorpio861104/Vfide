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

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Power } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

import { PageWrapper } from '@/components/ui/PageLayout';
import { Footer } from '@/components/layout/Footer';
import { useWizardState } from '@/components/wizard';
import { CHAPTERS } from '@/components/wizard';

export default function OnboardingPage() {
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
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-zinc-900/80 p-8 backdrop-blur"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-3">
                <Sparkles className="text-cyan-300" size={24} aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Setup wizard</h1>
                <p className="text-sm text-white/60">
                  A chapter-by-chapter walk through everything your vault needs.
                </p>
              </div>
            </div>

            {!isConnected ? (
              <div className="space-y-4">
                <p className="text-sm text-white/70">
                  Connect your wallet to start setup. The first chapter creates your CardBound
                  vault — everything after is skippable.
                </p>
                <ConnectButton />
              </div>
            ) : (
              <div className="space-y-4">
                {hasProgress && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-100">
                    <p className="font-semibold text-white">Resuming where you left off</p>
                    <p className="mt-1 text-white/70">
                      {completedCount} of {totalChapters} chapters completed
                      {wizard.state.skippedChapters.length > 0
                        ? `, ${wizard.state.skippedChapters.length} skipped`
                        : ''}.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleLaunch}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:scale-[1.01]"
                  >
                    {hasProgress ? 'Resume wizard' : 'Open wizard'}
                    <ArrowRight size={16} aria-hidden />
                  </button>
                  {hasProgress && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3 text-sm font-semibold text-white/70 hover:bg-white/10"
                    >
                      <Power size={14} aria-hidden /> Start over
                    </button>
                  )}
                </div>

                {!wizard.state.enabled && (
                  <p className="text-xs text-white/40">
                    The wizard is currently turned off. Launching here will re-enable it.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </PageWrapper>
      <Footer />
    </>
  );
}
