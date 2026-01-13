'use client';

/**
 * Feed Page - Redirects to Social Hub
 * 
 * This page exists for backward compatibility and direct links.
 * The main social experience is now consolidated in /social-hub.
 */

import { GlobalNav } from '@/components/layout/GlobalNav';
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
      <GlobalNav />
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          {/* Header with link to Social Hub */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8] mb-3">
                Activity Feed
              </h1>
              <p className="text-[#A0A0A5] text-lg max-w-2xl mx-auto mb-4">
                See what the community is sharing and celebrating
              </p>
              <Link 
                href="/social-hub" 
                className="inline-flex items-center gap-2 text-[#00F0FF] hover:underline"
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
              <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-xl p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">🔗</div>
                <h2 className="text-xl font-bold text-[#F5F3E8] mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-[#A0A0A5] mb-6">
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
