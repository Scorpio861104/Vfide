import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

const renderSocialPaymentsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/social-payments/page');
  const SocialPaymentsPage = pageModule.default as React.ComponentType;
  return render(<SocialPaymentsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    isConnected: true,
  }),
}));

jest.mock('@/components/social/SocialFeed', () => ({
  SocialFeed: () => <div>Social Feed Component</div>,
}));

jest.mock('@/components/social/UnifiedActivityFeed', () => ({
  UnifiedActivityFeed: () => <div>Unified Activity Feed Component</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Social payments page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders social payment stats and supporter list', () => {
    renderSocialPaymentsPage();

    expect(screen.getByRole('heading', { name: /Social Payments/i })).toBeTruthy();
    expect(screen.getByText(/Tips Received/i)).toBeTruthy();
    expect(screen.getByText(/Tips Sent/i)).toBeTruthy();
    expect(screen.getByText(/Top Supporters/i)).toBeTruthy();
    expect(screen.getByText(/Creator circle/i)).toBeTruthy();
    expect(screen.getByText(/Merchant buyers/i)).toBeTruthy();
  });

  it('switches across feed, activity, and earnings tabs', () => {
    renderSocialPaymentsPage();

    expect(screen.getByText('Social Feed Component')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /All Activity/i }));
    expect(screen.getByText('Unified Activity Feed Component')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Earnings/i }));
    expect(screen.getByText(/Recent Tips Received/i)).toBeTruthy();
    expect(screen.getAllByText(/Content Sales/i).length).toBeGreaterThan(0);
  });
});