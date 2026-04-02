export const PROMOTION_THRESHOLD = 50

export const categoryIcons: Record<string, string> = {
  feature: '🚀',
  economics: '💰',
  security: '🛡️',
  governance: '⚖️',
  other: '💡',
}

export const statusColors: Record<string, string> = {
  new: 'border-cyan-400 text-cyan-400',
  reviewing: 'border-amber-400 text-amber-400',
  approved: 'border-emerald-500 text-emerald-500',
  rejected: 'border-red-600 text-red-600',
  implemented: 'border-emerald-500 text-emerald-500',
}

export type SuggestionStatus = 'new' | 'reviewing' | 'approved' | 'rejected' | 'implemented'

export type SuggestionComment = {
  id: number
  author: string
  authorScore: number
  content: string
  timestamp: string
  likes: number
}

export type Suggestion = {
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
