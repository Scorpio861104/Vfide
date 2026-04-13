import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderDaoHubPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/dao-hub/page');
  const DaoHubPage = pageModule.default as React.ComponentType;
  return render(<DaoHubPage />);
};

jest.mock('../../app/dao-hub/components/OverviewTab', () => ({
  OverviewTab: () => <div>Overview tab content</div>,
}));

jest.mock('../../app/dao-hub/components/ProposalsTab', () => ({
  ProposalsTab: () => <div>Proposals tab content</div>,
}));

jest.mock('../../app/dao-hub/components/TreasuryTab', () => ({
  TreasuryTab: () => <div>Treasury tab content</div>,
}));

jest.mock('../../app/dao-hub/components/MembersTab', () => ({
  MembersTab: () => <div>Members tab content</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
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
  return new Proxy({}, { get: () => Icon });
});

describe('DAO Hub page access pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dao hub heading and copy', () => {
    renderDaoHubPage();

    expect(screen.getByText(/DAO Hub/i)).toBeTruthy();
    expect(screen.getByText(/Decentralized governance center/i)).toBeTruthy();
  });

  it('renders tab controls', () => {
    renderDaoHubPage();

    expect(screen.getByRole('button', { name: /Overview/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Proposals/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Treasury/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Members/i })).toBeTruthy();
  });

  it('renders default overview content', () => {
    renderDaoHubPage();

    expect(screen.getByText(/Overview tab content/i)).toBeTruthy();
  });
});