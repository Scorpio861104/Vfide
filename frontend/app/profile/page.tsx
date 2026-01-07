'use client';

import React from 'react';
import { GlobalNav } from '@/components/layout/GlobalNav';
import { Footer } from '@/components/layout/Footer';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function ProfilePage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <>
        <GlobalNav />
        <main className="min-h-screen bg-[#0F0F12] pt-20">
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="text-center max-w-md">
              <h1 className="text-3xl font-bold text-[#F5F3E8] mb-4">
                Connect Your Wallet
              </h1>
              <p className="text-[#A0A0A5] mb-8">
                Please connect your wallet to view and edit your profile
              </p>
              <ConnectButton />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <GlobalNav />
      <main className="min-h-screen bg-[#0F0F12] pt-20 pb-20">
        <ProfileSettings />
      </main>
      <Footer />
    </>
  );
}
