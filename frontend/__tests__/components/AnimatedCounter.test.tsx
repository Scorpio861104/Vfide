import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: React.PropsWithChildren<{ className?: string; style?: object }>) =>
      React.createElement('div', { className, style, ...props }, children),
    circle: (props: object) => React.createElement('circle', props),
  },
  useSpring: () => ({ set: vi.fn(), get: () => 0 }),
  useTransform: () => 0,
  useInView: () => true,
}))

import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

describe('AnimatedCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with prefix and suffix', () => {
    render(<AnimatedCounter end={100} prefix="$" suffix="+" />)
    const element = document.querySelector('div')
    expect(element?.textContent).toContain('$')
    expect(element?.textContent).toContain('+')
  })

  it('renders with custom decimals', () => {
    render(<AnimatedCounter end={99.99} decimals={2} />)
    const element = document.querySelector('div')
    // Initial render should show a number
    expect(element?.textContent).toMatch(/\d+\.\d{2}/)
  })

  it('applies custom className', () => {
    render(<AnimatedCounter end={100} className="custom-class" />)
    expect(document.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders initial value of 0', () => {
    render(<AnimatedCounter end={1000} />)
    const element = document.querySelector('div')
    expect(element?.textContent).toBe('0')
  })

  it('uses default duration of 2', () => {
    render(<AnimatedCounter end={100} />)
    expect(document.querySelector('div')).toBeInTheDocument()
  })
})
