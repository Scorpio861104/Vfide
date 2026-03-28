import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const mockWriteContract = jest.fn();

const renderBadgesPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/badges/page');
  const BadgesPage = pageModule.default as React.ComponentType;
  return render(<BadgesPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    isConnected: true,
  }),
  useWriteContract: () => ({
    writeContract: mockWriteContract,
    data: undefined,
    isPending: false,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
  useReadContract: () => ({
    data: 1n,
  }),
}));

jest.mock('@/lib/badge-registry', () => ({
  getBadgeCategories: () => ['Pioneer & Foundation', 'Activity & Participation'],
  getAllBadges: () => [
    {
      name: 'PIONEER',
      category: 'Pioneer & Foundation',
      rarity: 'Legendary',
      description: 'Early protocol contributor',
      points: 100,
    },
    {
      name: 'GOVERNANCE_VOTER',
      category: 'Activity & Participation',
      rarity: 'Rare',
      description: 'Participated in governance',
      points: 40,
    },
    {
      name: 'ACTIVE_TRADER',
      category: 'Activity & Participation',
      rarity: 'Uncommon',
      description: '50+ commerce transactions in 90 days',
      points: 20,
    },
  ],
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      const Tag = key as keyof JSX.IntrinsicElements;
      return ({ children, ...props }: any) => <Tag {...props}>{children}</Tag>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Badges page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders badge collection overview and tab counters', () => {
    renderBadgesPage();

    expect(screen.getByRole('heading', { name: /Badge Collection/i })).toBeTruthy();
    expect(screen.getByText(/Total Badges/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /All Badges \(3\)/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Earned \(0\)/i })).toBeTruthy();
  });

  it('filters badges by earned tab shows empty state', () => {
    renderBadgesPage();

    fireEvent.click(screen.getByRole('button', { name: /Earned \(0\)/i }));

    // No badges are earned (userBadges is empty), so empty state shows
    expect(screen.getByRole('heading', { name: /No Badges Found/i })).toBeTruthy();
  });

  it('shows empty state when search has no results', () => {
    renderBadgesPage();

    fireEvent.change(screen.getByPlaceholderText(/Search badges/i), {
      target: { value: 'does-not-exist' },
    });

    expect(screen.getByRole('heading', { name: /No Badges Found/i })).toBeTruthy();
    expect(screen.getByText(/Try adjusting your search or filters/i)).toBeTruthy();
  });
});
