'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { useAccount } from 'wagmi';
import { 
  MessageCircle, 
  Send, 
  Search, 
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  User,
  Mail,
  HelpCircle,
  Book,
  Zap,
  Shield,
  Wallet,
  RefreshCw,
  MessageSquare,
  LifeBuoy,
  Headphones
} from 'lucide-react';

// Ticket types and categories
type TicketStatus = 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'wallet' | 'transaction' | 'security' | 'account' | 'feature' | 'other';

interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  updatedAt: Date;
  messages: TicketMessage[];
  attachments: string[];
}

interface TicketMessage {
  id: string;
  sender: 'user' | 'support';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

// FAQ data
const FAQ_ITEMS = [
  {
    category: 'Getting Started',
    icon: Zap,
    questions: [
      { q: 'How do I connect my wallet?', a: 'Click the "Connect Wallet" button in the top right corner and select your preferred wallet (MetaMask, WalletConnect, Ledger, etc.). Follow the prompts to authorize the connection.' },
      { q: 'What is a VFIDE Vault?', a: 'Your VFIDE Vault is a smart contract that securely holds your funds. Think of it as a bank account that only you control. It\'s automatically created when you first receive tokens.' },
      { q: 'How do I set up guardians?', a: 'Go to the Guardians page and add trusted addresses. Guardians can help you recover your wallet if you lose access, but they cannot withdraw your funds.' },
    ]
  },
  {
    category: 'Security',
    icon: Shield,
    questions: [
      { q: 'Is VFIDE secure?', a: 'Yes! VFIDE uses post-quantum encryption (ML-KEM-1024 + Dilithium-5), never stores private keys, and all transactions require your explicit approval.' },
      { q: 'What if I lose my wallet?', a: 'Use the Guardian recovery system. Your designated guardians can help you connect a new wallet to your existing vault without accessing your funds.' },
      { q: 'How does ProofScore work?', a: 'ProofScore measures your on-chain reputation (0-100%). Higher scores unlock lower fees and more features. Earn points by using VFIDE, voting, and securing your account.' },
      { q: 'Is VFIDE an exchange or wallet?', a: 'No. VFIDE is a protocol interface, not an exchange or custodial wallet. We don\'t match trades, hold funds, or control private keys. You interact directly with your own smart contract vault. Swaps route to external DEXs like Uniswap.' },
    ]
  },
  {
    category: 'Transactions',
    icon: Wallet,
    questions: [
      { q: 'Why is my transaction pending?', a: 'Transactions require blockchain confirmation. This usually takes 1-5 minutes depending on network congestion. Check the transaction status on the explorer.' },
      { q: 'What are the fees?', a: 'VFIDE charges burn fees (0.25-5% depending on your ProofScore) plus Base network gas fees (usually $0.01-$0.10).' },
      { q: 'Can I cancel a transaction?', a: 'Once submitted to the blockchain, transactions cannot be cancelled. However, escrow and streaming payments can be refunded before completion.' },
    ]
  }
];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  'open': { label: 'Open', color: 'text-blue-400 bg-blue-500/20', icon: MessageCircle },
  'in-progress': { label: 'In Progress', color: 'text-amber-400 bg-amber-500/20', icon: RefreshCw },
  'waiting': { label: 'Waiting on You', color: 'text-purple-400 bg-purple-500/20', icon: Clock },
  'resolved': { label: 'Resolved', color: 'text-jade-400 bg-jade-500/20', icon: CheckCircle2 },
  'closed': { label: 'Closed', color: 'text-zinc-400 bg-zinc-500/20', icon: XCircle }
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  'low': { label: 'Low', color: 'text-zinc-400' },
  'medium': { label: 'Medium', color: 'text-blue-400' },
  'high': { label: 'High', color: 'text-amber-400' },
  'urgent': { label: 'Urgent', color: 'text-red-400' }
};

const CATEGORY_CONFIG: Record<TicketCategory, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  'wallet': { label: 'Wallet Issues', icon: Wallet },
  'transaction': { label: 'Transaction Help', icon: RefreshCw },
  'security': { label: 'Security Concern', icon: Shield },
  'account': { label: 'Account Help', icon: User },
  'feature': { label: 'Feature Request', icon: Zap },
  'other': { label: 'Other', icon: HelpCircle }
};

