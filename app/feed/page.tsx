'use client';

/**
 * Feed Page - Redirects to Social Hub
 * 
 * This page exists for backward compatibility and direct links.
 * The main social experience is now consolidated in /social-hub.
 */

import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import { SocialFeed } from '@/components/social/SocialFeed';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FeedPage() {
  const { isConnected } = useAccount();

  return (
    <>
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          {/* Header with link to Social Hub */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-3">
                Activity Feed
              </h1>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-4">
                See what the community is sharing and celebrating
              </p>
              <div
                className="flex flex-wrap justify-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4"
                aria-label="Feed workflow: Discover, then Connect, then Celebrate"
              >
                <span>Discover</span>
                <span className="text-cyan-400">→</span>
                <span>Connect</span>
                <span className="text-cyan-400">→</span>
                <span>Celebrate</span>
              </div>
              <Link 
                href="/social-hub" 
                className="inline-flex items-center gap-2 text-cyan-400 hover:underline"
              >
                Go to full Social Hub <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.section>

          {!isConnected ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md mx-auto ring-effect">
                <div className="text-6xl mb-4">🔗</div>
                <h2 className="text-xl font-bold text-zinc-100 mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-zinc-400 mb-6">
                  Connect your wallet to view the feed and interact with the community.
                </p>
                <ConnectButton />
              </div>
            </motion.div>
          ) : (
            <SocialFeed />
          )}
        </main>
        <Footer />
      </PageWrapper>
    </>
  );
}
