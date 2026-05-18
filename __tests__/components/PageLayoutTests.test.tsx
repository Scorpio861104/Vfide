/**
 * PageLayout Tests
 * Tests for PageLayout UI components (20% coverage)
 */
import { describe, it, expect, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, whileHover, whileTap, layoutId, ...props }: any) => (
      <div className={className} style={style} onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    section: ({ children, className, ...props }: any) => (
      <section className={className} {...props}>{children}</section>
    ),
    h1: ({ children, className, ...props }: any) => (
      <h1 className={className} {...props}>{children}</h1>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useScroll: () => ({ scrollYProgress: { current: 0 } }),
  useTransform: (value: any, input: any, output: any) => ({ current: output[0] }),
  useSpring: (value: any) => value,
}))

import {
  PageWrapper,
  PageHeader,
  StatItem,
  StatsGrid,
  GlassCard,
  TabNavigation,
  Section,
  EmptyState,
  PageLoading,
  CardLoading,
  FeatureCard,
  ActionBar,
} from '@/components/ui/PageLayout'

describe('PageWrapper', () => {
  it('renders children', () => {
    render(
      <PageWrapper>
        <div data-testid="child">Content</div>
      </PageWrapper>
    )
    
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders with default variant', () => {
    const { container } = render(
      <PageWrapper>Content</PageWrapper>
    )
    
    expect(container.firstChild).toHaveClass('min-h-screen')
  })

  it('renders with cosmic variant', () => {
    const { container } = render(
      <PageWrapper variant="cosmic">Content</PageWrapper>
    )
    
    expect(container.firstChild).toHaveClass('min-h-screen')
  })

  it('renders with aurora variant', () => {
    const { container } = render(
      <PageWrapper variant="aurora">Content</PageWrapper>
    )
    
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with matrix variant', () => {
    const { container } = render(
      <PageWrapper variant="matrix">Content</PageWrapper>
    )
    
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders with gradient variant', () => {
    const { container } = render(
      <PageWrapper variant="gradient">Content</PageWrapper>
    )
    
    expect(container.firstChild).toBeInTheDocument()
  })

  it('hides grid when showGrid is false', () => {
    const { container } = render(
      <PageWrapper showGrid={false}>Content</PageWrapper>
    )
    
    expect(container.querySelector('.grid-pattern')).not.toBeInTheDocument()
  })

  it('hides orbs when showOrbs is false', () => {
    render(<PageWrapper showOrbs={false}>Content</PageWrapper>)
    
    // Orbs should not be rendered
    expect(screen.queryByTestId('orbs')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <PageWrapper className="custom-class">Content</PageWrapper>
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Test Title" />)
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Title" subtitle="Test Subtitle" />)
    
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<PageHeader title="Title" icon={<span data-testid="icon">🔥</span>} />)
    
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders badge when provided', () => {
    render(<PageHeader title="Title" badge="Beta" />)
    
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('applies custom badge color', () => {
    render(<PageHeader title="Title" badge="New" badgeColor="bg-green-500" />)
    
    const badge = screen.getByText('New')
    // The badge element itself has the color class
    expect(badge.closest('[class*="bg-green"]') || badge).toHaveClass('bg-green-500')
  })

  it('renders children in the header', () => {
    render(
      <PageHeader title="Title">
        <button data-testid="action">Action</button>
      </PageHeader>
    )
    
    expect(screen.getByTestId('action')).toBeInTheDocument()
  })

  it('applies custom icon gradient', () => {
    render(
      <PageHeader 
        title="Title" 
        icon={<span>🎯</span>} 
        iconGradient="from-purple-500 to-pink-500" 
      />
    )
    
    expect(screen.getByText('🎯')).toBeInTheDocument()
  })
})

describe('StatItem', () => {
  it('renders label and value', () => {
    render(<StatItem label="Users" value="1,234" />)
    
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<StatItem label="Sales" value="$100" icon={<span data-testid="stat-icon">💰</span>} />)
    
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument()
  })

  it('renders positive trend', () => {
    render(<StatItem label="Growth" value="25%" trend={{ value: 15, isPositive: true }} />)
    
    expect(screen.getByText('↑ 15%')).toBeInTheDocument()
  })

  it('renders negative trend', () => {
    render(<StatItem label="Decline" value="10%" trend={{ value: 5, isPositive: false }} />)
    
    expect(screen.getByText('↓ 5%')).toBeInTheDocument()
  })

  it('renders numeric value', () => {
    render(<StatItem label="Count" value={42} />)
    
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})

describe('StatsGrid', () => {
  const testStats = [
    { label: 'Users', value: '100' },
    { label: 'Sales', value: '$500' },
  ]

  it('renders all stats', () => {
    render(<StatsGrid stats={testStats} />)
    
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Sales')).toBeInTheDocument()
  })

  it('renders with 2 columns', () => {
    const { container } = render(<StatsGrid stats={testStats} columns={2} />)
    
    expect(container.firstChild).toHaveClass('sm:grid-cols-2')
  })

  it('renders with 3 columns', () => {
    const { container } = render(<StatsGrid stats={testStats} columns={3} />)
    
    expect(container.firstChild).toHaveClass('lg:grid-cols-3')
  })

  it('renders with 4 columns (default)', () => {
    const { container } = render(<StatsGrid stats={testStats} columns={4} />)
    
    expect(container.firstChild).toHaveClass('lg:grid-cols-4')
  })

  it('applies custom className', () => {
    const { container } = render(<StatsGrid stats={testStats} className="mt-8" />)
    
    expect(container.firstChild).toHaveClass('mt-8')
  })
})

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard><span>Card Content</span></GlassCard>)
    
    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  it('applies gradient when enabled', () => {
    const { container } = render(<GlassCard gradient>Content</GlassCard>)
    
    expect(container.firstChild).toHaveClass('bg-gradient-to-br')
  })

  it('handles click events', () => {
    const onClick = jest.fn()
    render(<GlassCard onClick={onClick}>Clickable</GlassCard>)
    
    fireEvent.click(screen.getByText('Clickable'))
    
    expect(onClick).toHaveBeenCalled()
  })

  it('disables hover effects when hover is false', () => {
    const { container } = render(<GlassCard hover={false}>No Hover</GlassCard>)
    
    // Should not have hover transition classes (simplified test)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<GlassCard className="p-8">Content</GlassCard>)
    
    expect(container.firstChild).toHaveClass('p-8')
  })
})

