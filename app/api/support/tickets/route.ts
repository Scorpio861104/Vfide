import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { requireOwnership, withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const STORE_DIR = path.join(process.cwd(), '.vfide-runtime');
const STORE_PATH = path.join(STORE_DIR, 'support-tickets.json');

const createTicketSchema = z.object({
  address: z.string().trim().regex(ADDRESS_REGEX),
  subject: z.string().trim().min(1).max(200),
  details: z.string().trim().min(1).max(5000),
  category: z.string().trim().max(60).optional(),
});

const updateTicketSchema = z.object({
  address: z.string().trim().regex(ADDRESS_REGEX),
  ticketId: z.string().trim().min(1),
  action: z.enum(['support-reply', 'resolve', 'reopen']),
  message: z.string().trim().max(5000).optional(),
});

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

async function getHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const address = request.nextUrl.searchParams.get('address');

  if (!address || !ADDRESS_REGEX.test(address)) {
    return NextResponse.json({ error: 'Valid address query parameter is required' }, { status: 400 });
  }

  const normalizedAddress = normalizeAddress(address);
  const authResult = await requireOwnership(request, normalizedAddress);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const store = await readStore();
    const tickets = store[normalizedAddress] ?? [];

    return NextResponse.json({
      tickets,
      total: tickets.length,
      source: 'backend',
    });
  } catch (error) {
    logger.error('[Support Tickets GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const rawBody = await request.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid address, subject, and details are required' }, { status: 400 });
  }

  const { address, subject, details, category } = parsed.data;
  const normalizedAddress = normalizeAddress(address);
  const authResult = await requireOwnership(request, normalizedAddress);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: `TKT-${Date.now()}`,
      subject,
      category: category?.trim() || 'payments',
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
  } catch (error) {
    logger.error('[Support Tickets POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const rawBody = await request.json().catch(() => null);
  const parsed = updateTicketSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: 'address, ticketId, and action are required' }, { status: 400 });
  }

  const { address, ticketId, action, message } = parsed.data;
  const normalizedAddress = normalizeAddress(address);
  const authResult = await requireOwnership(request, normalizedAddress);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const store = await readStore();
    const tickets = store[normalizedAddress] ?? [];
    const ticketIndex = tickets.findIndex((ticket) => ticket.id === ticketId);

    if (ticketIndex === -1) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const currentTicket = tickets[ticketIndex];
    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    let updatedTicket: SupportTicket = currentTicket;

    if (action === 'support-reply') {
      const replyMessage = message?.trim() || `VFIDE Support has received your request. Reference ${currentTicket.id}`;
      updatedTicket = {
        ...currentTicket,
        updatedAt: now,
        messages: [
          ...currentTicket.messages,
          {
            id: `${Date.now()}-support`,
            sender: 'support',
            content: replyMessage,
            timestamp: now,
          },
        ],
      };
    }

    if (action === 'resolve') {
      updatedTicket = { ...updatedTicket, status: 'resolved', updatedAt: now };
    }

    if (action === 'reopen') {
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
  } catch (error) {
    logger.error('[Support Tickets PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
export const PATCH = withAuth(patchHandler);
