import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
let mockIsConnected = true;

const renderSupportPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/support/page');
  const SupportPage = pageModule.default as React.ComponentType;
  return render(<SupportPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAddress,
    isConnected: mockIsConnected,
  }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'button') {
          return ({ children, ...props }: any) => <button {...props}>{children}</button>;
        }
        return ({ children, ...props }: any) => <div {...props}>{children}</div>;
      },
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    MessageCircle: Icon,
    Send: Icon,
    Search: Icon,
    Plus: Icon,
    Clock: Icon,
    CheckCircle2: Icon,
    AlertCircle: Icon,
    XCircle: Icon,
    ChevronDown: Icon,
    User: Icon,
    Mail: Icon,
    HelpCircle: Icon,
    Book: Icon,
    Zap: Icon,
    Shield: Icon,
    Wallet: Icon,
    RefreshCw: Icon,
    MessageSquare: Icon,
    LifeBuoy: Icon,
    Headphones: Icon,
  };
});

describe('Support page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();

    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    mockIsConnected = true;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('expands FAQ answers and filters search results', () => {
    renderSupportPage();

    fireEvent.click(screen.getByRole('button', { name: /How do I connect my wallet/i }));
    expect(screen.getByText(/select your preferred wallet/i)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Search for answers/i), {
      target: { value: 'proofscore work' },
    });

    expect(screen.getByRole('button', { name: /How does ProofScore work/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /How do I set up guardians/i })).toBeNull();
  });

  it('loads existing wallet tickets from localStorage and renders list state', async () => {
    localStorage.setItem(
      'support_tickets_0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      JSON.stringify([
        {
          id: 'TKT-EXISTING',
          subject: 'Stored ticket',
          category: 'wallet',
          status: 'open',
          priority: 'medium',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          messages: [
            {
              id: '1',
              sender: 'user',
              content: 'Need help',
              timestamp: '2026-01-01T00:00:00.000Z',
            },
          ],
          attachments: [],
        },
      ])
    );

    renderSupportPage();

    fireEvent.click(screen.getByRole('button', { name: /My Tickets/i }));

    await waitFor(() => {
      expect(screen.getByText('Stored ticket')).toBeTruthy();
    });
    expect(screen.getByText('TKT-EXISTING')).toBeTruthy();
  });

  it('shows wallet warning when disconnected on new ticket tab', () => {
    mockAddress = undefined;
    mockIsConnected = false;

    renderSupportPage();

    fireEvent.click(screen.getByRole('button', { name: /New Ticket/i }));

    expect(screen.getByText(/Connect your wallet to create support tickets/i)).toBeTruthy();
  });

  it('handles unavailable localStorage gracefully', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    try {
      renderSupportPage();
      expect(screen.getByText(/Help & Support Center/i)).toBeTruthy();
    } finally {
      getItemSpy.mockRestore();
    }
  });

  it('creates a new ticket, selects it, and appends support auto-response', async () => {
    renderSupportPage();

    fireEvent.click(screen.getByRole('button', { name: /New Ticket/i }));

    fireEvent.change(screen.getByPlaceholderText(/Brief description of your issue/i), {
      target: { value: 'Cannot settle payment' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe your issue in detail/i), {
      target: { value: 'Settlement remains pending despite confirmations.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Ticket/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Cannot settle payment').length).toBeGreaterThan(0);
    });

    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(screen.getByText(/VFIDE Support/i)).toBeTruthy();
      expect(screen.getByText(/Ticket ID:/i)).toBeTruthy();
    });
  });
});