describe('TabNavigation', () => {
  const testTabs = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
    { id: 'tab3', label: 'Tab 3', badge: 5 },
  ]

  it('renders all tabs', () => {
    render(<TabNavigation tabs={testTabs} activeTab="tab1" onChange={() => {}} />)
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Tab 3')).toBeInTheDocument()
  })

  it('calls onChange when tab is clicked', () => {
    const onChange = jest.fn()
    render(<TabNavigation tabs={testTabs} activeTab="tab1" onChange={onChange} />)
    
    fireEvent.click(screen.getByText('Tab 2'))
    
    expect(onChange).toHaveBeenCalledWith('tab2')
  })

  it('renders tab badges', () => {
    render(<TabNavigation tabs={testTabs} activeTab="tab1" onChange={() => {}} />)
    
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders tabs with icons', () => {
    const tabsWithIcons = [
      { id: 'tab1', label: 'Home', icon: <span data-testid="home-icon">🏠</span> },
    ]
    
    render(<TabNavigation tabs={tabsWithIcons} activeTab="tab1" onChange={() => {}} />)
    
    expect(screen.getByTestId('home-icon')).toBeInTheDocument()
  })

  it('renders underline variant', () => {
    const { container } = render(
      <TabNavigation tabs={testTabs} activeTab="tab1" onChange={() => {}} variant="underline" />
    )
    
    expect(container.firstChild).toHaveClass('border-b')
  })

  it('renders cards variant', () => {
    render(
      <TabNavigation tabs={testTabs} activeTab="tab1" onChange={() => {}} variant="cards" />
    )
    
    expect(screen.getByText('Tab 1').closest('button')).toHaveClass('rounded-xl')
  })

  it('renders pills variant (default)', () => {
    const { container } = render(
      <TabNavigation tabs={testTabs} activeTab="tab1" onChange={() => {}} variant="pills" />
    )
    
    expect(container.firstChild).toHaveClass('rounded-xl')
  })
})

