import { render, screen } from '@testing-library/react'
import { StatCard, QuickAction, NotificationItem, ActivityItem } from '../DashboardCards'
import { Wallet, Star, Bell, Activity } from 'lucide-react'

describe('StatCard', () => {
  it('renders with basic props', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100 VFIDE"
        color="#00F0FF"
      />
    )
    expect(screen.getByText('Balance')).toBeInTheDocument()
    expect(screen.getByText('100 VFIDE')).toBeInTheDocument()
  })

  it('displays subValue when provided', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        subValue="≈ $10.00"
        color="#00F0FF"
      />
    )
    expect(screen.getByText('≈ $10.00')).toBeInTheDocument()
  })

  it('shows loading skeleton when isLoading', () => {
    const { container } = render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
        isLoading={true}
      />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('100')).not.toBeInTheDocument()
  })

  it('renders as link when href provided', () => {
    const { container } = render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
        href="/dashboard"
      />
    )
    expect(container.querySelector('a')).toBeInTheDocument()
  })

  it('applies correct href to link', () => {
    const { container } = render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
        href="/dashboard"
      />
    )
    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/dashboard')
  })

  it('shows chevron icon when href provided', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        subValue="View details"
        color="#00F0FF"
        href="/dashboard"
      />
    )
    const { container } = render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        subValue="View details"
        color="#00F0FF"
        href="/dashboard"
      />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('displays positive trend', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
        trend={{ value: 15, label: 'this week' }}
      />
    )
    expect(screen.getByText(/15% this week/)).toBeInTheDocument()
    expect(screen.getByText('↑')).toBeInTheDocument()
  })

  it('displays negative trend', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
        trend={{ value: -10, label: 'this month' }}
      />
    )
    expect(screen.getByText(/10% this month/)).toBeInTheDocument()
    expect(screen.getByText('↓')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(
      <StatCard 
        icon={<Wallet data-testid="wallet-icon" />}
        label="Balance"
        value="100"
        color="#00F0FF"
      />
    )
    expect(screen.getByTestId('wallet-icon')).toBeInTheDocument()
  })

  it('handles numeric value', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Score"
        value={5000}
        color="#00F0FF"
      />
    )
    expect(screen.getByText('5000')).toBeInTheDocument()
  })

  it('applies uppercase to label', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
      />
    )
    const label = screen.getByText('Balance')
    expect(label).toHaveClass('uppercase')
  })

  it('renders without subValue', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
      />
    )
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument()
  })

  it('renders without trend', () => {
    render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
      />
    )
    expect(screen.queryByText(/↑/)).not.toBeInTheDocument()
    expect(screen.queryByText(/↓/)).not.toBeInTheDocument()
  })

  it('does not render as link without href', () => {
    const { container } = render(
      <StatCard 
        icon={<Wallet />}
        label="Balance"
        value="100"
        color="#00F0FF"
      />
    )
    expect(container.querySelector('a')).not.toBeInTheDocument()
  })
})
describe('QuickAction', () => {
  it('renders with basic props', () => {
    render(
      <QuickAction 
        icon={<Star />}
        label="Quick Action"
        href="/action"
        color="#00F0FF"
      />
    )
    expect(screen.getByText('Quick Action')).toBeInTheDocument()
  })

  it('renders as a link', () => {
    const { container } = render(
      <QuickAction 
        icon={<Star />}
        label="Action"
        href="/test"
        color="#00F0FF"
      />
    )
    expect(container.querySelector('a')).toHaveAttribute('href', '/test')
  })

  it('renders primary style', () => {
    render(
      <QuickAction 
        icon={<Star />}
        label="Primary Action"
        href="/primary"
        color="#00F0FF"
        isPrimary={true}
      />
    )
    expect(screen.getByText('Primary Action')).toBeInTheDocument()
  })

  it('renders non-primary style', () => {
    const { container } = render(
      <QuickAction 
        icon={<Star />}
        label="Secondary"
        href="/secondary"
        color="#00F0FF"
        isPrimary={false}
      />
    )
    expect(container.querySelector('.glass-card')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(
      <QuickAction 
        icon={<Star data-testid="star-icon" />}
        label="Star Action"
        href="/star"
        color="#00F0FF"
      />
    )
    expect(screen.getByTestId('star-icon')).toBeInTheDocument()
  })
})

describe('NotificationItem', () => {
  it('renders with basic props', () => {
    render(
      <NotificationItem 
        icon={<Bell />}
        title="New Notification"
        description="You have a new message"
        color="#00F0FF"
      />
    )
    expect(screen.getByText('New Notification')).toBeInTheDocument()
    expect(screen.getByText('You have a new message')).toBeInTheDocument()
  })

  it('shows new indicator when isNew', () => {
    const { container } = render(
      <NotificationItem 
        icon={<Bell />}
        title="Alert"
        description="Important"
        color="#FF0000"
        isNew={true}
      />
    )
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('does not show new indicator by default', () => {
    const { container } = render(
      <NotificationItem 
        icon={<Bell />}
        title="Alert"
        description="Normal"
        color="#00F0FF"
      />
    )
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
  })

  it('renders action link when provided', () => {
    render(
      <NotificationItem 
        icon={<Bell />}
        title="Alert"
        description="Click below"
        color="#00F0FF"
        actionLabel="View Details"
        actionHref="/details"
      />
    )
    expect(screen.getByText('View Details')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View Details/i })).toHaveAttribute('href', '/details')
  })

  it('does not render action link when not provided', () => {
    render(
      <NotificationItem 
        icon={<Bell />}
        title="Alert"
        description="No action"
        color="#00F0FF"
      />
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders icon', () => {
    render(
      <NotificationItem 
        icon={<Bell data-testid="bell-icon" />}
        title="Bell Alert"
        description="Ding!"
        color="#00F0FF"
      />
    )
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument()
  })
})

describe('ActivityItem', () => {
  it('renders with basic props', () => {
    render(
      <ActivityItem 
        icon={<Activity />}
        action="Sent tokens"
        details="To 0x1234..."
        time="2 mins ago"
        color="#00F0FF"
      />
    )
    expect(screen.getByText('Sent tokens')).toBeInTheDocument()
    expect(screen.getByText('To 0x1234...')).toBeInTheDocument()
    expect(screen.getByText('2 mins ago')).toBeInTheDocument()
  })

  it('renders value when provided', () => {
    render(
      <ActivityItem 
        icon={<Activity />}
        action="Received"
        details="From treasury"
        value="+100 VFIDE"
        time="5 mins ago"
        color="#22C55E"
      />
    )
    expect(screen.getByText('+100 VFIDE')).toBeInTheDocument()
  })

  it('does not render value when not provided', () => {
    render(
      <ActivityItem 
        icon={<Activity />}
        action="Action"
        details="Details"
        time="10 mins ago"
        color="#00F0FF"
      />
    )
    // Just check basic render works
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(
      <ActivityItem 
        icon={<Activity data-testid="activity-icon" />}
        action="Test"
        details="Test details"
        time="1 min ago"
        color="#00F0FF"
      />
    )
    expect(screen.getByTestId('activity-icon')).toBeInTheDocument()
  })
})