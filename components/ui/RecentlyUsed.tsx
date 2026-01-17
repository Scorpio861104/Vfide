'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon?: React.ReactNode;
  timestamp: number;
}

interface RecentlyUsedProps {
  storageKey: string;
  maxItems?: number;
  title?: string;
  emptyMessage?: string;
}

/**
 * Recently Used component for quick access to frequent pages/actions
 * Tracks user activity and displays shortcuts
 */
export function RecentlyUsed({
  storageKey,
  maxItems = 5,
  title = 'Recently Used',
  emptyMessage = 'No recent activity',
}: RecentlyUsedProps) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    loadRecentItems();
  }, [storageKey]);

  const loadRecentItems = () => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: RecentItem[] = JSON.parse(saved);
        // Sort by timestamp, most recent first
        const sorted = parsed.sort((a, b) => b.timestamp - a.timestamp);
        setItems(sorted.slice(0, maxItems));
      }
    } catch (error) {
      console.error('Failed to load recent items:', error);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-[#1A1A2E] border border-[#2A2A3F] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-[#00F0FF]" />
        <h3 className="text-sm font-semibold text-[#F5F3E8]">{title}</h3>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#2A2A3F] transition-colors group"
            >
              {item.icon && (
                <div className="w-8 h-8 rounded-lg bg-[#2A2A3F] flex items-center justify-center text-[#00F0FF] group-hover:bg-[#3A3A4F]">
                  {item.icon}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#F5F3E8] truncate">
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-xs text-[#A0A0A5] truncate">
                    {item.subtitle}
                  </div>
                )}
              </div>

              <ArrowRight className="w-4 h-4 text-[#A0A0A5] group-hover:text-[#00F0FF] transition-colors" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook to track recently used items
 */
export function useRecentlyUsed(storageKey: string, maxItems: number = 10) {
  const addRecentItem = (item: Omit<RecentItem, 'timestamp'>) => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageKey);
      const existing: RecentItem[] = saved ? JSON.parse(saved) : [];
      
      // Remove duplicate if exists
      const filtered = existing.filter(i => i.id !== item.id);
      
      // Add new item with timestamp
      const newItem: RecentItem = {
        ...item,
        timestamp: Date.now(),
      };
      
      // Keep only maxItems
      const updated = [newItem, ...filtered].slice(0, maxItems);
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent item:', error);
    }
  };

  const clearRecentItems = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(storageKey);
  };

  return { addRecentItem, clearRecentItems };
}
