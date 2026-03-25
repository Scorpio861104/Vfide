'use client';

/**
 * Smart Search System
 * 
 * Fuzzy search with suggestions, history, and keyboard navigation.
 * Supports multiple data sources and custom result types.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

export interface SearchResult<T = unknown> {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  icon?: string;
  data: T;
  score: number;
  highlights?: Array<{ field: string; matches: Array<[number, number]> }>;
}

export interface SearchSource<T = unknown> {
  id: string;
  name: string;
  icon?: string;
  search: (query: string) => Promise<SearchResult<T>[]> | SearchResult<T>[];
  priority?: number;
}

export interface SearchOptions {
  minQueryLength?: number;
  maxResults?: number;
  debounceMs?: number;
  enableHistory?: boolean;
  maxHistoryItems?: number;
  fuzzyThreshold?: number;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  selectedIndex: number;
  history: string[];
}

// ==================== FUZZY MATCHING ====================

/**
 * Calculate fuzzy match score between query and text
 * Returns a score between 0 (no match) and 1 (exact match)
 */
export function fuzzyMatch(query: string, text: string): { score: number; matches: Array<[number, number]> } {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (!query) return { score: 1, matches: [] };
  if (!text) return { score: 0, matches: [] };
  
  // Exact match
  if (textLower === queryLower) {
    return { score: 1, matches: [[0, text.length]] };
  }
  
  // Contains exact query
  const containsIndex = textLower.indexOf(queryLower);
  if (containsIndex !== -1) {
    return { 
      score: 0.9 - (containsIndex * 0.01), 
      matches: [[containsIndex, containsIndex + query.length]] 
    };
  }
  
  // Fuzzy match
  let queryIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;
  const matches: Array<[number, number]> = [];
  let matchStart = -1;
  
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      if (matchStart === -1) matchStart = i;
      queryIndex++;
      consecutiveMatches++;
      score += consecutiveMatches * 2; // Reward consecutive matches
      
      // Bonus for matching at word boundaries
      if (i === 0 || /\W/.test(text[i - 1] || '')) {
        score += 5;
      }
    } else {
      if (matchStart !== -1) {
        matches.push([matchStart, i]);
        matchStart = -1;
      }
      consecutiveMatches = 0;
    }
  }
  
  if (matchStart !== -1) {
    matches.push([matchStart, text.length]);
  }
  
  // Not all query characters matched
  if (queryIndex < query.length) {
    return { score: 0, matches: [] };
  }
  
  // Normalize score
  const maxScore = query.length * 10;
  const normalizedScore = Math.min(0.8, score / maxScore);
  
  return { score: normalizedScore, matches };
}

/**
 * Highlight matched portions in text
 */
export function highlightMatches(text: string, matches: Array<[number, number]>): Array<{ text: string; highlight: boolean }> {
  if (matches.length === 0) {
    return [{ text, highlight: false }];
  }
  
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let lastEnd = 0;
  
  for (const [start, end] of matches) {
    if (start > lastEnd) {
      parts.push({ text: text.slice(lastEnd, start), highlight: false });
    }
    parts.push({ text: text.slice(start, end), highlight: true });
    lastEnd = end;
  }
  
  if (lastEnd < text.length) {
    parts.push({ text: text.slice(lastEnd), highlight: false });
  }
  
  return parts;
}

// ==================== HISTORY MANAGEMENT ====================

const HISTORY_KEY = 'vfide_search_history';

function loadHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage errors
  }
}

// ==================== SEARCH HOOK ====================

