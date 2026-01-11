'use client';

import { GlobalNav } from '@/components/layout/GlobalNav';
import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import { SocialFeed } from '@/components/social/SocialFeed';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

export default function FeedPage() {
  const { address, isConnected } = useAccount();

  return (
    <>
      <GlobalNav />
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          {/* Header */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8] mb-3">
                Social Feed
              </h1>
              <p className="text-[#A0A0A5] text-lg max-w-2xl mx-auto">
                See what the community is sharing, celebrate achievements, and connect with fellow VFIDE members
              </p>
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
                  Connect your wallet to view the feed, post updates, and interact with the community.
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
