"use client"

import { useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { sanitizeString } from "@/lib/validation"
import { useCopyWithId } from "@/lib/hooks/useCopyToClipboard"

const PROMOTION_THRESHOLD = 50

const categoryIcons: Record<string, string> = {
  feature: "🚀",
  economics: "💰",
  security: "🛡️",
  governance: "⚖️",
  other: "💡",
}

const statusColors: Record<string, string> = {
  new: "border-[#00F0FF] text-[#00F0FF]",
  reviewing: "border-[#FFD700] text-[#FFD700]",
  approved: "border-[#50C878] text-[#50C878]",
  rejected: "border-[#C41E3A] text-[#C41E3A]",
  implemented: "border-[#50C878] text-[#50C878]",
}

type SuggestionStatus = "new" | "reviewing" | "approved" | "rejected" | "implemented"

type Suggestion = {
  id: number
  title: string
  description: string
  category: string
  author: string
  authorScore: number
  timestamp: string
  upvotes: number
  downvotes: number
  comments: SuggestionComment[]
  status: SuggestionStatus
  votedBy: string[]
}

type SuggestionComment = {
  id: number
  author: string
  authorScore: number
  content: string
  timestamp: string
  likes: number
}

export function SuggestionsTab() {
  const { address, isConnected } = useAccount()
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [newComment, setNewComment] = useState("")
  const { copiedId, copyWithId } = useCopyWithId()
  const [newSuggestion, setNewSuggestion] = useState({
    title: "",
    description: "",
    category: "feature",
  })
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: 1,
      title: "Add multi-chain support for Arbitrum",
      description: "Deploy VFIDE protocol on Arbitrum to reduce gas costs and improve UX.",
      category: "feature",
      author: "0x742d...bEb",
      authorScore: 945,
      timestamp: "2 hours ago",
      upvotes: 42,
      downvotes: 3,
      comments: [
        { id: 1, author: "0x1a2b...3c4d", authorScore: 892, content: "This is critical for adoption.", timestamp: "1 hour ago", likes: 5 },
        { id: 2, author: "0x5e6f...7g8h", authorScore: 845, content: "We should compare Arbitrum vs Optimism fees.", timestamp: "45 min ago", likes: 3 },
      ],
      status: "reviewing",
      votedBy: ["0x1a2b...3c4d"],
    },
    {
      id: 2,
      title: "Add dark mode toggle",
      description: "Allow users to switch between themes for better accessibility.",
      category: "feature",
      author: "0x9i0j...1k2l",
      authorScore: 823,
      timestamp: "1 day ago",
      upvotes: 18,
      downvotes: 1,
      comments: [],
      status: "new",
      votedBy: [],
    },
    {
      id: 3,
      title: "Emergency multisig for treasury",
      description: "Implement a 3/5 multisig for emergency treasury actions.",
      category: "security",
      author: "Council",
      authorScore: 1000,
      timestamp: "3 days ago",
      upvotes: 55,
      downvotes: 4,
      comments: [
        { id: 3, author: "0x3m4n...5o6p", authorScore: 801, content: "Need clear signers list.", timestamp: "2 days ago", likes: 2 },
      ],
      status: "approved",
      votedBy: [],
    },
  ])
  const [sortBy, setSortBy] = useState<"recent" | "popular">("popular")
  const [filter, setFilter] = useState<"all" | SuggestionStatus>("all")

  const filteredSuggestions = useMemo(() => {
    return suggestions
      .filter((s) => filter === "all" || s.status === filter)
      .filter(
        (s) =>
          searchQuery === "" || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        if (sortBy === "popular") {
          const scoreA = a.upvotes - a.downvotes
          const scoreB = b.upvotes - b.downvotes
          return scoreB - scoreA
        }
        return b.id - a.id
      })
  }, [suggestions, filter, sortBy, searchQuery])

  const handleVote = (id: number, up: boolean) => {
    setSuggestions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        if (s.votedBy.includes(address || "anonymous")) return s

        const upvotes = up ? s.upvotes + 1 : s.upvotes
        const downvotes = up ? s.downvotes : s.downvotes + 1
        return {
          ...s,
          upvotes,
          downvotes,
          votedBy: [...s.votedBy, address || "anonymous"],
          status: s.status === "new" && upvotes - downvotes >= PROMOTION_THRESHOLD ? "reviewing" : s.status,
        }
      }),
    )
  }

  const handleShare = (s: Suggestion) => {
    copyWithId(String(s.id), `Suggestion #${s.id}: ${s.title}`)
  }

  const handleAddComment = (id: number) => {
    if (!newComment.trim()) return
    
    // Sanitize comment input to prevent XSS
    const sanitizedComment = sanitizeString(newComment, 500)
    
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              comments: [
                ...s.comments,
                {
                  id: s.comments.length + 1,
                  author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Anonymous",
                  authorScore: 500,
                  content: sanitizedComment,
                  timestamp: "Just now",
                  likes: 0,
                },
              ],
            }
          : s,
      ),
    )
    setNewComment("")
  }

  const handleSubmit = () => {
    if (!newSuggestion.title.trim() || !newSuggestion.description.trim()) return
    
    // Sanitize user inputs to prevent XSS
    const sanitizedTitle = sanitizeString(newSuggestion.title, 100)
    const sanitizedDescription = sanitizeString(newSuggestion.description, 2000)
    
    const suggestion: Suggestion = {
      id: suggestions.length + 1,
      title: sanitizedTitle,
      description: sanitizedDescription,
      category: newSuggestion.category,
      author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Anonymous",
      authorScore: 500,
      timestamp: "Just now",
      upvotes: 0,
      downvotes: 0,
      comments: [],
      status: "new",
      votedBy: [],
    }
    setSuggestions([suggestion, ...suggestions])
    setNewSuggestion({ title: "", description: "", category: "feature" })
    setShowSubmitForm(false)
  }

  return (
    <section className="py-8">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#F5F3E8]">💡 Submit & Vote on Ideas</h2>
            <p className="text-[#A0A0A5]">Community suggestions that can graduate to formal proposals.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suggestions..."
              className="px-4 py-2 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none"
            />
            <button
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              className="px-4 py-2 bg-linear-to-r from-[#50C878] to-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:opacity-90 transition-all"
            >
              {showSubmitForm ? "✕ Cancel" : "+ Submit Idea"}
            </button>
          </div>
        </div>

        {showSubmitForm && (
          <div className="bg-[#2A2A2F] border border-[#50C878] rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-[#F5F3E8] mb-4">📝 Submit Your Idea</h3>

            {!isConnected && (
              <div className="bg-[#FFD700]/20 border border-[#FFD700] rounded-lg p-4 mb-4">
                <p className="text-[#FFD700]">⚠️ Connect your wallet to submit suggestions with your identity. Anonymous submissions are also allowed.</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Title *</label>
                <input
                  type="text"
                  value={newSuggestion.title}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                  placeholder="Brief, descriptive title for your idea..."
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#50C878] focus:outline-none"
                  maxLength={100}
                />
                <div className="text-right text-xs text-[#A0A0A5] mt-1">{newSuggestion.title.length}/100</div>
              </div>

              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Category</label>
                <select
                  value={newSuggestion.category}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, category: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] focus:border-[#50C878] focus:outline-none"
                >
                  <option value="feature">🚀 New Feature</option>
                  <option value="economics">💰 Token Economics</option>
                  <option value="security">🛡️ Security</option>
                  <option value="governance">⚖️ Governance</option>
                  <option value="other">💡 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[#A0A0A5] text-sm mb-2">Description *</label>
                <textarea
                  value={newSuggestion.description}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                  placeholder="Explain your idea in detail. What problem does it solve? How would it work?"
                  rows={5}
                  className="w-full px-4 py-3 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#50C878] focus:outline-none resize-none"
                  maxLength={2000}
                />
                <div className="text-right text-xs text-[#A0A0A5] mt-1">{newSuggestion.description.length}/2000</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!newSuggestion.title.trim() || !newSuggestion.description.trim()}
                  className="flex-1 py-3 bg-[#50C878] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 Submit Suggestion
                </button>
                <button
                  onClick={() => setShowSubmitForm(false)}
                  className="px-6 py-3 bg-[#3A3A3F] text-[#A0A0A5] font-bold rounded-lg hover:text-[#F5F3E8] transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            {["all", "new", "reviewing", "approved"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as SuggestionStatus | "all")}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  filter === f ? "bg-[#00F0FF] text-[#1A1A1D]" : "bg-[#2A2A2F] text-[#A0A0A5] hover:text-[#00F0FF]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg text-[#F5F3E8]"
          >
            <option value="popular">🔥 Most Popular</option>
            <option value="recent">🕐 Most Recent</option>
          </select>
        </div>

        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => {
            const score = suggestion.upvotes - suggestion.downvotes
            const progressToPromotion = Math.min(100, (score / PROMOTION_THRESHOLD) * 100)
            const hasVoted = suggestion.votedBy.includes(address || "anonymous")
            const isExpanded = expandedId === suggestion.id

            return (
              <div
                key={suggestion.id}
                className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6 hover:border-[#50C878]/50 transition-all"
              >
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1 min-w-0 flex-shrink-0">
                    <button
                      onClick={() => handleVote(suggestion.id, true)}
                      disabled={hasVoted}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${
                        hasVoted
                          ? "bg-[#1A1A1D] text-[#3A3A3F] cursor-not-allowed"
                          : "bg-[#1A1A1D] hover:bg-[#50C878]/20 text-[#A0A0A5] hover:text-[#50C878]"
                      }`}
                    >
                      ▲
                    </button>
                    <div
                      className={`text-lg font-bold ${
                        score > 0 ? "text-[#50C878]" : score < 0 ? "text-[#C41E3A]" : "text-[#A0A0A5]"
                      }`}
                    >
                      {score}
                    </div>
                    <button
                      onClick={() => handleVote(suggestion.id, false)}
                      disabled={hasVoted}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${
                        hasVoted
                          ? "bg-[#1A1A1D] text-[#3A3A3F] cursor-not-allowed"
                          : "bg-[#1A1A1D] hover:bg-[#C41E3A]/20 text-[#A0A0A5] hover:text-[#C41E3A]"
                      }`}
                    >
                      ▼
                    </button>
                    {hasVoted && <span className="text-[#A0A0A5] text-xs">voted</span>}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded border ${statusColors[suggestion.status]}`}>
                        {suggestion.status.toUpperCase()}
                      </span>
                      <span className="text-lg">{categoryIcons[suggestion.category] || "💡"}</span>
                      <span className="text-[#A0A0A5] text-sm">{suggestion.category}</span>
                      {suggestion.status === "new" && score > 0 && (
                        <span className="text-xs text-[#FFD700]">🎯 {Math.round(progressToPromotion)}% to proposal</span>
                      )}
                    </div>

                    {suggestion.status === "new" && score > 0 && (
                      <div className="w-full h-1 bg-[#3A3A3F] rounded-full mb-3 overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-[#50C878] to-[#00F0FF] transition-all duration-500"
                          style={{ width: `${progressToPromotion}%` }}
                        />
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-[#F5F3E8] mb-2">{suggestion.title}</h3>
                    <p className={`text-[#A0A0A5] mb-4 ${isExpanded ? "" : "line-clamp-2"}`}>{suggestion.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-[#A0A0A5]">
                        by <span className="text-[#00F0FF] font-mono">{suggestion.author}</span>
                        <span className="text-[#50C878] ml-1">(Score: {suggestion.authorScore})</span>
                      </span>
                      <span className="text-[#A0A0A5]">• {suggestion.timestamp}</span>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                        className="text-[#A0A0A5] hover:text-[#00F0FF] transition-all"
                      >
                        💬 {suggestion.comments.length} comments {isExpanded ? "▲" : "▼"}
                      </button>
                      <button
                        onClick={() => handleShare(suggestion)}
                        className="text-[#A0A0A5] hover:text-[#00F0FF] transition-all"
                      >
                        {copiedId === suggestion.id ? "✓ Copied!" : "🔗 Share"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#3A3A3F]">
                        <div className="space-y-3 mb-4">
                          {suggestion.comments.length === 0 ? (
                            <p className="text-[#A0A0A5] text-sm italic">No comments yet. Be the first!</p>
                          ) : (
                            suggestion.comments.map((comment) => (
                              <div key={comment.id} className="bg-[#1A1A1D] rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[#00F0FF] font-mono">{comment.author}</span>
                                    <span className="text-[#50C878] text-xs">(Score: {comment.authorScore})</span>
                                    <span className="text-[#A0A0A5]">• {comment.timestamp}</span>
                                  </div>
                                  <button className="text-[#A0A0A5] hover:text-[#C41E3A] text-xs">❤️ {comment.likes}</button>
                                </div>
                                <p className="text-[#F5F3E8] text-sm">{comment.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            maxLength={500}
                            className="flex-1 px-3 py-2 bg-[#1A1A1D] border border-[#3A3A3F] rounded-lg text-[#F5F3E8] placeholder-[#A0A0A5] focus:border-[#00F0FF] focus:outline-none text-sm"
                            onKeyDown={(e) => e.key === "Enter" && handleAddComment(suggestion.id)}
                          />
                          <button
                            onClick={() => handleAddComment(suggestion.id)}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="text-center py-12 text-[#A0A0A5]">
            <div className="text-4xl mb-4">💡</div>
            <p>No suggestions found. Be the first to submit an idea!</p>
          </div>
        )}
      </div>
    </section>
  )
}