export function useSmartSearch(sources: SearchSource[], options: SearchOptions = {}) {
  const {
    minQueryLength = 1,
    maxResults = 20,
    debounceMs = 200,
    enableHistory = true,
    maxHistoryItems = 10,
    fuzzyThreshold = 0.3,
  } = options;

  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
    selectedIndex: -1,
    history: [],
  });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Load history on mount
  useEffect(() => {
    if (enableHistory) {
      setState(prev => ({ ...prev, history: loadHistory() }));
    }
  }, [enableHistory]);

  // Perform search across all sources
  const performSearch = useCallback(async (query: string) => {
    if (query.length < minQueryLength) {
      setState(prev => ({ ...prev, results: [], isLoading: false, error: null }));
      return;
    }

    // Cancel previous search
    abortController.current?.abort();
    abortController.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Search all sources in parallel
      const sourceResults = await Promise.all(
        sources.map(async (source) => {
          try {
            const results = await source.search(query);
            return results.map(r => ({
              ...r,
              type: source.id,
              score: r.score * (source.priority || 1),
            }));
          } catch (e) {
            logger.error(`Search source ${source.id} failed:`, e);
            return [];
          }
        })
      );

      // Flatten and sort by score
      const allResults = sourceResults
        .flat()
        .filter(r => r.score >= fuzzyThreshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      setState(prev => ({
        ...prev,
        results: allResults,
        isLoading: false,
        selectedIndex: allResults.length > 0 ? 0 : -1,
      }));
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: e instanceof Error ? e.message : 'Search failed',
      }));
    }
  }, [sources, minQueryLength, maxResults, fuzzyThreshold]);

  // Debounced search
  const search = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  // Add to history
  const addToHistory = useCallback((query: string) => {
    if (!enableHistory || !query.trim()) return;

    setState(prev => {
      const newHistory = [
        query,
        ...prev.history.filter(h => h !== query),
      ].slice(0, maxHistoryItems);
      
      saveHistory(newHistory);
      return { ...prev, history: newHistory };
    });
  }, [enableHistory, maxHistoryItems]);

  // Clear history
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
    saveHistory([]);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { results, selectedIndex } = state;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedIndex: Math.min(results.length - 1, selectedIndex + 1),
        }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedIndex: Math.max(0, selectedIndex - 1),
        }));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && results[selectedIndex]) {
          addToHistory(state.query);
          return results[selectedIndex];
        }
        break;
      case 'Escape':
        setState(prev => ({ ...prev, query: '', results: [], selectedIndex: -1 }));
        break;
    }
    return null;
  }, [state, addToHistory]);

  // Clear search
  const clear = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    abortController.current?.abort();
    setState(prev => ({
      ...prev,
      query: '',
      results: [],
      isLoading: false,
      error: null,
      selectedIndex: -1,
    }));
  }, []);

  // Select a result
  const selectResult = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedIndex: index }));
  }, []);

  return {
    ...state,
    search,
    clear,
    handleKeyDown,
    selectResult,
    addToHistory,
    clearHistory,
  };
}

// ==================== BUILT-IN SEARCH SOURCES ====================

/**
 * Create a search source from a static array
 */
export function createArraySource<T extends { id: string }>(
  id: string,
  name: string,
  items: T[],
  getSearchableText: (item: T) => string,
  transform: (item: T, score: number, matches: Array<[number, number]>) => SearchResult<T>
): SearchSource<T> {
  return {
    id,
    name,
    search: (query) => {
      return items
        .map(item => {
          const text = getSearchableText(item);
          const { score, matches } = fuzzyMatch(query, text);
          return { item, score, matches };
        })
        .filter(({ score }) => score > 0)
        .map(({ item, score, matches }) => transform(item, score, matches));
    },
  };
}

/**
 * Create a search source from an API endpoint
 */
export function createApiSource<T>(
  id: string,
  name: string,
  fetchResults: (query: string) => Promise<T[]>,
  transform: (item: T) => SearchResult<T>
): SearchSource<T> {
  return {
    id,
    name,
    search: async (query) => {
      const results = await fetchResults(query);
      return results.map(transform);
    },
  };
}

// ==================== COMMON SEARCH SOURCES ====================

export interface TokenItem {
  id: string;
  symbol: string;
  name: string;
  address: string;
  chainId: number;
  logoURI?: string;
}

export function createTokenSearchSource(tokens: TokenItem[]): SearchSource<TokenItem> {
  return createArraySource(
    'tokens',
    'Tokens',
    tokens,
    (t) => `${t.symbol} ${t.name}`,
    (token, score, matches) => ({
      id: token.id,
      type: 'token',
      title: token.symbol,
      subtitle: token.name,
      icon: token.logoURI,
      data: token,
      score,
      highlights: [{ field: 'name', matches }],
    })
  );
}

export interface AddressBookEntry {
  id: string;
  address: string;
  label: string;
  tags?: string[];
}

export function createAddressSearchSource(addresses: AddressBookEntry[]): SearchSource<AddressBookEntry> {
  return createArraySource(
    'addresses',
    'Addresses',
    addresses,
    (a) => `${a.label} ${a.address}`,
    (address, score, matches) => ({
      id: address.id,
      type: 'address',
      title: address.label,
      subtitle: `${address.address.slice(0, 6)}...${address.address.slice(-4)}`,
      data: address,
      score,
      highlights: [{ field: 'label', matches }],
    })
  );
}

export default useSmartSearch;
