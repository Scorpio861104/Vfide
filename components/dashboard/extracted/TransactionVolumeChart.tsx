'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export export function TransactionVolumeChart({ data }: { data: PortfolioDataPoint[] }) {
  return (
    <div className="w-full h-80 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            formatter={(value) => `$${((value as number) ?? 0).toLocaleString()}`}
          />
          <Legend />
          <Bar dataKey="eth" stackId="a" fill="#627eea" name="ETH" />
          <Bar dataKey="btc" stackId="a" fill="#f7931a" name="BTC" />
          <Bar dataKey="usdc" stackId="a" fill="#2775ca" name="USDC" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
