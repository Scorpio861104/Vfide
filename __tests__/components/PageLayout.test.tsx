import { describe, expect, it } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/link
jest.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement('a', { href, ...props }, children),
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  ArrowLeft: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'arrow-left' }),
  Menu: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'menu-icon' }),
  X: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'close-icon' }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: React.PropsWithChildren<{ className?: string; style?: object }>) =>
      React.createElement('div', { className, style, ...props }, children),
    main: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) =>
      React.createElement('main', { className, ...props }, children),
    header: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) =>
      React.createElement('header', { className, ...props }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Simple Page Layout components for testing
const PageHeader = ({ 
  title, 
  subtitle, 
  backLink,
  actions 
}: { 
  title: string; 
  subtitle?: string; 
  backLink?: string;
  actions?: React.ReactNode;
}) => (
  <header data-testid="page-header">
    {backLink && (
      <a href={backLink} data-testid="back-link">
        <span data-testid="arrow-left">←</span>
      </a>
    )}
    <h1 data-testid="page-title">{title}</h1>
    {subtitle && <p data-testid="page-subtitle">{subtitle}</p>}
    {actions && <div data-testid="header-actions">{actions}</div>}
  </header>
)

const PageContainer = ({ 
  children, 
  className,
  maxWidth = 'max-w-7xl'
}: { 
  children: React.ReactNode; 
  className?: string;
  maxWidth?: string;
}) => (
  <div data-testid="page-container" className={`${maxWidth} ${className || ''}`}>
    {children}
  </div>
)

const PageSection = ({ 
  title, 
  children,
  className 
}: { 
  title?: string; 
  children: React.ReactNode;
  className?: string;
}) => (
  <section data-testid="page-section" className={className}>
    {title && <h2 data-testid="section-title">{title}</h2>}
    {children}
  </section>
)

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByTestId('page-title')).toHaveTextContent('Dashboard')
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Settings" subtitle="Manage your account" />)
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Manage your account')
  })

  it('renders back link when provided', () => {
    render(<PageHeader title="Details" backLink="/home" />)
    expect(screen.getByTestId('back-link')).toHaveAttribute('href', '/home')
  })

  it('does not render back link when not provided', () => {
    render(<PageHeader title="Home" />)
    expect(screen.queryByTestId('back-link')).not.toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(
      <PageHeader 
        title="Users" 
        actions={<button data-testid="action-btn">Add User</button>} 
      />
    )
    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
  })
})

describe('PageContainer', () => {
  it('renders children', () => {
    render(
      <PageContainer>
        <div data-testid="child">Content</div>
      </PageContainer>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('applies default maxWidth', () => {
    render(<PageContainer>Content</PageContainer>)
    expect(screen.getByTestId('page-container')).toHaveClass('max-w-7xl')
  })

  it('applies custom maxWidth', () => {
    render(<PageContainer maxWidth="max-w-4xl">Content</PageContainer>)
    expect(screen.getByTestId('page-container')).toHaveClass('max-w-4xl')
  })

  it('applies custom className', () => {
    render(<PageContainer className="custom-container">Content</PageContainer>)
    expect(screen.getByTestId('page-container')).toHaveClass('custom-container')
  })
})

describe('PageSection', () => {
  it('renders children', () => {
    render(
      <PageSection>
        <p data-testid="section-content">Section content</p>
      </PageSection>
    )
    expect(screen.getByTestId('section-content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<PageSection title="Statistics">Content</PageSection>)
    expect(screen.getByTestId('section-title')).toHaveTextContent('Statistics')
  })

  it('does not render title when not provided', () => {
    render(<PageSection>Content</PageSection>)
    expect(screen.queryByTestId('section-title')).not.toBeInTheDocument()
  })

  it('applies className', () => {
    render(<PageSection className="custom-section">Content</PageSection>)
    expect(screen.getByTestId('page-section')).toHaveClass('custom-section')
  })
})
