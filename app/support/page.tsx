'use client';

import { Footer } from '@/components/layout/Footer';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';

type TabId = 'faq' | 'tickets' | 'new';
type LocaleId = 'en-US' | 'es-ES';

type SupportMessage = {
  id: string;
  sender: 'user' | 'support';
  content: string;
  timestamp: string;
};

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: 'open' | 'resolved';
  priority: 'medium';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  attachments: string[];
};

const TAB_IDS: TabId[] = ['faq', 'tickets', 'new'];

const COPY = {
  'en-US': {
    heading: 'Help & Support Center',
    subtitle: 'Find answers, manage tickets, and get direct support from the VFIDE team.',
    tabs: { faq: 'FAQ', tickets: 'My Tickets', new: 'New Ticket' },
  },
  'es-ES': {
    heading: 'Centro de ayuda y soporte',
    subtitle: 'Encuentra respuestas, administra tickets y recibe ayuda directa del equipo VFIDE.',
    tabs: { faq: 'FAQ', tickets: 'Mis tickets', new: 'Nuevo ticket' },
  },
} as const;

const FAQ_ITEMS = [
  {
    question: 'How do I connect my wallet?',
    answer: 'Open the wallet menu, select your preferred wallet, and approve the VFIDE connection request.',
  },
  {
    question: 'How does ProofScore work?',
    answer: 'ProofScore rewards trustworthy activity, participation, and successful platform usage over time.',
  },
  {
    question: 'How do I set up guardians?',
    answer: 'Navigate to the guardians page, choose trusted contacts, and confirm the recovery configuration.',
  },
];

export default function SupportPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('faq');
  const [locale, setLocale] = useState<LocaleId>('en-US');
  const [search, setSearch] = useState('');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    try {
      const storedLocale = window.localStorage.getItem('vfide_locale');
      if (storedLocale === 'es-ES' || storedLocale === 'en-US') {
        setLocale(storedLocale);
      }
    } catch {
      // ignore storage access failures
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    try {
      const stored = window.localStorage.getItem(`support_tickets_${address}`);
      if (stored) {
        const parsed = JSON.parse(stored) as SupportTicket[];
        setTickets(parsed);
        setSelectedTicketId(parsed[0]?.id ?? null);
      }
    } catch {
      // ignore storage access failures
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    try {
      window.localStorage.setItem(`support_tickets_${address}`, JSON.stringify(tickets));
    } catch {
      // ignore storage access failures
    }
  }, [address, tickets]);

  const filteredFaq = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return FAQ_ITEMS;
    return FAQ_ITEMS.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(query));
  }, [search]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0] ?? null;
  const copy = COPY[locale];

  const persistLocale = (nextLocale: LocaleId) => {
    setLocale(nextLocale);
    try {
      window.localStorage.setItem('vfide_locale', nextLocale);
    } catch {
      // ignore storage access failures
    }
  };

  const handleSubmitTicket = () => {
    const now = new Date().toISOString();
    const newTicket: SupportTicket = {
      id: `TKT-${Date.now()}`,
      subject,
      category: 'payments',
      status: 'open',
      priority: 'medium',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `${Date.now()}-user`,
          sender: 'user',
          content: details,
          timestamp: now,
        },
      ],
      attachments: [],
    };

    setTickets((current) => [newTicket, ...current]);
    setSelectedTicketId(newTicket.id);
    setActiveTab('tickets');

    window.setTimeout(() => {
      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === newTicket.id
            ? {
                ...ticket,
                updatedAt: new Date().toISOString(),
                messages: [
                  ...ticket.messages,
                  {
                    id: `${Date.now()}-support`,
                    sender: 'support',
                    content: `VFIDE Support has received your request. Reference ${ticket.id}`,
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : ticket
        )
      );
    }, 1500);

    setSubject('');
    setDetails('');
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto px-4 max-w-6xl py-8 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold text-white mb-2">{copy.heading}</h1>
          </motion.div>
          <p className="text-white/60">{copy.subtitle}</p>

          <div className="flex items-center gap-3">
            <label htmlFor="support-language" className="text-sm text-gray-300">Language</label>
            <select
              id="support-language"
              value={locale}
              onChange={(event) => persistLocale(event.target.value as LocaleId)}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white"
            >
              <option value="en-US">English</option>
              <option value="es-ES">Español</option>
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
                }`}
              >
                {copy.tabs[id]}
              </button>
            ))}
          </div>

          {activeTab === 'faq' && (
            <div className="space-y-4">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search for answers"
                className="w-full rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-white placeholder:text-gray-500"
              />

              {filteredFaq.map((item) => (
                <div key={item.question} className="rounded-2xl border border-white/10 bg-white/3 p-4">
                  <button
                    type="button"
                    onClick={() => setOpenQuestion((current) => current === item.question ? null : item.question)}
                    className="w-full text-left text-white font-semibold"
                  >
                    {item.question}
                  </button>
                  {openQuestion === item.question ? (
                    <p className="text-gray-400 mt-3">{item.answer}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
                {tickets.length === 0 ? (
                  <p className="text-gray-400">No tickets yet. Create one from the new ticket tab.</p>
                ) : (
                  tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full text-left rounded-xl border px-3 py-3 ${selectedTicketId === ticket.id ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-white/10 bg-black/20'}`}
                    >
                      <div className="text-white font-semibold">{ticket.id}</div>
                      <div className="text-xs text-gray-400 mt-1">Subject • {ticket.subject}</div>
                    </button>
                  ))
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
                {selectedTicket ? (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedTicket.subject}</h2>
                      <p className="text-sm text-gray-400 mt-1">Ticket ID: {selectedTicket.id}</p>
                    </div>
                    <div className="space-y-3">
                      {selectedTicket.messages.map((message) => (
                        <div key={message.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-sm font-semibold text-white mb-1">{message.sender === 'support' ? 'Support Team' : 'You'}</div>
                          <p className="text-sm text-gray-300">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">Choose a ticket to see the conversation.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'new' && (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-4">
              {!isConnected ? (
                <p className="text-gray-300">Connect your wallet to create support tickets.</p>
              ) : (
                <>
                  <input
                    type="text"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Brief description of your issue"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
                  />
                  <textarea
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder="Describe your issue in detail"
                    className="w-full min-h-32 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitTicket}
                    className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 font-semibold"
                  >
                    Submit Ticket
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
