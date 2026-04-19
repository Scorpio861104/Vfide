'use client';

export const dynamic = 'force-dynamic';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useMemo, useState } from 'react';
import { Hash, MessageCircle, Users } from 'lucide-react';
import { useAccount } from 'wagmi';

import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';

import { CreatePostCard } from './components/CreatePostCard';
import { PostCard } from './components/PostCard';
import { StoryRing } from './components/StoryRing';
import { TrendingSidebar } from './components/TrendingSidebar';

type FeedFilter = 'all' | 'following' | 'trending';

export default function SocialHubPage() {
  const { isConnected, address } = useAccount();
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [filter, setFilter] = useState<FeedFilter>('all');

  useEffect(() => {
    if (!isConnected) {
      setPosts([]);
      return;
    }

    fetch('/api/community/posts')
      .then((response) => (response.ok ? response.json() : { posts: [] }))
      .then((data) => {
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      })
      .catch(() => setPosts([]));
  }, [isConnected]);

  const filteredPosts = useMemo(() => {
    if (filter === 'following') {
      return posts.filter((post) => post.isFollowing);
    }
    if (filter === 'trending') {
      return [...posts].sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0));
    }
    return posts;
  }, [filter, posts]);

  const handlePost = (content: string) => {
    setPosts((prev) => [
      {
        id: `draft-${Date.now()}`,
        author: {
          address: address ?? 'You',
          name: 'You',
          avatar: '✨',
          verified: true,
          proofScore: 100,
        },
        content,
        timestamp: Date.now(),
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        liked: false,
        bookmarked: false,
        isFollowing: true,
        tags: [],
      },
      ...prev,
    ]);
  };

  if (!isConnected) {
    return (
      <>
        <div className="min-h-screen bg-zinc-950 pt-20">
          <PageWrapper>
            <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white">
              <h1 className="mb-4 text-4xl font-bold">Connect to Join the Conversation</h1>
              <p className="mb-8 text-white/60">Sign in with your wallet to unlock the VFIDE social feed, stories, and community reactions.</p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          </PageWrapper>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <PageWrapper>
          <div className="container mx-auto max-w-6xl px-4 py-8 text-white">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-bold">Social Hub</h1>
                <p className="text-white/60">Follow merchants, share updates, and track community activity across VFIDE.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'all', label: 'All', icon: Hash },
                  { id: 'following', label: 'Following', icon: Users },
                  { id: 'trending', label: 'Trending', icon: MessageCircle },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${filter === tab.id ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-300' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'}`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {stories.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {stories.map((story, index) => (
                      <StoryRing key={index} story={story} onClick={() => {}} />
                    ))}
                  </div>
                )}

                <CreatePostCard onPost={handlePost} />

                {filteredPosts.map((post, index) => (
                  <PostCard key={post.id || index} post={post} onLike={() => {}} onBookmark={() => {}} />
                ))}

                {filteredPosts.length === 0 && (
                  <div className="py-16 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Your feed is empty</p>
                    <p className="mt-1 text-sm">Follow merchants and users to see activity</p>
                  </div>
                )}

                <button type="button" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-cyan-300 hover:bg-white/10">
                  Load More Posts
                </button>
              </div>

              <div className="hidden lg:block">
                <TrendingSidebar trending={trending} suggested={suggested} />
              </div>
            </div>
          </div>
        </PageWrapper>
      </div>
      <Footer />
    </>
  );
}
