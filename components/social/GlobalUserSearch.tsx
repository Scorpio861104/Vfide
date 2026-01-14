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
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B78]" />
        <input
          type="text"
          placeholder="Search users by @username..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[#0A0A0F] border border-[#3A3A4F] rounded-xl text-[#F5F3E8] placeholder-[#6B6B78] focus:border-[#00F0FF] focus:outline-none"
        />
      </div>

      {/* Results */}
      {searching ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 border-4 border-[#00F0FF]/30 border-t-[#00F0FF] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#6B6B78]">Searching...</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-[#6B6B78]">
            Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
          </p>
          {searchResults.map((user) => (
            <motion.div
              key={user.address}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-[#0A0A0F] border border-[#2A2A2F] rounded-xl hover:border-[#3A3A4F] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-linear-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-[#F5F3E8] font-bold">
                    {user.username ? user.username?.[0]?.toUpperCase() : user.address.slice(2, 4).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <UserDisplay address={user.address} />
                      {user.proofScore && user.proofScore >= 80 && (
                        <Award className="w-4 h-4 text-[#FFD700]" />
                      )}
                    </div>
                    {user.displayName && (
                      <p className="text-sm text-[#A0A0A5]">{user.displayName}</p>
                    )}
                    {user.bio && (
                      <p className="text-xs text-[#6B6B78] mt-1 line-clamp-1">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="p-2 bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 rounded-lg hover:bg-[#00F0FF]/30 transition-colors"
                    title="Send Friend Request"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30 rounded-lg hover:bg-[#A78BFA]/30 transition-colors"
                    title="Message"
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
          <Users className="w-12 h-12 text-[#6B6B78] mx-auto mb-3 opacity-50" />
          <p className="text-[#6B6B78]">No users found</p>
        </div>
      ) : null}
    </div>
  );
}
