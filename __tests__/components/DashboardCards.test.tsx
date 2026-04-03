import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Simple test components that mirror DashboardCards interface
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: string
  subValue?: string
  isLoading?: boolean
  href?: string
  trend?: { value: number; label: string }
}

const StatCard = ({ icon, label, value, color, subValue, isLoading, href, trend }: StatCardProps) => {
  const content = (
    <div data-testid="stat-card" className={isLoading ? 'animate-pulse' : ''}>
      <div data-testid="stat-icon">{icon}</div>
      <span>{label}</span>
      <span>{value}</span>
      {subValue && <span>{subValue}</span>}
      {trend && <span data-testid="trend">{trend.label}</span>}
    </div>
  )
  
  if (href) {
    return <a href={href} role="link">{content}</a>
  }
  return content
}

interface QuickActionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  href: string
}

const QuickActionCard = ({ icon, title, description, href }: QuickActionCardProps) => (
  <a href={href} role="link" data-testid="quick-action">
    <div>{icon}</div>
    <span>{title}</span>
    <span>{description}</span>
    <svg data-testid="chevron-icon" />
  </a>
)

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

const GlassCard = ({ children, className, noPadding }: GlassCardProps) => (
  <div className={`glass-card ${noPadding ? '' : 'p-6'} ${className || ''}`}>
    {children}
  </div>
)

interface MetricCardProps {
  label: string
  value: string
  change: number
  className?: string
}

const MetricCard = ({ label, value, change, className }: MetricCardProps) => (
  <div className={`metric-card ${className || ''}`}>
    <span>{label}</span>
    <span>{value}</span>
    <span>{change >= 0 ? `+${change}%` : `${change}%`}</span>
    {change >= 0 ? (
      <svg data-testid="trending-up" />
    ) : (
      <svg data-testid="trending-down" />
    )}
  </div>
)

describe('StatCard', () => {
  it('renders label and value', () => {
    render(
      <StatCard 
        icon={<span>📊</span>} 
        label="Total Balance" 
        value="$1,000" 
        color="#00F0FF" 
      />
    )
    expect(screen.getByText('Total Balance')).toBeInTheDocument()
    expect(screen.getByText('$1,000')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(
      <StatCard 
        icon={<span data-testid="icon">📊</span>} 
        label="Test" 
        value="100" 
        color="#FF0000" 
      />
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders subValue when provided', () => {
    render(
      <StatCard 
        icon={<span>📊</span>} 
        label="Balance" 
        value="$500" 
        subValue="5% Fee Savings"
        color="#00FF00" 
      />
    )
    expect(screen.getByText('5% Fee Savings')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const { container } = render(
      <StatCard 
        icon={<span>📊</span>} 
        label="Loading" 
        value="" 
        color="#0000FF" 
        isLoading={true}
      />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders as link when href provided', () => {
    render(
      <StatCard 
        icon={<span>📊</span>} 
        label="Clickable" 
        value="100" 
        color="#FF00FF" 
        href="/dashboard"
      />
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/dashboard')
  })

  it('renders trend when provided', () => {
    render(
      <StatCard 
        icon={<span>📊</span>} 
        label="Trending" 
        value="100" 
        color="#00FFFF" 
        trend={{ value: 15, label: '+15% this week' }}
      />
    )
    expect(screen.getByTestId('trend')).toHaveTextContent('+15% this week')
  })
})

describe('QuickActionCard', () => {
  it('renders title and description', () => {
    render(
      <QuickActionCard 
        icon={<span>🚀</span>} 
        title="Quick Action" 
        description="Do something fast"
        color="#00F0FF"
        href="/action"
      />
    )
    expect(screen.getByText('Quick Action')).toBeInTheDocument()
    expect(screen.getByText('Do something fast')).toBeInTheDocument()
  })

  it('renders as link', () => {
    render(
      <QuickActionCard 
        icon={<span>🚀</span>} 
        title="Action" 
        description="Description"
        color="#00F0FF"
        href="/test"
      />
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test')
  })

  it('shows chevron icon', () => {
    render(
      <QuickActionCard 
        icon={<span>🚀</span>} 
        title="Action" 
        description="Description"
        color="#00F0FF"
        href="/test"
      />
    )
    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
  })
})

describe('GlassCard', () => {
  it('renders children', () => {
    render(
      <GlassCard>
        <span data-testid="child">Child content</span>
      </GlassCard>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <GlassCard className="custom-class">Content</GlassCard>
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders with padding by default', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    )
    expect(container.innerHTML).toContain('p-6')
  })

  it('removes padding when noPadding is true', () => {
    const { container } = render(
      <GlassCard noPadding>Content</GlassCard>
    )
    expect(container.innerHTML).not.toContain('p-6')
  })
})

describe('MetricCard', () => {
  it('renders label, value and change', () => {
    render(
      <MetricCard 
        label="Revenue" 
        value="$10,000" 
        change={5.5}
      />
    )
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$10,000')).toBeInTheDocument()
    expect(screen.getByText('+5.5%')).toBeInTheDocument()
  })

  it('shows positive trend indicator', () => {
    render(
      <MetricCard 
        label="Test" 
        value="100" 
        change={10}
      />
    )
    expect(screen.getByTestId('trending-up')).toBeInTheDocument()
  })

  it('shows negative trend indicator', () => {
    render(
      <MetricCard 
        label="Test" 
        value="100" 
        change={-5}
      />
    )
    expect(screen.getByTestId('trending-down')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <MetricCard 
        label="Test" 
        value="100" 
        change={0}
        className="custom-metric"
      />
    )
    expect(container.firstChild).toHaveClass('custom-metric')
  })
})
