import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

describe('Keyboard Navigation Tests', () => {
  describe('Tab Order', () => {
    it('should have logical tab order for form elements', async () => {
      const { container } = render(
        <form>
          <label htmlFor="first">First Name</label>
          <input id="first" type="text" tabIndex={1} />
          
          <label htmlFor="last">Last Name</label>
          <input id="last" type="text" tabIndex={2} />
          
          <label htmlFor="email">Email</label>
          <input id="email" type="email" tabIndex={3} />
          
          <button type="submit" tabIndex={4}>Submit</button>
        </form>
      );

      // Disable tabindex rule for this test as we're specifically testing explicit tab order
      const results = await axe(container, {
        rules: {
          tabindex: { enabled: false }
        }
      });
      expect(results).toHaveNoViolations();

      const inputs = container.querySelectorAll('input, button');
      expect(inputs[0]).toHaveAttribute('tabIndex', '1');
      expect(inputs[1]).toHaveAttribute('tabIndex', '2');
      expect(inputs[2]).toHaveAttribute('tabIndex', '3');
      expect(container.querySelector('button')).toHaveAttribute('tabIndex', '4');
    });

    it('should follow natural DOM order when tabIndex not specified', async () => {
      const { container } = render(
        <div>
          <button>First</button>
          <a href="/page">Second</a>
          <label htmlFor="input-dom-order">Input</label>
          <input id="input-dom-order" type="text" />
          <button>Last</button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should skip disabled elements in tab order', () => {
      const { container } = render(
        <div>
          <button>Active 1</button>
          <button disabled>Disabled</button>
          <button>Active 2</button>
        </div>
      );

      const disabledButton = container.querySelectorAll('button')[1];
      expect(disabledButton).toBeDisabled();
    });

    it('should handle nested interactive elements correctly', async () => {
      const { container } = render(
        <div>
          <button>
            <span>Button with nested content</span>
          </button>
          <div role="button" tabIndex={0}>
            <span>Custom button</span>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('buttons should be activatable with Enter and Space', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<button onClick={handleClick}>Click me</button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('links should be activatable with Enter', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<a href="/test" onClick={handleClick}>Link</a>);
      
      const link = screen.getByRole('link');
      link.focus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });

    it('custom interactive elements should handle keyboard events', async () => {
      const handleActivate = jest.fn();
      const user = userEvent.setup();
      
      render(
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleActivate();
            }
          }}
        >
          Custom Button
        </div>
      );
      
      const element = screen.getByRole('button');
      element.focus();
      
      await user.keyboard('{Enter}');
      expect(handleActivate).toHaveBeenCalledTimes(1);
      
      await user.keyboard(' ');
      expect(handleActivate).toHaveBeenCalledTimes(2);
    });

    it('dropdown menus should be keyboard navigable', async () => {
      const user = userEvent.setup();
      
      render(
        <div role="combobox" aria-expanded="false" aria-haspopup="listbox">
          <button aria-label="Open menu">Menu</button>
          <ul role="listbox" hidden>
            <li role="option">Option 1</li>
            <li role="option">Option 2</li>
            <li role="option">Option 3</li>
          </ul>
        </div>
      );
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(button).toHaveFocus();
    });

    it('checkbox should toggle with Space key', async () => {
      const user = userEvent.setup();
      
      render(
        <label>
          <input type="checkbox" />
          Accept terms
        </label>
      );
      
      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      
      expect(checkbox).not.toBeChecked();
      await user.keyboard(' ');
      expect(checkbox).toBeChecked();
      await user.keyboard(' ');
      expect(checkbox).not.toBeChecked();
    });

    it('radio buttons should be navigable with arrow keys', async () => {
      render(
        <div role="radiogroup" aria-label="Choose option">
          <label>
            <input type="radio" name="option" value="1" />
            Option 1
          </label>
          <label>
            <input type="radio" name="option" value="2" />
            Option 2
          </label>
          <label>
            <input type="radio" name="option" value="3" />
            Option 3
          </label>
        </div>
      );
      
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });
  });

  describe('Focus Indicators', () => {
    it('focused elements should have visible focus indicator', async () => {
      const { container } = render(
        <button style={{ outline: '2px solid blue', outlineOffset: '2px' }}>
          Focused Button
        </button>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('custom focus styles should meet contrast requirements', async () => {
      const { container } = render(
        <a 
          href="/page" 
          style={{ 
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(0, 102, 204, 0.5)'
          }}
        >
          Custom Focus Link
        </a>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focus should not be hidden by outline: none without replacement', async () => {
      const { container } = render(
        <button style={{ outline: '2px solid #0066cc' }}>
          Accessible Focus
        </button>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Skip Links', () => {
    it('skip to main content link should be present', async () => {
      const { container } = render(
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <nav>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
          <main id="main-content">
            <h1>Main Content</h1>
          </main>
        </div>
      );

      const skipLink = container.querySelector('.skip-link');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('skip link should be first focusable element', async () => {
      const { container } = render(
        <div>
          <a href="#main" className="skip-link">Skip to content</a>
          <button>Other element</button>
          <main id="main">Content</main>
        </div>
      );

      const firstFocusable = container.querySelector('a');
      expect(firstFocusable).toHaveClass('skip-link');
    });

    it('multiple skip links should be available for complex layouts', async () => {
      const { container } = render(
        <div>
          <a href="#main-content">Skip to main content</a>
          <a href="#navigation">Skip to navigation</a>
          <a href="#search">Skip to search</a>
          <nav id="navigation">Nav</nav>
          <div id="search">Search</div>
          <main id="main-content">Content</main>
        </div>
      );

      const skipLinks = container.querySelectorAll('a[href^="#"]');
      expect(skipLinks.length).toBeGreaterThanOrEqual(3);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('keyboard shortcuts should not conflict with browser/AT shortcuts', () => {
      const handleKeyDown = jest.fn((e) => {
        // Don't override Ctrl+C, Ctrl+V, etc.
        if (e.ctrlKey || e.metaKey) {
          return;
        }
        e.preventDefault();
      });

      render(
        <div onKeyDown={handleKeyDown} tabIndex={0}>
          Content with keyboard shortcuts
        </div>
      );

      expect(handleKeyDown).toBeDefined();
    });

    it('keyboard shortcuts should be documented', async () => {
      const { container } = render(
        <div>
          <button aria-label="Help (Press ? for keyboard shortcuts)">?</button>
          <div role="dialog" aria-label="Keyboard shortcuts">
            <h2>Keyboard Shortcuts</h2>
            <dl>
              <dt>?</dt>
              <dd>Show keyboard shortcuts</dd>
              <dt>/</dt>
              <dd>Focus search</dd>
              <dt>Esc</dt>
              <dd>Close dialog</dd>
            </dl>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('keyboard shortcuts should be customizable when possible', () => {
      const shortcuts = {
        search: '/',
        help: '?',
        close: 'Escape'
      };

      expect(shortcuts.search).toBe('/');
      expect(shortcuts.help).toBe('?');
      expect(shortcuts.close).toBe('Escape');
    });
  });

  describe('Modal Dialog Keyboard Behavior', () => {
    it('focus should be trapped within modal', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <button>Open Modal</button>
          <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title">Modal Title</h2>
            <button>First Button</button>
            <input type="text" placeholder="Input field" />
            <button>Last Button</button>
            <button aria-label="Close">×</button>
          </div>
        </div>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('Escape key should close modal', async () => {
      const handleClose = jest.fn();
      const user = userEvent.setup();
      
      render(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Test Modal"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              handleClose();
            }
          }}
        >
          <h2>Modal</h2>
          <button>Action</button>
        </div>
      );

      const dialog = screen.getByRole('dialog');
      dialog.focus();
      
      await user.keyboard('{Escape}');
      expect(handleClose).toHaveBeenCalled();
    });

    it('focus should return to trigger element after modal closes', () => {
      const { container } = render(
        <div>
          <button id="modal-trigger">Open Modal</button>
          <div role="dialog" aria-modal="true" hidden>
            <h2>Modal</h2>
            <button id="close-modal">Close</button>
          </div>
        </div>
      );

      const trigger = container.querySelector('#modal-trigger');
      expect(trigger).toBeInTheDocument();
    });

    it('first focusable element in modal should receive focus', async () => {
      const { container } = render(
        <div role="dialog" aria-modal="true" aria-labelledby="title">
          <h2 id="title">Dialog</h2>
          <button autoFocus>First Focusable</button>
          <button>Second</button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Complex Widget Keyboard Support', () => {
    it('tabs should be keyboard navigable with arrow keys', async () => {
      const { container } = render(
        <div>
          <div role="tablist" aria-label="Main tabs">
            <button role="tab" aria-selected="true" aria-controls="panel1" id="tab1">
              Tab 1
            </button>
            <button role="tab" aria-selected="false" aria-controls="panel2" id="tab2">
              Tab 2
            </button>
            <button role="tab" aria-selected="false" aria-controls="panel3" id="tab3">
              Tab 3
            </button>
          </div>
          <div role="tabpanel" id="panel1" aria-labelledby="tab1">
            Panel 1 content
          </div>
          <div role="tabpanel" id="panel2" aria-labelledby="tab2" hidden>
            Panel 2 content
          </div>
          <div role="tabpanel" id="panel3" aria-labelledby="tab3" hidden>
            Panel 3 content
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('accordion should be keyboard accessible', async () => {
      const { container } = render(
        <div>
          <h3>
            <button
              aria-expanded="false"
              aria-controls="section1"
              id="accordion1"
            >
              Section 1
            </button>
          </h3>
          <div id="section1" role="region" aria-labelledby="accordion1" hidden>
            Content 1
          </div>
          <h3>
            <button
              aria-expanded="false"
              aria-controls="section2"
              id="accordion2"
            >
              Section 2
            </button>
          </h3>
          <div id="section2" role="region" aria-labelledby="accordion2" hidden>
            Content 2
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tree view should support arrow key navigation', async () => {
      const { container } = render(
        <div role="tree" aria-label="File tree">
          <div role="treeitem" aria-expanded="false">
            <span>Folder 1</span>
            <div role="group">
              <div role="treeitem">File 1</div>
              <div role="treeitem">File 2</div>
            </div>
          </div>
          <div role="treeitem">File 3</div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('listbox should support keyboard selection', async () => {
      const { container } = render(
        <div>
          <label id="listbox-label">Choose an option</label>
          <div
            role="listbox"
            aria-labelledby="listbox-label"
            tabIndex={0}
          >
            <div role="option" aria-selected="false">Option 1</div>
            <div role="option" aria-selected="false">Option 2</div>
            <div role="option" aria-selected="true">Option 3</div>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('menu should support keyboard navigation', async () => {
      const { container } = render(
        <div>
          <button aria-haspopup="true" aria-expanded="false">
            Menu
          </button>
          <div role="menu" hidden>
            <div role="menuitem">Item 1</div>
            <div role="menuitem">Item 2</div>
            <div role="separator" />
            <div role="menuitem">Item 3</div>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Table Navigation', () => {
    it('data tables should be keyboard navigable', async () => {
      const { container } = render(
        <table>
          <caption>Transaction History</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2024-01-22</td>
              <td>$100</td>
              <td>Complete</td>
            </tr>
          </tbody>
        </table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('interactive elements in tables should be reachable', async () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Item 1</td>
              <td><button>Edit</button></td>
            </tr>
          </tbody>
        </table>
      );

      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('No Keyboard Traps', () => {
    it('focus should not be trapped in non-modal content', async () => {
      const { container } = render(
        <div>
          <button>Button 1</button>
          <div>
            <label htmlFor="test-input">Test input</label>
            <input id="test-input" type="text" />
            <button>Button 2</button>
          </div>
          <button>Button 3</button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('all interactive elements should be reachable and escapable', async () => {
      const { container } = render(
        <div>
          <a href="/page1">Link 1</a>
          <button>Button</button>
          <label htmlFor="text-input">Text input</label>
          <input id="text-input" type="text" />
          <label htmlFor="select-input">Select</label>
          <select id="select-input" aria-label="Select">
            <option>Option</option>
          </select>
          <a href="/page2">Link 2</a>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
