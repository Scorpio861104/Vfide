'use client';

import { SHORTCUTS, useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Group } from '@/types/groups';
import { Friend } from '@/types/messaging';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Command,
  MessageSquare,
  Search,
  Users,
  X,
  Clock,
  Mic,
  MicOff,
  Hash,
  Wallet,
  Send,
  ArrowRightLeft,
  FileText,
  Settings,
  Star,
  Trash2,
  Zap,
  Trophy,
  Store,
  Vote,
  Shield,
  LayoutDashboard,
  CreditCard,
  PiggyBank,
  Bell,
  ChevronRight,
  Crown,
  Flashlight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

// ==================== TYPES ====================

type SearchCategory = 'all' | 'pages' | 'people' | 'transactions' | 'commands';

interface SearchResult {
  type: 'friend' | 'group' | 'achievement' | 'page' | 'command' | 'transaction' | 'address';
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category: SearchCategory;
  keywords?: string[];
}

interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount: number;
}

// ==================== CONSTANTS ====================

const RECENT_SEARCHES_KEY = 'vfide-recent-searches';
const MAX_RECENT_SEARCHES = 5;

const CATEGORY_ICONS: Record<SearchCategory, React.ReactNode> = {
  all: <Search className="w-4 h-4" />,
  pages: <FileText className="w-4 h-4" />,
  people: <Users className="w-4 h-4" />,
  transactions: <ArrowRightLeft className="w-4 h-4" />,
  commands: <Zap className="w-4 h-4" />,
};

const PAGES = [
  { title: 'Dashboard', path: '/dashboard', keywords: ['home', 'overview', 'dashboard', 'main'], icon: LayoutDashboard },
  { title: 'Vault', path: '/vault', keywords: ['vault', 'safe', 'storage', 'security'], icon: Shield },
  { title: 'Wallet', path: '/crypto', keywords: ['wallet', 'crypto', 'balance', 'funds'], icon: Wallet },
  { title: 'Messages', path: '/social-messaging', keywords: ['messages', 'chat', 'social', 'dm'], icon: MessageSquare },
  { title: 'Feed', path: '/feed', keywords: ['feed', 'activity', 'posts', 'updates'], icon: Bell },
  { title: 'DAO Hub', path: '/dao-hub', keywords: ['dao', 'hub', 'governance', 'disputes'], icon: Crown },
  { title: 'Governance', path: '/governance', keywords: ['governance', 'dao', 'voting', 'proposals'], icon: Vote },
  { title: 'Merchant', path: '/merchant', keywords: ['merchant', 'shop', 'store', 'business', 'pos'], icon: Store },
  { title: 'Payroll', path: '/payroll', keywords: ['payroll', 'salary', 'payments', 'streaming'], icon: CreditCard },
  { title: 'Treasury', path: '/treasury', keywords: ['treasury', 'funds', 'reserve'], icon: PiggyBank },
  { title: 'Flashlight', path: '/flashlight', keywords: ['flashlight', 'p2p', 'credit', 'loan'], icon: Flashlight },
  { title: 'Settings', path: '/settings', keywords: ['settings', 'preferences', 'config', 'options'], icon: Settings },
];

const COMMANDS = [
  { id: 'send', title: 'Send Payment', description: 'Send crypto to an address', keywords: ['send', 'pay', 'transfer'], icon: Send, action: '/pay' },
  { id: 'swap', title: 'Swap Tokens', description: 'Exchange one token for another', keywords: ['swap', 'exchange', 'trade'], icon: ArrowRightLeft, action: '/crypto?tab=swap' },
  { id: 'stake', title: 'Lock VFIDE', description: 'Lock tokens for governance voting power', keywords: ['stake', 'staking', 'lock', 'governance'], icon: PiggyBank, action: '/rewards?tab=stake' },
  { id: 'vote', title: 'Vote on Proposal', description: 'Participate in governance', keywords: ['vote', 'governance', 'proposal'], icon: Vote, action: '/governance' },
  { id: 'claim', title: 'Claim Milestones', description: 'Claim completed milestone allocations', keywords: ['claim', 'rewards', 'milestones'], icon: Trophy, action: '/rewards?tab=claim' },
];

// ==================== HELPERS ====================

function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) return true;
  
  // Fuzzy match (characters in order)
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length;
}

function isEthAddress(str: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(str);
}

