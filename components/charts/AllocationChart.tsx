'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AllocationChartProps {
  data?: Array<{ name: string; value: number; color: string }>;
  className?: string;
}

/**
 * AllocationChart Component
 * Displays asset allocation in a pie chart
 */
export default function AllocationChart({ 
  data = [], 
  className = '' 
}: AllocationChartProps) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className={`p-6 bg-zinc-900 rounded-xl border border-zinc-800 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Asset Allocation</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1A1A2E',
                border: '1px solid #3A3A4F',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-zinc-500">
          No allocation data yet.
        </div>
      )}
    </div>
  );
}
