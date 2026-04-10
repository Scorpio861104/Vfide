'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Active flash loans with progress, due dates, and repayment buttons

export function ActiveTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // TODO: Wire to API endpoint
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Active</h3>
        <p className="text-gray-400 text-sm">Active flash loans with progress, due dates, and repayment buttons</p>
        {/* TODO: Implement ActiveTab UI */}
      </div>
    </div>
  );
}
