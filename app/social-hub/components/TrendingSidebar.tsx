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

const formatNumber = (value: number | undefined) => new Intl.NumberFormat().format(value ?? 0);

export function TrendingSidebar({ trending, suggested }: { trending: TrendingTopic[]; suggested: SuggestedUser[] }) {
  return (
      <div className="space-y-6">
        {/* Quick Links */}
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

      {/* Trending */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4 ring-effect">
          <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            Trending
          </h3>
        <div className="space-y-3">
          {trending.length === 0 ? (
            <div className="text-sm text-zinc-500">Trending topics will appear when live activity indexing is available.</div>
          ) : null}
          {trending.map((topic, index) => (
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

      {/* Who to Follow */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4 ring-effect">
          <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            Who to Follow
          </h3>
        <div className="space-y-4">
          {suggested.length === 0 ? (
            <div className="text-sm text-zinc-500">Suggested accounts will appear once social graph data is available.</div>
          ) : null}
          {suggested.map((user) => (
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

      {/* Stats Card */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-4 ring-effect">
          <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Your Stats
          </h3>
        <div className="text-sm text-zinc-500">Personal social stats are not available until profile analytics is connected.</div>
      </div>
    </div>
  );
}
