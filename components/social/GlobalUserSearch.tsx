'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Users,
  TrendingUp as _TrendingUp,
  Award,
  MessageCircle,
  UserPlus,
} from 'lucide-react';
import { UserDisplay } from '@/components/common/UserDisplay';
import { UserProfileService } from '@/lib/userProfileService';
import { UserProfile } from '@/types/userProfile';

export function GlobalUserSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    
    try {
      // Search by username
      const results = UserProfileService.searchByUsername(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" aria-hidden="true" />
        <input
          type="text"
         
          value={searchQuery}
          onChange={(e) =>  handleSearch(e.target.value)}
          aria-label="Search users by username or address"
          aria-describedby="search-results-count"
          className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100  focus:border-accent focus:outline-none"
        />
      </div>

      {/* Results */}
      {searching ? (
        <div className="p-8 text-center" role="status" aria-live="polite">
          <div className="w-12 h-12 border-4 border-accent/30 border-t-[#00F0FF] rounded-full animate-spin mx-auto mb-3" aria-hidden="true" />
          <p className="text-zinc-500">Searching...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2">
          <p id="search-results-count" className="text-sm text-zinc-500" role="status" aria-live="polite">
            Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
          </p>
          {searchResults.map((user) => (
            <motion.div
              key={user.address}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-violet-400 flex items-center justify-center text-zinc-100 font-bold">
                    {user.username ? user.username?.[0]?.toUpperCase() : user.address.slice(2, 4).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <UserDisplay address={user.address} />
                      {user.proofScore && user.proofScore >= 80 && (
                        <Award className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    {user.displayName && (
                      <p className="text-sm text-zinc-400">{user.displayName}</p>
                    )}
                    {user.bio && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled
                    className="p-2 bg-accent/10 text-accent/40 border border-accent/15 rounded-lg cursor-not-allowed"
                    title="Friend requests require a /api/social/friend-requests endpoint that isn't built yet."
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    disabled
                    className="p-2 bg-violet-400/10 text-violet-400/40 border border-violet-400/15 rounded-lg cursor-not-allowed"
                    title="Direct messaging from search isn't wired up yet — open the Messages tab to start a conversation."
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : searchQuery.trim().length >= 2 ? (
        <div className="p-8 text-center">
          <Users className="w-12 h-12 text-zinc-500 mx-auto mb-3 opacity-50" />
          <p className="text-zinc-500">No users found</p>
        </div>
      ) : null}
    </div>
  );
}