export default function SupportPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets' | 'new'>('faq');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('wallet');
  const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  // Load tickets from localStorage
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`support_tickets_${address}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTickets(parsed.map((t: Ticket) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          messages: t.messages.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        })));
      }
    }
  }, [address]);

  // Save tickets to localStorage
  const saveTickets = useCallback((newTickets: Ticket[]) => {
    if (address) {
      localStorage.setItem(`support_tickets_${address}`, JSON.stringify(newTickets));
    }
    setTickets(newTickets);
  }, [address]);

  const handleCreateTicket = () => {
    if (!newSubject.trim() || !newMessage.trim()) return;

    const ticket: Ticket = {
      id: `TKT-${Date.now().toString(36).toUpperCase()}`,
      subject: newSubject,
      category: newCategory,
      status: 'open',
      priority: newPriority,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        {
          id: '1',
          sender: 'user',
          content: newMessage,
          timestamp: new Date()
        }
      ],
      attachments: []
    };

    saveTickets([ticket, ...tickets]);
    setNewSubject('');
    setNewMessage('');
    setActiveTab('tickets');
    setSelectedTicket(ticket);

    // Simulate auto-response
    setTimeout(() => {
      const autoResponse: TicketMessage = {
        id: '2',
        sender: 'support',
        content: `Thanks for reaching out! We've received your ${CATEGORY_CONFIG[newCategory].label.toLowerCase()} request and our team will review it shortly. In the meantime, you might find helpful information in our FAQ section.\n\nTicket ID: ${ticket.id}\nPriority: ${PRIORITY_CONFIG[newPriority].label}\n\nWe typically respond within 24 hours.`,
        timestamp: new Date()
      };
      
      const updatedTicket = {
        ...ticket,
        messages: [...ticket.messages, autoResponse],
        status: 'in-progress' as TicketStatus,
        updatedAt: new Date()
      };
      
      const updatedTickets = [updatedTicket, ...tickets];
      saveTickets(updatedTickets);
      setSelectedTicket(updatedTicket);
    }, 1500);
  };

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    const newMsg: TicketMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: replyMessage,
      timestamp: new Date()
    };

    const updatedTicket = {
      ...selectedTicket,
      messages: [...selectedTicket.messages, newMsg],
      status: 'open' as TicketStatus,
      updatedAt: new Date()
    };

    const updatedTickets = tickets.map(t => 
      t.id === selectedTicket.id ? updatedTicket : t
    );
    
    saveTickets(updatedTickets);
    setSelectedTicket(updatedTicket);
    setReplyMessage('');
  };

  const filteredFaq = FAQ_ITEMS.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(c => c.questions.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-jade-500/10 rounded-full text-jade-400 text-sm font-medium mb-4">
            <Headphones size={16} />
            24/7 Support
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Help & Support Center</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Find answers to common questions or open a support ticket. 
            Our team is here to help you with any issues.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.button
            onClick={() => setActiveTab('faq')}
            className={`p-6 rounded-xl border text-left transition-all ${
              activeTab === 'faq' 
                ? 'border-jade-400 bg-jade-500/10' 
                : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500'
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <Book className={activeTab === 'faq' ? 'text-jade-400' : 'text-zinc-400'} size={28} />
            <h3 className="text-lg font-semibold text-white mt-3">FAQ & Guides</h3>
            <p className="text-sm text-zinc-400 mt-1">Browse common questions and tutorials</p>
          </motion.button>

          <motion.button
            onClick={() => setActiveTab('tickets')}
            className={`p-6 rounded-xl border text-left transition-all ${
              activeTab === 'tickets' 
                ? 'border-jade-400 bg-jade-500/10' 
                : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500'
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <MessageSquare className={activeTab === 'tickets' ? 'text-jade-400' : 'text-zinc-400'} size={28} />
            <h3 className="text-lg font-semibold text-white mt-3">My Tickets</h3>
            <p className="text-sm text-zinc-400 mt-1">
              View and manage your support requests
              {tickets.filter(t => t.status !== 'closed').length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-jade-500/20 text-jade-400 rounded-full text-xs">
                  {tickets.filter(t => t.status !== 'closed').length} active
                </span>
              )}
            </p>
          </motion.button>

          <motion.button
            onClick={() => setActiveTab('new')}
            className={`p-6 rounded-xl border text-left transition-all ${
              activeTab === 'new' 
                ? 'border-jade-400 bg-jade-500/10' 
                : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500'
            }`}
            whileHover={{ scale: 1.02 }}
          >
            <Plus className={activeTab === 'new' ? 'text-jade-400' : 'text-zinc-400'} size={28} />
            <h3 className="text-lg font-semibold text-white mt-3">New Ticket</h3>
            <p className="text-sm text-zinc-400 mt-1">Create a new support request</p>
          </motion.button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for answers..."
                  className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500"
                />
              </div>

              {/* FAQ Categories */}
              {filteredFaq.map((category) => (
                <div key={category.category} className="bg-zinc-900/50 border border-zinc-700 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-700 flex items-center gap-3">
                    <category.icon className="text-jade-400" size={20} />
                    <h3 className="font-semibold text-white">{category.category}</h3>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {category.questions.map((item, idx) => {
                      const id = `${category.category}-${idx}`;
                      return (
                        <div key={idx}>
                          <button
                            onClick={() => setExpandedFaq(expandedFaq === id ? null : id)}
                            className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                          >
                            <span className="text-white pr-4">{item.q}</span>
                            <ChevronDown 
                              size={20} 
                              className={`text-zinc-400 transition-transform shrink-0 ${
                                expandedFaq === id ? 'rotate-180' : ''
                              }`} 
                            />
                          </button>
                          <AnimatePresence>
                            {expandedFaq === id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <p className="px-4 pb-4 text-zinc-400 text-sm leading-relaxed">
                                  {item.a}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Still need help? */}
              <div className="p-6 bg-gradient-to-r from-jade-500/10 to-teal-500/10 border border-jade-500/30 rounded-xl text-center">
                <LifeBuoy className="text-jade-400 mx-auto mb-4" size={32} />
                <h3 className="text-lg font-semibold text-white mb-2">Still need help?</h3>
                <p className="text-zinc-400 mb-4">Can&apos;t find what you&apos;re looking for? Our support team is ready to assist.</p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="px-6 py-3 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg"
                >
                  Create Support Ticket
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'tickets' && (
            <motion.div
              key="tickets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Ticket List */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Your Tickets</h3>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="p-2 bg-jade-500/10 rounded-lg text-jade-400 hover:bg-jade-500/20"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {tickets.length === 0 ? (
                  <div className="p-8 bg-zinc-900/50 border border-zinc-700 rounded-xl text-center">
                    <MessageCircle className="text-zinc-600 mx-auto mb-4" size={48} />
                    <p className="text-zinc-400">No tickets yet</p>
                    <button
                      onClick={() => setActiveTab('new')}
                      className="mt-4 px-4 py-2 bg-jade-500/10 text-jade-400 rounded-lg text-sm"
                    >
                      Create your first ticket
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets.map(ticket => {
                      const _StatusIcon = STATUS_CONFIG[ticket.status].icon;
                      return (
                        <button
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className={`w-full p-4 rounded-xl border text-left transition-all ${
                            selectedTicket?.id === ticket.id
                              ? 'border-jade-400 bg-jade-500/10'
                              : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{ticket.subject}</p>
                              <p className="text-xs text-zinc-500 mt-1">{ticket.id}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${STATUS_CONFIG[ticket.status].color}`}>
                              {STATUS_CONFIG[ticket.status].label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                            <Clock size={12} />
                            {ticket.updatedAt.toLocaleDateString()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ticket Detail */}
              <div className="lg:col-span-2">
                {selectedTicket ? (
                  <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl overflow-hidden">
                    {/* Ticket Header */}
                    <div className="p-4 border-b border-zinc-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{selectedTicket.subject}</h3>
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-zinc-500">{selectedTicket.id}</span>
                            <span className={`px-2 py-0.5 rounded ${STATUS_CONFIG[selectedTicket.status].color}`}>
                              {STATUS_CONFIG[selectedTicket.status].label}
                            </span>
                            <span className={PRIORITY_CONFIG[selectedTicket.priority].color}>
                              {PRIORITY_CONFIG[selectedTicket.priority].label} Priority
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(Object.entries(CATEGORY_CONFIG) as [TicketCategory, typeof CATEGORY_CONFIG[TicketCategory]][]).find(
                            ([key]) => key === selectedTicket.category
                          )?.[1] && (
                            <span className="px-3 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center gap-1">
                              {(() => {
                                const CategoryIcon = CATEGORY_CONFIG[selectedTicket.category].icon;
                                return <CategoryIcon size={12} />;
                              })()}
                              {CATEGORY_CONFIG[selectedTicket.category].label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                      {selectedTicket.messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] p-4 rounded-xl ${
                            msg.sender === 'user'
                              ? 'bg-jade-500/20 text-jade-100'
                              : 'bg-zinc-800 text-zinc-100'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {msg.sender === 'support' && (
                                <span className="px-2 py-0.5 bg-jade-500/20 text-jade-400 rounded text-xs">
                                  VFIDE Support
                                </span>
                              )}
                              <span className="text-xs text-zinc-500">
                                {msg.timestamp.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply Box */}
                    {selectedTicket.status !== 'closed' && (
                      <div className="p-4 border-t border-zinc-700">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your reply..."
                            className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                          />
                          <button
                            onClick={handleSendReply}
                            disabled={!replyMessage.trim()}
                            className="px-4 py-3 bg-jade-500 text-black rounded-lg disabled:opacity-50"
                          >
                            <Send size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-zinc-900/50 border border-zinc-700 rounded-xl p-8">
                    <div className="text-center">
                      <MessageCircle className="text-zinc-600 mx-auto mb-4" size={48} />
                      <p className="text-zinc-400">Select a ticket to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'new' && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Plus className="text-jade-400" size={24} />
                  <h3 className="text-xl font-semibold text-white">Create Support Ticket</h3>
                </div>

                {!isConnected && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-amber-400 shrink-0" size={20} />
                      <p className="text-sm text-amber-200">
                        Connect your wallet to create support tickets and track their status.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Subject</label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-jade-500"
                      >
                        {(Object.entries(CATEGORY_CONFIG) as [TicketCategory, typeof CATEGORY_CONFIG[TicketCategory]][]).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Priority</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-jade-500"
                      >
                        {(Object.entries(PRIORITY_CONFIG) as [TicketPriority, typeof PRIORITY_CONFIG[TicketPriority]][]).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Describe your issue in detail. Include any relevant transaction IDs, error messages, or steps to reproduce the problem."
                      rows={6}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-jade-500 resize-none"
                    />
                  </div>

                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <p className="text-sm text-zinc-400">
                      <strong className="text-zinc-300">Connected Wallet:</strong>{' '}
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCreateTicket}
                  disabled={!newSubject.trim() || !newMessage.trim()}
                  className="w-full py-4 bg-gradient-to-r from-jade-500 to-teal-500 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  Submit Ticket
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contact Options */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="mailto:support@vfide.io"
            className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl flex items-center gap-4 hover:border-zinc-500 transition-colors"
          >
            <div className="p-3 bg-jade-500/10 rounded-lg">
              <Mail className="text-jade-400" size={20} />
            </div>
            <div>
              <p className="font-medium text-white">Email Support</p>
              <p className="text-sm text-zinc-400">support@vfide.io</p>
            </div>
          </a>

          <a
            href="https://discord.gg/vfide"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl flex items-center gap-4 hover:border-zinc-500 transition-colors"
          >
            <div className="p-3 bg-indigo-500/10 rounded-lg">
              <MessageSquare className="text-indigo-400" size={20} />
            </div>
            <div>
              <p className="font-medium text-white">Discord Community</p>
              <p className="text-sm text-zinc-400">Get help from the community</p>
            </div>
          </a>

          <a
            href="https://docs.vfide.io"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl flex items-center gap-4 hover:border-zinc-500 transition-colors"
          >
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <Book className="text-amber-400" size={20} />
            </div>
            <div>
              <p className="font-medium text-white">Documentation</p>
              <p className="text-sm text-zinc-400">Detailed guides and tutorials</p>
            </div>
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
