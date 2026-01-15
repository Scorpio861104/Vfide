'use client';

import { SHORTCUTS, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Group } from '@/types/groups';
import { Friend } from '@/types/messaging';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, MessageSquare, Search, TrendingUp, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

interface SearchResult {
  type: 'friend' | 'group' | 'achievement' | 'page';
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function GlobalSearch() {
  const { address } = useAccount();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cache parsed friends and groups to avoid repeated JSON.parse on every search
  const cachedFriends = useMemo<Friend[]>(() => {
    if (!address || typeof window === 'undefined') return [];
    try {
      const storedFriends = localStorage.getItem(`vfide_friends_${address}`);
      return storedFriends ? JSON.parse(storedFriends) : [];
    } catch (e) {
      console.error('Failed to load friends:', e);
      return [];
    }
  }, [address]);

  const cachedGroups = useMemo<Group[]>(() => {
    if (!address || typeof window === 'undefined') return [];
    try {
      const storedGroups = localStorage.getItem(`vfide_groups_${address}`);
      return storedGroups ? JSON.parse(storedGroups) : [];
    } catch (e) {
      console.error('Failed to load groups:', e);
      return [];
    }
  }, [address]);

  // Keyboard shortcut to open search
  useKeyboardShortcuts([
    {
      ...SHORTCUTS.SEARCH,
      handler: () => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      },
    },
    {
      ...SHORTCUTS.CLOSE,
      handler: () => {
        if (isOpen) setIsOpen(false);
      },
    },
  ]);

  // Handle arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        results[selectedIndex].action();
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Search function
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search pages
    const pages = [
      { title: 'Dashboard', path: '/', keywords: ['home', 'overview', 'dashboard'] },
      { title: 'Messages', path: '/social-messaging', keywords: ['messages', 'chat', 'social'] },
      { title: 'Achievements', path: '/achievements', keywords: ['achievements', 'badges', 'gamification'] },
      { title: 'Governance', path: '/governance', keywords: ['governance', 'dao', 'voting'] },
      { title: 'Merchant', path: '/merchant', keywords: ['merchant', 'shop', 'store'] },
      { title: 'Analytics', path: '/reporting', keywords: ['analytics', 'reports', 'stats'] },
    ];

    pages.forEach(page => {
      const matches = page.keywords.some(k => k.includes(query)) || page.title.toLowerCase().includes(query);
      if (matches) {
        searchResults.push({
          type: 'page',
          id: page.path,
          title: page.title,
          icon: <TrendingUp className="w-5 h-5" />,
          action: () => router.push(page.path),
        });
      }
    });

    // Search friends using cached data
    cachedFriends.forEach(friend => {
      const matches = 
        friend.alias?.toLowerCase().includes(query) ||
        friend.address.toLowerCase().includes(query);
      
      if (matches) {
        searchResults.push({
          type: 'friend',
          id: friend.address,
          title: friend.alias || friend.address,
          subtitle: friend.address,
          icon: <Users className="w-5 h-5" />,
          action: () => {
            router.push(`/social-messaging?friend=${friend.address}`);
          },
        });
      }
    });

    // Search groups using cached data
    cachedGroups.forEach(group => {
      const matches =
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query);
      
      if (matches) {
        searchResults.push({
          type: 'group',
          id: group.id,
          title: group.name,
          subtitle: `${group.members.length} members`,
          icon: <MessageSquare className="w-5 h-5" />,
          action: () => {
            router.push(`/social-messaging?group=${group.id}`);
          },
        });
      }
    });

    setResults(searchResults.slice(0, 8)); // Limit to 8 results
    setSelectedIndex(0);
  }, [cachedFriends, cachedGroups, router]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <>
      {/* Trigger Button in Nav */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-2 bg-[#1A1A1F] hover:bg-[#2A2A2F] border border-[#2A2A2F] rounded-lg text-sm text-[#6B6B78] transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-[#2A2A3F] rounded border border-[#3A3A4F]">
          ⌘K
        </kbd>
      </button>

      {/* Mobile Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 hover:bg-[#2A2A3F] rounded-lg transition-colors"
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-[#6B6B78]" />
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            {/* Search Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-[#0A0A0F] border border-[#2A2A2F] rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-[#2A2A2F]">
                <Search className="w-5 h-5 text-[#6B6B78]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search friends, groups, pages..."
                  className="flex-1 bg-transparent text-[#F5F3E8] placeholder-[#6B6B78] outline-none"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 hover:bg-[#2A2A3F] rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-[#6B6B78]" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {results.length === 0 && query ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-[#6B6B78]">No results found for &quot;{query}&quot;</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-8 text-center">
                    <Command className="w-12 h-12 text-[#6B6B78] mx-auto mb-3" />
                    <p className="text-sm text-[#6B6B78] mb-1">Quick search</p>
                    <p className="text-xs text-[#6B6B78]/60">Search for friends, groups, and pages</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          result.action();
                          handleClose();
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                          index === selectedIndex
                            ? 'bg-[#00F0FF]/10 border-l-2 border-[#00F0FF]'
                            : 'hover:bg-[#1A1A1F]'
                        }`}
                      >
                        <div className={`${index === selectedIndex ? 'text-[#00F0FF]' : 'text-[#6B6B78]'}`}>
                          {result.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-[#F5F3E8]">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-[#6B6B78]">{result.subtitle}</p>
                          )}
                        </div>
                        <span className="text-xs text-[#6B6B78] uppercase">{result.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0F0F14] border-t border-[#2A2A2F] text-xs text-[#6B6B78]">
                <div className="flex gap-4">
                  <span>
                    <kbd className="px-1.5 py-0.5 font-mono bg-[#2A2A3F] rounded border border-[#3A3A4F]">↑↓</kbd> Navigate
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 font-mono bg-[#2A2A3F] rounded border border-[#3A3A4F]">Enter</kbd> Select
                  </span>
                </div>
                <span>
                  <kbd className="px-1.5 py-0.5 font-mono bg-[#2A2A3F] rounded border border-[#3A3A4F]">Esc</kbd> Close
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
