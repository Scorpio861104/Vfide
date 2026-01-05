# VFIDE Component Library Documentation

## Overview
This document provides comprehensive documentation for all VFIDE UI components, including usage examples, props, accessibility considerations, and design guidelines.

## Component Inventory

### Core Components

#### Button
**Description:** Versatile button component with multiple variants and sizes.

**Props:**
- `variant`: 'default' | 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost'
- `size`: 'default' | 'sm' | 'lg'
- `disabled`: boolean
- `children`: React.ReactNode
- `className`: string
- `onClick`: (event: React.MouseEvent) => void

**Usage Example:**
```tsx
import { Button } from "@/components/ui/button";

export function MyComponent() {
  return (
    <Button variant="primary" size="lg" onClick={() => console.log("clicked")}>
      Click Me
    </Button>
  );
}
```

**Accessibility:**
- ✅ Keyboard navigable
- ✅ Proper ARIA labels
- ✅ Focus visible states
- ✅ Disabled state properly announced
- ✅ High contrast colors

**Design Pattern:**
- Use `primary` for main actions
- Use `secondary` for alternative actions
- Use `outline` for less important actions
- Use `destructive` for dangerous actions (delete, remove)
- Use `ghost` for tertiary actions

---

#### Card
**Description:** Container component for grouping related content.

**Props:**
- `className`: string
- `children`: React.ReactNode

**Sub-components:**
- `CardHeader`: Top section for title/description
- `CardTitle`: Card headline
- `CardDescription`: Subtitle text
- `CardContent`: Main content area
- `CardFooter`: Bottom section for actions

**Usage Example:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function MyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        Main content here
      </CardContent>
    </Card>
  );
}
```

**Accessibility:**
- ✅ Semantic HTML structure
- ✅ Proper heading hierarchy
- ✅ Sufficient spacing between interactive elements

**Design Guidelines:**
- Use for grouping related information
- Maintain consistent padding (p-6)
- Keep content focused and scannable

---

#### Dialog
**Description:** Modal dialog for focused user interaction.

**Props:**
- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `children`: React.ReactNode

**Sub-components:**
- `DialogTrigger`: Button that opens the dialog
- `DialogContent`: Main dialog container
- `DialogHeader`: Title and description section
- `DialogTitle`: Dialog headline
- `DialogDescription`: Dialog subtitle
- `DialogFooter`: Action buttons

**Usage Example:**
```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function MyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
        </DialogHeader>
        {/* Content here */}
      </DialogContent>
    </Dialog>
  );
}
```

**Accessibility:**
- ✅ Focus trap (focus stays within dialog)
- ✅ Escape key closes dialog
- ✅ Click outside closes dialog
- ✅ Focus returns to trigger on close
- ✅ ARIA labels present

**Best Practices:**
- Use for confirmation dialogs
- Use for forms
- Keep content concise
- Provide clear action buttons

---

#### Alert
**Description:** Component for displaying important messages.

**Props:**
- `variant`: 'default' | 'destructive'
- `children`: React.ReactNode

**Sub-components:**
- `AlertTitle`: Headline
- `AlertDescription`: Detailed message

**Usage Example:**
```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function MyAlert() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Something went wrong.</AlertDescription>
    </Alert>
  );
}
```

**Accessibility:**
- ✅ Semantic roles
- ✅ Sufficient color contrast
- ✅ Not relying on color alone

**Use Cases:**
- Success messages
- Error messages
- Warnings
- Information notices

---

#### Tabs
**Description:** Tab navigation component.

**Props:**
- `defaultValue`: string
- `orientation`: 'horizontal' | 'vertical'
- `onValueChange`: (value: string) => void

**Sub-components:**
- `TabsList`: Container for triggers
- `TabsTrigger`: Individual tab button
- `TabsContent`: Content for each tab

**Usage Example:**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function MyTabs() {
  return (
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
    </Tabs>
  );
}
```

**Accessibility:**
- ✅ Keyboard navigation (arrow keys)
- ✅ ARIA labels
- ✅ Focus visible states

---

## Design System

### Colors
```
Primary: #00F0FF (Cyan)
Success: #00FF88 (Green)
Destructive: #dc2626 (Red)
Warning: #ca8a04 (Yellow)

Background Dark: #1A1A1D
Background Lighter: #2A2A2F
Border: #3A3A3F

Text Primary: #F5F3E8 (Cream)
Text Secondary: #A0A0A5 (Gray)
```

### Typography
```
Display Font: var(--font-display)
Body Font: 'Geist', sans-serif

Heading Sizes:
- h1: 3xl
- h2: 2xl
- h3: lg
- h4: base

Body: 14px (base)
Small: 12px (sm)
```

### Spacing
```
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 24px
2xl: 32px
```

### Border Radius
```
sm: 4px
base: 6px
lg: 8px
xl: 12px
2xl: 16px
```

---

## Theming

### Dark Theme (Default)
VFIDE uses a dark theme optimized for crypto dashboards with high contrast and accent colors.

### Custom Theme Override
```tsx
// Wrap your app with custom className
<div className="dark custom-theme">
  <YourApp />
</div>
```

---

## Accessibility Guidelines

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Tab order should follow visual hierarchy
- Escape key should close modals/popovers
- Arrow keys for navigation within groups

### Screen Reader Support
- Use semantic HTML (`<button>`, `<a>`, `<form>`)
- Add `aria-label` for icon-only buttons
- Add `aria-describedby` for additional descriptions
- Use `aria-live` for dynamic content

### Color Contrast
- All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- Don't rely on color alone to convey information
- Provide alternative ways to identify elements

### Focus Management
- Visible focus indicators on all interactive elements
- Focus should be visible with CSS (`outline` or box-shadow)
- Focus order should match visual order

---

## Performance Best Practices

### Code Splitting
```tsx
const Dialog = dynamic(() => import('@/components/ui/dialog'), {
  loading: () => <Skeleton />,
});
```

### Memoization
```tsx
import { memo } from 'react';

const MyComponent = memo(({ prop }) => {
  return <div>{prop}</div>;
});
```

### Lazy Loading
```tsx
const LazyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

---

## Testing Components

### Unit Testing Example
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## Component Checklist

When creating new components, ensure:
- ✅ TypeScript interfaces for all props
- ✅ JSDoc comments for documentation
- ✅ Accessibility attributes (ARIA, semantic HTML)
- ✅ Unit tests with >80% coverage
- ✅ Storybook stories for visual documentation
- ✅ Performance optimizations (memo, lazy load)
- ✅ Error boundaries for error handling
- ✅ Loading and empty states

---

## Migration Guide

### From Old Component Library
If upgrading from a previous component library:

1. Update imports:
```tsx
// Old
import Button from '@/old-components/Button';

// New
import { Button } from '@/components/ui/button';
```

2. Update props if needed
3. Run tests to verify behavior
4. Update Storybook stories

---

## Support & Contribution

For questions or to contribute improvements:
1. Check existing GitHub issues
2. Open a new issue with detailed description
3. Submit PR with tests and documentation

---

## Changelog

### v1.0.0 (Current)
- Initial component library setup
- Button, Card, Dialog, Alert, Tabs components
- Full Storybook documentation
- 97%+ test coverage
- WCAG AA accessibility compliance
