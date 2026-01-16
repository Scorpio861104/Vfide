/**
 * Comprehensive tests for Button primitive component
 */
import { describe, expect, it } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { Button, buttonVariants } from '@/components/ui/button'

describe('Button', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('renders with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outlined</Button>)
    expect(screen.getByRole('button')).toHaveClass('border')
  })

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-secondary')
  })

  it('renders with ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('renders with link variant', () => {
    render(<Button variant="link">Link</Button>)
    expect(screen.getByRole('button')).toHaveClass('underline-offset-4')
  })

  it('renders with sm size', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9')
  })

  it('renders with lg size', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11')
  })

  it('renders with icon size', () => {
    render(<Button size="icon">🔍</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10')
  })

  it('handles click events', () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('supports asChild prop for composition', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    expect(screen.getByRole('link')).toHaveTextContent('Link Button')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref Button</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('applies type attribute', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})

describe('buttonVariants', () => {
  it('returns correct classes for default variant', () => {
    const classes = buttonVariants({ variant: 'default' })
    expect(classes).toContain('bg-primary')
  })

  it('returns correct classes for destructive variant', () => {
    const classes = buttonVariants({ variant: 'destructive' })
    expect(classes).toContain('bg-destructive')
  })

  it('returns correct classes for size sm', () => {
    const classes = buttonVariants({ size: 'sm' })
    expect(classes).toContain('h-9')
  })

  it('returns correct classes for size lg', () => {
    const classes = buttonVariants({ size: 'lg' })
    expect(classes).toContain('h-11')
  })

  it('combines variant and size', () => {
    const classes = buttonVariants({ variant: 'outline', size: 'lg' })
    expect(classes).toContain('border')
    expect(classes).toContain('h-11')
  })
})
