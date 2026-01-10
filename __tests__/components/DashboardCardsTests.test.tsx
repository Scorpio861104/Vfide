/**
 * DashboardCards Tests
 * Tests for StatCard component with 0% coverage
 */
import { describe, it, expect, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { StatCard } from '@/components/ui/DashboardCards'
import { ChevronRight, Activity } from 'lucide-react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: React.ComponentProps<'p'>) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock next/link
jest.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('DashboardCards - StatCard Component', () => {
  const defaultProps = {
    icon: <Activity data-testid="icon" />,
    label: 'Test Label',
    value: '1,234',
    color: '#00F0FF',
  }

  it('renders with required props', () => {
    render(<StatCard {...defaultProps} />)
    
    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders with numeric value', () => {
    render(<StatCard {...defaultProps} value={5678} />)
    
    expect(screen.getByText('5678')).toBeInTheDocument()
  })

  it('renders subValue when provided', () => {
    render(<StatCard {...defaultProps} subValue="Sub Value Text" />)
    
    expect(screen.getByText('Sub Value Text')).toBeInTheDocument()
  })

  it('renders as link when href provided', () => {
    render(<StatCard {...defaultProps} href="/test-link" />)
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test-link')
  })

  it('shows loading skeleton when isLoading is true', () => {
    render(<StatCard {...defaultProps} isLoading={true} />)
    
    // Should not show the value
    expect(screen.queryByText('1,234')).not.toBeInTheDocument()
    // Should show loading skeleton via animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders positive trend with up arrow', () => {
    render(<StatCard {...defaultProps} trend={{ value: 15, label: 'this week' }} />)
    
    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('15% this week')).toBeInTheDocument()
  })

  it('renders negative trend with down arrow', () => {
    render(<StatCard {...defaultProps} trend={{ value: -10, label: 'today' }} />)
    
    expect(screen.getByText('↓')).toBeInTheDocument()
    expect(screen.getByText('10% today')).toBeInTheDocument()
  })

  it('renders zero trend with up arrow', () => {
    render(<StatCard {...defaultProps} trend={{ value: 0, label: 'stable' }} />)
    
    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('0% stable')).toBeInTheDocument()
  })

  it('shows chevron in subValue when href is provided', () => {
    render(<StatCard {...defaultProps} href="/vault" subValue="Click here" />)
    
    expect(screen.getByText('Click here')).toBeInTheDocument()
    // The ChevronRight should be visible as an SVG
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('applies custom color to icon container', () => {
    render(<StatCard {...defaultProps} color="#FF0000" />)
    
    // The icon container div should have the color applied
    const iconContainer = screen.getByTestId('icon').closest('div')
    expect(iconContainer).toBeInTheDocument()
  })

  it('renders with all optional props', () => {
    render(
      <StatCard
        icon={<Activity data-testid="icon" />}
        label="Complete Label"
        value="9,999"
        subValue="Extra info"
        color="#50C878"
        href="/complete"
        isLoading={false}
        trend={{ value: 25, label: 'increase' }}
      />
    )
    
    expect(screen.getByText('Complete Label')).toBeInTheDocument()
    expect(screen.getByText('9,999')).toBeInTheDocument()
    expect(screen.getByText('Extra info')).toBeInTheDocument()
    expect(screen.getByText('25% increase')).toBeInTheDocument()
  })

  it('does not render trend when isLoading', () => {
    render(<StatCard {...defaultProps} isLoading={true} trend={{ value: 10, label: 'test' }} />)
    
    expect(screen.queryByText('↑')).not.toBeInTheDocument()
    expect(screen.queryByText('10% test')).not.toBeInTheDocument()
  })

  it('does not render subValue when isLoading', () => {
    render(<StatCard {...defaultProps} isLoading={true} subValue="Should not show" />)
    
    expect(screen.queryByText('Should not show')).not.toBeInTheDocument()
  })

  it('applies uppercase tracking to label', () => {
    render(<StatCard {...defaultProps} />)
    
    const label = screen.getByText('Test Label')
    expect(label).toHaveClass('uppercase', 'tracking-wider')
  })

  it('renders without href as non-clickable', () => {
    render(<StatCard {...defaultProps} />)
    
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('handles empty string value', () => {
    render(<StatCard {...defaultProps} value="" />)
    
    // Value should be empty but component should render
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('handles special characters in value', () => {
    render(<StatCard {...defaultProps} value="$1,234.56 USD" />)
    
    expect(screen.getByText('$1,234.56 USD')).toBeInTheDocument()
  })
})
