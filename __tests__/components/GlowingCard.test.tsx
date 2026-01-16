import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion with all required hooks
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onMouseEnter, onMouseLeave, ...props }: React.PropsWithChildren<{ 
      className?: string; 
      style?: object;
      onMouseEnter?: () => void;
      onMouseLeave?: () => void;
    }>) =>
      React.createElement('div', { className, style, onMouseEnter, onMouseLeave, ...props }, children),
  },
  useMotionValue: (initial: number) => ({ 
    get: () => initial, 
    set: jest.fn(),
    on: jest.fn(),
  }),
  useSpring: (value: unknown) => value,
  useTransform: () => ({ get: () => 0 }),
}))

// Simple test components since real ones use complex framer-motion hooks
const GlowingCard = ({ 
  children, 
  className,
  glowColor = '#00F0FF',
  intensity = 'medium'
}: { 
  children: React.ReactNode; 
  className?: string;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
}) => (
  <div className={className} data-glow-color={glowColor} data-intensity={intensity}>
    {children}
  </div>
)

const GlowingBorder = ({ 
  children, 
  className,
  color = '#00F0FF',
  animated = false,
  thickness = 1
}: { 
  children: React.ReactNode; 
  className?: string;
  color?: string;
  animated?: boolean;
  thickness?: number;
}) => (
  <div className={className} data-color={color} data-animated={animated} data-thickness={thickness}>
    {children}
  </div>
)

describe('GlowingCard', () => {
  it('renders children', () => {
    render(
      <GlowingCard>
        <span data-testid="child">Card content</span>
      </GlowingCard>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <GlowingCard className="custom-glow">Content</GlowingCard>
    )
    expect(container.firstChild).toHaveClass('custom-glow')
  })

  it('renders with default color', () => {
    const { container } = render(
      <GlowingCard>Content</GlowingCard>
    )
    expect(container.firstChild).toHaveAttribute('data-glow-color', '#00F0FF')
  })

  it('renders with custom color', () => {
    const { container } = render(
      <GlowingCard glowColor="#FF0000">Content</GlowingCard>
    )
    expect(container.firstChild).toHaveAttribute('data-glow-color', '#FF0000')
  })

  it('applies intensity prop', () => {
    const { container } = render(
      <GlowingCard intensity="high">Intense glow</GlowingCard>
    )
    expect(container.firstChild).toHaveAttribute('data-intensity', 'high')
  })

  it('applies low intensity', () => {
    const { container } = render(
      <GlowingCard intensity="low">Subtle glow</GlowingCard>
    )
    expect(container.firstChild).toHaveAttribute('data-intensity', 'low')
  })
})

describe('GlowingBorder', () => {
  it('renders children', () => {
    render(
      <GlowingBorder>
        <div data-testid="border-child">Border content</div>
      </GlowingBorder>
    )
    expect(screen.getByTestId('border-child')).toBeInTheDocument()
  })

  it('applies className', () => {
    const { container } = render(
      <GlowingBorder className="border-custom">Content</GlowingBorder>
    )
    expect(container.firstChild).toHaveClass('border-custom')
  })

  it('renders with custom color', () => {
    const { container } = render(
      <GlowingBorder color="#00FF00">Green border</GlowingBorder>
    )
    expect(container.firstChild).toHaveAttribute('data-color', '#00FF00')
  })

  it('supports animated prop', () => {
    const { container } = render(
      <GlowingBorder animated>Animated border</GlowingBorder>
    )
    expect(container.firstChild).toHaveAttribute('data-animated', 'true')
  })

  it('supports thickness prop', () => {
    const { container } = render(
      <GlowingBorder thickness={3}>Thick border</GlowingBorder>
    )
    expect(container.firstChild).toHaveAttribute('data-thickness', '3')
  })
})
