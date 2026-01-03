import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from '../alert'

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
})