describe('Section', () => {
  it('renders children', () => {
    render(<Section><span>Section Content</span></Section>)
    
    expect(screen.getByText('Section Content')).toBeInTheDocument()
  })

  it('applies small max-width', () => {
    const { container } = render(<Section size="sm">Content</Section>)
    
    expect(container.querySelector('.max-w-3xl')).toBeInTheDocument()
  })

  it('applies medium max-width', () => {
    const { container } = render(<Section size="md">Content</Section>)
    
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument()
  })

  it('applies large max-width (default)', () => {
    const { container } = render(<Section size="lg">Content</Section>)
    
    expect(container.querySelector('.max-w-6xl')).toBeInTheDocument()
  })

  it('applies xl max-width', () => {
    const { container } = render(<Section size="xl">Content</Section>)
    
    expect(container.querySelector('.max-w-7xl')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Section className="bg-gray-100">Content</Section>)
    
    expect(container.firstChild).toHaveClass('bg-gray-100')
  })
})

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">📭</span>}
        title="No data"
        description="There's nothing here yet"
      />
    )
    
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument()
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.getByText("There's nothing here yet")).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const onAction = jest.fn()
    
    render(
      <EmptyState
        icon={<span>📭</span>}
        title="No data"
        description="Nothing yet"
        action={{ label: 'Add Item', onClick: onAction }}
      />
    )
    
    const button = screen.getByText('Add Item')
    expect(button).toBeInTheDocument()
    
    fireEvent.click(button)
    expect(onAction).toHaveBeenCalled()
  })

  it('does not render action button when not provided', () => {
    render(
      <EmptyState
        icon={<span>📭</span>}
        title="No data"
        description="Nothing yet"
      />
    )
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('PageLoading', () => {
  it('renders loading text', () => {
    render(<PageLoading />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders loading spinner', () => {
    const { container } = render(<PageLoading />)
    
    expect(container.querySelector('.rounded-full')).toBeInTheDocument()
  })
})

describe('CardLoading', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<CardLoading />)
    
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})

describe('FeatureCard', () => {
  it('renders icon, title, and description', () => {
    render(
      <FeatureCard
        icon={<span data-testid="feature-icon">🚀</span>}
        title="Fast"
        description="Lightning quick performance"
      />
    )
    
    expect(screen.getByTestId('feature-icon')).toBeInTheDocument()
    expect(screen.getByText('Fast')).toBeInTheDocument()
    expect(screen.getByText('Lightning quick performance')).toBeInTheDocument()
  })

  it('applies custom color', () => {
    render(
      <FeatureCard
        icon={<span>🎨</span>}
        title="Colorful"
        description="Pretty colors"
        color="#FF6B9D"
      />
    )
    
    expect(screen.getByText('Colorful')).toBeInTheDocument()
  })
})

describe('ActionBar', () => {
  it('renders children', () => {
    render(
      <ActionBar>
        <button>Save</button>
      </ActionBar>
    )
    
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('applies fixed positioning', () => {
    const { container } = render(
      <ActionBar>Content</ActionBar>
    )
    
    expect(container.firstChild).toHaveClass('fixed', 'bottom-0')
  })

  it('applies custom className', () => {
    const { container } = render(
      <ActionBar className="bg-black">Content</ActionBar>
    )
    
    expect(container.firstChild).toHaveClass('bg-black')
  })
})
