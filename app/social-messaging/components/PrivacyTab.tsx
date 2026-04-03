'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original social-messaging page

export function PrivacyTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="privacy"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    >
    <div className="max-w-6xl mx-auto">
    <Suspense fallback={<SocialPanelFallback message="Loading privacy controls…" />}>
    <PrivacySettings />
    </Suspense>
    </div>
    </motion.div>
    </div>
  );
}
