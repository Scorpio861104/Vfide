'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original social-messaging page

export function AccountTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="account"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    >
    <div className="max-w-4xl mx-auto space-y-6">
    <Suspense fallback={<SocialPanelFallback message="Loading account settings…" />}>
    <AccountSettings />
    </Suspense>
    {address && (
    <Suspense fallback={<SocialPanelFallback message="Loading endorsements…" />}>
    <EndorsementsBadges
    userAddress={address}
    showGiveEndorsement={false}
    />
    </Suspense>
    )}
    </div>
    </motion.div>
    </div>
  );
}
