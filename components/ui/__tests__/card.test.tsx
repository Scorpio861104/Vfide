import { render, screen } from '@testing-library/react'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '../card'

describe('Card', () => {
  it('renders card', () => {
    render(<Card data-testid="card">Card content</Card>)
    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies custom className to Card', () => {
    render(<Card className="custom-class">Content</Card>)
    const card = screen.getByText('Content')
    expect(card).toHaveClass('custom-class')
  })

  it('forwards ref to Card', () => {
    const ref = jest.fn()
    render(<Card ref={ref}>Content</Card>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('CardHeader', () => {
  it('renders card header', () => {
    render(<CardHeader>Header</CardHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardHeader className="custom-class">Header</CardHeader>)
    expect(screen.getByText('Header')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<CardHeader ref={ref}>Header</CardHeader>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('CardTitle', () => {
  it('renders card title', () => {
    render(<CardTitle>Title</CardTitle>)
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardTitle className="custom-class">Title</CardTitle>)
    expect(screen.getByText('Title')).toHaveClass('custom-class')
  })

  it('renders as h3', () => {
    render(<CardTitle>Title</CardTitle>)
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<CardTitle ref={ref}>Title</CardTitle>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('CardDescription', () => {
  it('renders card description', () => {
    render(<CardDescription>Description</CardDescription>)
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardDescription className="custom-class">Description</CardDescription>)
    expect(screen.getByText('Description')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<CardDescription ref={ref}>Description</CardDescription>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('CardContent', () => {
  it('renders card content', () => {
    render(<CardContent>Content</CardContent>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardContent className="custom-class">Content</CardContent>)
    expect(screen.getByText('Content')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<CardContent ref={ref}>Content</CardContent>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('CardFooter', () => {
  it('renders card footer', () => {
    render(<CardFooter>Footer</CardFooter>)
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<CardFooter className="custom-class">Footer</CardFooter>)
    expect(screen.getByText('Footer')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(<CardFooter ref={ref}>Footer</CardFooter>)
    expect(ref).toHaveBeenCalled()
  })
})

describe('Card complete structure', () => {
  it('renders complete card with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Main content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })
})
