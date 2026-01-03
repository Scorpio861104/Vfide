import { render, screen } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs'

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
