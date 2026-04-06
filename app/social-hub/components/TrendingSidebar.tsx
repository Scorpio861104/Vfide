'use client';

import Link from 'next/link';
import {
  Award,
  Camera,
  MessageCircle,
  Rss,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

type TrendingTopic = {
  id: string | number;
  tag: string;
  posts?: number;
  trending?: 'up' | 'down';
};

type SuggestedUser = {
  address: string;
  avatar?: string;
  name: string;
  verified?: boolean;
  mutualFriends?: number;
};

const FALLBACK_TRENDING: TrendingTopic[] = [
  { id: 'proofscore', tag: '#ProofScore', posts: 18, trending: 'up' },
  { id: 'merchantwins', tag: '#MerchantWins', posts: 12, trending: 'up' },
  { id: 'flashloans', tag: '#Flashloans', posts: 9, trending: 'up' },
];

const FALLBACK_SUGGESTED: SuggestedUser[] = [
  { address: '0x1111111111111111111111111111111111111111', avatar: '🛍️', name: 'Merchant Circle', verified: true, mutualFriends: 12 },
  { address: '0x2222222222222222222222222222222222222222', avatar: '🎨', name: 'Creator Network', verified: true, mutualFriends: 8 },
  { address: '0x3333333333333333333333333333333333333333', avatar: '🛡️', name: 'Trust Builders', verified: false, mutualFriends: 5 },
];

const formatNumber = (value: number | undefined) => new Intl.NumberFormat().format(value ?? 0);

export function TrendingSidebar({ trending, suggested }: { trending: TrendingTopic[]; suggested: SuggestedUser[] }) {
  const visibleTrending = trending.length > 0 ? trending : FALLBACK_TRENDING;
  const visibleSuggested = suggested.length > 0 ? suggested : FALLBACK_SUGGESTED;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4 ring-effect">
        <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          Quick Access
        </h3>
        <div className="space-y-2">
          <Link href="/feed" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
            <Rss className="w-5 h-5" />
            <span>Activity Feed</span>
          </Link>
          <Link href="/stories" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
            <Camera className="w-5 h-5" />
            <span>Stories</span>
          </Link>
          <Link href="/social-messaging" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
            <MessageCircle className="w-5 h-5" />
            <span>Messages</span>
          </Link>
          <Link href="/social-payments" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
            <Zap className="w-5 h-5" />
            <span>Social Payments</span>
          </Link>
        </div>
      </div>

      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4 ring-effect">
        <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-pink-400" />
          Trending
        </h3>
        <div className="space-y-3">
          {visibleTrending.map((topic, index) => (
            <div key={topic.id} className="flex items-center justify-between group cursor-pointer">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">{index + 1}</span>
                  <span className="text-cyan-400 font-medium group-hover:underline">{topic.tag}</span>
                </div>
                <span className="text-xs text-zinc-500">{formatNumber(topic.posts)} posts</span>
              </div>
              {topic.trending === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
              {topic.trending === 'down' && <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4 ring-effect">
        <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-400" />
          Who to Follow
        </h3>
        <div className="space-y-4">
          {visibleSuggested.map((user) => (
            <div key={user.address} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-lg">
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-zinc-50 truncate">{user.name}</span>
                  {user.verified && <Shield className="w-3 h-3 text-cyan-400" />}
                </div>
                <span className="text-xs text-zinc-500">{user.mutualFriends} mutual</span>
              </div>
              <button className="px-3 py-1 bg-cyan-400 text-zinc-950 text-sm font-semibold rounded-full hover:bg-cyan-400 transition-colors">
                Follow
              </button>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 text-cyan-400 text-sm hover:underline">
          Show more
        </button>
      </div>

      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-4 ring-effect">
        <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Your Stats
        </h3>
        <div className="space-y-2 text-sm text-zinc-400">
          <div className="flex items-center justify-between"><span>Feed status</span><span className="text-emerald-300">Active</span></div>
          <div className="flex items-center justify-between"><span>Messaging</span><span className="text-cyan-300">Ready</span></div>
          <div className="flex items-center justify-between"><span>Payment rail</span><span className="text-purple-300">Connected</span></div>
        </div>
      </div>
    </div>
  );
}
