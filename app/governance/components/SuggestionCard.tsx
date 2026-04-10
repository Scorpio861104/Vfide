'use client'

import { useState } from 'react'
import { sanitizeString } from '@/lib/validation'
import { type Suggestion, PROMOTION_THRESHOLD, categoryIcons, statusColors } from './suggestion-types'

interface SuggestionCardProps {
  suggestion: Suggestion
  address: string | undefined
  copiedId: string | number | null
  onVote: (id: number, up: boolean) => void
  onShare: (s: Suggestion) => void
  onAddComment: (id: number, content: string) => void
}

export function SuggestionCard({ suggestion, address, copiedId, onVote, onShare, onAddComment }: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newComment, setNewComment] = useState('')

  const score = suggestion.upvotes - suggestion.downvotes
  const progressToPromotion = Math.min(100, (score / PROMOTION_THRESHOLD) * 100)
  const hasVoted = suggestion.votedBy.includes(address || 'anonymous')

  const handleAddComment = () => {
    if (!newComment.trim()) return
    onAddComment(suggestion.id, sanitizeString(newComment, 500))
    setNewComment('')
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all">
      <div className="flex gap-4">
        {/* Voting */}
        <div className="flex flex-col items-center gap-1 min-w-[60px]">
          <button onClick={() => onVote(suggestion.id, true)} disabled={hasVoted}
            className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${hasVoted ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : 'bg-zinc-900 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-500'}`}>▲</button>
          <div className={`text-lg font-bold ${score > 0 ? 'text-emerald-500' : score < 0 ? 'text-red-600' : 'text-zinc-400'}`}>{score}</div>
          <button onClick={() => onVote(suggestion.id, false)} disabled={hasVoted}
            className={`w-10 h-10 rounded-lg transition-all flex items-center justify-center text-xl ${hasVoted ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : 'bg-zinc-900 hover:bg-red-600/20 text-zinc-400 hover:text-red-600'}`}>▼</button>
          {hasVoted && <span className="text-zinc-400 text-xs">voted</span>}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded border ${statusColors[suggestion.status]}`}>{suggestion.status.toUpperCase()}</span>
            <span className="text-lg">{categoryIcons[suggestion.category] || '💡'}</span>
            <span className="text-zinc-400 text-sm">{suggestion.category}</span>
            {suggestion.status === 'new' && score > 0 && <span className="text-xs text-amber-400">🎯 {Math.round(progressToPromotion)}% to proposal</span>}
          </div>

          {suggestion.status === 'new' && score > 0 && (
            <div className="w-full h-1 bg-zinc-700 rounded-full mb-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500" style={{ width: `${progressToPromotion}%` }} />
            </div>
          )}

          <h3 className="text-xl font-bold text-zinc-100 mb-2">{suggestion.title}</h3>
          <p className={`text-zinc-400 mb-4 ${isExpanded ? '' : 'line-clamp-2'}`}>{suggestion.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-zinc-400">
              by <span className="text-cyan-400 font-mono">{suggestion.author}</span>
              <span className="text-emerald-500 ml-1">(Score: {suggestion.authorScore})</span>
            </span>
            <span className="text-zinc-400">• {suggestion.timestamp}</span>
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-zinc-400 hover:text-cyan-400 transition-all">
              💬 {suggestion.comments.length} comments {isExpanded ? '▲' : '▼'}
            </button>
            <button onClick={() => onShare(suggestion)} className="text-zinc-400 hover:text-cyan-400 transition-all">
              {copiedId === suggestion.id ? '✓ Copied!' : '🔗 Share'}
            </button>
          </div>

          {/* Comments */}
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
                <input type="text" value={newComment} onChange={(e) =>  setNewComment(e.target.value)}
                  placeholder="Add a comment..." maxLength={500}
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-[#A0A0A5] focus:border-cyan-400 focus:outline-none text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
                <button onClick={handleAddComment} disabled={!newComment.trim()}
                  className="px-4 py-2 bg-cyan-400 text-zinc-900 font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm">Post</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
