import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

let mockParams = { id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
let mockAccountAddress: `0x${string}` | undefined = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const mockCopy = jest.fn();

const renderExplorerIdPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/explorer/[id]/page');
  const ExplorerIdPage = pageModule.default as React.ComponentType;
  return render(<ExplorerIdPage />);
};

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAccountAddress,
  }),
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useProofScore: () => ({
    score: 8200,
    tier: 'GOLD',
    canVote: true,
    canMerchant: true,
    isLoading: false,
  }),
}));

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copied: false,
    copy: mockCopy,
  }),
}));

jest.mock('@/components/trust/ProofScoreVisualizer', () => ({
  ProofScoreVisualizer: ({ address }: { address: string }) => <div>ProofScore Visualizer {address}</div>,
}));

jest.mock('@/components/badge/BadgeGallery', () => ({
  BadgeGallery: ({ address }: { address: string }) => <div>Badge Gallery {address}</div>,
}));

jest.mock('@/components/trust/EndorsementStats', () => ({
  EndorsementStats: ({ address }: { address: string }) => <div>Endorsement Stats {address}</div>,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    ArrowLeft: Icon,
    Copy: Icon,
    CheckCircle: Icon,
    AlertCircle: Icon,
  };
});

describe('Explorer address detail page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
    mockAccountAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  });

  it('renders invalid-address state when route id is malformed', () => {
    mockParams = { id: 'bad-address' };

    renderExplorerIdPage();

    expect(screen.getByRole('heading', { name: /Invalid Address/i })).toBeTruthy();
    expect(screen.getByText(/address format is not valid/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to Leaderboard/i }).getAttribute('href')).toBe('/leaderboard');
  });

  it('renders self-profile trust data and supports address copy', () => {
    renderExplorerIdPage();

    expect(screen.getByRole('heading', { name: /User Profile/i })).toBeTruthy();
    expect(screen.getByText(/This is your profile/i)).toBeTruthy();
    expect(screen.getByText(/Trust Tier:/i)).toBeTruthy();
    expect(screen.getByText(/GOLD/i)).toBeTruthy();

    fireEvent.click(screen.getByTitle('Copy address'));
    expect(mockCopy).toHaveBeenCalledWith('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('shows actions section when viewing another wallet profile', () => {
    mockParams = { id: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' };
    mockAccountAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    renderExplorerIdPage();

    expect(screen.getByRole('heading', { name: /Actions/i })).toBeTruthy();
    expect(screen.queryByText(/This is your profile/i)).toBeNull();
  });
});