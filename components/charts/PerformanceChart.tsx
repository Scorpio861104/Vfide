'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceChartProps {
  data?: Array<{ time: string; value: number }>;
  className?: string;
}

/**
 * PerformanceChart Component
 * Displays vault performance over time
 */
export default function PerformanceChart({ 
  data = [], 
  className = '' 
}: PerformanceChartProps) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className={`p-6 bg-zinc-900 rounded-xl border border-zinc-800 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2F" />
            <XAxis 
              dataKey="time" 
              stroke="#6B6B78"
              style={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#6B6B78"
              style={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1A1A2E',
                border: '1px solid #3A3A4F',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#00F0FF" 
              strokeWidth={2}
              dot={{ fill: '#00F0FF', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-zinc-500">
          No performance data yet.
        </div>
      )}
    </div>
  );
}
