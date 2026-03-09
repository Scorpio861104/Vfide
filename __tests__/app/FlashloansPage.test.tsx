import { fireEvent, render, screen } from '@testing-library/react'
import FlashlightPage from '@/app/flashlight/page'
import React from 'react'

jest.mock('framer-motion', () => ({
  motion: {
    main: ({ children, ...props }: any) => React.createElement('main', props, children),
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
  },
}))

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}))

describe('FlashloansPage', () => {
  it('runs the happy-path p2p lifecycle', () => {
    render(<FlashlightPage />)

    expect(screen.getByText('Current Stage')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Request Lane' }))
    expect(screen.getByText('Requested')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Lender Approve Terms' }))
    expect(screen.getByText('Approved')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fund Escrow' }))
    expect(screen.getByText('Escrow Funded')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Borrower Draw' }))
    expect(screen.getByText('Borrower Drawn')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Repay + Close' }))
    expect(screen.getByText('Repaid')).toBeInTheDocument()
  })

  it('supports dispute and resolution path', () => {
    render(<FlashlightPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Request Lane' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lender Approve Terms' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fund Escrow' }))

    fireEvent.click(screen.getByRole('button', { name: 'Raise Dispute' }))
    expect(screen.getByText('Disputed')).toBeInTheDocument()
    expect(screen.getByText('DAO Arbitration Required')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Resolve to Lender' }))
    expect(screen.getByText('Resolved: Lender')).toBeInTheDocument()
  })

  it('shows both-party protection status as satisfied with defaults', () => {
    render(<FlashlightPage />)

    expect(
      screen.getByText('Both parties are currently protected under configured terms.')
    ).toBeInTheDocument()
  })
})
