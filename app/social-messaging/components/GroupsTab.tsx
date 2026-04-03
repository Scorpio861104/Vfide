'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original social-messaging page

export function GroupsTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="groups"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    >
    <Suspense fallback={<SocialPanelFallback message="Loading group messaging…" />}>
    <GroupMessaging />
    </Suspense>
    </motion.div>
    </div>
  );
}
