'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { Footer } from '@/components/layout/Footer';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { useAccount } from 'wagmi';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <>
        <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
              style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
          </div>
          <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative container mx-auto max-w-3xl px-4 py-20 text-center">
            <div className="badge-live mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Identity Management
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <User size={28} className="text-accent" />
            </div>
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Your Profile</h1>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto text-lg">
              Connect your wallet to view and edit your profile, display name, and avatar.
            </p>
            <div className="inline-block">
              <VfideConnectButton size="md" />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative">
          <ProfileSettings />
        </div>
      </main>
      <Footer />
    </>
  );
}
