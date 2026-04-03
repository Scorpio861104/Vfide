'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original social-messaging page

export function DiscoverTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="discover"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    >
    <div className="max-w-4xl mx-auto">
    <Suspense fallback={<SocialPanelFallback message="Loading discovery…" />}>
    <GlobalUserSearch />
    </Suspense>
    </div>
    </motion.div>
    </div>
  );
}
