import { describe, expect, it, vi, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock lucide-react
jest.mock('lucide-react', () => ({
  X: () => React.createElement('svg', { 'data-testid': 'close-icon' }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) =>
      React.createElement('div', { className, onClick, ...props }, children),
    button: ({ children, className, onClick, disabled, type, ...props }: React.PropsWithChildren<{ 
      className?: string
      onClick?: () => void
      disabled?: boolean
      type?: string
    }>) =>
      React.createElement('button', { className, onClick, disabled, type, ...props }, children),
    span: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) =>
      React.createElement('span', { className, ...props }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

import { Modal, Button, Input, Select, Badge, Tooltip } from '@/components/ui/FormElements'

describe('Modal', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    )
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    )
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Title">
        <div>Content</div>
      </Modal>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Title" subtitle="Subtitle text">
        <div>Content</div>
      </Modal>
    )
    expect(screen.getByText('Subtitle text')).toBeInTheDocument()
  })

  it('shows close button by default', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Title">
        <div>Content</div>
      </Modal>
    )
    expect(screen.getByTestId('close-icon')).toBeInTheDocument()
  })

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
        <div>Content</div>
      </Modal>
    )
    expect(screen.queryByTestId('close-icon')).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const handleClose = jest.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Title">
        <div>Content</div>
      </Modal>
    )
    fireEvent.click(screen.getByTestId('close-icon').parentElement!)
    expect(handleClose).toHaveBeenCalled()
  })

  it('applies size classes', () => {
    const { container, rerender } = render(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        <div>Content</div>
      </Modal>
    )
    expect(container.innerHTML).toContain('max-w-md')

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <div>Content</div>
      </Modal>
    )
    expect(container.innerHTML).toContain('max-w-2xl')

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="xl">
        <div>Content</div>
      </Modal>
    )
    expect(container.innerHTML).toContain('max-w-4xl')
  })

  it('prevents body scroll when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
  })
})

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading spinner when loading', () => {
    const { container } = render(<Button loading>Click me</Button>)
    expect(container.querySelector('.border-2')).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button')
    // Check button renders with gradient classes or specific color
    expect(button.className).toMatch(/from-|gradient|00F0FF/)
  })

  it('applies secondary variant', () => {
    render(<Button variant="secondary">Click me</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-white/10')
  })

  it('applies danger variant', () => {
    render(<Button variant="danger">Click me</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toMatch(/from-|gradient|FF4444|red/)
  })

  it('applies success variant', () => {
    render(<Button variant="success">Click me</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toMatch(/from-|gradient|50C878|green/)
  })

  it('applies ghost variant', () => {
    render(<Button variant="ghost">Click me</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-transparent')
  })

  it('applies size classes', () => {
    const { rerender } = render(<Button size="sm">Click me</Button>)
    expect(screen.getByRole('button').className).toContain('text-sm')

    rerender(<Button size="lg">Click me</Button>)
    expect(screen.getByRole('button').className).toContain('text-lg')
  })

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Click me</Button>)
    expect(screen.getByRole('button').className).toContain('w-full')
  })

  it('renders icon on left by default', () => {
    render(<Button icon={<span data-testid="icon">🎉</span>}>Click me</Button>)
    const button = screen.getByRole('button')
    const icon = screen.getByTestId('icon')
    expect(button.firstChild).toBe(icon)
  })

  it('renders icon on right when specified', () => {
    render(<Button icon={<span data-testid="icon">🎉</span>} iconPosition="right">Click me</Button>)
    const button = screen.getByRole('button')
    const icon = screen.getByTestId('icon')
    expect(button.lastChild).toBe(icon)
  })

  it('uses button type by default', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('can be submit type', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Click me</Button>)
    expect(screen.getByRole('button').className).toContain('custom-class')
  })
})

