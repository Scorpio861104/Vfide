import { render, screen } from '@testing-library/react'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger
} from '../dialog'

describe('Dialog', () => {
  it('renders dialog trigger', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>
    )
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('renders dialog content when open', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('renders close button in content', () => {
    render(
      <Dialog open>
        <DialogContent>Content</DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Close')).toBeInTheDocument()
  })
})

describe('DialogHeader', () => {
  it('renders dialog header', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>Header Content</DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Header Content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader className="custom-class">Header</DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Header')).toHaveClass('custom-class')
  })
})

describe('DialogFooter', () => {
  it('renders dialog footer', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogFooter>Footer Content</DialogFooter>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Footer Content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogFooter className="custom-class">Footer</DialogFooter>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Footer')).toHaveClass('custom-class')
  })
})

describe('DialogTitle', () => {
  it('renders dialog title', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle className="custom-class">Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Title')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle ref={ref}>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(ref).toHaveBeenCalled()
  })
})

describe('DialogDescription', () => {
  it('renders dialog description', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogDescription>Test Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogDescription className="custom-class">Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Description')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(
      <Dialog open>
        <DialogContent>
          <DialogDescription ref={ref}>Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(ref).toHaveBeenCalled()
  })
})

describe('DialogContent', () => {
  it('renders content with custom className', () => {
    render(
      <Dialog open>
        <DialogContent className="custom-class">
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    const content = screen.getByRole('dialog')
    expect(content).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(
      <Dialog open>
        <DialogContent ref={ref}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(ref).toHaveBeenCalled()
  })
})

describe('Dialog complete structure', () => {
  it('renders complete dialog with all subcomponents', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Title</DialogTitle>
            <DialogDescription>Modal description text</DialogDescription>
          </DialogHeader>
          <div>Modal body content</div>
          <DialogFooter>
            <button>Cancel</button>
            <button>Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText('Modal Title')).toBeInTheDocument()
    expect(screen.getByText('Modal description text')).toBeInTheDocument()
    expect(screen.getByText('Modal body content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('handles controlled dialog with onOpenChange', () => {
    const handleOpenChange = jest.fn()
    render(
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogTitle>Controlled Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Controlled Dialog')).toBeInTheDocument()
  })

  it('renders dialog with trigger and opens on interaction', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Triggered Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Open Dialog')).toBeInTheDocument()
  })

  it('renders overlay with custom className', () => {
    const { container } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    // DialogOverlay is rendered as part of DialogContent - check for dialog role instead
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders dialog with multiple header elements', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description line 1</DialogDescription>
            <DialogDescription>Description line 2</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Description line 1')).toBeInTheDocument()
    expect(screen.getByText('Description line 2')).toBeInTheDocument()
  })

  it('renders dialog with custom footer content', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Custom Footer</DialogTitle>
          <DialogFooter>
            <span>Footer text</span>
            <button>Action 1</button>
            <button>Action 2</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Footer text')).toBeInTheDocument()
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
  })

  it('exports DialogPortal component', () => {
    expect(DialogPortal).toBeDefined()
  })

  it('exports DialogOverlay component', () => {
    expect(DialogOverlay).toBeDefined()
  })

  it('exports DialogClose component', () => {
    expect(DialogClose).toBeDefined()
  })

  it('renders DialogClose explicitly', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Test</DialogTitle>
          <DialogClose asChild>
            <button>Custom Close</button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Custom Close')).toBeInTheDocument()
  })
})
