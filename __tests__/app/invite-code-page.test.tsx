import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockPush = jest.fn();
const mockAnnounce = jest.fn();

let mockConnected = false;
let mockAddress: `0x${string}` | undefined;

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

const renderInviteCodePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/invite/[code]/page');
  const InviteCodePage = pageModule.default as React.ComponentType;
  return render(<InviteCodePage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => ({ code: 'abc123' }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAddress,
    isConnected: mockConnected,
  }),
}));

jest.mock('@/lib/accessibility', () => ({
  useAnnounce: () => ({ announce: mockAnnounce }),
}));

jest.mock('@/lib/inviteLinks', () => ({
  formatExpirationTime: () => 'Never',
  formatUsageLimit: () => '0 / 10',
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    AlertCircle: Icon,
    Check: Icon,
    Clock: Icon,
    Loader2: Icon,
    Shield: Icon,
    Users: Icon,
    X: Icon,
  };
});

describe('Invite code page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnected = false;
    mockAddress = undefined;
    (global as any).fetch = mockFetch;

    mockFetch.mockResolvedValue({
      json: async () => ({
        success: true,
        valid: true,
        invite: {
          id: 'inv1',
          groupId: 'group-1',
          code: 'abc123',
          createdAt: Date.now(),
          currentUses: 0,
          maxUses: 10,
          metadata: { description: 'Join this group' },
        },
      }),
    } as Response);
  });

  it('loads invite data and prompts wallet connect when disconnected', async () => {
    renderInviteCodePage();

    expect(await screen.findByText(/you\'ve been invited!/i)).toBeTruthy();
    expect(screen.getByText(/connect your wallet to join this group/i)).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledWith('/api/groups/invites?code=abc123');
  });

  it('submits join request and redirects on success when connected', async () => {
    mockConnected = true;
    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    mockFetch
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          valid: true,
          invite: {
            id: 'inv1',
            groupId: 'group-1',
            code: 'abc123',
            createdAt: Date.now(),
            currentUses: 0,
            maxUses: 10,
            metadata: { description: 'Join this group', requireApproval: false },
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, groupId: 'group-1', status: 'joined' }),
      } as Response);

    jest.useFakeTimers();
    renderInviteCodePage();

    const joinButton = await screen.findByRole('button', { name: /join group/i });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/api/groups/join',
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(mockAnnounce).toHaveBeenCalledWith('Successfully joined group', 'polite');
    });

    jest.advanceTimersByTime(2100);
    expect(mockPush).toHaveBeenCalledWith('/groups/group-1');
    jest.useRealTimers();
  });
});
