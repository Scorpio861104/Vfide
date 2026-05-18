import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

let mockCode: string | undefined = 'abc123';
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;

const renderInviteCodePage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/invite/[code]/page');
  const InviteCodePage = pageModule.default as React.ComponentType;
  return render(<InviteCodePage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => ({ code: mockCode }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  ),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Gift: Icon,
    Users: Icon,
    Shield: Icon,
    ArrowRight: Icon,
    Check: Icon,
    Loader2: Icon,
  };
});

describe('Invite code page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCode = 'abc123';
    (global as any).fetch = mockFetch;
  });

  it('renders valid invite state with accept link', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ valid: true }) } as Response);

    renderInviteCodePage();

    expect(await screen.findByText(/You\'re invited to VFIDE/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Accept Invite/i }).getAttribute('href')).toBe('/setup');
    expect(mockFetch).toHaveBeenCalledWith('/api/users/invite?code=abc123');
  });

  it('renders invalid state when invite validation fails', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ valid: false }) } as Response);

    renderInviteCodePage();

    expect(await screen.findByRole('heading', { name: /Invalid Invite/i })).toBeTruthy();
    expect(screen.getByText(/expired or invalid/i)).toBeTruthy();
  });

  it('renders invalid state immediately when code is missing', async () => {
    mockCode = undefined;

    renderInviteCodePage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Invalid Invite/i })).toBeTruthy();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
