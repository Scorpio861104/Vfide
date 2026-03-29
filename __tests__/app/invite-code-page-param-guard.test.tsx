import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockPush = jest.fn();
const mockAnnounce = jest.fn();
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

let mockParams: Record<string, string> = {};

const renderInviteCodePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/invite/[code]/page');
  const InviteCodePage = pageModule.default as React.ComponentType;
  return render(<InviteCodePage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
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

describe('Invite code route param guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    (global as any).fetch = mockFetch;
  });

  it('fails closed when the invite code route param is missing', async () => {
    renderInviteCodePage();

    expect(await screen.findByRole('heading', { name: /Invalid Invite/i })).toBeTruthy();
    expect(screen.getByText(/Invalid invite link/i)).toBeTruthy();

    await waitFor(() => {
      expect(mockAnnounce).toHaveBeenCalledWith('Invalid invite link', 'assertive');
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});