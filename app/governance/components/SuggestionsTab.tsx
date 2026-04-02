'use client'

import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { sanitizeString } from '@/lib/validation'
import { useCopyWithId } from '@/lib/hooks/useCopyToClipboard'
import { type Suggestion, type SuggestionStatus, PROMOTION_THRESHOLD } from './suggestion-types'
import { SuggestionCard } from './SuggestionCard'

const SEED_SUGGESTIONS: Suggestion[] = [
  { id: 1, title: 'Add multi-chain support for Arbitrum', description: 'Deploy VFIDE protocol on Arbitrum to reduce gas costs and improve UX.', category: 'feature', author: '0x742d...bEb', authorScore: 945, timestamp: '2 hours ago', upvotes: 42, downvotes: 3,
    comments: [{ id: 1, author: '0x1a2b...3c4d', authorScore: 892, content: 'This is critical for adoption.', timestamp: '1 hour ago', likes: 5 }, { id: 2, author: '0x5e6f...7g8h', authorScore: 845, content: 'We should compare Arbitrum vs Optimism fees.', timestamp: '45 min ago', likes: 3 }],
    status: 'reviewing', votedBy: ['0x1a2b...3c4d'] },
  { id: 2, title: 'Add dark mode toggle', description: 'Allow users to switch between themes for better accessibility.', category: 'feature', author: '0x9i0j...1k2l', authorScore: 823, timestamp: '1 day ago', upvotes: 18, downvotes: 1, comments: [], status: 'new', votedBy: [] },
  { id: 3, title: 'Emergency multisig for treasury', description: 'Implement a 3/5 multisig for emergency treasury actions.', category: 'security', author: 'Council', authorScore: 1000, timestamp: '3 days ago', upvotes: 55, downvotes: 4,
    comments: [{ id: 3, author: '0x3m4n...5o6p', authorScore: 801, content: 'Need clear signers list.', timestamp: '2 days ago', likes: 2 }],
    status: 'approved', votedBy: [] },
]

export function SuggestionsTab() {
  const { address, isConnected } = useAccount()
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { copiedId, copyWithId } = useCopyWithId()
  const [newSuggestion, setNewSuggestion] = useState({ title: '', description: '', category: 'feature' })
  const [suggestions, setSuggestions] = useState<Suggestion[]>(SEED_SUGGESTIONS)
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('popular')
  const [filter, setFilter] = useState<'all' | SuggestionStatus>('all')

  const filteredSuggestions = useMemo(() => {
    return suggestions
      .filter((s) => filter === 'all' || s.status === filter)
      .filter((s) => searchQuery === '' || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.description.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => sortBy === 'popular' ? (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes) : b.id - a.id)
  }, [suggestions, filter, sortBy, searchQuery])

  const handleVote = (id: number, up: boolean) => {
    setSuggestions((prev) => prev.map((s) => {
      if (s.id !== id || s.votedBy.includes(address || 'anonymous')) return s
      const upvotes = up ? s.upvotes + 1 : s.upvotes
      const downvotes = up ? s.downvotes : s.downvotes + 1
      return { ...s, upvotes, downvotes, votedBy: [...s.votedBy, address || 'anonymous'],
        status: s.status === 'new' && upvotes - downvotes >= PROMOTION_THRESHOLD ? 'reviewing' : s.status }
    }))
  }

  const handleAddComment = (id: number, content: string) => {
    setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, comments: [...s.comments,
      { id: s.comments.length + 1, author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous', authorScore: 500, content, timestamp: 'Just now', likes: 0 }] } : s))
  }

  const handleSubmit = () => {
    if (!newSuggestion.title.trim() || !newSuggestion.description.trim()) return
    const suggestion: Suggestion = {
      id: suggestions.length + 1, title: sanitizeString(newSuggestion.title, 100), description: sanitizeString(newSuggestion.description, 2000),
      category: newSuggestion.category, author: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous', authorScore: 500,
      timestamp: 'Just now', upvotes: 0, downvotes: 0, comments: [], status: 'new', votedBy: [],
    }
    setSuggestions([suggestion, ...suggestions])
    setNewSuggestion({ title: '', description: '', category: 'feature' })
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
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search suggestions..."
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-cyan-400 focus:outline-none" />
            <button onClick={() => setShowSubmitForm(!showSubmitForm)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-400 text-zinc-900 rounded-lg font-bold hover:opacity-90 transition-all">
              {showSubmitForm ? '✕ Cancel' : '+ Submit Idea'}
            </button>
          </div>
        </div>

        {/* Submit Form */}
        {showSubmitForm && (
          <div className="bg-zinc-800 border border-emerald-500 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">📝 Submit Your Idea</h3>
            {!isConnected && <div className="bg-amber-400/20 border border-amber-400 rounded-lg p-4 mb-4"><p className="text-amber-400">⚠️ Connect your wallet to submit with your identity.</p></div>}
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Title *</label>
                <input type="text" value={newSuggestion.title} onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                  placeholder="Brief, descriptive title..." className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-emerald-500 focus:outline-none" maxLength={100} />
                <div className="text-right text-xs text-zinc-400 mt-1">{newSuggestion.title.length}/100</div>
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Category</label>
                <select value={newSuggestion.category} onChange={(e) => setNewSuggestion({ ...newSuggestion, category: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:border-emerald-500 focus:outline-none">
                  <option value="feature">🚀 New Feature</option><option value="economics">💰 Token Economics</option>
                  <option value="security">🛡️ Security</option><option value="governance">⚖️ Governance</option><option value="other">💡 Other</option>
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 text-sm mb-2">Description *</label>
                <textarea value={newSuggestion.description} onChange={(e) => setNewSuggestion({ ...newSuggestion, description: e.target.value })}
                  placeholder="Explain your idea in detail..." rows={5}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-emerald-500 focus:outline-none resize-none" maxLength={2000} />
                <div className="text-right text-xs text-zinc-400 mt-1">{newSuggestion.description.length}/2000</div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSubmit} disabled={!newSuggestion.title.trim() || !newSuggestion.description.trim()}
                  className="flex-1 py-3 bg-emerald-500 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50">🚀 Submit Suggestion</button>
                <button onClick={() => setShowSubmitForm(false)} className="px-6 py-3 bg-zinc-700 text-zinc-400 font-bold rounded-lg hover:text-zinc-100 transition-all">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            {['all', 'new', 'reviewing', 'approved'].map((f) => (
              <button key={f} onClick={() => setFilter(f as SuggestionStatus | 'all')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filter === f ? 'bg-cyan-400 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:text-cyan-400'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100">
            <option value="popular">🔥 Most Popular</option><option value="recent">🕐 Most Recent</option>
          </select>
        </div>

        {/* Suggestion Cards */}
        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} address={address}
              copiedId={copiedId} onVote={handleVote} onShare={(s) => copyWithId(String(s.id), `Suggestion #${s.id}: ${s.title}`)}
              onAddComment={handleAddComment} />
          ))}
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="text-center py-12 text-zinc-400"><div className="text-4xl mb-4">💡</div><p>No suggestions found. Be the first to submit an idea!</p></div>
        )}
      </div>
    </section>
  )
}
