'use client';

import Link from 'next/link';
import { Search, Compass, TrendingUp, Users, Activity } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ExplorerPage() {
  const [searchInput, setSearchInput] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      // Check if it's a valid address format
      if (searchInput.startsWith('0x') && searchInput.length === 42) {
        router.push(`/explorer/${searchInput}`);
      } else {
        // Could also search for usernames, transaction hashes, etc.
        router.push(`/explorer/${searchInput}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08080A] to-[#0A0A0F] text-white">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Compass className="w-8 h-8 text-[#00F0FF]" />
            <h1 className="text-4xl md:text-5xl font-bold">VFIDE Explorer</h1>
          </div>
          <p className="text-lg text-[#A8A8B3] max-w-2xl mx-auto">
            Explore addresses, transactions, and user profiles on the VFIDE network
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-16">
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B78]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by address (0x...) or username"
                className="w-full pl-12 pr-4 py-4 bg-[#1A1A26] border border-[#2A2A38] rounded-xl text-white placeholder:text-[#6B6B78] focus:outline-none focus:border-[#00F0FF] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-3 py-3 bg-gradient-to-r from-[#00F0FF] to-[#0080FF] rounded-xl font-semibold hover:shadow-lg hover:shadow-[#00F0FF]/20 transition-all"
            >
              Search
            </button>
          </form>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link
            href="/leaderboard"
            className="group p-6 bg-[#1A1A26] border border-[#2A2A38] rounded-xl hover:border-[#00F0FF] transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[#00F0FF]/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-[#00F0FF]" />
              </div>
              <h3 className="text-lg font-semibold">Leaderboard</h3>
            </div>
            <p className="text-sm text-[#A8A8B3]">
              View top users ranked by ProofScore
            </p>
          </Link>

          <Link
            href="/social-hub"
            className="group p-6 bg-[#1A1A26] border border-[#2A2A38] rounded-xl hover:border-[#00F0FF] transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[#00F0FF]/10 rounded-lg">
                <Users className="w-6 h-6 text-[#00F0FF]" />
              </div>
              <h3 className="text-lg font-semibold">Community</h3>
            </div>
            <p className="text-sm text-[#A8A8B3]">
              Explore social feeds and stories
            </p>
          </Link>

          <Link
            href="/insights"
            className="group p-6 bg-[#1A1A26] border border-[#2A2A38] rounded-xl hover:border-[#00F0FF] transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[#00F0FF]/10 rounded-lg">
                <Activity className="w-6 h-6 text-[#00F0FF]" />
              </div>
              <h3 className="text-lg font-semibold">Network Activity</h3>
            </div>
            <p className="text-sm text-[#A8A8B3]">
              View real-time network statistics
            </p>
          </Link>
        </div>

        {/* How to Use */}
        <div className="bg-[#1A1A26] border border-[#2A2A38] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-6">How to Use the Explorer</h2>
          <div className="space-y-4 text-[#A8A8B3]">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#00F0FF]/10 rounded-full flex items-center justify-center text-[#00F0FF] font-bold">
                1
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Search by Address</h3>
                <p className="text-sm">
                  Enter a wallet address (starting with 0x) to view user profiles, ProofScores, badges, and endorsements
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#00F0FF]/10 rounded-full flex items-center justify-center text-[#00F0FF] font-bold">
                2
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">View Leaderboards</h3>
                <p className="text-sm">
                  Browse top-ranked users and discover high-trust members of the community
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-[#00F0FF]/10 rounded-full flex items-center justify-center text-[#00F0FF] font-bold">
                3
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Track Network Activity</h3>
                <p className="text-sm">
                  Monitor transactions, vault creations, and ecosystem metrics in real-time
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Tools Link */}
        <div className="mt-12 text-center">
          <p className="text-[#6B6B78] mb-4">Looking for developer tools?</p>
          <Link
            href="/developer"
            className="inline-flex items-center gap-2 text-[#00F0FF] hover:underline"
          >
            Visit Developer Hub
            <Compass className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
