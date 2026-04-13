'use client'

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
  new: "border-cyan-400 text-cyan-400",
  reviewing: "border-amber-400 text-amber-400",
  approved: "border-emerald-500 text-emerald-500",
  rejected: "border-red-600 text-red-600",
  implemented: "border-emerald-500 text-emerald-500",
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
            <h2 className="text-2xl font-bold text-zinc-100">💡 Submit & Vote on Ideas</h2>
            <p className="text-zinc-400">Community suggestions that can graduate to formal proposals.</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>  setSearchQuery(e.target.value)}
             
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100  focus:border-cyan-400 focus:outline-none"
            />
            <button
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-400 text-zinc-900 rounded-lg font-bold hover:opacity-90 transition-all"
            >
              {showSubmitForm ? "✕ Cancel" : "+ Submit Idea"}
            </button>
          </div>
        </div>

        {showSubmitForm && (
          <div className="bg-zinc-800 border border-emerald-500 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">📝 Submit Your Idea</h3>

            {!isConnected && (
              <div className="bg-amber-400/20 border border-amber-400 rounded-lg p-4 mb-4">
                <p className="text-amber-400">⚠️ Connect your wallet to submit suggestions with your identity. Anonymous submissions are also allowed.</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Title *</label>
                <input
                  type="text"
                  value={newSuggestion.title}
                  onChange={(e) =>  setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                 
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100  focus:border-emerald-500 focus:outline-none"
                  maxLength={100}
                />
                <div className="text-right text-xs text-zinc-400 mt-1">{newSuggestion.title.length}/100</div>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-2">Category</label>
                <select
                  value={newSuggestion.category}
                  onChange={(e) =>  setNewSuggestion({ ...newSuggestion, category: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="feature">🚀 New Feature</option>
                  <option value="economics">💰 Token Economics</option>
                  <option value="security">🛡️ Security</option>
                  <option value="governance">⚖️ Governance</option>
                  <option value="other">💡 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-2">Description *</label>
                <textarea
                  value={newSuggestion.description}
                  onChange={(e) =>  setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                 
                  rows={5}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100  focus:border-emerald-500 focus:outline-none resize-none"
                  maxLength={2000}
                />
                <div className="text-right text-xs text-zinc-400 mt-1">{newSuggestion.description.length}/2000</div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!newSuggestion.title.trim() || !newSuggestion.description.trim()}
                  className="flex-1 py-3 bg-emerald-500 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 Submit Suggestion
                </button>
                <button
                  onClick={() => setShowSubmitForm(false)}
                  className="px-6 py-3 bg-zinc-700 text-zinc-400 font-bold rounded-lg hover:text-zinc-100 transition-all"
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
                  filter === f ? "bg-cyan-400 text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:text-cyan-400"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) =>  setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100"
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
                className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all"
              >
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <button
                      onClick={() => handleVote(suggestion.id, true)}
                      disabled={hasVoted}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${
                        hasVoted
                          ? "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                          : "bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500"
                      }`}
                    >
                      ▲
                    </button>
                    <div
                      className={`text-lg font-bold ${
                        score > 0 ? "text-emerald-500" : score < 0 ? "text-red-600" : "text-zinc-400"
                      }`}
                    >
                      {score}
                    </div>
                    <button
                      onClick={() => handleVote(suggestion.id, false)}
                      disabled={hasVoted}
                      className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${
                        hasVoted
                          ? "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                          : "bg-zinc-900 hover:bg-red-600/20 text-zinc-400 hover:text-red-600"
                      }`}
                    >
                      ▼
                    </button>
                    {hasVoted && <span className="text-zinc-400 text-xs">voted</span>}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded border ${statusColors[suggestion.status]}`}>
                        {suggestion.status.toUpperCase()}
                      </span>
                      <span className="text-lg">{categoryIcons[suggestion.category] || "💡"}</span>
                      <span className="text-zinc-400 text-sm">{suggestion.category}</span>
                      {suggestion.status === "new" && score > 0 && (
                        <span className="text-xs text-amber-400">🎯 {Math.round(progressToPromotion)}% to proposal</span>
                      )}
                    </div>

                    {suggestion.status === "new" && score > 0 && (
                      <div className="w-full h-1 bg-zinc-700 rounded-full mb-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                          style={{ width: `${progressToPromotion}%` }}
                        />
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-zinc-100 mb-2">{suggestion.title}</h3>
                    <p className={`text-zinc-400 mb-4 ${isExpanded ? "" : "line-clamp-2"}`}>{suggestion.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-zinc-400">
                        by <span className="text-cyan-400 font-mono">{suggestion.author}</span>
                        <span className="text-emerald-500 ml-1">(Score: {suggestion.authorScore})</span>
                      </span>
                      <span className="text-zinc-400">• {suggestion.timestamp}</span>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                        className="text-zinc-400 hover:text-cyan-400 transition-all"
                      >
                        💬 {suggestion.comments.length} comments {isExpanded ? "▲" : "▼"}
                      </button>
                      <button
                        onClick={() => handleShare(suggestion)}
                        className="text-zinc-400 hover:text-cyan-400 transition-all"
                      >
                        {copiedId === suggestion.id ? "✓ Copied!" : "🔗 Share"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-zinc-700">
                        <div className="space-y-3 mb-4">
                          {suggestion.comments.length === 0 ? (
                            <p className="text-zinc-400 text-sm italic">No comments yet. Be the first!</p>
                          ) : (
                            suggestion.comments.map((comment) => (
                              <div key={comment.id} className="bg-zinc-900 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-cyan-400 font-mono">{comment.author}</span>
                                    <span className="text-emerald-500 text-xs">(Score: {comment.authorScore})</span>
                                    <span className="text-zinc-400">• {comment.timestamp}</span>
                                  </div>
                                  <button className="text-zinc-400 hover:text-red-600 text-xs">❤️ {comment.likes}</button>
                                </div>
                                <p className="text-zinc-100 text-sm">{comment.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) =>  setNewComment(e.target.value)}
                           
                            maxLength={500}
                            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100  focus:border-cyan-400 focus:outline-none text-sm"
                            onKeyDown={(e) => e.key === "Enter" && handleAddComment(suggestion.id)}
                          />
                          <button
                            onClick={() => handleAddComment(suggestion.id)}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm"
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
          <div className="text-center py-12 text-zinc-400">
            <div className="text-4xl mb-4">💡</div>
            <p>No suggestions found. Be the first to submit an idea!</p>
          </div>
        )}
      </div>
    </section>
  )
}
