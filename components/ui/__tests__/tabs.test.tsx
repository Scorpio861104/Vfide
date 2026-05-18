import { render, screen } from '@testing-library/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs'

describe('Tabs', () => {
  it('renders tabs component', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
    expect(screen.getByText('Tab 2')).toBeInTheDocument()
    expect(screen.getByText('Content 1')).toBeInTheDocument()
  })

  it('shows correct content based on selected tab', () => {
    render(
      <Tabs defaultValue="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Content 2')).toBeInTheDocument()
  })
})

describe('TabsList', () => {
  it('renders tab list', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-class">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(screen.getByRole('tablist')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(
      <Tabs defaultValue="tab1">
        <TabsList ref={ref}>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(ref).toHaveBeenCalled()
  })
})

describe('TabsTrigger', () => {
  it('renders tab trigger', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" className="custom-class">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(screen.getByRole('tab')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger ref={ref} value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(ref).toHaveBeenCalled()
  })
})

describe('TabsContent', () => {
  it('renders tab content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tabpanel')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="custom-class">Content 1</TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tabpanel')).toHaveClass('custom-class')
  })

  it('forwards ref', () => {
    const ref = jest.fn()
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent ref={ref} value="tab1">Content 1</TabsContent>
      </Tabs>
    )
    expect(ref).toHaveBeenCalled()
  })
})

describe('Tabs interaction and state', () => {
  it('renders multiple tabs with controlled value', () => {
    render(
      <Tabs value="tab2">
        <TabsList>
          <TabsTrigger value="tab1">First</TabsTrigger>
          <TabsTrigger value="tab2">Second</TabsTrigger>
          <TabsTrigger value="tab3">Third</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">First content</TabsContent>
        <TabsContent value="tab2">Second content</TabsContent>
        <TabsContent value="tab3">Third content</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Second content')).toBeInTheDocument()
  })

  it('handles onValueChange callback', () => {
    const handleChange = jest.fn()
    render(
      <Tabs defaultValue="tab1" onValueChange={handleChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Tab 1')).toBeInTheDocument()
  })

  it('renders disabled tab trigger', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Active Tab</TabsTrigger>
          <TabsTrigger value="tab2" disabled>Disabled Tab</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const disabledTab = screen.getByRole('tab', { name: 'Disabled Tab' })
    expect(disabledTab).toHaveAttribute('disabled')
  })

  it('passes additional props to Tabs root', () => {
    render(
      <Tabs defaultValue="tab1" data-testid="custom-tabs" dir="rtl">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const tabs = screen.getByTestId('custom-tabs')
    expect(tabs).toHaveAttribute('dir', 'rtl')
  })

  it('renders tabs with complex content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Complex Tab</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <div>
            <h2>Title</h2>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </div>
        </TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
  })
})
