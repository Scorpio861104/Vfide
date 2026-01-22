'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Command, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  CornerDownLeft,
  Loader2,
  Hash,
  User,
  Settings,
  Wallet,
  Send,
  ArrowRightLeft,
  Store,
  Vote,
  Trophy,
  Shield,
  Bell,
  Home,
  LayoutDashboard,
  CreditCard,
  PiggyBank,
  MessageSquare,
  Users,
  X,
  Clock,
  Star,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

// ==================== TYPES ====================

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action' | 'recent' | 'search';
  keywords: string[];
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

interface CommandPaletteProps {
  customCommands?: CommandItem[];
  onSearch?: (query: string) => Promise<CommandItem[]>;
}

// ==================== COMMANDS ====================

function useCommands(address?: string) {
  const router = useRouter();

  return useMemo<CommandItem[]>(() => {
    const navigate = (path: string) => () => router.push(path);

    return [
      // Navigation
      { id: 'home', title: 'Home', description: 'Go to homepage', icon: <Home className="w-4 h-4" />, category: 'navigation', keywords: ['home', 'main', 'landing'], shortcut: 'G H', action: navigate('/') },
      { id: 'dashboard', title: 'Dashboard', description: 'View your dashboard', icon: <LayoutDashboard className="w-4 h-4" />, category: 'navigation', keywords: ['dashboard', 'overview', 'stats'], shortcut: 'G D', action: navigate('/dashboard') },
      { id: 'vault', title: 'Vault', description: 'Manage your vault', icon: <PiggyBank className="w-4 h-4" />, category: 'navigation', keywords: ['vault', 'savings', 'deposit', 'withdraw'], shortcut: 'G V', action: navigate('/vault') },
      { id: 'pay', title: 'Send Payment', description: 'Send tokens to someone', icon: <Send className="w-4 h-4" />, category: 'navigation', keywords: ['send', 'pay', 'transfer', 'payment'], shortcut: 'G P', action: navigate('/pay') },
      { id: 'transactions', title: 'Transaction History', description: 'View all transactions', icon: <ArrowRightLeft className="w-4 h-4" />, category: 'navigation', keywords: ['transactions', 'history', 'activity'], shortcut: 'G T', action: navigate('/transactions') },
      { id: 'merchant', title: 'Merchant Portal', description: 'Manage your store', icon: <Store className="w-4 h-4" />, category: 'navigation', keywords: ['merchant', 'store', 'business', 'shop'], shortcut: 'G M', action: navigate('/merchant') },
      { id: 'governance', title: 'Governance', description: 'DAO proposals and voting', icon: <Vote className="w-4 h-4" />, category: 'navigation', keywords: ['governance', 'dao', 'vote', 'proposal'], shortcut: 'G G', action: navigate('/governance') },
      { id: 'gamification', title: 'Achievements', description: 'View your achievements', icon: <Trophy className="w-4 h-4" />, category: 'navigation', keywords: ['achievements', 'badges', 'gamification', 'rewards'], action: navigate('/gamification') },
      { id: 'guardians', title: 'Guardians', description: 'Manage recovery guardians', icon: <Shield className="w-4 h-4" />, category: 'navigation', keywords: ['guardians', 'recovery', 'security'], action: navigate('/guardians') },
      { id: 'social', title: 'Social Hub', description: 'Messages and connections', icon: <Users className="w-4 h-4" />, category: 'navigation', keywords: ['social', 'messages', 'friends', 'chat'], action: navigate('/social') },
      { id: 'notifications', title: 'Notifications', description: 'View notifications', icon: <Bell className="w-4 h-4" />, category: 'navigation', keywords: ['notifications', 'alerts', 'updates'], action: navigate('/notifications') },
      { id: 'settings', title: 'Settings', description: 'App settings', icon: <Settings className="w-4 h-4" />, category: 'navigation', keywords: ['settings', 'preferences', 'config'], shortcut: 'G S', action: navigate('/settings') },
      { id: 'profile', title: 'Profile', description: 'Your profile', icon: <User className="w-4 h-4" />, category: 'navigation', keywords: ['profile', 'account', 'me'], action: navigate('/profile') },

      // Actions
      { id: 'connect-wallet', title: 'Connect Wallet', description: 'Connect your wallet', icon: <Wallet className="w-4 h-4" />, category: 'action', keywords: ['connect', 'wallet', 'login'], action: () => document.querySelector<HTMLButtonElement>('[data-wallet-connect]')?.click(), disabled: !!address },
      { id: 'new-payment', title: 'New Payment', description: 'Create a new payment', icon: <CreditCard className="w-4 h-4" />, category: 'action', keywords: ['new', 'payment', 'create'], action: navigate('/pay/new') },
      { id: 'new-message', title: 'New Message', description: 'Start a conversation', icon: <MessageSquare className="w-4 h-4" />, category: 'action', keywords: ['new', 'message', 'chat', 'dm'], shortcut: '⌘ N', action: navigate('/social?compose=true') },
    ];
  }, [router, address]);
}

// ==================== HOOK ====================

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { isOpen, setIsOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), toggle: () => setIsOpen((prev) => !prev) };
}