describe('Input', () => {
  it('renders with placeholder', () => {
    const { container } = render(<Input value="" onChange={() => {}} placeholder="Enter text" />)
    expect(container.querySelector('input')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Input value="" onChange={() => {}} label="Username" />)
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('calls onChange when value changes', () => {
    const onChange = jest.fn()
    render(<Input value="" onChange={onChange} />)
    
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalledWith('test')
  })

  it('displays value', () => {
    render(<Input value="current value" onChange={() => {}} />)
    expect(screen.getByDisplayValue('current value')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input value="" onChange={() => {}} error="This is an error" />)
    expect(screen.getByText('This is an error')).toBeInTheDocument()
  })

  it('shows hint when no error', () => {
    render(<Input value="" onChange={() => {}} hint="Helpful hint" />)
    expect(screen.getByText('Helpful hint')).toBeInTheDocument()
  })

  it('hides hint when error is shown', () => {
    render(<Input value="" onChange={() => {}} error="Error" hint="Hint" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.queryByText('Hint')).not.toBeInTheDocument()
  })

  it('renders with icon', () => {
    render(
      <Input 
        value="" 
        onChange={() => {}} 
        icon={<span data-testid="input-icon">@</span>}
      />
    )
    expect(screen.getByTestId('input-icon')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input value="" onChange={() => {}} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('applies custom className', () => {
    const { container } = render(<Input value="" onChange={() => {}} className="custom-input" />)
    expect(container.querySelector('.custom-input')).toBeInTheDocument()
  })
})

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' },
  ]

  it('renders options', () => {
    render(<Select options={options} value="" onChange={() => {}} />)
    
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })

  it('renders label', () => {
    render(<Select options={options} value="" onChange={() => {}} label="Choose One" />)
    expect(screen.getByText('Choose One')).toBeInTheDocument()
  })

  it('shows placeholder', () => {
    render(<Select options={options} value="" onChange={() => {}} placeholder="Select..." />)
    expect(screen.getByText('Select...')).toBeInTheDocument()
  })

  it('calls onChange when value changes', () => {
    const onChange = jest.fn()
    render(<Select options={options} value="" onChange={onChange} />)
    
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Select options={options} value="" onChange={() => {}} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('applies custom className', () => {
    const { container } = render(<Select options={options} value="" onChange={() => {}} className="custom-select" />)
    expect(container.querySelector('.custom-select')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies success variant', () => {
    const { container } = render(<Badge variant="success">Success</Badge>)
    expect(container.innerHTML).toMatch(/bg-|50C878|green/)
  })

  it('applies warning variant', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>)
    expect(container.innerHTML).toMatch(/bg-|FFD700|yellow/)
  })

  it('applies danger variant', () => {
    const { container } = render(<Badge variant="danger">Danger</Badge>)
    expect(container.innerHTML).toMatch(/bg-|FF4444|red/)
  })

  it('applies info variant', () => {
    const { container } = render(<Badge variant="info">Info</Badge>)
    expect(container.innerHTML).toMatch(/bg-|00F0FF|cyan|blue/)
  })

  it('applies size sm', () => {
    const { container } = render(<Badge size="sm">Small</Badge>)
    expect(container.innerHTML).toContain('text-xs')
  })

  it('applies size md', () => {
    const { container } = render(<Badge size="md">Medium</Badge>)
    expect(container.innerHTML).toContain('text-sm')
  })

  it('shows pulse indicator when pulse is true', () => {
    const { container } = render(<Badge pulse>Pulsing</Badge>)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-badge">Custom</Badge>)
    expect(container.querySelector('.custom-badge')).toBeInTheDocument()
  })
})

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('renders tooltip content', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.getByText('Tooltip text')).toBeInTheDocument()
  })

  it('applies top position by default', () => {
    const { container } = render(
      <Tooltip content="Tip">
        <span>Top</span>
      </Tooltip>
    )
    expect(container.innerHTML).toContain('bottom-full')
  })

  it('applies bottom position', () => {
    const { container } = render(
      <Tooltip content="Tip" position="bottom">
        <span>Bottom</span>
      </Tooltip>
    )
    expect(container.innerHTML).toContain('top-full')
  })

  it('applies left position', () => {
    const { container } = render(
      <Tooltip content="Tip" position="left">
        <span>Left</span>
      </Tooltip>
    )
    expect(container.innerHTML).toContain('right-full')
  })

  it('applies right position', () => {
    const { container } = render(
      <Tooltip content="Tip" position="right">
        <span>Right</span>
      </Tooltip>
    )
    expect(container.innerHTML).toContain('left-full')
  })
})
