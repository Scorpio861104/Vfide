'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import SocialNav from '@/components/social/SocialNav';
import MediaUploader from '@/components/social/MediaUploader';
import { MediaAttachment } from '@/lib/mediaSharing';

export default function MessagesPage() {
  const { address } = useAccount();
  const [showUploader, setShowUploader] = useState(false);

  if (!address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SocialNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/social" className="text-[#00F0FF] hover:underline mb-2 inline-block">
              ← Back to Social Hub
            </Link>
            <h1 className="text-3xl font-bold text-white">Messages</h1>
            <p className="text-gray-400">Encrypted messaging with crypto payments</p>
          </div>
          <button
            onClick={() => setShowUploader(true)}
            className="px-6 py-3 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
          >
            📎 Send Media
          </button>
        </div>

        {/* Content */}
        <div className="bg-gray-900 border-2 border-gray-800 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-white mb-2">Messages Coming Soon</h2>
          <p className="text-gray-400 mb-6">
            Integration with MessagingCenter in progress
          </p>
          <Link
            href="/frontend/app/social-messaging"
            className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            View Legacy Messaging
          </Link>
        </div>
      </div>

      {showUploader && (
        <MediaUploader
          onUploadComplete={() => setShowUploader(false)}
          onCancel={() => setShowUploader(false)}
          userAddress={address}
        />
      )}
    </div>
  );
}
