import { describe, expect, it, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
jest.mock('lucide-react', () => ({
  HelpCircle: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'help-icon' }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) =>
      React.createElement('div', { className }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

import { HelpTooltip, HelpTerm } from '@/components/ui/HelpTooltip'

describe('HelpTooltip', () => {
  it('renders the help icon', () => {
    render(<HelpTooltip term="ProofScore" />)
    expect(screen.getByTestId('help-icon')).toBeInTheDocument()
  })

  it('shows tooltip on hover with glossary term', () => {
    render(<HelpTooltip term="ProofScore" />)
    const trigger = screen.getByTestId('help-icon').parentElement!
    
    fireEvent.mouseEnter(trigger)
    expect(screen.getByText('ProofScore')).toBeInTheDocument()
    expect(screen.getByText(/dynamic reputation score/i)).toBeInTheDocument()
  })

  it('hides tooltip on mouse leave', () => {
    render(<HelpTooltip term="ProofScore" />)
    const trigger = screen.getByTestId('help-icon').parentElement!
    
    fireEvent.mouseEnter(trigger)
    expect(screen.getByText('ProofScore')).toBeInTheDocument()
    
    fireEvent.mouseLeave(trigger)
    // After leave, the term title should not be visible
    expect(screen.queryByText(/dynamic reputation score/i)).not.toBeInTheDocument()
  })

  it('shows custom children instead of glossary', () => {
    render(<HelpTooltip term="Custom">Custom explanation here</HelpTooltip>)
    const trigger = screen.getByTestId('help-icon').parentElement!
    
    fireEvent.mouseEnter(trigger)
    expect(screen.getByText('Custom explanation here')).toBeInTheDocument()
  })

  it('shows fallback for unknown terms', () => {
    render(<HelpTooltip term="UnknownTerm" />)
    const trigger = screen.getByTestId('help-icon').parentElement!
    
    fireEvent.mouseEnter(trigger)
    expect(screen.getByText('Learn more about UnknownTerm')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<HelpTooltip term="Test" className="custom-class" />)
    const trigger = screen.getByTestId('help-icon').parentElement!
    expect(trigger.className).toContain('custom-class')
  })

  it('toggles on touch', () => {
    render(<HelpTooltip term="ProofScore" />)
    const trigger = screen.getByTestId('help-icon').parentElement!
    
    fireEvent.touchStart(trigger)
    expect(screen.getByText(/dynamic reputation score/i)).toBeInTheDocument()
    
    fireEvent.touchStart(trigger)
    expect(screen.queryByText(/dynamic reputation score/i)).not.toBeInTheDocument()
  })

  describe('positions', () => {
    it('applies top position by default', () => {
      render(<HelpTooltip term="Test" />)
      const trigger = screen.getByTestId('help-icon').parentElement!
      fireEvent.mouseEnter(trigger)
      
      const tooltip = screen.getByText('Test').parentElement
      expect(tooltip?.parentElement?.className).toContain('bottom-full')
    })

    it('applies bottom position', () => {
      render(<HelpTooltip term="Test" position="bottom" />)
      const trigger = screen.getByTestId('help-icon').parentElement!
      fireEvent.mouseEnter(trigger)
      
      const tooltip = screen.getByText('Test').parentElement
      expect(tooltip?.parentElement?.className).toContain('top-full')
    })
  })
})

describe('HelpTerm', () => {
  it('renders term with dotted underline', () => {
    render(<HelpTerm term="Vault" />)
    expect(screen.getByText('Vault')).toBeInTheDocument()
  })

  it('includes HelpTooltip', () => {
    render(<HelpTerm term="Vault" />)
    expect(screen.getByTestId('help-icon')).toBeInTheDocument()
  })

  it('shows tooltip on hover with glossary definition', () => {
    render(<HelpTerm term="Vault" />)
    const trigger = screen.getByTestId('help-icon').parentElement!
    
    fireEvent.mouseEnter(trigger)
    expect(screen.getByText(/personal smart contract wallet/i)).toBeInTheDocument()
  })
})

describe('glossary terms', () => {
  const glossaryTerms = [
    'ProofScore',
    'Vault',
    'Guardian',
    'Next of Kin',
    'Escrow',
    'Burn',
    'Sanctum',
    'Quarantine',
    'Council',
    'Tier',
    'Transfer Fee',
    'Commitment Period',
    'Badge',
    'Soulbound',
    'Gas',
  ]

  it.each(glossaryTerms)('has definition for %s', (term) => {
    render(<HelpTooltip term={term} />)
    const trigger = screen.getByTestId('help-icon').parentElement!
    
    fireEvent.mouseEnter(trigger)
    // Should not show fallback message
    expect(screen.queryByText(`Learn more about ${term}`)).not.toBeInTheDocument()
  })
})