// ==================== COMPONENT ====================

export function CommandPalette({ customCommands = [], onSearch }: CommandPaletteProps) {
  const { isOpen, setIsOpen: _setIsOpen, close } = useCommandPalette();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CommandItem[]>([]);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  
  const { address } = useAccount();
  const { playClick } = useTransactionSounds();
  const commands = useCommands(address);

  // Load recent commands from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vfide_recent_commands');
    if (saved) {
      try {
        setRecentCommands(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save recent command
  const saveRecentCommand = useCallback((commandId: string) => {
    setRecentCommands((prev) => {
      const updated = [commandId, ...prev.filter((id) => id !== commandId)].slice(0, 5);
      localStorage.setItem('vfide_recent_commands', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    const allCommands = [...commands, ...customCommands];
    
    if (!query.trim()) {
      // Show recent commands first, then all
      const recentItems = recentCommands
        .map((id) => allCommands.find((cmd) => cmd.id === id))
        .filter((cmd): cmd is CommandItem => !!cmd)
        .map((cmd) => ({ ...cmd, category: 'recent' as const }));
      
      return [...recentItems, ...allCommands.filter((cmd) => !recentCommands.includes(cmd.id))];
    }

    const q = query.toLowerCase();
    return allCommands
      .filter((cmd) => 
        cmd.title.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        // Prioritize title matches
        const aTitle = a.title.toLowerCase().startsWith(q);
        const bTitle = b.title.toLowerCase().startsWith(q);
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        return 0;
      });
  }, [commands, customCommands, query, recentCommands]);

  // Combined results (filtered + search)
  const displayedCommands = useMemo(() => {
    return [...filteredCommands, ...searchResults];
  }, [filteredCommands, searchResults]);

  // Handle search
  useEffect(() => {
    if (!onSearch || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await onSearch(query);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [query, onSearch]);

  // Reset when opened/closed
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSearchResults([]);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < displayedCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : displayedCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (displayedCommands[selectedIndex]) {
          executeCommand(displayedCommands[selectedIndex]);
        }
        break;
    }
  }, [displayedCommands, selectedIndex]);

  const executeCommand = useCallback((cmd: CommandItem) => {
    if (cmd.disabled) return;
    
    playClick();
    saveRecentCommand(cmd.id);
    cmd.action();
    close();
  }, [close, playClick, saveRecentCommand]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    displayedCommands.forEach((cmd, index) => {
      const category = cmd.category;
      if (!groups[category]) groups[category] = [];
      groups[category].push({ ...cmd, id: `${cmd.id}-${index}` });
    });
    return groups;
  }, [displayedCommands]);

  const categoryLabels: Record<string, string> = {
    recent: 'Recent',
    navigation: 'Navigation',
    action: 'Actions',
    search: 'Search Results',
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    recent: <Clock className="w-3 h-3" />,
    navigation: <Hash className="w-3 h-3" />,
    action: <Zap className="w-3 h-3" />,
    search: <Search className="w-3 h-3" />,
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                {isSearching ? (
                  <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-zinc-400" />
                )}
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none text-base"
                  autoFocus
                />
                <button
                  onClick={close}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>

              {/* Command List */}
              <div className="max-h-100 overflow-y-auto p-2">
                {displayedCommands.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">
                    No commands found for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  Object.entries(groupedCommands).map(([category, items]) => (
                    <div key={category} className="mb-2">
                      <div className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 font-medium uppercase">
                        {categoryIcons[category]}
                        {categoryLabels[category] || category}
                      </div>
                      {items.map((cmd, idx) => {
                        const idParts = cmd.id.split('-');
                        const globalIndex = displayedCommands.findIndex((c) => c.id === idParts[0]) + (cmd.id.includes('-') ? parseInt(idParts[1] ?? '0', 10) : idx);
                        const isSelected = selectedIndex === globalIndex || displayedCommands.indexOf(cmd as CommandItem) === selectedIndex;
                        
                        return (
                          <motion.button
                            key={cmd.id}
                            onClick={() => executeCommand(cmd)}
                            disabled={cmd.disabled}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                              ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'text-zinc-300 hover:bg-zinc-800'}
                              ${cmd.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                            onMouseEnter={() => {
                              const idx = displayedCommands.findIndex((c) => c.id === cmd.id.split('-')[0]);
                              if (idx !== -1) setSelectedIndex(idx);
                            }}
                          >
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/20' : 'bg-zinc-800'}`}>
                              {cmd.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{cmd.title}</span>
                                {category === 'recent' && <Star className="w-3 h-3 text-yellow-500" />}
                              </div>
                              {cmd.description && (
                                <p className="text-xs text-zinc-500 truncate">{cmd.description}</p>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <kbd className="hidden sm:block px-2 py-1 text-xs font-mono bg-zinc-800 text-zinc-400 rounded border border-zinc-700">
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    <ArrowDown className="w-3 h-3" />
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" />
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">esc</kbd>
                    close
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Command className="w-3 h-3" />
                  <span className="font-medium text-cyan-400">VFIDE</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;
