'use client';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock badge registry
vi.mock('@/lib/badge-registry', () => ({
  getBadgeById: vi.fn(),
  getAllBadges: vi.fn(() => []),
  getBadgesByCategory: vi.fn(() => []),
  getBadgeCategories: vi.fn(() => []),
}));

// Mock hooks
vi.mock('@/lib/vfide-hooks', () => ({
  useUserBadges: vi.fn(() => ({ badgeIds: [], isLoading: false })),
  useBadgeNFTs: vi.fn(() => ({ count: 0 })),
}));

// Mock Tabs components
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children, className }: any) => <div data-testid="tabs-list" className={className}>{children}</div>,
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button data-testid={`tab-${value}`} data-value={value} {...props}>{children}</button>
  ),
}));

import { BadgeDisplay } from '@/components/badge/BadgeDisplay';
import { BadgeGallery } from '@/components/badge/BadgeGallery';
import * as badgeRegistry from '@/lib/badge-registry';
import * as hooks from '@/lib/vfide-hooks';

describe('BadgeDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unknown Badge', () => {
    it('should render placeholder for unknown badge', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(undefined);
      
      render(<BadgeDisplay badgeId="0x123" />);
      
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should apply size class', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(undefined);
      
      const { container } = render(<BadgeDisplay badgeId="0x123" size="lg" />);
      
      const element = container.querySelector('.w-32');
      expect(element).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(undefined);
      
      const { container } = render(<BadgeDisplay badgeId="0x123" className="custom-class" />);
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Known Badge', () => {
    const mockBadge = {
      id: '0xabc' as `0x${string}`,
      name: 'First Transaction',
      description: 'Made your first transaction',
      icon: '🎉',
      points: 10,
      rarity: 'Common' as const,
      category: 'Commerce',
      criteria: { type: 'transactions', value: 1 },
    };

    it('should render badge when found', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(mockBadge);
      
      render(<BadgeDisplay badgeId="0xabc" />);
      
      // Badge icon appears multiple times (main view and tooltip)
      const icons = screen.getAllByText('🎉');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should show badge icon in main display', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(mockBadge);
      
      const { container } = render(<BadgeDisplay badgeId="0xabc" />);
      
      // Check for the drop-shadow icon
      const iconElement = container.querySelector('.drop-shadow-lg');
      expect(iconElement).toBeInTheDocument();
      expect(iconElement?.textContent).toBe('🎉');
    });

    it('should show points when showPoints is true', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(mockBadge);
      
      render(<BadgeDisplay badgeId="0xabc" showPoints />);
      
      expect(screen.getByText('+10')).toBeInTheDocument();
    });

    it('should show description when showDescription is true', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(mockBadge);
      
      render(<BadgeDisplay badgeId="0xabc" showDescription />);
      
      // Description appears in multiple places
      const descriptions = screen.getAllByText('Made your first transaction');
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it('should apply small size', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(mockBadge);
      
      const { container } = render(<BadgeDisplay badgeId="0xabc" size="sm" />);
      
      expect(container.querySelector('.w-16')).toBeInTheDocument();
    });

    it('should apply medium size by default', () => {
      vi.mocked(badgeRegistry.getBadgeById).mockReturnValue(mockBadge);
      
      const { container } = render(<BadgeDisplay badgeId="0xabc" />);
      
      expect(container.querySelector('.w-24')).toBeInTheDocument();
    });
  });
});

