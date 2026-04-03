'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original demo/crypto-social page

export function DashboardTab() {
  return (
    <div className="space-y-6">
      <div>
    <h2 className="text-2xl font-bold mb-4">Creator Dashboard</h2>
    <p className="text-gray-600 dark:text-gray-300 mb-6">
    Comprehensive analytics and earnings management for content creators.
    Track your revenue, top supporters, and content performance.
    </p>

    <CreatorDashboard />
    </div>
    </div>
  );
}
