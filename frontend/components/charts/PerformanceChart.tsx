"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { time: '00:00', value: 100 },
  { time: '04:00', value: 120 },
  { time: '08:00', value: 115 },
  { time: '12:00', value: 140 },
  { time: '16:00', value: 135 },
  { time: '20:00', value: 160 },
  { time: '24:00', value: 155 },
];

interface PerformanceChartProps {
  data?: Array<{ time: string; value: number }>;
  className?: string;
}

/**
 * PerformanceChart Component
 * Displays vault performance over time
 */
export default function PerformanceChart({ 
  data = mockData, 
  className = '' 
}: PerformanceChartProps) {
  return (
    <div className={`p-6 bg-[#0F0F14] rounded-xl border border-[#2A2A2F] ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
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
    </div>
  );
}
