'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original achievements page

export function AchievementsTab() {
  return (
    <div className="space-y-6">
      <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    >
    <AchievementsList userAddress={address} />
    </motion.div>
    </div>
  );
}
