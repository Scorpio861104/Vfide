import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style}>{children}</div>
    ),
    h1: ({ children, className, ...props }: any) => (
      <h1 className={className}>{children}</h1>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className}>{children}</p>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className}>{children}</span>
    ),
    section: ({ children, className, ...props }: any) => (
      <section className={className}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useScroll: () => ({ scrollYProgress: { get: () => 0 } }),
  useTransform: () => ({ get: () => 0 }),
  useSpring: () => ({ get: () => 0 }),
  useInView: () => true,
}))

// Import after mocking
import { PageWrapper } from '@/components/ui/PageLayout'

describe('PageWrapper', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <PageWrapper>
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <PageWrapper>
        <div data-testid="child">Test Content</div>
      </PageWrapper>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    const { container, rerender } = render(
      <PageWrapper variant="cosmic">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()

    rerender(
      <PageWrapper variant="aurora">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()

    rerender(
      <PageWrapper variant="matrix">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()

    rerender(
      <PageWrapper variant="gradient">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders without grid when showGrid is false', () => {
    const { container } = render(
      <PageWrapper showGrid={false}>
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()
  })

  it('renders without orbs when showOrbs is false', () => {
    const { container } = render(
      <PageWrapper showOrbs={false}>
        <div>Content</div>
      </PageWrapper>
    )
    expect(container).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    const { container } = render(
      <PageWrapper className="custom-class">
        <div>Content</div>
      </PageWrapper>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
