'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { safeLocalStorage } from '@/lib/utils';
import { FaqTab } from './components/FaqTab';
import { TicketsTab } from './components/TicketsTab';
import { NewTab } from './components/NewTab';

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
    const storedLocale = safeLocalStorage.getItem('vfide_locale');
    if (storedLocale === 'es-ES' || storedLocale === 'en-US') {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setTickets([]);
      setSelectedTicketId(null);
      return;
    }

    let cancelled = false;

    try {
      const stored = safeLocalStorage.getItem(`support_tickets_${address}`);
      if (stored) {
        const parsed = JSON.parse(stored) as SupportTicket[];
        setTickets(parsed);
        setSelectedTicketId(parsed[0]?.id ?? null);
      }
    } catch {
      // ignore storage access failures
    }

    const loadTickets = async () => {
      try {
        const response = await fetch(`/api/support/tickets?address=${address}`, { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const data = await response.json().catch(() => ({ tickets: [] }));
        if (!cancelled && Array.isArray(data.tickets)) {
          setTickets(data.tickets as SupportTicket[]);
          setSelectedTicketId(data.tickets[0]?.id ?? null);
        }
      } catch {
        // keep local cache fallback when backend sync is unavailable
      }
    };

    void loadTickets();

    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    if (!address) return;
    safeLocalStorage.setItem(`support_tickets_${address}`, JSON.stringify(tickets));
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
    safeLocalStorage.setItem('vfide_locale', nextLocale);
  };

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !details.trim()) {
      return;
    }

    const now = new Date().toISOString();
    let newTicket: SupportTicket = {
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

    if (address) {
      try {
        const response = await fetch('/api/support/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            subject,
            details,
            category: 'payments',
          }),
        });

        const data = await response.json().catch(() => null) as { ticket?: SupportTicket; tickets?: SupportTicket[] } | null;
        if (response.ok && data?.ticket) {
          newTicket = data.ticket;
          if (Array.isArray(data.tickets)) {
            setTickets(data.tickets);
          } else {
            setTickets((current) => [newTicket, ...current]);
          }
        } else {
          setTickets((current) => [newTicket, ...current]);
        }
      } catch {
        setTickets((current) => [newTicket, ...current]);
      }
    } else {
      setTickets((current) => [newTicket, ...current]);
    }

    setSelectedTicketId(newTicket.id);
    setActiveTab('tickets');

    window.setTimeout(() => {
      const supportMessage = `VFIDE Support has received your request. Reference ${newTicket.id}`;
      const supportTimestamp = new Date().toISOString();

      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === newTicket.id
            ? {
                ...ticket,
                updatedAt: supportTimestamp,
                messages: [
                  ...ticket.messages,
                  {
                    id: `${Date.now()}-support`,
                    sender: 'support',
                    content: supportMessage,
                    timestamp: supportTimestamp,
                  },
                ],
              }
            : ticket
        )
      );

      if (address && typeof fetch === 'function') {
        void fetch('/api/support/tickets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address,
            ticketId: newTicket.id,
            action: 'support-reply',
            message: supportMessage,
          }),
        }).catch(() => {
          // optimistic UI already reflects the support reply
        });
      }
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

          {activeTab === 'faq' ? (
            <FaqTab
              search={search}
              items={filteredFaq}
              openQuestion={openQuestion}
              onSearchChange={setSearch}
              onToggleQuestion={(question) => setOpenQuestion((current) => current === question ? null : question)}
            />
          ) : null}

          {activeTab === 'tickets' ? (
            <TicketsTab
              tickets={tickets}
              selectedTicketId={selectedTicketId}
              selectedTicket={selectedTicket}
              onSelectTicket={setSelectedTicketId}
            />
          ) : null}

          {activeTab === 'new' ? (
            <NewTab
              isConnected={isConnected}
              subject={subject}
              details={details}
              onSubjectChange={setSubject}
              onDetailsChange={setDetails}
              onSubmitTicket={handleSubmitTicket}
            />
          ) : null}
        </div>
      </div>
      <Footer />
    </>
  );
}
