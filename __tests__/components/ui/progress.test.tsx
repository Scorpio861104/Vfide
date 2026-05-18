/**
 * Comprehensive tests for Progress primitive component
 */
import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Progress } from '@/components/ui/progress'

describe('Progress', () => {
  it('renders with 0% progress', () => {
    const { container } = render(<Progress value={0} />)
    // Progress component should render
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with 50% progress', () => {
    const { container } = render(<Progress value={50} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with 100% progress', () => {
    const { container } = render(<Progress value={100} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with undefined value', () => {
    render(<Progress />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Progress value={50} className="custom-progress" />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('custom-progress')
  })

  it('has correct base classes', () => {
    render(<Progress value={50} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('relative', 'overflow-hidden', 'rounded-full')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<Progress ref={ref} value={50} />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })

  it('indicator transforms based on value', () => {
    const { container } = render(<Progress value={75} />)
    // The indicator should have transform style
    const indicator = container.querySelector('[class*="bg-primary"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' })
  })

  it('renders with max attribute', () => {
    render(<Progress value={50} max={200} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toBeInTheDocument()
  })
})
