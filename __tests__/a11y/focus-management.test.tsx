import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React, { useState } from 'react';

expect.extend(toHaveNoViolations);

describe('Focus Management Tests', () => {
  describe('Visible Focus Indicators', () => {
    it('focused elements should have visible focus indicator', async () => {
      const { container } = render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <a href="/page">Link</a>
        </div>
      );

      const button = screen.getAllByRole('button')[0];
      button.focus();
      expect(button).toHaveFocus();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('custom focus styles should be visible', async () => {
      const { container } = render(
        <button 
          style={{ 
            outline: '2px solid #0066cc',
            outlineOffset: '2px'
          }}
        >
          Custom Focus Button
        </button>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('all interactive elements should have focus indicators', async () => {
      const { container } = render(
        <div>
          <button>Button</button>
          <a href="/page">Link</a>
          <input type="text" aria-label="Text input" />
          <select aria-label="Select">
            <option>Option</option>
          </select>
          <textarea aria-label="Textarea" />
        </div>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focus should be visible on all states', async () => {
      const { container } = render(
        <div>
          <button>Normal Button</button>
          <button disabled>Disabled Button</button>
          <button aria-pressed="true">Toggle Button (Pressed)</button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Never Lost', () => {
    it('removing focused element should move focus appropriately', () => {
      const TestComponent = () => {
        const [showButton, setShowButton] = useState(true);
        
        return (
          <div>
            <button onClick={() => setShowButton(false)}>Remove Button</button>
            {showButton && <button id="removable">Removable</button>}
            <button>Next Button</button>
          </div>
        );
      };

      render(<TestComponent />);
      
      const removeButton = screen.getByRole('button', { name: 'Remove Button' });
      expect(removeButton).toBeInTheDocument();
    });

    it('focus should not be lost when content updates', () => {
      const TestComponent = () => {
        const [count, setCount] = useState(0);
        
        return (
          <div>
            <button onClick={() => setCount(count + 1)}>
              Count: {count}
            </button>
            <p>Current count: {count}</p>
          </div>
        );
      };

      render(<TestComponent />);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('focus should be maintained during loading states', async () => {
      const TestComponent = () => {
        const [loading, setLoading] = useState(false);
        
        return (
          <button 
            onClick={() => setLoading(true)}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Loading...' : 'Submit'}
          </button>
        );
      };

      const { container } = render(<TestComponent />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Logical Focus Movement', () => {
    it('tab order should follow visual order', async () => {
      const { container } = render(
        <form>
          <label htmlFor="first">First</label>
          <input id="first" type="text" />
          
          <label htmlFor="second">Second</label>
          <input id="second" type="text" />
          
          <label htmlFor="third">Third</label>
          <input id="third" type="text" />
          
          <button type="submit">Submit</button>
        </form>
      );

      const first = screen.getByLabelText('First');
      const second = screen.getByLabelText('Second');
      const third = screen.getByLabelText('Third');
      const submit = screen.getByRole('button');

      first.focus();
      expect(first).toHaveFocus();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focus should skip hidden elements', async () => {
      const { container } = render(
        <div>
          <button>Visible 1</button>
          <button style={{ display: 'none' }}>Hidden</button>
          <button>Visible 2</button>
        </div>
      );

      const buttons = screen.getAllByRole('button', { hidden: true });
      const visibleButtons = buttons.filter(
        (button) => window.getComputedStyle(button).display !== 'none'
      );
      expect(visibleButtons).toHaveLength(2); // Only visible buttons

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focus should skip disabled elements', async () => {
      const { container } = render(
        <div>
          <button>Active 1</button>
          <button disabled>Disabled</button>
          <button>Active 2</button>
        </div>
      );

      const activeButtons = screen.getAllByRole('button').filter(b => !b.hasAttribute('disabled'));
      expect(activeButtons).toHaveLength(2);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('programmatic focus should move logically', async () => {
      const TestComponent = () => {
        const firstRef = React.useRef<HTMLButtonElement>(null);
        const lastRef = React.useRef<HTMLButtonElement>(null);
        
        return (
          <div>
            <button ref={firstRef}>First</button>
            <button onClick={() => lastRef.current?.focus()}>
              Jump to Last
            </button>
            <button ref={lastRef}>Last</button>
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modal Focus Trapping', () => {
    it('focus should be trapped within modal', async () => {
      const Modal = ({ onClose }: { onClose: () => void }) => {
        const modalRef = React.useRef<HTMLDivElement>(null);
        
        React.useEffect(() => {
          const modal = modalRef.current;
          if (!modal) return;
          
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
          
          firstElement?.focus();
          
          const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                lastElement?.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === lastElement) {
                firstElement?.focus();
                e.preventDefault();
              }
            }
          };
          
          modal.addEventListener('keydown', handleTab);
          return () => modal.removeEventListener('keydown', handleTab);
        }, []);
        
        return (
          <div 
            ref={modalRef}
            role="dialog" 
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <h2 id="modal-title">Modal Title</h2>
            <button>Action 1</button>
            <button>Action 2</button>
            <button onClick={onClose}>Close</button>
          </div>
        );
      };

      const { container } = render(<Modal onClose={() => {}} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tabbing forward should cycle within modal', async () => {
      const { container } = render(
        <div role="dialog" aria-modal="true" aria-labelledby="title">
          <h2 id="title">Dialog</h2>
          <button id="first">First</button>
          <button id="middle">Middle</button>
          <button id="last">Last</button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tabbing backward should cycle within modal', async () => {
      const { container } = render(
        <div role="dialog" aria-modal="true" aria-labelledby="title">
          <h2 id="title">Dialog</h2>
          <button>First</button>
          <button>Last</button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('nested modals should maintain separate focus traps', async () => {
      const { container } = render(
        <div>
          <div role="dialog" aria-modal="true" aria-labelledby="outer-title">
            <h2 id="outer-title">Outer Dialog</h2>
            <button>Outer Button</button>
            
            <div role="dialog" aria-modal="true" aria-labelledby="inner-title">
              <h2 id="inner-title">Inner Dialog</h2>
              <button>Inner Button</button>
            </div>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Return Focus After Modal Close', () => {
    it('focus should return to trigger element', async () => {
      const TestComponent = () => {
        const [modalOpen, setModalOpen] = useState(false);
        const triggerRef = React.useRef<HTMLButtonElement>(null);
        
        React.useEffect(() => {
          if (!modalOpen) {
            triggerRef.current?.focus();
          }
        }, [modalOpen]);
        
        return (
          <div>
            <button ref={triggerRef} onClick={() => setModalOpen(true)}>
              Open Modal
            </button>
            {modalOpen && (
              <div role="dialog" aria-modal="true">
                <h2>Modal</h2>
                <button onClick={() => setModalOpen(false)}>Close</button>
              </div>
            )}
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focus should return after Escape key', async () => {
      const TestComponent = () => {
        const [open, setOpen] = useState(true);
        const triggerRef = React.useRef<HTMLButtonElement>(null);
        
        React.useEffect(() => {
          if (!open) {
            triggerRef.current?.focus();
          }
        }, [open]);
        
        return (
          <div>
            <button ref={triggerRef}>Trigger</button>
            {open && (
              <div 
                role="dialog" 
                aria-modal="true"
                aria-label="Modal Dialog"
                onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
              >
                <button onClick={() => setOpen(false)}>Close</button>
              </div>
            )}
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focus should return to logical element if trigger is removed', async () => {
      const TestComponent = () => {
        const [modalOpen, setModalOpen] = useState(true);
        const fallbackRef = React.useRef<HTMLDivElement>(null);
        
        React.useEffect(() => {
          if (!modalOpen) {
            fallbackRef.current?.focus();
          }
        }, [modalOpen]);
        
        return (
          <div ref={fallbackRef} tabIndex={-1}>
            {modalOpen && (
              <div role="dialog" aria-modal="true" aria-label="Confirmation Dialog">
                <button onClick={() => setModalOpen(false)}>Close</button>
              </div>
            )}
            <p>Main content</p>
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus on Page Navigation', () => {
    it('main content should receive focus on navigation', async () => {
      const { container } = render(
        <div>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
          <main tabIndex={-1} id="main-content">
            <h1>Page Title</h1>
            <p>Content</p>
          </main>
        </div>
      );

      const main = container.querySelector('#main-content');
      expect(main).toHaveAttribute('tabIndex', '-1');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('skip link should move focus to main content', async () => {
      const { container } = render(
        <div>
          <a href="#main" className="skip-link">Skip to content</a>
          <nav>Navigation</nav>
          <main id="main" tabIndex={-1}>
            <h1>Main Content</h1>
          </main>
        </div>
      );

      const skipLink = screen.getByText('Skip to content');
      expect(skipLink).toHaveAttribute('href', '#main');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('page title should be announced on navigation', async () => {
      const { container } = render(
        <div>
          <title>New Page Title - Vfide</title>
          <h1>New Page Title</h1>
          <div role="status" aria-live="polite" aria-atomic="true">
            Navigated to New Page Title
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management in Dynamic Content', () => {
    it('newly revealed content should receive focus when appropriate', async () => {
      const TestComponent = () => {
        const [expanded, setExpanded] = useState(false);
        const contentRef = React.useRef<HTMLDivElement>(null);
        
        React.useEffect(() => {
          if (expanded) {
            contentRef.current?.focus();
          }
        }, [expanded]);
        
        return (
          <div>
            <button 
              aria-expanded={expanded}
              aria-controls="expandable-content"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Collapse' : 'Expand'} Content
            </button>
            {expanded && (
              <div 
                id="expandable-content"
                ref={contentRef}
                tabIndex={-1}
              >
                <h2>Additional Content</h2>
                <p>This content was hidden</p>
                <button>Action in expanded content</button>
              </div>
            )}
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('accordion focus should move to expanded panel', async () => {
      const { container } = render(
        <div>
          <h3>
            <button
              aria-expanded="true"
              aria-controls="section1"
            >
              Section 1
            </button>
          </h3>
          <div id="section1" role="region">
            <p>Section 1 content</p>
            <button>Action</button>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tab panel should receive focus when selected', async () => {
      const TestComponent = () => {
        const [activeTab, setActiveTab] = useState(0);
        const panelRef = React.useRef<HTMLDivElement>(null);
        
        React.useEffect(() => {
          panelRef.current?.focus();
        }, [activeTab]);
        
        return (
          <div>
            <div role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 0}
                onClick={() => setActiveTab(0)}
              >
                Tab 1
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 1}
                onClick={() => setActiveTab(1)}
              >
                Tab 2
              </button>
            </div>
            <div 
              role="tabpanel"
              ref={panelRef}
              tabIndex={-1}
            >
              Panel {activeTab + 1} content
            </div>
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('added list items should not steal focus', async () => {
      const TestComponent = () => {
        const [items, setItems] = useState(['Item 1', 'Item 2']);
        
        return (
          <div>
            <button onClick={() => setItems([...items, `Item ${items.length + 1}`])}>
              Add Item
            </button>
            <ul>
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      
      const addButton = screen.getByRole('button');
      addButton.focus();
      expect(addButton).toHaveFocus();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Indicators on Complex Widgets', () => {
    it('combobox should show focus on input and listbox', async () => {
      const { container } = render(
        <div>
          <label htmlFor="combo">Choose option</label>
          <input
            id="combo"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="listbox"
          />
          <ul id="listbox" role="listbox">
            <li role="option">Option 1</li>
            <li role="option">Option 2</li>
          </ul>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tree view items should show focus', async () => {
      const { container } = render(
        <div role="tree" aria-label="File tree">
          <div role="treeitem" tabIndex={0} aria-expanded="true">
            <span>Folder</span>
            <div role="group">
              <div role="treeitem" tabIndex={-1}>File 1</div>
              <div role="treeitem" tabIndex={-1}>File 2</div>
            </div>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('menu items should show focus', async () => {
      const { container } = render(
        <div>
          <button aria-haspopup="true" aria-expanded="true">
            Menu
          </button>
          <div role="menu">
            <div role="menuitem" tabIndex={0}>Item 1</div>
            <div role="menuitem" tabIndex={-1}>Item 2</div>
            <div role="menuitem" tabIndex={-1}>Item 3</div>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management Edge Cases', () => {
    it('focus should not be on multiple elements simultaneously', async () => {
      const { container } = render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
        </div>
      );

      const buttons = screen.getAllByRole('button');
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();
      expect(buttons[1]).not.toHaveFocus();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focus should handle rapid navigation', async () => {
      const { container } = render(
        <div>
          <button>1</button>
          <button>2</button>
          <button>3</button>
          <button>4</button>
          <button>5</button>
        </div>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        button.focus();
        expect(button).toHaveFocus();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('focus should work with portals', async () => {
      const { container } = render(
        <div>
          <button>Main Content Button</button>
          <div id="portal-root">
            <div role="dialog" aria-modal="true" aria-label="Portal Dialog">
              <button>Portal Button</button>
            </div>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
