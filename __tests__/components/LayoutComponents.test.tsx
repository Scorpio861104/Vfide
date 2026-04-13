'use client';

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Mock wallet components
jest.mock('@/components/wallet/SimpleWalletConnect', () => ({
  SimpleWalletConnect: () => <div data-testid="wallet-connect">Wallet</div>,
}));

jest.mock('@/components/wallet/QuickWalletConnect', () => ({
  QuickWalletConnect: () => <div data-testid="quick-wallet-connect">Quick Wallet</div>,
}));

jest.mock('@/components/wallet/NetworkSwitcher', () => ({
  NetworkSwitcher: () => <div data-testid="network-switcher">Network</div>,
}));

jest.mock('@/components/wallet/FaucetButton', () => ({
  FaucetButton: () => <button data-testid="faucet-button">Faucet</button>,
}));

// Mock vault components
jest.mock('@/components/vault/VaultStatusModal', () => ({
  VaultStatusModal: () => <div data-testid="vault-modal" />,
}));

jest.mock('@/components/vault/VaultStatusIndicator', () => ({
  VaultStatusIndicator: () => <div data-testid="vault-indicator" />,
}));

// Mock UI components
jest.mock('@/components/ui/TokenBalance', () => ({
  NavbarBalance: () => <div data-testid="navbar-balance">Balance</div>,
}));

jest.mock('@/components/ui/NotificationCenter', () => ({
  NotificationCenter: () => <div data-testid="notification-center">Notifications</div>,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, layoutId, ...props }: any) => (
      <div className={className} data-layoutid={layoutId} {...props}>{children}</div>
    ),
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    nav: ({ children, className, ...props }: any) => <nav className={className} {...props}>{children}</nav>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Github: () => <span data-testid="github-icon">GitHub</span>,
  Twitter: () => <span data-testid="twitter-icon">Twitter</span>,
  MessageCircle: () => <span data-testid="discord-icon">Discord</span>,
  Code2: () => <span data-testid="github-icon">GitHub</span>,
  X: () => <span data-testid="twitter-icon">Twitter</span>,
  ExternalLink: () => <span data-testid="external-link-icon">↗</span>,
  MoreHorizontal: () => <span data-testid="more-icon">⋯</span>,
  User: () => <span data-testid="user-icon">👤</span>,
  Flashloan: () => <span data-testid="flashloan-icon">🔦</span>,
}));

// Mock MetallicIcons
jest.mock('@/components/icons/MetallicIcons', () => ({
  MetalDashboardIcon: () => <span data-testid="dashboard-icon">📊</span>,
  MetalVaultIcon: () => <span data-testid="vault-icon">🏦</span>,
  MetalSocialIcon: () => <span data-testid="social-icon">👥</span>,
  MetalMerchantIcon: () => <span data-testid="merchant-icon">🏪</span>,
  MetalGovernanceIcon: () => <span data-testid="governance-icon">⚖️</span>,
  MetalHeadhunterIcon: () => <span data-testid="headhunter-icon">🎯</span>,
  MetalShieldIcon: () => <span data-testid="shield-icon">🛡️</span>,
  MetalRewardsIcon: () => <span data-testid="rewards-icon">🎁</span>,
  MetalTokenIcon: () => <span data-testid="token-icon">🪙</span>,
}));

import { GlobalNav } from '@/components/layout/GlobalNav';
import { Footer } from '@/components/layout/Footer';

describe('GlobalNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render VFIDE logo text', () => {
    render(<GlobalNav />);
    
    expect(screen.getByText('VFIDE')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(<GlobalNav />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Vault')).toBeInTheDocument();
    expect(screen.getByText('Wallet')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Merchant')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('DAO Hub')).toBeInTheDocument();
    expect(screen.getByText('Flashloans P2P')).toBeInTheDocument();
  });

  it('should render wallet connect button', () => {
    render(<GlobalNav />);
    
    expect(screen.getAllByTestId('quick-wallet-connect').length).toBeGreaterThan(0);
  });

  it('should render notification center', () => {
    render(<GlobalNav />);
    
    expect(screen.getAllByTestId('notification-center').length).toBeGreaterThan(0);
  });

  it('should render vault status modal', () => {
    render(<GlobalNav />);
    
    expect(screen.getByTestId('vault-modal')).toBeInTheDocument();
  });

  it('should render faucet button', () => {
    render(<GlobalNav />);
    
    expect(screen.getByTestId('faucet-button')).toBeInTheDocument();
  });

  it('should have dashboard link with correct href', () => {
    render(<GlobalNav />);
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('should have vault link with correct href', () => {
    render(<GlobalNav />);
    
    const vaultLink = screen.getByText('Vault').closest('a');
    expect(vaultLink).toHaveAttribute('href', '/vault');
  });
});

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render VFIDE brand', () => {
    render(<Footer />);
    
    expect(screen.getByText('VFIDE')).toBeInTheDocument();
  });

  it('should render brand description', () => {
    render(<Footer />);
    
    expect(screen.getByText(/decentralized payment protocol/i)).toBeInTheDocument();
  });

  it('should render Product section', () => {
    render(<Footer />);
    
    expect(screen.getByText('Product')).toBeInTheDocument();
  });

  it('should render Community section', () => {
    render(<Footer />);
    
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('should render Resources section', () => {
    render(<Footer />);
    
    expect(screen.getByText('Resources')).toBeInTheDocument();
  });

  it('should render Legal section', () => {
    render(<Footer />);
    
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  it('should render product links', () => {
    render(<Footer />);
    
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getByText('Merchant Portal')).toBeInTheDocument();
    expect(screen.getByText('Vault Manager')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('Flashloans P2P')).toBeInTheDocument();
  });

  it('should render community links', () => {
    render(<Footer />);
    
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('Token Launch')).toBeInTheDocument();
    // GitHub appears multiple times
    const githubElements = screen.getAllByText('GitHub');
    expect(githubElements.length).toBeGreaterThan(0);
  });

  it('should render resources links', () => {
    render(<Footer />);
    
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('should render legal links', () => {
    render(<Footer />);
    
    // Legal & Terms appears multiple times
    const legalElements = screen.getAllByText('Legal & Terms');
    expect(legalElements.length).toBeGreaterThan(0);
    const guardianElements = screen.getAllByText('Guardians');
    expect(guardianElements.length).toBeGreaterThan(0);
  });

  it('should render social icons', () => {
    render(<Footer />);
    
    // The icons are inside the social links
    const githubElements = screen.getAllByTestId('github-icon');
    expect(githubElements.length).toBeGreaterThan(0);
  });

  it('should have dashboard link with correct href', () => {
    render(<Footer />);
    
    const dashboardLinks = screen.getAllByText('Dashboard');
    const link = dashboardLinks[0].closest('a');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('should have external link for GitHub with target blank', () => {
    render(<Footer />);
    
    // Multiple GitHub elements exist - find the one with external link
    const githubIcons = screen.getAllByText('GitHub');
    // Find the one inside an external link
    const externalLink = githubIcons.find(el => el.closest('a')?.getAttribute('target') === '_blank');
    expect(externalLink).toBeDefined();
  });

  it('should show Discord link in community section', () => {
    render(<Footer />);
    
    const discordLinks = screen.getAllByText('Discord');
    expect(discordLinks.length).toBeGreaterThan(0);
  });
});
