import { describe, expect, it, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Bell: ({ className, onClick }: { className?: string; onClick?: () => void }) => 
    React.createElement('button', { className, onClick, 'data-testid': 'bell-icon' }),
  X: ({ className, onClick }: { className?: string; onClick?: () => void }) => 
    React.createElement('button', { className, onClick, 'data-testid': 'x-icon' }),
  Check: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'check-icon' }),
  AlertCircle: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'alert-icon' }),
  Info: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'info-icon' }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: React.PropsWithChildren<{ 
      className?: string; 
      style?: object;
      onClick?: () => void;
    }>) =>
      React.createElement('div', { className, style, onClick, ...props }, children),
    button: ({ children, className, onClick, ...props }: React.PropsWithChildren<{ 
      className?: string;
      onClick?: () => void;
    }>) =>
      React.createElement('button', { className, onClick, ...props }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Simple notification system for testing
interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}

const NotificationItem = ({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) => (
  <div data-testid={`notification-${notification.id}`} className="notification">
    <span data-testid="notification-title">{notification.title}</span>
    {notification.message && <p data-testid="notification-message">{notification.message}</p>}
    <button onClick={() => onDismiss(notification.id)} data-testid={`dismiss-${notification.id}`}>Dismiss</button>
  </div>
)

const NotificationCenter = ({ notifications, onDismiss }: { notifications: Notification[]; onDismiss: (id: string) => void }) => (
  <div data-testid="notification-center">
    {notifications.length === 0 && <span data-testid="no-notifications">No notifications</span>}
    {notifications.map((n) => (
      <NotificationItem key={n.id} notification={n} onDismiss={onDismiss} />
    ))}
  </div>
)

describe('NotificationCenter', () => {
  it('renders empty state when no notifications', () => {
    render(<NotificationCenter notifications={[]} onDismiss={() => {}} />)
    expect(screen.getByTestId('no-notifications')).toBeInTheDocument()
  })

  it('renders notifications list', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'success', title: 'Success!' },
      { id: '2', type: 'error', title: 'Error!' },
    ]
    render(<NotificationCenter notifications={notifications} onDismiss={() => {}} />)
    expect(screen.getByTestId('notification-1')).toBeInTheDocument()
    expect(screen.getByTestId('notification-2')).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = jest.fn()
    const notifications: Notification[] = [
      { id: '1', type: 'info', title: 'Info message' },
    ]
    render(<NotificationCenter notifications={notifications} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByTestId('dismiss-1'))
    expect(onDismiss).toHaveBeenCalledWith('1')
  })

  it('renders notification with message', () => {
    const notifications: Notification[] = [
      { id: '1', type: 'warning', title: 'Warning', message: 'Something is wrong' },
    ]
    render(<NotificationCenter notifications={notifications} onDismiss={() => {}} />)
    expect(screen.getByText('Something is wrong')).toBeInTheDocument()
  })
})

describe('NotificationItem', () => {
  it('renders title', () => {
    render(
      <NotificationItem 
        notification={{ id: '1', type: 'success', title: 'Test Title' }} 
        onDismiss={() => {}} 
      />
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders optional message', () => {
    render(
      <NotificationItem 
        notification={{ id: '1', type: 'error', title: 'Error', message: 'Details here' }} 
        onDismiss={() => {}} 
      />
    )
    expect(screen.getByText('Details here')).toBeInTheDocument()
  })

  it('calls onDismiss with correct id', () => {
    const onDismiss = jest.fn()
    render(
      <NotificationItem 
        notification={{ id: 'abc123', type: 'info', title: 'Info' }} 
        onDismiss={onDismiss} 
      />
    )
    fireEvent.click(screen.getByTestId('dismiss-abc123'))
    expect(onDismiss).toHaveBeenCalledWith('abc123')
  })
})
