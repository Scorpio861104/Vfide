'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { sanitizeString } from '@/lib/validation'

interface Reply {
  id: number
  author: string
  authorScore: number
  content: string
  timestamp: string
  likes: number
}

const categoryColors: Record<string, string> = {
  general: 'bg-zinc-400/20 text-zinc-400 border-zinc-400',
  proposals: 'bg-cyan-400/20 text-cyan-400 border-cyan-400',
  support: 'bg-amber-400/20 text-amber-400 border-amber-400',
  ideas: 'bg-emerald-500/20 text-emerald-500 border-emerald-500',
  announcements: 'bg-purple-500/20 text-purple-500 border-purple-500',
}

interface DiscussionThreadProps {
  discussion: { id: number; title: string; author: string; timestamp: string; views: number; isPinned: boolean; category: string; preview: string; replies: number }
  onBack: () => void
  onReplyAdded: (discussionId: number) => void
}

export function DiscussionThread({ discussion, onBack, onReplyAdded }: DiscussionThreadProps) {
  const { isConnected, address } = useAccount()
  const [newReply, setNewReply] = useState('')
  const [replies, setReplies] = useState<Reply[]>([
    { id: 1, author: '0x742d...bEb', authorScore: 847, content: 'Great idea! I especially like the multi-chain support concept.', timestamp: '1 hour ago', likes: 12 },
    { id: 2, author: '0x1a2b...3c4d', authorScore: 723, content: 'I agree, but we need to consider the security implications carefully.', timestamp: '45 min ago', likes: 8 },
    { id: 3, author: '0x5e6f...7g8h', authorScore: 912, content: 'Has anyone done a cost analysis? What would the deployment costs look like?', timestamp: '30 min ago', likes: 5 },
  ])

  const handleReply = () => {
    if (!newReply.trim()) return
    setReplies([...replies, {
      id: replies.length + 1,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous',
      authorScore: 500, content: sanitizeString(newReply, 1000), timestamp: 'Just now', likes: 0,
    }])
    setNewReply('')
    onReplyAdded(discussion.id)
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <button onClick={onBack} className="mb-4 text-cyan-400 hover:underline flex items-center gap-2">← Back to Discussions</button>

        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            {discussion.isPinned && <span className="text-amber-400">📌</span>}
            <span className={`px-2 py-1 text-xs rounded border ${categoryColors[discussion.category] || ''}`}>{discussion.category.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-4">{discussion.title}</h1>
          <p className="text-zinc-400 mb-4">{discussion.preview}</p>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>by <span className="text-cyan-400 font-mono">{discussion.author}</span></span>
            <span>• {discussion.timestamp}</span>
            <span>• 👁 {discussion.views} views</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-bold text-zinc-100">💬 {replies.length} Replies</h2>
          {replies.map((reply) => (
            <div key={reply.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-mono">{reply.author}</span>
                  <span className="text-emerald-500 text-xs">(Score: {reply.authorScore})</span>
                  <span className="text-zinc-400 text-sm">• {reply.timestamp}</span>
                </div>
                <button className="text-zinc-400 hover:text-cyan-400 text-sm">❤️ {reply.likes}</button>
              </div>
              <p className="text-zinc-100">{reply.content}</p>
            </div>
          ))}
        </div>

        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-zinc-100 mb-4">Reply to this discussion</h3>
          {!isConnected && <div className="bg-amber-400/20 border border-amber-400 rounded-lg p-3 mb-4 text-sm text-amber-400">⚠️ Connect your wallet to reply with your identity</div>}
          <textarea value={newReply} onChange={(e) =>  setNewReply(e.target.value)} rows={4} maxLength={1000}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100  focus:border-cyan-400 focus:outline-none resize-none mb-4" />
          <button onClick={handleReply} disabled={!newReply.trim()}
            className="px-6 py-3 bg-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50">💬 Post Reply</button>
        </div>
      </div>
    </section>
  )
}
