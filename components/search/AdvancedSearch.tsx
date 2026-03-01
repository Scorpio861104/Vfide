/**
 * AdvancedSearch Component
 * 
 * Comprehensive search interface with advanced filtering, search history,
 * saved searches, and autocomplete capabilities.
 * 
 * Features:
 * - Multiple filter types (content type, date range, category, user, status)
 * - Search history with timestamps
 * - Saved searches with labels
 * - Autocomplete suggestions
 * - Full-text search
 * - Result highlighting
 * - Export results
 * - Search analytics
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { safeParseInt } from '@/lib/validation';

// ============================================================================
// Type Definitions
// ============================================================================

interface SearchFilter {
  contentType: ContentType[];
  dateRange: DateRange;
  category: string[];
  users: string[];
  status: SearchStatus[];
  minScore?: number;
  hasAttachments?: boolean;
  tags?: string[];
}

interface SearchHistoryItem {
  id: string;
  query: string;
  filters: SearchFilter;
  timestamp: Date;
  resultsCount: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

interface SearchResult {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  createdAt: Date;
  score: number;
  category: string;
  status: SearchStatus;
  highlights?: string[];
  tags?: string[];
  attachments?: number;
}

interface AutocompleteResult {
  query: string;
  type: 'history' | 'suggestion' | 'saved';
  resultsCount?: number;
  timestamp?: Date;
}

type ContentType = 'proposal' | 'user' | 'transaction' | 'activity' | 'post' | 'comment' | 'all';
type SearchStatus = 'active' | 'completed' | 'pending' | 'archived' | 'all';
type DateRange = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type SortBy = 'relevance' | 'date' | 'score' | 'popular';

// ============================================================================
// Mock Data Generators
// ============================================================================

const generateMockSearchResult = (id: string, type: ContentType): SearchResult => {
  const titles: Record<ContentType, string[]> = {
    proposal: ['Increase Staking Rewards', 'Update Governance Rules', 'Community Fund Allocation'],
    user: ['Alice Developer', 'Bob Merchant', 'Carol Validator'],
    transaction: ['Payment to Merchant #123', 'Staking Reward Claimed', 'Token Transfer'],
    activity: ['Voted on Proposal #42', 'Joined Council Election', 'Earned Achievement Badge'],
    post: ['Introducing New Feature', 'Community Update', 'Technical Discussion'],
    comment: ['Great proposal!', 'I agree with this approach', 'Some concerns about implementation'],
    all: ['Mixed Content Item']
  };

  const categories = ['Governance', 'Finance', 'Technical', 'Community', 'General'];
  const statuses: SearchStatus[] = ['active', 'completed', 'pending', 'archived'];

  return {
    id,
    type,
    title: (titles[type] ?? titles.all)[Math.floor(Math.random() * (titles[type] ?? titles.all).length)] ?? 'Mixed Content Item',
    description: `This is a detailed description of the ${type} item. It contains relevant information that matches your search query with highlighted terms.`,
    author: {
      id: `user${id}`,
      username: `user${id}`,
      displayName: `User ${id}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${id}`
    },
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    score: Math.floor(Math.random() * 100),
    category: categories[Math.floor(Math.random() * categories.length)] ?? 'General',
    status: statuses[Math.floor(Math.random() * statuses.length)] ?? 'active',
    highlights: ['search term', 'matched phrase', 'relevant keyword'],
    tags: ['tag1', 'tag2', 'tag3'].slice(0, Math.floor(Math.random() * 3) + 1),
    attachments: Math.random() > 0.5 ? Math.floor(Math.random() * 5) : 0
  };
};

const mockSearchHistory = (): SearchHistoryItem[] => [
  {
    id: 'h1',
    query: 'governance proposal',
    filters: {
      contentType: ['proposal'],
      dateRange: 'month',
      category: ['Governance'],
      users: [],
      status: ['active']
    },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    resultsCount: 15
  },
  {
    id: 'h2',
    query: 'governance vote',
    filters: {
      contentType: ['transaction', 'proposal'],
      dateRange: 'week',
      category: ['Finance'],
      users: [],
      status: ['all']
    },
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    resultsCount: 42
  },
  {
    id: 'h3',
    query: 'community fund',
    filters: {
      contentType: ['all'],
      dateRange: 'all',
      category: [],
      users: [],
      status: ['active']
    },
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    resultsCount: 28
  }
];

const mockSavedSearches = (): SavedSearch[] => [
  {
    id: 's1',
    name: 'Active Proposals',
    query: 'proposal',
    filters: {
      contentType: ['proposal'],
      dateRange: 'all',
      category: ['Governance'],
      users: [],
      status: ['active']
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 12 * 60 * 60 * 1000),
    useCount: 12
  },
  {
    id: 's2',
    name: 'My Transactions',
    query: 'transaction',
    filters: {
      contentType: ['transaction'],
      dateRange: 'month',
      category: [],
      users: ['currentUser'],
      status: ['all']
    },
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
    useCount: 34
  },
  {
    id: 's3',
    name: 'High Score Posts',
    query: '',
    filters: {
      contentType: ['post'],
      dateRange: 'month',
      category: [],
      users: [],
      status: ['all'],
      minScore: 80
    },
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    useCount: 8
  }
];

const mockSearchResults = (): SearchResult[] => {
  return [
    generateMockSearchResult('r1', 'proposal'),
    generateMockSearchResult('r2', 'user'),
    generateMockSearchResult('r3', 'transaction'),
    generateMockSearchResult('r4', 'activity'),
    generateMockSearchResult('r5', 'post'),
    generateMockSearchResult('r6', 'proposal'),
    generateMockSearchResult('r7', 'comment'),
    generateMockSearchResult('r8', 'user')
  ];
};

// ============================================================================
// Helper Functions
// ============================================================================

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getContentTypeIcon = (type: ContentType): string => {
  const icons: Record<ContentType, string> = {
    proposal: '🗳️',
    user: '👤',
    transaction: '💰',
    activity: '📊',
    post: '📝',
    comment: '💬',
    all: '🔍'
  };
  return icons[type];
};

const getContentTypeLabel = (type: ContentType): string => {
  const labels: Record<ContentType, string> = {
    proposal: 'Proposal',
    user: 'User',
    transaction: 'Transaction',
    activity: 'Activity',
    post: 'Post',
    comment: 'Comment',
    all: 'All Content'
  };
  return labels[type];
};

const getStatusBadgeColor = (status: SearchStatus): string => {
  const colors: Record<SearchStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    all: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  };
  return colors[status];
};

const _highlightText = (text: string, highlights: string[]): string => {
  let result = text;
  highlights.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  });
  return result;
};

// ============================================================================
// Sub-Components
// ============================================================================

interface SearchResultCardProps {
  result: SearchResult;
  onSelect: (id: string) => void;
}

function SearchResultCard({ result, onSelect }: SearchResultCardProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(result.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getContentTypeIcon(result.type)}</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {getContentTypeLabel(result.type)}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(result.status)}`}>
            {result.status}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {result.score}%
          </span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {result.title}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
        {result.description}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <img
              src={result.author.avatar}
              alt={result.author.displayName}
              className="w-5 h-5 rounded-full"
            />
            <span>{result.author.displayName}</span>
          </div>
          <span>•</span>
          <span>{formatDate(result.createdAt)}</span>
          <span>•</span>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            {result.category}
          </span>
        </div>
        {result.attachments && result.attachments > 0 && (
          <div className="flex items-center space-x-1">
            <span>📎</span>
            <span>{result.attachments}</span>
          </div>
        )}
      </div>

      {result.tags && result.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {result.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

interface HistoryItemProps {
  item: SearchHistoryItem;
  onReuse: (item: SearchHistoryItem) => void;
  onDelete: (id: string) => void;
}

function HistoryItem({ item, onReuse, onDelete }: HistoryItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex-1 cursor-pointer" onClick={() => onReuse(item)}>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            &quot;{item.query}&quot;
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            • {item.resultsCount} results
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatTimestamp(item.timestamp)}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        aria-label="Delete history item"
      >
        ✕
      </button>
    </div>
  );
};

interface SavedSearchItemProps {
  search: SavedSearch;
  onUse: (search: SavedSearch) => void;
  onDelete: (id: string) => void;
}

function SavedSearchItem({ search, onUse, onDelete }: SavedSearchItemProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {search.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {search.query || 'Custom filters'}
          </p>
        </div>
        <button
          onClick={() => onDelete(search.id)}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          aria-label="Delete saved search"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span>Used {search.useCount} times</span>
        {search.lastUsed && <span>{formatTimestamp(search.lastUsed)}</span>}
      </div>

      <button
        onClick={() => onUse(search)}
        className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
        Use Search
      </button>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface AdvancedSearchProps {
  className?: string;
  onResultSelect?: (resultId: string) => void;
}

export default function AdvancedSearch({
  className = '',
  onResultSelect
}: AdvancedSearchProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter>({
    contentType: ['all'],
    dateRange: 'all',
    category: [],
    users: [],
    status: ['all']
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(mockSearchHistory());
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(mockSavedSearches());
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Handlers
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim() && filters.contentType[0] === 'all') return;

    setIsSearching(true);
    setShowHistory(false);
    setShowSaved(false);
    setShowAutocomplete(false);

    // Simulate API call
    setTimeout(() => {
      const results = mockSearchResults();
      setSearchResults(results);
      setIsSearching(false);

      // Add to history
      const historyItem: SearchHistoryItem = {
        id: `h${Date.now()}`,
        query: searchQuery,
        filters: { ...filters },
        timestamp: new Date(),
        resultsCount: results.length
      };
      setSearchHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    }, 800);
  }, [searchQuery, filters]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setFilters({
      contentType: ['all'],
      dateRange: 'all',
      category: [],
      users: [],
      status: ['all']
    });
  }, []);

  const handleFilterChange = useCallback((key: keyof SearchFilter, value: SearchFilter[keyof SearchFilter]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleHistoryItemReuse = useCallback((item: SearchHistoryItem) => {
    setSearchQuery(item.query);
    setFilters(item.filters);
    setShowHistory(false);
    handleSearch();
  }, [handleSearch]);

  const handleDeleteHistory = useCallback((id: string) => {
    setSearchHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleSaveSearch = useCallback(() => {
    const name = prompt('Enter a name for this search:');
    if (!name) return;

    const newSaved: SavedSearch = {
      id: `s${Date.now()}`,
      name,
      query: searchQuery,
      filters: { ...filters },
      createdAt: new Date(),
      useCount: 0
    };
    setSavedSearches(prev => [newSaved, ...prev]);
  }, [searchQuery, filters]);

  const handleUseSavedSearch = useCallback((search: SavedSearch) => {
    setSearchQuery(search.query);
    setFilters(search.filters);
    setShowSaved(false);

    // Update use count and last used
    setSavedSearches(prev =>
      prev.map(s =>
        s.id === search.id
          ? { ...s, useCount: s.useCount + 1, lastUsed: new Date() }
          : s
      )
    );

    handleSearch();
  }, [handleSearch]);

  const handleDeleteSaved = useCallback((id: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleResultSelect = useCallback((id: string) => {
    onResultSelect?.(id);
  }, [onResultSelect]);

  const handleExportResults = useCallback(() => {
    const dataStr = JSON.stringify(searchResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [searchResults]);

  // Autocomplete
  useEffect(() => {
    if (searchQuery.length > 0) {
      const suggestions: AutocompleteResult[] = [
        ...searchHistory.slice(0, 3).map(h => ({
          query: h.query,
          type: 'history' as const,
          resultsCount: h.resultsCount,
          timestamp: h.timestamp
        })),
        { query: `${searchQuery} governance`, type: 'suggestion' as const },
        { query: `${searchQuery} proposal`, type: 'suggestion' as const }
      ];
      setAutocompleteResults(suggestions);
      setShowAutocomplete(true);
    } else {
      setShowAutocomplete(false);
    }
  }, [searchQuery, searchHistory]);

  // Filtered and sorted results
  const displayResults = useMemo(() => {
    let results = [...searchResults];

    // Apply filters
    if (filters.contentType[0] !== 'all') {
      results = results.filter(r => filters.contentType.includes(r.type));
    }

    if (filters.status[0] !== 'all') {
      results = results.filter(r => filters.status.includes(r.status));
    }

    if (filters.minScore) {
      results = results.filter(r => r.score >= filters.minScore!);
    }

    if (filters.category.length > 0) {
      results = results.filter(r => filters.category.includes(r.category));
    }

    // Apply sorting
    switch (sortBy) {
      case 'date':
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'score':
        results.sort((a, b) => b.score - a.score);
        break;
      case 'popular':
        results.sort((a, b) => (b.attachments || 0) - (a.attachments || 0));
        break;
      case 'relevance':
      default:
        // Already sorted by relevance from API
        break;
    }

    return results;
  }, [searchResults, filters, sortBy]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🔍 Advanced Search
            </h1>

            {/* Search Input */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search proposals, users, transactions, and more..."
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Search
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto z-20">
                  {autocompleteResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                      onClick={() => {
                        setSearchQuery(result.query);
                        setShowAutocomplete(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {result.type === 'history' ? '🕐' : '💡'}
                          </span>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {result.query}
                          </span>
                        </div>
                        {result.resultsCount && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {result.resultsCount} results
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
              >
                {showFilters ? '🔼' : '🔽'} Filters
              </button>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  setShowSaved(false);
                }}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
              >
                🕐 History ({searchHistory.length})
              </button>
              <button
                onClick={() => {
                  setShowSaved(!showSaved);
                  setShowHistory(false);
                }}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
              >
                ⭐ Saved ({savedSearches.length})
              </button>
              {searchResults.length > 0 && (
                <>
                  <button
                    onClick={handleSaveSearch}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
                  >
                    💾 Save Search
                  </button>
                  <button
                    onClick={handleExportResults}
                    className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
                  >
                    📤 Export
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Content Type */}
                <div>
                  <label htmlFor="content-type-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Type
                  </label>
                  <select
                    id="content-type-filter"
                    value={filters.contentType[0]}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('contentType', [e.target.value as ContentType])}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    aria-label="Content Type"
                  >
                    <option value="all">All Content</option>
                    <option value="proposal">Proposals</option>
                    <option value="user">Users</option>
                    <option value="transaction">Transactions</option>
                    <option value="activity">Activities</option>
                    <option value="post">Posts</option>
                    <option value="comment">Comments</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label htmlFor="date-range-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Range
                  </label>
                  <select
                    id="date-range-filter"
                    value={filters.dateRange}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('dateRange', e.target.value as DateRange)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    aria-label="Date Range"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                    <option value="year">Past Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={filters.status[0]}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('status', [e.target.value as SearchStatus])}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    aria-label="Status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Min Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Score: {filters.minScore || 0}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={filters.minScore || 0}
                    onChange={(e) => handleFilterChange('minScore', safeParseInt(e.target.value, 0, { min: 0, max: 100 }))}
                    className="w-full"
                  />
                </div>

                {/* Has Attachments */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasAttachments"
                    checked={filters.hasAttachments || false}
                    onChange={(e) => handleFilterChange('hasAttachments', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="hasAttachments"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Has Attachments
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4">
          {/* Search History */}
          {showHistory && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Search History
              </h2>
              {searchHistory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No search history yet
                </p>
              ) : (
                <div className="space-y-2">
                  {searchHistory.map(item => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      onReuse={handleHistoryItemReuse}
                      onDelete={handleDeleteHistory}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Saved Searches */}
          {showSaved && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Saved Searches
              </h2>
              {savedSearches.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No saved searches yet
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedSearches.map(search => (
                    <SavedSearchItem
                      key={search.id}
                      search={search}
                      onUse={handleUseSavedSearch}
                      onDelete={handleDeleteSaved}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {!showHistory && !showSaved && (
            <>
              {isSearching ? (
                <div className="text-center py-12">
                  <div className="animate-spin text-4xl mb-4">🔍</div>
                  <p className="text-gray-500 dark:text-gray-400">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {displayResults.length} {displayResults.length === 1 ? 'Result' : 'Results'}
                    </h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortBy)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="date">Date</option>
                        <option value="score">Score</option>
                        <option value="popular">Popular</option>
                      </select>
                    </div>
                  </div>

                  {/* Results Grid */}
                  <div className="space-y-4">
                    {displayResults.map(result => (
                      <SearchResultCard
                        key={result.id}
                        result={result}
                        onSelect={handleResultSelect}
                      />
                    ))}
                  </div>
                </>
              ) : searchQuery || filters.contentType[0] !== 'all' ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No results found. Try adjusting your filters.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Enter a search query to get started
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => setShowHistory(true)}
                      className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View History
                    </button>
                    <button
                      onClick={() => setShowSaved(true)}
                      className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Saved Searches
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
