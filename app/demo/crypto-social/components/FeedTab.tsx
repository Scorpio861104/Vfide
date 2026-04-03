'use client';

import { SocialPaymentButton } from '@/components/social/SocialPaymentButton';
import { UnifiedActivityFeed } from '@/components/social/UnifiedActivityFeed';

export function FeedTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Feed</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <SocialPaymentButton
            recipientAddress="0x0000000000000000000000000000000000000001"
            recipientName="VFIDE Demo Creator"
            contentId="demo-feed-post"
          />
        </div>
        <UnifiedActivityFeed />
      </div>
    </div>
  );
}
