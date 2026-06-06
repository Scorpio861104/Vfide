import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockParams: Record<string, string> = {};
let mockAddress: `0x${string}` | undefined;
let mockProposalCount = 0n;
let mockFetchProposal: jest.Mock;
let mockDaoConfigured = true;

const renderProposalDetailPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/governance/proposal/[id]/page');
  const ProposalDetailPage = pageModule.default as React.ComponentType;
  return render(<ProposalDetailPage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAddress,
  }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/hooks/useDAO', () => ({
  ProposalStatus: { Active: 1 },
  proposalStatusLabel: () => 'Active',
  proposalTypeLabel: () => 'Standard',
  useDAO: () => ({
    daoConfigured: mockDaoConfigured,
    proposalCount: mockProposalCount,
    fetchProposal: mockFetchProposal,
    hasVotedOn: jest.fn(),
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Governance proposal detail route', () => {
  beforeEach(() => {
    mockParams = { id: '1' };
    mockAddress = undefined;
    mockProposalCount = 42n;
    mockDaoConfigured = true;
    mockFetchProposal = jest.fn().mockResolvedValue(null);
  });

  it('renders invalid-id state when proposal id param is missing or malformed', async () => {
    mockParams = {};

    renderProposalDetailPage();

    expect(await screen.findByRole('heading', { name: /Invalid proposal ID/i })).toBeTruthy();
    expect(screen.getByText(/not a valid proposal ID/i)).toBeTruthy();
  });

  it('renders not-found state when proposal id is valid but no proposal exists', async () => {
    renderProposalDetailPage();

    expect(await screen.findByRole('heading', { name: /Proposal not found/i })).toBeTruthy();
    expect(screen.getByText(/Total proposals created/i)).toBeTruthy();
  });

  it('renders load-error state when proposal fetch throws', async () => {
    mockFetchProposal = jest.fn().mockRejectedValue(new Error('RPC unavailable'));

    renderProposalDetailPage();

    expect(await screen.findByRole('heading', { name: /Failed to load proposal/i })).toBeTruthy();
    expect(screen.getByText(/RPC unavailable/i)).toBeTruthy();
  });
});