describe('BadgeGallery', () => {
  const mockBadges = [
    {
      id: '0x001' as `0x${string}`,
      name: 'Badge 1',
      description: 'First badge',
      icon: '🎯',
      points: 10,
      rarity: 'Common' as const,
      category: 'Commerce',
      criteria: { type: 'transactions', value: 1 },
    },
    {
      id: '0x002' as `0x${string}`,
      name: 'Badge 2',
      description: 'Second badge',
      icon: '🏆',
      points: 20,
      rarity: 'Rare' as const,
      category: 'Trust',
      criteria: { type: 'score', value: 50 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      vi.mocked(hooks.useUserBadges).mockReturnValue({
        badgeIds: [],
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as any);
      
      const { container } = render(<BadgeGallery />);
      
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no badges earned', () => {
      vi.mocked(hooks.useUserBadges).mockReturnValue({
        badgeIds: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      vi.mocked(hooks.useBadgeNFTs).mockReturnValue({
        count: 0,
        nfts: [],
        isLoading: false,
      } as any);
      
      render(<BadgeGallery />);
      
      expect(screen.getByText('No Badges Yet')).toBeInTheDocument();
      expect(screen.getByText('Start participating to earn your first badge!')).toBeInTheDocument();
    });
  });

  describe('With Badges', () => {
    beforeEach(() => {
      vi.mocked(hooks.useUserBadges).mockReturnValue({
        badgeIds: ['0x001', '0x002'] as `0x${string}`[],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      vi.mocked(hooks.useBadgeNFTs).mockReturnValue({
        count: 1,
        nfts: [],
        isLoading: false,
      } as any);
      vi.mocked(badgeRegistry.getAllBadges).mockReturnValue(mockBadges);
      vi.mocked(badgeRegistry.getBadgeById).mockImplementation((id) => 
        mockBadges.find(b => b.id === id)
      );
    });

    it('should show badge count', () => {
      render(<BadgeGallery />);
      
      expect(screen.getByText('2 Badges Earned')).toBeInTheDocument();
    });

    it('should show NFT count', () => {
      render(<BadgeGallery />);
      
      expect(screen.getByText('1 minted as NFTs')).toBeInTheDocument();
    });

    it('should calculate total points', () => {
      render(<BadgeGallery />);
      
      expect(screen.getByText('+30')).toBeInTheDocument();
    });

    it('should hide stats in compact mode', () => {
      render(<BadgeGallery compact />);
      
      expect(screen.queryByText('2 Badges Earned')).not.toBeInTheDocument();
      expect(screen.queryByText('Total Badge Points:')).not.toBeInTheDocument();
    });
  });

  describe('Show All Mode', () => {
    beforeEach(() => {
      vi.mocked(hooks.useUserBadges).mockReturnValue({
        badgeIds: ['0x001'] as `0x${string}`[],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      vi.mocked(hooks.useBadgeNFTs).mockReturnValue({
        count: 0,
        nfts: [],
        isLoading: false,
      } as any);
      vi.mocked(badgeRegistry.getAllBadges).mockReturnValue(mockBadges);
      vi.mocked(badgeRegistry.getBadgeCategories).mockReturnValue(['Commerce', 'Trust']);
      vi.mocked(badgeRegistry.getBadgesByCategory).mockImplementation((cat) => 
        mockBadges.filter(b => b.category === cat)
      );
      vi.mocked(badgeRegistry.getBadgeById).mockImplementation((id) => 
        mockBadges.find(b => b.id === id)
      );
    });

    it('should show all badges when showAll is true', () => {
      render(<BadgeGallery showAll />);
      
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
    });

    it('should show category tabs', () => {
      render(<BadgeGallery showAll />);
      
      expect(screen.getByTestId('tab-all')).toBeInTheDocument();
      expect(screen.getByTestId('tab-Commerce')).toBeInTheDocument();
      expect(screen.getByTestId('tab-Trust')).toBeInTheDocument();
    });

    it('should show collected count', () => {
      render(<BadgeGallery showAll />);
      
      expect(screen.getByText('1 / 2 collected')).toBeInTheDocument();
    });

    it('should show All tab with count', () => {
      render(<BadgeGallery showAll />);
      
      expect(screen.getByText('All (2)')).toBeInTheDocument();
    });
  });

  describe('Address Prop', () => {
    it('should pass address to hooks', () => {
      const address = '0xabc123' as `0x${string}`;
      vi.mocked(hooks.useUserBadges).mockReturnValue({
        badgeIds: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as any);
      vi.mocked(hooks.useBadgeNFTs).mockReturnValue({
        count: 0,
        nfts: [],
        isLoading: false,
      } as any);
      
      render(<BadgeGallery address={address} />);
      
      expect(hooks.useUserBadges).toHaveBeenCalledWith(address);
      expect(hooks.useBadgeNFTs).toHaveBeenCalledWith(address);
    });
  });
});
