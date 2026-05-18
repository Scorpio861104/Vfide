'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { MessageSquare, Loader2, ThumbsUp } from 'lucide-react';

interface Post {
  id: string | number;
  content?: string;
  title?: string;
  author?: string;
  author_name?: string;
  author_score?: number;
  created_at: string;
  likes?: number;
  comments?: number;
}

interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

export function EngagementTab() {
  const { address } = useAccount();
  const [posts, setPosts] = useState<Post[]>([]);
  const [endorsements, setEndorsements] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      fetch('/api/community/posts').then((r) => r.json()),
      fetch(`/api/activities?userAddress=${address}&type=endorsement&limit=20`).then((r) => r.json()),
    ])
      .then(([c, a]) => {
        // Show all recent community posts
        setPosts((c.posts ?? []).slice(0, 10));
        setEndorsements(a.activities ?? []);
      })
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to view engagement data.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={22} className="text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Community Posts</p>
          <p className="text-2xl font-bold text-white">{posts.length}</p>
        </div>
        <div className="bg-white/3 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-1 mb-1">
            <ThumbsUp size={12} className="text-yellow-400" />
            <p className="text-xs text-gray-400">Endorsements Recv&apos;d</p>
          </div>
          <p className="text-2xl font-bold text-white">{endorsements.length}</p>
        </div>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} className="text-purple-400" />
          <h3 className="text-white font-semibold text-sm">Recent Community Posts</h3>
        </div>
        {posts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No posts found.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="p-3 bg-white/3 rounded-lg">
                <p className="text-sm text-white">{p.title ?? p.content ?? 'Post'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-gray-500">{p.author_name ?? p.author ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-600">{new Date(p.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
