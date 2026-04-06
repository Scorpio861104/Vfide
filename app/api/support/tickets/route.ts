import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const STORE_DIR = path.join(process.cwd(), '.vfide-runtime');
const STORE_PATH = path.join(STORE_DIR, 'support-tickets.json');

interface SupportMessage {
  id: string;
  sender: 'user' | 'support';
  content: string;
  timestamp: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: 'open' | 'resolved';
  priority: 'medium';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  attachments: string[];
}

type SupportStore = Record<string, SupportTicket[]>;

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

async function readStore(): Promise<SupportStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as SupportStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: SupportStore) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');

  if (!address || !ADDRESS_REGEX.test(address)) {
    return NextResponse.json({ error: 'Valid address query parameter is required' }, { status: 400 });
  }

  const store = await readStore();
  const normalizedAddress = normalizeAddress(address);
  const tickets = store[normalizedAddress] ?? [];

  return NextResponse.json({
    tickets,
    total: tickets.length,
    source: 'backend',
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    address?: string;
    subject?: string;
    details?: string;
    category?: string;
  } | null;

  if (!body?.address || !ADDRESS_REGEX.test(body.address)) {
    return NextResponse.json({ error: 'Valid address is required' }, { status: 400 });
  }

  const subject = body.subject?.trim() ?? '';
  const details = body.details?.trim() ?? '';
  if (!subject || !details) {
    return NextResponse.json({ error: 'Subject and details are required' }, { status: 400 });
  }

  const normalizedAddress = normalizeAddress(body.address);
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: `TKT-${Date.now()}`,
    subject,
    category: body.category?.trim() || 'payments',
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

  const store = await readStore();
  const nextTickets = [ticket, ...(store[normalizedAddress] ?? [])];
  store[normalizedAddress] = nextTickets;
  await writeStore(store);

  return NextResponse.json(
    {
      ticket,
      tickets: nextTickets,
      total: nextTickets.length,
      source: 'backend',
    },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    address?: string;
    ticketId?: string;
    action?: 'support-reply' | 'resolve' | 'reopen';
    message?: string;
  } | null;

  if (!body?.address || !ADDRESS_REGEX.test(body.address) || !body.ticketId || !body.action) {
    return NextResponse.json({ error: 'address, ticketId, and action are required' }, { status: 400 });
  }

  const normalizedAddress = normalizeAddress(body.address);
  const store = await readStore();
  const tickets = store[normalizedAddress] ?? [];
  const ticketIndex = tickets.findIndex((ticket) => ticket.id === body.ticketId);

  if (ticketIndex === -1) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  const currentTicket = tickets[ticketIndex];
  if (!currentTicket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  let updatedTicket: SupportTicket = currentTicket;

  if (body.action === 'support-reply') {
    const message = body.message?.trim() || `VFIDE Support has received your request. Reference ${currentTicket.id}`;
    updatedTicket = {
      ...currentTicket,
      updatedAt: now,
      messages: [
        ...currentTicket.messages,
        {
          id: `${Date.now()}-support`,
          sender: 'support',
          content: message,
          timestamp: now,
        },
      ],
    };
  }

  if (body.action === 'resolve') {
    updatedTicket = { ...updatedTicket, status: 'resolved', updatedAt: now };
  }

  if (body.action === 'reopen') {
    updatedTicket = { ...updatedTicket, status: 'open', updatedAt: now };
  }

  tickets[ticketIndex] = updatedTicket;
  store[normalizedAddress] = tickets;
  await writeStore(store);

  return NextResponse.json({
    ticket: updatedTicket,
    tickets,
    total: tickets.length,
    source: 'backend',
  });
}
