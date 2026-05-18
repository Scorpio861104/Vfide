import { render, screen } from '@testing-library/react'
import { Alert, AlertDescription, AlertTitle } from '../alert'

describe('Alert', () => {
  it('renders alert with default variant', () => {
    render(<Alert>Test alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Test alert')
  })

  it('renders alert with destructive variant', () => {
    render(<Alert variant="destructive">Error alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('border-destructive/50')
  })

  it('applies custom className', () => {
    render(<Alert className="custom-class">Test</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<Alert ref={ref}>Test</Alert>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('AlertTitle', () => {
  it('renders alert title', () => {
    render(<AlertTitle>Test Title</AlertTitle>)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<AlertTitle className="custom-class">Title</AlertTitle>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders as h5 element', () => {
    const { container } = render(<AlertTitle>Title</AlertTitle>)
    expect(container.querySelector('h5')).toBeInTheDocument()
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<AlertTitle ref={ref}>Test</AlertTitle>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('AlertDescription', () => {
  it('renders alert description', () => {
    render(<AlertDescription>Test Description</AlertDescription>)
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<AlertDescription className="custom-class">Desc</AlertDescription>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders as div element', () => {
    const { container } = render(<AlertDescription>Description</AlertDescription>)
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<AlertDescription ref={ref}>Test</AlertDescription>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('Alert components together', () => {
  it('renders complete alert with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>This is a warning message</AlertDescription>
      </Alert>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('This is a warning message')).toBeInTheDocument()
  })

  it('renders destructive alert with title and description', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('border-destructive/50')
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders alert with icon and title', () => {
    const Icon = () => <svg data-testid="alert-icon" />
    render(
      <Alert>
        <Icon />
        <AlertTitle>Alert with icon</AlertTitle>
      </Alert>
    )
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    expect(screen.getByText('Alert with icon')).toBeInTheDocument()
  })

  it('renders alert with icon, title, and description', () => {
    const Icon = () => <svg data-testid="warning-icon" />
    render(
      <Alert variant="destructive">
        <Icon />
        <AlertTitle>Critical Error</AlertTitle>
        <AlertDescription>
          <p>Please check your settings and try again.</p>
        </AlertDescription>
      </Alert>
    )
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
    expect(screen.getByText('Critical Error')).toBeInTheDocument()
    expect(screen.getByText('Please check your settings and try again.')).toBeInTheDocument()
  })

  it('renders alert with only icon', () => {
    const Icon = () => <svg data-testid="standalone-icon" />
    render(
      <Alert>
        <Icon />
      </Alert>
    )
    expect(screen.getByTestId('standalone-icon')).toBeInTheDocument()
  })

  it('renders alert with description containing multiple paragraphs', () => {
    render(
      <Alert>
        <AlertTitle>Multi-paragraph alert</AlertTitle>
        <AlertDescription>
          <p>First paragraph with information.</p>
          <p>Second paragraph with more details.</p>
        </AlertDescription>
      </Alert>
    )
    expect(screen.getByText('First paragraph with information.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph with more details.')).toBeInTheDocument()
  })

  it('renders alert with custom data attributes', () => {
    render(
      <Alert data-testid="custom-alert" data-status="warning">
        <AlertTitle data-testid="custom-title">Custom attrs</AlertTitle>
        <AlertDescription data-testid="custom-desc">Description</AlertDescription>
      </Alert>
    )
    expect(screen.getByTestId('custom-alert')).toHaveAttribute('data-status', 'warning')
    expect(screen.getByTestId('custom-title')).toBeInTheDocument()
    expect(screen.getByTestId('custom-desc')).toBeInTheDocument()
  })

  it('renders alert with aria attributes', () => {
    render(
      <Alert aria-live="polite" aria-atomic="true">
        <AlertTitle>Accessible alert</AlertTitle>
      </Alert>
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'polite')
    expect(alert).toHaveAttribute('aria-atomic', 'true')
  })

  it('renders alert description with nested elements', () => {
    render(
      <AlertDescription>
        <strong>Bold text</strong> and <em>italic text</em>
      </AlertDescription>
    )
    expect(screen.getByText(/Bold text/)).toBeInTheDocument()
    expect(screen.getByText(/italic text/)).toBeInTheDocument()
  })
})
