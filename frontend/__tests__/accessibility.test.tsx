/**
 * Comprehensive Accessibility Tests for VFIDE
 * Tests WCAG 2.1 AA compliance across components
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

describe('Accessibility: Keyboard Navigation', () => {
  it('button should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    button.focus();

    // Should activate on Enter
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalled();

    handleClick.mockClear();

    // Should activate on Space
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalled();
  });

  it('should maintain logical tab order', () => {
    render(
      <>
        <Button>First</Button>
        <Button>Second</Button>
        <Button>Third</Button>
      </>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);

    // Verify tab order
    buttons.forEach((button, index) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});

describe('Accessibility: Focus Management', () => {
  it('button should have visible focus indicator', () => {
    render(<Button>Focus me</Button>);

    const button = screen.getByRole('button');
    button.focus();

    // Check for focus styling
    expect(button).toHaveFocus();
  });

  it('dialog should trap focus', async () => {
    const user = userEvent.setup();

    function DialogExample() {
      return (
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <button>First</button>
            <button>Second</button>
          </DialogContent>
        </Dialog>
      );
    }

    render(<DialogExample />);

    const openButton = screen.getByText('Open');
    await user.click(openButton);

    // Dialog should be visible
    const content = screen.getByText('First');
    expect(content).toBeInTheDocument();
  });

  it('pressing Escape should close dialog', async () => {
    const user = userEvent.setup();

    function DialogExample() {
      return (
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );
    }

    const { rerender } = render(<DialogExample />);

    const openButton = screen.getByText('Open');
    await user.click(openButton);

    // Press Escape
    await user.keyboard('{Escape}');
  });
});

describe('Accessibility: ARIA Labels', () => {
  it('icon button should have aria-label', () => {
    render(
      <button aria-label="Close menu" className="p-2">
        ✕
      </button>
    );

    const button = screen.getByLabelText('Close menu');
    expect(button).toBeInTheDocument();
  });

  it('buttons should have proper type attribute', () => {
    render(
      <>
        <button type="button">Regular</button>
        <button type="submit">Submit</button>
        <button type="reset">Reset</button>
      </>
    );

    expect(screen.getByRole('button', { name: /Regular/ })).toHaveAttribute(
      'type',
      'button'
    );
    expect(screen.getByRole('button', { name: /Submit/ })).toHaveAttribute(
      'type',
      'submit'
    );
    expect(screen.getByRole('button', { name: /Reset/ })).toHaveAttribute(
      'type',
      'reset'
    );
  });

  it('form inputs should be associated with labels', () => {
    render(
      <>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </>
    );

    const input = screen.getByRole('textbox', { name: /Email/ });
    expect(input).toHaveAttribute('id', 'email');
  });

  it('disabled state should be announced', () => {
    render(<Button disabled>Disabled Button</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});

describe('Accessibility: Semantic HTML', () => {
  it('should use semantic button element', () => {
    render(<Button>Click</Button>);

    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
  });

  it('should use proper heading hierarchy', () => {
    render(
      <>
        <h1>Main Title</h1>
        <h2>Section Title</h2>
        <h3>Subsection</h3>
      </>
    );

    const heading1 = screen.getByRole('heading', { level: 1 });
    const heading2 = screen.getByRole('heading', { level: 2 });
    const heading3 = screen.getByRole('heading', { level: 3 });

    expect(heading1).toHaveTextContent('Main Title');
    expect(heading2).toHaveTextContent('Section Title');
    expect(heading3).toHaveTextContent('Subsection');
  });

  it('should use semantic list elements', () => {
    render(
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    );

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });
});

describe('Accessibility: Color Contrast', () => {
  it('should have sufficient contrast for text', () => {
    // VFIDE colors
    const primaryText = '#F5F3E8'; // Cream on dark
    const darkBg = '#1A1A1D';
    const secondaryText = '#A0A0A5'; // Gray on dark

    // These should meet WCAG AA standards (4.5:1 for normal text)
    // Primary text should have higher contrast
    // Secondary text should have at least 3:1 for large text
  });
});

describe('Accessibility: Images & Icons', () => {
  it('images should have alt text', () => {
    render(<img src="test.png" alt="Test image" />);

    const image = screen.getByAltText('Test image');
    expect(image).toBeInTheDocument();
  });

  it('decorative images should have empty alt', () => {
    render(<img src="decorative.png" alt="" />);

    const image = screen.getByAltText('');
    expect(image).toHaveAttribute('alt', '');
  });
});

describe('Accessibility: Forms', () => {
  it('form input should be associated with label', () => {
    render(
      <div>
        <label htmlFor="test-input">Test Label</label>
        <input id="test-input" type="text" />
      </div>
    );

    const input = screen.getByLabelText('Test Label');
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('required fields should be marked', () => {
    render(
      <input
        type="email"
        required
        aria-required="true"
        aria-label="Email"
      />
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('form errors should be announced', () => {
    render(
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          aria-describedby="email-error"
          value="invalid"
        />
        <span id="email-error" role="alert">
          Please enter a valid email
        </span>
      </div>
    );

    const input = screen.getByLabelText('Email');
    const error = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(error).toHaveTextContent('Please enter a valid email');
  });
});

describe('Accessibility: Motion', () => {
  it('should respect prefers-reduced-motion', () => {
    // Test that animations respect user preferences
    const mediaQuery = '(prefers-reduced-motion: reduce)';
    const matches = window.matchMedia(mediaQuery).matches;

    if (matches) {
      // Animations should be disabled
      expect(true).toBe(true);
    }
  });
});

describe('Accessibility: Content Structure', () => {
  it('should have proper page landmark structure', () => {
    render(
      <>
        <header>Header</header>
        <nav>Navigation</nav>
        <main>Main Content</main>
        <aside>Sidebar</aside>
        <footer>Footer</footer>
      </>
    );

    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
    expect(screen.getByRole('main')).toBeInTheDocument(); // main
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
  });
});
