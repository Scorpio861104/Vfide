import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockAccount = {
  isConnected: true,
  address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
};

const renderBenefitsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/benefits/page');
  const BenefitsPage = pageModule.default as React.ComponentType;
  return render(<BenefitsPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => mockAccount,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, key: string) => {
      if (key === 'button') {
        return ({ children, ...props }: any) => <button {...props}>{children}</button>;
      }
      return ({ children, ...props }: any) => <div {...props}>{children}</div>;
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Benefits page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = {
      isConnected: true,
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
  });

  it('renders benefits header and overview tab content', () => {
    renderBenefitsPage();

    expect(screen.getByRole('heading', { name: /Member Benefits/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Active Participation Benefits/i })).toBeTruthy();
    expect(screen.getAllByText(/Membership Tiers/i).length).toBeGreaterThan(0);
  });

  it('switches to membership tiers and shows tier cards', () => {
    renderBenefitsPage();

    fireEvent.click(screen.getByRole('button', { name: /Membership Tiers/i }));

    expect(screen.getByRole('heading', { name: /Membership Tiers/i })).toBeTruthy();
    expect(screen.getByText(/Bronze/i)).toBeTruthy();
    expect(screen.getByText(/Platinum/i)).toBeTruthy();
  });

  it('switches to rewards and stats tabs with connect-state stats', () => {
    renderBenefitsPage();

    fireEvent.click(screen.getByRole('button', { name: /Available Rewards/i }));
    expect(screen.getByRole('heading', { name: /Available Rewards/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /My Stats/i }));
    expect(screen.getByRole('heading', { name: /Gold Member/i })).toBeTruthy();
    expect(screen.getByText(/ProofScore: 68/i)).toBeTruthy();
  });
});
