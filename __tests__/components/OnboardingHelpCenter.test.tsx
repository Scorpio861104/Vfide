import { beforeEach, describe, expect, it, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockIsCardBoundVaultMode = jest.fn(() => false)

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: any) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock lucide-react
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  HelpCircle: () => <span data-testid="help-icon">Help</span>,
  X: () => <span>X</span>,
  Book: () => <span>Book</span>,
  Wallet: () => <span>Wallet</span>,
  Shield: () => <span>Shield</span>,
  Store: () => <span>Store</span>,
  Star: () => <span>Star</span>,
  Vote: () => <span>Vote</span>,
  ChevronRight: () => <span>ChevronRight</span>,
  Globe: () => <span>Globe</span>,
  Droplets: () => <span>Droplets</span>,
  Sparkles: () => <span>Sparkles</span>,
  Users: () => <span>Users</span>,
  ArrowRight: () => <span>ArrowRight</span>,
  ChevronLeft: () => <span>ChevronLeft</span>,
});
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})())

jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V2
  CONTRACT_ADDRESSES: {},
  CONTRACTS: {},
  getContractAddresses: () => ({}),
  isConfiguredContractAddress: (address?: string | null) =>,
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  isCardBoundVaultMode: () => mockIsCardBoundVaultMode(),
  getContractConfigurationError: (name: string) =>,
}))

jest.mock('@/components/onboarding/OnboardingManager', () => ({
  WIZARD_ENABLED_KEY: 'vfide_wizard_enabled',
  TOUR_COMPLETED_KEY: 'vfide_tour_completed',
  BEGINNER_COMPLETED_KEY: 'vfide_beginner_completed',
}))

// Import after mocking
import { HelpCenter } from '@/components/onboarding/HelpCenter'

describe('HelpCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsCardBoundVaultMode.mockReturnValue(false)
  })

  it('renders help button', () => {
    render(<HelpCenter />)
    expect(screen.getByTestId('help-icon')).toBeInTheDocument()
  })

  it('opens help panel on click', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Help Center')).toBeInTheDocument()
  })

  it('shows help topics', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
  })

  it('shows network setup topic', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Network Setup')).toBeInTheDocument()
  })

  it('shows get test ETH topic', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Get Test ETH')).toBeInTheDocument()
  })

  it('shows wallet setup topic', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Wallet Setup')).toBeInTheDocument()
  })

  it('shows vault security topic', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    expect(screen.getByText('Vault Security')).toBeInTheDocument()
  })

  it('can expand topic content', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    
    // Click on a topic to expand
    const gettingStarted = screen.getByText('Getting Started')
    fireEvent.click(gettingStarted)
    
    // Content should be visible
    expect(screen.getByText(/Connect your Web3 wallet/)).toBeInTheDocument()
  })

  it('can close help panel', () => {
    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    
    // Find close button
    const closeButton = screen.getByText('X').closest('button') || screen.getByText('X')
    fireEvent.click(closeButton)
    
    // Panel should be closed
    expect(screen.queryByText('Help Center')).not.toBeInTheDocument()
  })

  it('shows CardBound-safe vault security guidance when CardBound mode is active', () => {
    mockIsCardBoundVaultMode.mockReturnValue(true)

    render(<HelpCenter />)
    const helpButton = screen.getByTestId('help-icon').closest('button') || screen.getByTestId('help-icon')
    fireEvent.click(helpButton)
    fireEvent.click(screen.getByText('Vault Security'))

    expect(screen.getByText(/Wallet Rotation: Guardians can approve signer rotation and protect queued transfers\. Configure heirs and inheritance in the vault's Inheritance section\./i)).toBeInTheDocument()
    expect(screen.queryByText(/Next of Kin: Designate an heir to inherit your vault if something happens/i)).not.toBeInTheDocument()
  })
})
