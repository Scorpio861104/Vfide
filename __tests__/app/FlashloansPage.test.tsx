import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import FlashLoansPage from '../../app/flashloans/page'
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
  const originalFetch = global.fetch

  beforeEach(() => {
    ;(global as typeof global & { fetch: jest.Mock }).fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('runs the happy-path p2p lifecycle', () => {
    render(<FlashLoansPage />)

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
    render(<FlashLoansPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Request Lane' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lender Approve Terms' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fund Escrow' }))

    fireEvent.change(screen.getByLabelText('Drawn Amount (USDC)'), {
      target: { value: '1000' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Borrower Draw' }))

    fireEvent.change(screen.getByPlaceholderText('Attach borrower/lender evidence summary...'), {
      target: { value: 'Borrower submits transaction proofs and timeline details.' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Raise Dispute' }))
    expect(screen.getByText('Disputed')).toBeInTheDocument()
    expect(screen.getByText('DAO Arbitration Required')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Resolve to Lender' }))
    expect(screen.getByText('Resolved: Lender')).toBeInTheDocument()
  })

  it('shows both-party protection status as satisfied with defaults', () => {
    render(<FlashLoansPage />)

    expect(
      screen.getByText('Both parties are currently protected under configured terms.')
    ).toBeInTheDocument()
  })

  it('blocks dispute without evidence and surfaces a clear error', () => {
    render(<FlashLoansPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Request Lane' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lender Approve Terms' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fund Escrow' }))

    fireEvent.click(screen.getByRole('button', { name: 'Raise Dispute' }))

    expect(screen.getByText(/Dispute requires evidence note/i)).toBeInTheDocument()
  })

  it('creates server lane and switches mode to server', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lane: {
          id: 11,
          borrower_address: '0x1111111111111111111111111111111111111111',
          lender_address: '0x2222222222222222222222222222222222222222',
          arbiter_address: '0x3333333333333333333333333333333333333333',
          principal: '1500',
          duration_days: 14,
          interest_bps: 600,
          collateral_pct: 125,
          drawn_amount: '1500',
          stage: 'draft',
          sim_day: 0,
          due_day: null,
          evidence_note: '',
        },
      }),
    })

    render(<FlashLoansPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Create Server Lane' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Server Lane #11' })).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: 'Mode: Server' })).toBeInTheDocument()
  })

  it('surfaces server action failure and then succeeds on retry', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          lane: {
            id: 12,
            borrower_address: '0x1111111111111111111111111111111111111111',
            lender_address: '0x2222222222222222222222222222222222222222',
            arbiter_address: '0x3333333333333333333333333333333333333333',
            principal: '1500',
            duration_days: 14,
            interest_bps: 600,
            collateral_pct: 125,
            drawn_amount: '1500',
            stage: 'draft',
            sim_day: 0,
            due_day: null,
            evidence_note: '',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server action failed: request' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          lane: {
            id: 12,
            borrower_address: '0x1111111111111111111111111111111111111111',
            lender_address: '0x2222222222222222222222222222222222222222',
            arbiter_address: '0x3333333333333333333333333333333333333333',
            principal: '1500',
            duration_days: 14,
            interest_bps: 600,
            collateral_pct: 125,
            drawn_amount: '1500',
            stage: 'requested',
            sim_day: 0,
            due_day: null,
            evidence_note: '',
          },
          event: 'Borrower requested lane',
        }),
      })

    render(<FlashLoansPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Create Server Lane' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Server Lane #12' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Request Lane' }))

    await waitFor(() => {
      expect(screen.getByText('Server action failed: request')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Request Lane' }))

    await waitFor(() => {
      expect(screen.getByText('Requested')).toBeInTheDocument()
    })
  })
})
