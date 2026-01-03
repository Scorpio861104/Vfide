/**
 * Stats Component Tests
 * Tests for statistics display and metrics components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up" />,
  TrendingDown: () => <span data-testid="trending-down" />,
  ArrowUp: () => <span data-testid="arrow-up" />,
  ArrowDown: () => <span data-testid="arrow-down" />,
  DollarSign: () => <span data-testid="dollar-sign" />,
  Users: () => <span data-testid="users-icon" />,
  Wallet: () => <span data-testid="wallet-icon" />,
  Activity: () => <span data-testid="activity-icon" />,
  BarChart: () => <span data-testid="bar-chart" />,
  PieChart: () => <span data-testid="pie-chart" />,
  LineChart: () => <span data-testid="line-chart" />,
  Clock: () => <span data-testid="clock-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
  Info: () => <span data-testid="info-icon" />,
}))

// Test StatCard pattern
describe('StatCard Pattern', () => {
  interface StatCardProps {
    label: string
    value: string | number
    change?: number
    changeLabel?: string
    icon?: React.ReactNode
  }

  function StatCard({ label, value, change, changeLabel = 'vs last period', icon }: StatCardProps) {
    const isPositive = change && change > 0
    const isNegative = change && change < 0

    return (
      <div data-testid="stat-card">
        <div data-testid="stat-header">
          {icon && <span data-testid="stat-icon">{icon}</span>}
          <span data-testid="stat-label">{label}</span>
        </div>
        <div data-testid="stat-value">{value}</div>
        {change !== undefined && (
          <div 
            data-testid="stat-change"
            className={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
          >
            <span data-testid="change-value">
              {isPositive ? '+' : ''}{change}%
            </span>
            <span data-testid="change-label">{changeLabel}</span>
          </div>
        )}
      </div>
    )
  }

  it('renders label correctly', () => {
    render(<StatCard label="Total Revenue" value="$10,000" />)
    expect(screen.getByTestId('stat-label')).toHaveTextContent('Total Revenue')
  })

  it('renders value correctly', () => {
    render(<StatCard label="Users" value={1250} />)
    expect(screen.getByTestId('stat-value')).toHaveTextContent('1250')
  })

  it('shows positive change', () => {
    render(<StatCard label="Revenue" value="$10,000" change={15} />)
    expect(screen.getByTestId('change-value')).toHaveTextContent('+15%')
  })

  it('shows negative change', () => {
    render(<StatCard label="Revenue" value="$10,000" change={-8} />)
    expect(screen.getByTestId('change-value')).toHaveTextContent('-8%')
  })

  it('shows change label', () => {
    render(<StatCard label="Revenue" value="$10,000" change={5} changeLabel="this week" />)
    expect(screen.getByTestId('change-label')).toHaveTextContent('this week')
  })

  it('renders icon when provided', () => {
    render(<StatCard label="Revenue" value="$10,000" icon={<span data-testid="custom-icon">$</span>} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('does not render change when not provided', () => {
    render(<StatCard label="Users" value={100} />)
    expect(screen.queryByTestId('stat-change')).not.toBeInTheDocument()
  })
})

// Test StatsGrid pattern
describe('StatsGrid Pattern', () => {
  interface Stat {
    id: string
    label: string
    value: string | number
  }

  function StatsGrid({ stats }: { stats: Stat[] }) {
    return (
      <div data-testid="stats-grid">
        {stats.map(stat => (
          <div key={stat.id} data-testid={`stat-${stat.id}`}>
            <span data-testid={`label-${stat.id}`}>{stat.label}</span>
            <span data-testid={`value-${stat.id}`}>{stat.value}</span>
          </div>
        ))}
      </div>
    )
  }

  const mockStats = [
    { id: 'users', label: 'Total Users', value: 1000 },
    { id: 'transactions', label: 'Transactions', value: 5000 },
    { id: 'volume', label: 'Volume', value: '$100K' },
  ]

  it('renders all stats', () => {
    render(<StatsGrid stats={mockStats} />)
    expect(screen.getByTestId('stat-users')).toBeInTheDocument()
    expect(screen.getByTestId('stat-transactions')).toBeInTheDocument()
    expect(screen.getByTestId('stat-volume')).toBeInTheDocument()
  })

  it('displays correct labels', () => {
    render(<StatsGrid stats={mockStats} />)
    expect(screen.getByTestId('label-users')).toHaveTextContent('Total Users')
    expect(screen.getByTestId('label-transactions')).toHaveTextContent('Transactions')
  })

  it('displays correct values', () => {
    render(<StatsGrid stats={mockStats} />)
    expect(screen.getByTestId('value-users')).toHaveTextContent('1000')
    expect(screen.getByTestId('value-volume')).toHaveTextContent('$100K')
  })

  it('handles empty stats array', () => {
    render(<StatsGrid stats={[]} />)
    expect(screen.getByTestId('stats-grid')).toBeEmptyDOMElement()
  })
})

// Test ProgressBar pattern
describe('ProgressBar Pattern', () => {
  interface ProgressBarProps {
    value: number
    max: number
    label?: string
    showPercentage?: boolean
  }

  function ProgressBar({ value, max, label, showPercentage = true }: ProgressBarProps) {
    const percentage = Math.min((value / max) * 100, 100)

    return (
      <div data-testid="progress-container">
        {label && <span data-testid="progress-label">{label}</span>}
        <div data-testid="progress-track">
          <div 
            data-testid="progress-bar" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showPercentage && (
          <span data-testid="progress-percentage">{percentage.toFixed(0)}%</span>
        )}
      </div>
    )
  }

  it('renders progress bar', () => {
    render(<ProgressBar value={50} max={100} />)
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
  })

  it('calculates percentage correctly', () => {
    render(<ProgressBar value={75} max={100} />)
    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('75%')
  })

  it('shows label when provided', () => {
    render(<ProgressBar value={50} max={100} label="Loading..." />)
    expect(screen.getByTestId('progress-label')).toHaveTextContent('Loading...')
  })

  it('caps at 100%', () => {
    render(<ProgressBar value={150} max={100} />)
    expect(screen.getByTestId('progress-percentage')).toHaveTextContent('100%')
  })

  it('hides percentage when showPercentage is false', () => {
    render(<ProgressBar value={50} max={100} showPercentage={false} />)
    expect(screen.queryByTestId('progress-percentage')).not.toBeInTheDocument()
  })
})

// Test MetricDisplay pattern
describe('MetricDisplay Pattern', () => {
  interface MetricDisplayProps {
    title: string
    current: number
    previous: number
    format?: 'number' | 'currency' | 'percentage'
  }

  function formatMetric(value: number, format: string) {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'percentage':
        return `${value}%`
      default:
        return value.toLocaleString()
    }
  }

  function MetricDisplay({ title, current, previous, format = 'number' }: MetricDisplayProps) {
    const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0
    const isPositive = change > 0

    return (
      <div data-testid="metric-display">
        <h3 data-testid="metric-title">{title}</h3>
        <div data-testid="metric-value">{formatMetric(current, format)}</div>
        <div data-testid="metric-previous">
          Previous: {formatMetric(previous, format)}
        </div>
        <div 
          data-testid="metric-change"
          className={isPositive ? 'positive' : 'negative'}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      </div>
    )
  }

  it('displays title', () => {
    render(<MetricDisplay title="Revenue" current={1000} previous={800} />)
    expect(screen.getByTestId('metric-title')).toHaveTextContent('Revenue')
  })

  it('formats number values', () => {
    render(<MetricDisplay title="Users" current={1500} previous={1000} format="number" />)
    expect(screen.getByTestId('metric-value')).toHaveTextContent('1,500')
  })

  it('formats currency values', () => {
    render(<MetricDisplay title="Revenue" current={5000} previous={4000} format="currency" />)
    expect(screen.getByTestId('metric-value')).toHaveTextContent('$5,000')
  })

  it('formats percentage values', () => {
    render(<MetricDisplay title="Growth" current={25} previous={20} format="percentage" />)
    expect(screen.getByTestId('metric-value')).toHaveTextContent('25%')
  })

  it('calculates positive change', () => {
    render(<MetricDisplay title="Revenue" current={1200} previous={1000} />)
    expect(screen.getByTestId('metric-change')).toHaveTextContent('↑ 20.0%')
  })

  it('calculates negative change', () => {
    render(<MetricDisplay title="Revenue" current={800} previous={1000} />)
    expect(screen.getByTestId('metric-change')).toHaveTextContent('↓ 20.0%')
  })
})

// Test LiveMetric pattern
describe('LiveMetric Pattern', () => {
  function LiveMetric({ 
    value,
    label,
    isLive,
    lastUpdated,
    onRefresh,
  }: { 
    value: string
    label: string
    isLive: boolean
    lastUpdated: string
    onRefresh: () => void
  }) {
    return (
      <div data-testid="live-metric">
        <div data-testid="metric-header">
          <span data-testid="metric-label">{label}</span>
          <span data-testid="live-indicator" className={isLive ? 'live' : 'offline'}>
            {isLive ? '● LIVE' : '○ OFFLINE'}
          </span>
        </div>
        <div data-testid="metric-value">{value}</div>
        <div data-testid="metric-footer">
          <span data-testid="last-updated">Updated: {lastUpdated}</span>
          <button data-testid="refresh-button" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>
    )
  }

  it('displays label', () => {
    render(
      <LiveMetric 
        value="$1,234" 
        label="VFIDE Price" 
        isLive={true} 
        lastUpdated="Just now" 
        onRefresh={() => {}} 
      />
    )
    expect(screen.getByTestId('metric-label')).toHaveTextContent('VFIDE Price')
  })

  it('shows live indicator when live', () => {
    render(
      <LiveMetric 
        value="$1,234" 
        label="Price" 
        isLive={true} 
        lastUpdated="Just now" 
        onRefresh={() => {}} 
      />
    )
    expect(screen.getByTestId('live-indicator')).toHaveTextContent('● LIVE')
  })

  it('shows offline indicator when not live', () => {
    render(
      <LiveMetric 
        value="$1,234" 
        label="Price" 
        isLive={false} 
        lastUpdated="5 min ago" 
        onRefresh={() => {}} 
      />
    )
    expect(screen.getByTestId('live-indicator')).toHaveTextContent('○ OFFLINE')
  })

  it('displays last updated time', () => {
    render(
      <LiveMetric 
        value="$1,234" 
        label="Price" 
        isLive={true} 
        lastUpdated="2 seconds ago" 
        onRefresh={() => {}} 
      />
    )
    expect(screen.getByTestId('last-updated')).toHaveTextContent('Updated: 2 seconds ago')
  })

  it('calls onRefresh when refresh clicked', () => {
    const onRefresh = vi.fn()
    render(
      <LiveMetric 
        value="$1,234" 
        label="Price" 
        isLive={true} 
        lastUpdated="Just now" 
        onRefresh={onRefresh} 
      />
    )
    fireEvent.click(screen.getByTestId('refresh-button'))
    expect(onRefresh).toHaveBeenCalled()
  })
})

// Test ComparisonChart pattern
describe('ComparisonChart Pattern', () => {
  interface ChartData {
    label: string
    value: number
    color?: string
  }

  function ComparisonChart({ 
    data,
    title,
    maxValue,
  }: { 
    data: ChartData[]
    title: string
    maxValue?: number
  }) {
    const max = maxValue || Math.max(...data.map(d => d.value))

    return (
      <div data-testid="comparison-chart">
        <h3 data-testid="chart-title">{title}</h3>
        <div data-testid="chart-bars">
          {data.map((item, index) => (
            <div key={index} data-testid={`bar-${index}`}>
              <span data-testid={`bar-label-${index}`}>{item.label}</span>
              <div 
                data-testid={`bar-fill-${index}`}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
              <span data-testid={`bar-value-${index}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const mockData = [
    { label: 'Deposits', value: 100 },
    { label: 'Withdrawals', value: 75 },
    { label: 'Transfers', value: 50 },
  ]

  it('renders title', () => {
    render(<ComparisonChart data={mockData} title="Transaction Types" />)
    expect(screen.getByTestId('chart-title')).toHaveTextContent('Transaction Types')
  })

  it('renders all bars', () => {
    render(<ComparisonChart data={mockData} title="Transactions" />)
    expect(screen.getByTestId('bar-0')).toBeInTheDocument()
    expect(screen.getByTestId('bar-1')).toBeInTheDocument()
    expect(screen.getByTestId('bar-2')).toBeInTheDocument()
  })

  it('displays bar labels', () => {
    render(<ComparisonChart data={mockData} title="Transactions" />)
    expect(screen.getByTestId('bar-label-0')).toHaveTextContent('Deposits')
    expect(screen.getByTestId('bar-label-1')).toHaveTextContent('Withdrawals')
  })

  it('displays bar values', () => {
    render(<ComparisonChart data={mockData} title="Transactions" />)
    expect(screen.getByTestId('bar-value-0')).toHaveTextContent('100')
    expect(screen.getByTestId('bar-value-2')).toHaveTextContent('50')
  })
})
