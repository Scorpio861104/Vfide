import { describe, expect, it } from '@jest/globals'
import { render } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: React.PropsWithChildren<{ className?: string; style?: object }>) =>
      React.createElement('div', { className, style, ...props }, children),
    circle: (props: object) => React.createElement('circle', props),
  },
  useSpring: () => ({ set: jest.fn(), get: () => 0 }),
  useTransform: (spring: unknown, fn: (v: number) => number) => fn(0),
}))

import { ProofScoreRing, ProofScoreCard } from '@/components/ui/ProofScoreRing'

describe('ProofScoreRing', () => {
  it('renders with score', () => {
    const { container } = render(<ProofScoreRing score={5000} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies sm size', () => {
    const { container } = render(<ProofScoreRing score={5000} size="sm" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '80')
  })

  it('applies md size by default', () => {
    const { container } = render(<ProofScoreRing score={5000} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '120')
  })

  it('applies lg size', () => {
    const { container } = render(<ProofScoreRing score={5000} size="lg" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '180')
  })

  it('shows label by default', () => {
    const { container } = render(<ProofScoreRing score={5000} />)
    expect(container.textContent).toContain('TRUSTED')
  })

  it('hides label when showLabel is false', () => {
    const { container } = render(<ProofScoreRing score={5000} showLabel={false} />)
    expect(container.textContent).not.toContain('TRUSTED')
  })

  it('applies custom className', () => {
    const { container } = render(<ProofScoreRing score={5000} className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  describe('tier colors', () => {
    it('shows ELITE for score >= 8000', () => {
      const { container } = render(<ProofScoreRing score={8000} />)
      expect(container.textContent).toContain('ELITE')
    })

    it('shows VERIFIED for score >= 7000', () => {
      const { container } = render(<ProofScoreRing score={7000} />)
      expect(container.textContent).toContain('VERIFIED')
    })

    it('shows TRUSTED for score >= 5000', () => {
      const { container } = render(<ProofScoreRing score={5000} />)
      expect(container.textContent).toContain('TRUSTED')
    })

    it('shows NEUTRAL for score < 5000', () => {
      const { container } = render(<ProofScoreRing score={4000} />)
      expect(container.textContent).toContain('NEUTRAL')
    })
  })
})

describe('ProofScoreCard', () => {
  it('renders with score and fee rate', () => {
    const { container } = render(<ProofScoreCard score={6000} feeRate={2.5} />)
    expect(container.textContent).toContain('Your ProofScore')
    expect(container.textContent).toContain('2.50% Fee')
  })

  it('shows score breakdown', () => {
    const { container } = render(<ProofScoreCard score={7000} feeRate={1.0} />)
    expect(container.textContent).toContain('Base Score')
    expect(container.textContent).toContain('Vault Created')
    expect(container.textContent).toContain('Transactions')
    expect(container.textContent).toContain('Governance')
    expect(container.textContent).toContain('Badges')
  })

  it('includes ProofScoreRing', () => {
    const { container } = render(<ProofScoreCard score={6000} feeRate={2.0} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ProofScoreCard score={5000} feeRate={3.0} className="custom-card" />
    )
    expect(container.firstChild).toHaveClass('custom-card')
  })
})
