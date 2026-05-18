import { render, screen } from '@testing-library/react'
import { Button, buttonVariants } from '../button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies default variant', () => {
    const { container } = render(<Button>Default</Button>)
    expect(container.firstChild).toHaveClass('bg-primary')
  })

  it('applies destructive variant', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    expect(container.firstChild).toHaveClass('bg-destructive')
  })

  it('applies outline variant', () => {
    const { container } = render(<Button variant="outline">Outline</Button>)
    expect(container.firstChild).toHaveClass('border')
  })

  it('applies secondary variant', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>)
    expect(container.firstChild).toHaveClass('bg-secondary')
  })

  it('applies ghost variant', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    expect(container.firstChild).toHaveClass('hover:bg-accent')
  })

  it('applies link variant', () => {
    const { container } = render(<Button variant="link">Link</Button>)
    expect(container.firstChild).toHaveClass('underline-offset-4')
  })

  it('applies default size', () => {
    const { container } = render(<Button>Default Size</Button>)
    expect(container.firstChild).toHaveClass('h-10')
  })

  it('applies small size', () => {
    const { container } = render(<Button size="sm">Small</Button>)
    expect(container.firstChild).toHaveClass('h-9')
  })

  it('applies large size', () => {
    const { container } = render(<Button size="lg">Large</Button>)
    expect(container.firstChild).toHaveClass('h-11')
  })

  it('applies icon size', () => {
    const { container } = render(<Button size="icon">X</Button>)
    expect(container.firstChild).toHaveClass('w-10')
  })

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Custom</Button>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('disables button', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders as child when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    expect(screen.getByRole('link', { name: 'Link Button' })).toBeInTheDocument()
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<Button ref={ref}>Ref Button</Button>)
    expect(ref).toHaveBeenCalled()
  })

  it('handles click events', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click</Button>)
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalled()
  })

  it('buttonVariants returns correct classes', () => {
    const classes = buttonVariants({ variant: 'default', size: 'default' })
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('h-10')
  })
})
