'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original social-messaging page

export function CirclesTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="circles"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    >
    <div className="max-w-7xl mx-auto">
    <Suspense fallback={<SocialPanelFallback message="Loading circles…" />}>
    <FriendCirclesManager friends={friends} />
    </Suspense>
    </div>
    </motion.div>
    </div>
  );
}
