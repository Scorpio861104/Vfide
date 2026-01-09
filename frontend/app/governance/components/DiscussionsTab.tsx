"use client"

import { useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { sanitizeString } from "@/lib/validation"

interface Discussion {
  id: number
  title: string
  author: string
  authorScore: number
  timestamp: string
  replies: number
  views: number
  lastReply: string
  isPinned: boolean
  category: "general" | "proposals" | "support" | "ideas" | "announcements"
  preview: string
}

interface Reply {
  id: number
  author: string
  authorScore: number
  content: string
  timestamp: string
  likes: number
}

const categoryColors: Record<Discussion["category"], string> = {
  general: "bg-[#A0A0A5]/20 text-[#A0A0A5] border-[#A0A0A5]",
  proposals: "bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]",
  support: "bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]",
  ideas: "bg-[#50C878]/20 text-[#50C878] border-[#50C878]",
  announcements: "bg-[#9B59B6]/20 text-[#9B59B6] border-[#9B59B6]",
}

export function DiscussionsTab({ searchQuery }: { searchQuery: string }) {
  const { address, isConnected } = useAccount()
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newThread, setNewThread] = useState({ title: "", content: "", category: "general" })
  const [newReply, setNewReply] = useState("")
  const [category, setCategory] = useState<"all" | Discussion["category"]>("all")

  const [discussions, setDiscussions] = useState<Discussion[]>([
    {
      id: 1,
      title: "📢 VFIDE v2.0 Launch Discussion",
      author: "VFIDE Team",
      authorScore: 1000,
      timestamp: "2 hours ago",
      replies: 47,
      views: 1250,
      lastReply: "10 min ago",
      isPinned: true,
      category: "announcements",
      preview: "We're excited to announce the upcoming v2.0 release! This thread is for community discussion about the new features...",
    },
    {
      id: 2,
      title: "Best practices for merchant onboarding",
      author: "0x742d...bEb",
      authorScore: 847,
      timestamp: "5 hours ago",
      replies: 23,
      views: 456,
      lastReply: "1 hour ago",
      isPinned: false,
      category: "general",
      preview: "I've been helping onboard local merchants in my area. Here are some tips that have worked well for me...",
    },
    {
      id: 3,
      title: "Proposal #142 Discussion: Multi-Chain Expansion",
      author: "0x1a2b...3c4d",
      authorScore: 723,
      timestamp: "1 day ago",
      replies: 89,
      views: 2340,
      lastReply: "30 min ago",
      isPinned: true,
      category: "proposals",
      preview: "Let's discuss the pros and cons of expanding to Arbitrum and Optimism as outlined in Proposal #142...",
    },
    {
      id: 4,
      title: "Help: Vault recovery process",
      author: "0x5e6f...7g8h",
      authorScore: 312,
      timestamp: "3 days ago",
      replies: 12,
      views: 234,
      lastReply: "6 hours ago",
      isPinned: false,
      category: "support",
      preview: "I need help understanding the vault recovery process. My guardian says they can't see the approval button...",
    },
    {
      id: 5,
      title: "Idea: Gamification of ProofScore building",
      author: "0x9i0j...1k2l",
      authorScore: 654,
      timestamp: "1 week ago",
      replies: 34,
      views: 567,
      lastReply: "2 days ago",
      isPinned: false,
      category: "ideas",
      preview: "What if we added achievements and milestones to make building ProofScore more engaging? Here's my proposal...",
    },
  ])

  const [replies, setReplies] = useState<Reply[]>([
    {
      id: 1,
      author: "0x742d...bEb",
      authorScore: 847,
      content: "Great idea! I especially like the multi-chain support concept. This would really help with gas fees.",
      timestamp: "1 hour ago",
      likes: 12,
    },
    {
      id: 2,
      author: "0x1a2b...3c4d",
      authorScore: 723,
      content: "I agree, but we need to consider the security implications carefully. Let's not rush this.",
      timestamp: "45 min ago",
      likes: 8,
    },
    {
      id: 3,
      author: "0x5e6f...7g8h",
      authorScore: 912,
      content: "Has anyone done a cost analysis? What would the deployment costs look like on Arbitrum?",
      timestamp: "30 min ago",
      likes: 5,
    },
  ])

  const filteredDiscussions = useMemo(() => {
    return discussions
      .filter((d) => category === "all" || d.category === category)
      .filter((d) => !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
  }, [discussions, category, searchQuery])

  const handleNewThread = () => {
    if (!newThread.title.trim() || !newThread.content.trim()) return

    // Sanitize user inputs to prevent XSS
    const sanitizedTitle = sanitizeString(newThread.title, 100)
    const sanitizedContent = sanitizeString(newThread.content, 2000)

    const thread: Discussion = {
      id: discussions.length + 1,
      title: sanitizedTitle,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Anonymous",
      authorScore: 500,
      timestamp: "Just now",
      replies: 0,
      views: 1,
      lastReply: "-",
      isPinned: false,
      category: newThread.category as Discussion["category"],
      preview: sanitizedContent.slice(0, 150) + "...",
    }

    setDiscussions([thread, ...discussions])
    setNewThread({ title: "", content: "", category: "general" })
    setShowNewThread(false)
  }

  const handleReply = () => {
    if (!newReply.trim()) return

    // Sanitize reply content to prevent XSS
    const sanitizedReply = sanitizeString(newReply, 1000)

    const reply: Reply = {
      id: replies.length + 1,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Anonymous",
      authorScore: 500,
      content: sanitizedReply,
      timestamp: "Just now",
      likes: 0,
    }

    setReplies([...replies, reply])
    setNewReply("")

    if (selectedDiscussion) {
      setDiscussions(
        discussions.map((d) =>
          d.id === selectedDiscussion.id ? { ...d, replies: d.replies + 1, lastReply: "Just now" } : d,
        ),
      )
    }
  }

  if (selectedDiscussion) {
    return (
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <button
            onClick={() => setSelectedDiscussion(null)}
            className="mb-4 text-[#00F0FF] hover:underline flex items-center gap-2"
          >
            ← Back to Discussions
          </button>

          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              {selectedDiscussion.isPinned && <span className="text-[#FFD700]">📌</span>}
              <span className={`px-2 py-1 text-xs rounded border ${categoryColors[selectedDiscussion.category]}`}>
                {selectedDiscussion.category.toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#F5F3E8] mb-4">{selectedDiscussion.title}</h1>
            <p className="text-[#A0A0A5] mb-4">{selectedDiscussion.preview}</p>
            <div className="flex items-center gap-4 text-sm text-[#A0A0A5]">
              <span>
                by <span className="text-[#00F0FF] font-mono">{selectedDiscussion.author}</span>
              </span>
              <span>• {selectedDiscussion.timestamp}</span>
              <span>• 👁 {selectedDiscussion.views} views</span>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-bold text-[#F5F3E8]">💬 {replies.length} Replies</h2>
            {replies.map((reply) => (
              <div key={reply.id} className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#00F0FF] font-mono">{reply.author}</span>
                    <span className="text-[#50C878] text-xs">(Score: {reply.authorScore})</span>
                    <span className="text-[#A0A0A5] text-sm">• {reply.timestamp}</span>
                  </div>
                  <button className="text-[#A0A0A5] hover:text-[#00F0FF] text-sm">❤️ {reply.likes}</button>
                </div>
                <p className="text-[#F5F3E8]">{reply.content}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
            <h3 className="text-lg font-bold text-[#F5F3E8] mb-4">Reply to this discussion</h3>
            {!isConnected && (
              <div className="bg-[#FFD700]/20 border border-[#FFD700] rounded-lg p-3 mb-4 text-sm text-[#FFD700]">
                ⚠️ Connect your wallet to reply with your identity
              </div>
            )}
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none resize-none mb-4"
            />
            <button
              onClick={handleReply}
              disabled={!newReply.trim()}
              className="px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              💬 Post Reply
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-2">💬 Community Discussions</h2>
            <p className="text-[#A0A0A5]">Discuss proposals, share ideas, and connect with the community.</p>
          </div>
          <button
            onClick={() => setShowNewThread(!showNewThread)}
            className="px-6 py-3 bg-linear-to-r from-[#00F0FF] to-[#0080FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all"
          >
            {showNewThread ? "✕ Cancel" : "+ New Discussion"}
          </button>
        </div>

        {showNewThread && (
          <div className="bg-[#2A2A2F] border border-[#00F0FF] rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">📝 Start a New Discussion</h3>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[#A0A0A5] text-sm mb-2">Title *</label>
                  <input
                    type="text"
                    value={newThread.title}
                    onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                    placeholder="Discussion topic..."
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-[#A0A0A5] text-sm mb-2">Category</label>
                  <select
                    value={newThread.category}
                    onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#00F0FF] focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="proposals">Proposals</option>
                    <option value="support">Support</option>
                    <option value="ideas">Ideas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Content *</label>
                <textarea
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  placeholder="What would you like to discuss?"
                  rows={5}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleNewThread}
                disabled={!newThread.title.trim() || !newThread.content.trim()}
                className="px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
              >
                🚀 Start Discussion
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {["all", "announcements", "proposals", "general", "ideas", "support"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat as typeof category)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
                category === cat ? "bg-[#00F0FF] text-[#1A1A1D]" : "bg-[#2A2A2F] text-[#A0A0A5] hover:text-[#00F0FF]"
              }`}
            >
              {cat === "all"
                ? "📋 All"
                : cat === "announcements"
                  ? "📢 Announcements"
                  : cat === "proposals"
                    ? "📜 Proposals"
                    : cat === "general"
                      ? "💬 General"
                      : cat === "ideas"
                        ? "💡 Ideas"
                        : "🆘 Support"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredDiscussions.map((discussion) => (
            <div
              key={discussion.id}
              onClick={() => setSelectedDiscussion(discussion)}
              className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-4 hover:border-[#00F0FF]/50 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {discussion.isPinned && <span className="text-[#FFD700]">📌</span>}
                    <span className={`px-2 py-1 text-xs rounded border ${categoryColors[discussion.category]}`}>
                      {discussion.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#F5F3E8] mb-1 hover:text-[#00F0FF] transition-colors">
                    {discussion.title}
                  </h3>
                  <p className="text-[#A0A0A5] text-sm line-clamp-1 mb-2">{discussion.preview}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#A0A0A5]">
                    <span>
                      by <span className="text-[#00F0FF]">{discussion.author}</span>
                    </span>
                    <span>• {discussion.timestamp}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-[#00F0FF] font-bold">{discussion.replies}</div>
                  <div className="text-[#A0A0A5] text-xs">replies</div>
                  <div className="text-[#A0A0A5] text-xs mt-1">👁 {discussion.views}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDiscussions.length === 0 && (
          <div className="text-center py-12 text-[#A0A0A5]">
            <div className="text-4xl mb-4">💬</div>
            <p>No discussions found. Start a new conversation!</p>
          </div>
        )}
      </div>
    </section>
  )
}
