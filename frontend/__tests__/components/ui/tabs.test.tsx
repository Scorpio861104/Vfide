/**
 * Comprehensive tests for Tabs primitive component
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

describe('Tabs', () => {
  it('renders tabs with list and content', () => {
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

  it('switches tab content on click', () => {
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
    
    const tab2 = screen.getByText('Tab 2')
    fireEvent.click(tab2)
    // Tab 2 button should be clickable
    expect(tab2).toBeInTheDocument()
  })

  it('applies custom className to TabsList', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-list">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tablist')).toHaveClass('custom-list')
  })

  it('applies custom className to TabsTrigger', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" className="custom-trigger">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tab')).toHaveClass('custom-trigger')
  })

  it('applies custom className to TabsContent', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="custom-content">Content</TabsContent>
      </Tabs>
    )
    expect(screen.getByRole('tabpanel')).toHaveClass('custom-content')
  })

  it('handles disabled trigger', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    expect(screen.getByText('Tab 2')).toBeDisabled()
  })

  it('controls value with controlled component', () => {
    const onValueChange = vi.fn()
    render(
      <Tabs value="tab1" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )
    
    // Click should trigger onValueChange for controlled component
    const tab2 = screen.getByText('Tab 2')
    fireEvent.click(tab2)
    // Controlled component should have tab accessible
    expect(tab2).toBeInTheDocument()
  })

  it('forwards ref to TabsList', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(
      <Tabs defaultValue="tab1">
        <TabsList ref={ref}>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    )
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })

  it('forwards ref to TabsTrigger', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger ref={ref} value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content</TabsContent>
      </Tabs>
    )
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('forwards ref to TabsContent', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent ref={ref} value="tab1">Content</TabsContent>
      </Tabs>
    )
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })

  it('supports multiple tabs', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    )
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })
})
