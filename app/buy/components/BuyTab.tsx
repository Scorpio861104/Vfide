'use client';

import { useState, useEffect } from 'react';

// On-ramp integration is not live yet; keep this tab as a clear placeholder.

export function BuyTab() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-cyan-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">Buy</h3>
        <p className="text-gray-400 text-sm">Direct fiat on-ramp is coming soon. Use the marketplace and wallet flows available today.</p>
      </div>
    </div>
  );
}