function isTransactionHash(str: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(str);
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ==================== COMPONENT ====================

export function GlobalSearch() {
  const { address } = useAccount();
  const router = useRouter();
  const { play: playSound } = useTransactionSounds();
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showTips, setShowTips] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch { /* ignore */ }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string, resultCount: number) => {
    if (!searchQuery.trim()) return;
    
    const newSearch: RecentSearch = {
      query: searchQuery,
      timestamp: Date.now(),
      resultCount,
    };

    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.query.toLowerCase() !== searchQuery.toLowerCase());
      const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch { /* ignore */ }
  }, []);

  // Voice search
  const toggleVoiceSearch = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInterface;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Keyboard shortcut to open search
  useKeyboardShortcuts([
    {
      ...SHORTCUTS.SEARCH,
      handler: () => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      },
    },
    {
      ...SHORTCUTS.CLOSE,
      handler: () => {
        if (isOpen) setIsOpen(false);
      },
    },
  ]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        playSound('click');
        setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        playSound('click');
        setSelectedIndex(prev => (prev - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        playSound('success');
        saveRecentSearch(query, results.length);
        results[selectedIndex].action();
        setIsOpen(false);
        setQuery('');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Cycle through categories
        const categories: SearchCategory[] = ['all', 'pages', 'people', 'transactions', 'commands'];
        const currentIdx = categories.indexOf(activeCategory);
        const nextCategory = categories[(currentIdx + 1) % categories.length];
        if (nextCategory) setActiveCategory(nextCategory);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, query, activeCategory, playSound, saveRecentSearch]);

  // Search function
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const q = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Check for command shortcuts (starts with /)
    if (searchQuery.startsWith('/')) {
      const cmdQuery = searchQuery.slice(1).toLowerCase();
      COMMANDS.forEach(cmd => {
        if (cmd.id.includes(cmdQuery) || cmd.keywords.some(k => k.includes(cmdQuery))) {
          searchResults.push({
            type: 'command',
            id: cmd.id,
            title: cmd.title,
            subtitle: cmd.description,
            icon: <cmd.icon className="w-5 h-5" />,
            action: () => router.push(cmd.action),
            category: 'commands',
          });
        }
      });
    }

    // Check for ETH address
    if (isEthAddress(searchQuery)) {
      searchResults.push({
        type: 'address',
        id: searchQuery,
        title: shortenAddress(searchQuery),
        subtitle: 'View address on explorer',
        icon: <Wallet className="w-5 h-5" />,
        action: () => window.open(`https://basescan.org/address/${searchQuery}`, '_blank'),
        category: 'transactions',
      });
      searchResults.push({
        type: 'command',
        id: `send-${searchQuery}`,
        title: `Send to ${shortenAddress(searchQuery)}`,
        subtitle: 'Quick send payment',
        icon: <Send className="w-5 h-5" />,
        action: () => router.push(`/pay?merchant=${searchQuery}`),
        category: 'commands',
      });
    }

    // Check for transaction hash
    if (isTransactionHash(searchQuery)) {
      searchResults.push({
        type: 'transaction',
        id: searchQuery,
        title: `Transaction ${shortenAddress(searchQuery)}`,
        subtitle: 'View on block explorer',
        icon: <Hash className="w-5 h-5" />,
        action: () => window.open(`https://basescan.org/tx/${searchQuery}`, '_blank'),
        category: 'transactions',
      });
    }

    // Search pages
    if (activeCategory === 'all' || activeCategory === 'pages') {
      PAGES.forEach(page => {
        const matches = 
          fuzzyMatch(page.title, q) ||
          page.keywords.some(k => fuzzyMatch(k, q));
        
        if (matches) {
          searchResults.push({
            type: 'page',
            id: page.path,
            title: page.title,
            icon: <page.icon className="w-5 h-5" />,
            action: () => router.push(page.path),
            category: 'pages',
          });
        }
      });
    }

    // Search commands
    if ((activeCategory === 'all' || activeCategory === 'commands') && !searchQuery.startsWith('/')) {
      COMMANDS.forEach(cmd => {
        const matches = 
          fuzzyMatch(cmd.title, q) ||
          cmd.keywords.some(k => fuzzyMatch(k, q));
        
        if (matches) {
          searchResults.push({
            type: 'command',
            id: cmd.id,
            title: cmd.title,
            subtitle: cmd.description,
            icon: <cmd.icon className="w-5 h-5" />,
            action: () => router.push(cmd.action),
            category: 'commands',
          });
        }
      });
    }

    // Search friends
    if ((activeCategory === 'all' || activeCategory === 'people') && address && typeof window !== 'undefined') {
      try {
        const storedFriends = localStorage.getItem(`vfide_friends_${address}`);
        if (storedFriends) {
          const friends: Friend[] = JSON.parse(storedFriends);
          friends.forEach(friend => {
            const matches = 
              fuzzyMatch(friend.alias || '', q) ||
              friend.address.toLowerCase().includes(q);
            
            if (matches) {
              searchResults.push({
                type: 'friend',
                id: friend.address,
                title: friend.alias || shortenAddress(friend.address),
                subtitle: friend.address,
                icon: <Users className="w-5 h-5" />,
                action: () => router.push(`/social-messaging?friend=${friend.address}`),
                category: 'people',
              });
            }
          });
        }
      } catch (e) {
        console.error('Failed to search friends:', e);
      }
    }

    // Search groups
    if ((activeCategory === 'all' || activeCategory === 'people') && address && typeof window !== 'undefined') {
      try {
        const storedGroups = localStorage.getItem(`vfide_groups_${address}`);
        if (storedGroups) {
          const groups: Group[] = JSON.parse(storedGroups);
          groups.forEach(group => {
            const matches =
              fuzzyMatch(group.name, q) ||
              fuzzyMatch(group.description || '', q);
            
            if (matches) {
              searchResults.push({
                type: 'group',
                id: group.id,
                title: group.name,
                subtitle: `${group.members.length} members`,
                icon: <MessageSquare className="w-5 h-5" />,
                action: () => router.push(`/social-messaging?group=${group.id}`),
                category: 'people',
              });
            }
          });
        }
      } catch (e) {
        console.error('Failed to search groups:', e);
      }
    }

    // Filter by category
    const filtered = activeCategory === 'all' 
      ? searchResults 
      : searchResults.filter(r => r.category === activeCategory);

    setResults(filtered.slice(0, 10));
    setSelectedIndex(0);
  }, [address, router, activeCategory]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setActiveCategory('all');
    setShowTips(false);
  };

  const handleResultClick = (result: SearchResult) => {
    playSound('success');
    saveRecentSearch(query, results.length);
    result.action();
    handleClose();
  };

  return (
    <>
      {/* Trigger Button in Nav */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/30 rounded-xl text-sm text-zinc-500 transition-all group"
      >
        <Search className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
        <span className="group-hover:text-white transition-colors">Search...</span>
        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-zinc-800 rounded border border-zinc-700 group-hover:border-cyan-500/30 transition-colors">
          ⌘K
        </kbd>
      </button>

      {/* Mobile Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-zinc-500" />
      </button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            {/* Search Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                <Search className={`w-5 h-5 ${query ? 'text-cyan-400' : 'text-zinc-500'} transition-colors`} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search pages, people, commands... (try /send)"
                  className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none text-lg"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                )}
                <button
                  onClick={toggleVoiceSearch}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening 
                      ? 'bg-red-500/20 text-red-400 animate-pulse' 
                      : 'hover:bg-zinc-800 text-zinc-500'
                  }`}
                  title="Voice search"
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 overflow-x-auto">
                {(Object.keys(CATEGORY_ICONS) as SearchCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-zinc-900 text-zinc-500 border border-transparent hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]}
                    <span className="capitalize">{cat}</span>
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={() => setShowTips(!showTips)}
                  className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors"
                >
                  {showTips ? 'Hide tips' : 'Show tips'}
                </button>
              </div>

              {/* Tips */}
              <AnimatePresence>
                {showTips && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-cyan-500/5 border-b border-zinc-800"
                  >
                    <div className="p-3 text-xs text-zinc-500 space-y-1">
                      <p><span className="text-cyan-400">/send</span> — Quick send command</p>
                      <p><span className="text-cyan-400">0x...</span> — Search addresses or tx hashes</p>
                      <p><span className="text-cyan-400">Tab</span> — Cycle categories</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {/* Recent Searches (when no query) */}
                {!query && recentSearches.length > 0 && (
                  <div className="py-2">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Recent Searches</span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((search, index) => (
                      <button
                        key={`${search.query}-${search.timestamp}`}
                        onClick={() => setQuery(search.query)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          index === selectedIndex && !query
                            ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                            : 'hover:bg-zinc-900'
                        }`}
                      >
                        <Clock className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-zinc-100">{search.query}</span>
                        <span className="text-xs text-zinc-500">{search.resultCount} results</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* No Query Prompt */}
                {!query && recentSearches.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <Command className="w-8 h-8 text-cyan-400" />
                    </div>
                    <p className="text-sm text-zinc-100 mb-1">Quick Search</p>
                    <p className="text-xs text-zinc-500">
                      Search pages, people, transactions, or use commands like <span className="text-cyan-400">/send</span>
                    </p>
                  </div>
                )}

                {/* No Results */}
                {query && results.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-sm text-zinc-500 mb-2">No results for &quot;{query}&quot;</p>
                    <p className="text-xs text-zinc-500/60">Try a different search or category</p>
                  </div>
                )}

                {/* Results List */}
                {results.length > 0 && (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <motion.button
                        key={result.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleResultClick(result)}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                          index === selectedIndex
                            ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                            : 'hover:bg-zinc-900 border-l-2 border-transparent'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${
                          index === selectedIndex 
                            ? 'bg-cyan-500/20 text-cyan-400' 
                            : 'bg-zinc-900 text-zinc-500'
                        } transition-colors`}>
                          {result.icon}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-zinc-500 truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-medium ${
                            result.type === 'command' ? 'bg-purple-500/20 text-purple-400' :
                            result.type === 'page' ? 'bg-blue-500/20 text-blue-400' :
                            result.type === 'transaction' || result.type === 'address' ? 'bg-green-500/20 text-green-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {result.type}
                          </span>
                          <ChevronRight className={`w-4 h-4 ${
                            index === selectedIndex ? 'text-cyan-400' : 'text-zinc-500'
                          }`} />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 font-mono bg-zinc-800 rounded border border-zinc-700">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 font-mono bg-zinc-800 rounded border border-zinc-700">Tab</kbd>
                    Categories
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 font-mono bg-zinc-800 rounded border border-zinc-700">↵</kbd>
                    Select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-mono bg-zinc-800 rounded border border-zinc-700">Esc</kbd>
                  Close
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// SpeechRecognitionInterface type for this file
interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
