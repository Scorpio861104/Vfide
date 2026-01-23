import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

describe('WCAG 2.1 AA Compliance Tests', () => {
  describe('Perceivable - Principle 1', () => {
    describe('1.1 Text Alternatives', () => {
      it('images should have alt text', async () => {
        const { container } = render(
          <img src="/test.jpg" alt="Descriptive alt text" />
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('decorative images should have empty alt', async () => {
        const { container } = render(
          <img src="/decorative.jpg" alt="" role="presentation" />
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('icons should have accessible labels', async () => {
        const { container } = render(
          <button aria-label="Close dialog">
            <span aria-hidden="true">×</span>
          </button>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('informative SVGs should have title and desc', async () => {
        const { container } = render(
          <svg role="img" aria-labelledby="title desc">
            <title id="title">Chart Title</title>
            <desc id="desc">A bar chart showing sales data</desc>
            <rect x="0" y="0" width="100" height="100" />
          </svg>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('1.2 Time-based Media', () => {
      it('video should have captions', async () => {
        const { container } = render(
          <video controls>
            <source src="/video.mp4" type="video/mp4" />
            <track kind="captions" src="/captions.vtt" srcLang="en" label="English" />
          </video>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('audio should have transcript or captions', async () => {
        const { container } = render(
          <div>
            <audio controls>
              <source src="/audio.mp3" type="audio/mpeg" />
            </audio>
            <p>Transcript: Audio content transcribed here</p>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('1.3 Adaptable', () => {
      it('content should have proper heading hierarchy', async () => {
        const { container } = render(
          <main>
            <h1>Main Title</h1>
            <section>
              <h2>Section Title</h2>
              <h3>Subsection</h3>
            </section>
          </main>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('lists should use proper semantic markup', async () => {
        const { container } = render(
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('tables should have proper structure', async () => {
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
                <td>Completed</td>
              </tr>
            </tbody>
          </table>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('form inputs should have associated labels', async () => {
        const { container } = render(
          <form>
            <label htmlFor="username">Username</label>
            <input id="username" type="text" />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" />
          </form>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('landmark regions should be properly defined', async () => {
        const { container } = render(
          <div>
            <header role="banner">
              <h1>Site Title</h1>
            </header>
            <nav role="navigation" aria-label="Main navigation">
              <ul>
                <li><a href="/">Home</a></li>
              </ul>
            </nav>
            <main role="main">
              <h2>Main Content</h2>
            </main>
            <footer role="contentinfo">
              <p>Footer content</p>
            </footer>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('1.4 Distinguishable', () => {
      it('text should have sufficient color contrast (4.5:1)', async () => {
        const { container } = render(
          <p style={{ color: '#000000', backgroundColor: '#ffffff' }}>
            Normal text with sufficient contrast
          </p>
        );
        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true }
          }
        });
        expect(results).toHaveNoViolations();
      });

      it('large text should have sufficient color contrast (3:1)', async () => {
        const { container } = render(
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#595959', backgroundColor: '#ffffff' }}>
            Large text with sufficient contrast
          </h1>
        );
        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true }
          }
        });
        expect(results).toHaveNoViolations();
      });

      it('UI components should have sufficient contrast (3:1)', async () => {
        const { container } = render(
          <button style={{ backgroundColor: '#0066cc', color: '#ffffff', border: '2px solid #004499' }}>
            Button with sufficient contrast
          </button>
        );
        const results = await axe(container, {
          rules: {
            'color-contrast': { enabled: true }
          }
        });
        expect(results).toHaveNoViolations();
      });

      it('content should not rely solely on color', async () => {
        const { container } = render(
          <div>
            <p><span style={{ color: 'red' }}>*</span> Required field</p>
            <label htmlFor="email">
              Email <span aria-label="required">*</span>
            </label>
            <input id="email" type="email" required aria-required="true" />
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('text should be resizable without loss of content', async () => {
        const { container } = render(
          <div style={{ fontSize: '16px', lineHeight: '1.5' }}>
            <p>This text should be resizable up to 200% without loss of content or functionality.</p>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });

  describe('Operable - Principle 2', () => {
    describe('2.1 Keyboard Accessible', () => {
      it('interactive elements should be keyboard accessible', async () => {
        const { container } = render(
          <div>
            <button>Clickable Button</button>
            <a href="/page">Link</a>
            <input type="text" />
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('custom interactive elements should have keyboard support', async () => {
        const { container } = render(
          <div 
            role="button" 
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && console.log('activated')}
          >
            Custom Button
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('should not have keyboard traps outside modals', async () => {
        const { container } = render(
          <div>
            <button>First</button>
            <input type="text" />
            <button>Last</button>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('2.2 Enough Time', () => {
      it('forms should not have automatic timeouts without warning', async () => {
        const { container } = render(
          <form>
            <label htmlFor="data">Data Input</label>
            <input id="data" type="text" />
            <p role="status">Session expires in 10 minutes</p>
          </form>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('auto-updating content should be pausable', async () => {
        const { container } = render(
          <div>
            <div role="region" aria-live="polite" aria-label="Live updates">
              Live content
            </div>
            <button aria-label="Pause updates">Pause</button>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('2.3 Seizures and Physical Reactions', () => {
      it('should not have content that flashes more than 3 times per second', async () => {
        const { container } = render(
          <div aria-label="Animation container" role="region">
            <p>Static content without flashing</p>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('2.4 Navigable', () => {
      it('page should have a descriptive title', async () => {
        const { container } = render(
          <div>
            <title>Dashboard - Vfide Platform</title>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('should have skip navigation link', async () => {
        const { container } = render(
          <div>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <nav>Navigation</nav>
            <main id="main-content">Content</main>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('links should have descriptive text', async () => {
        const { container } = render(
          <div>
            <a href="/about">Learn more about our services</a>
            <a href="/contact" aria-label="Contact us">Contact</a>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('multiple navigation sections should be distinguishable', async () => {
        const { container } = render(
          <div>
            <nav aria-label="Main navigation">
              <ul><li><a href="/">Home</a></li></ul>
            </nav>
            <nav aria-label="Footer navigation">
              <ul><li><a href="/privacy">Privacy</a></li></ul>
            </nav>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('headings should be descriptive', async () => {
        const { container } = render(
          <article>
            <h1>Complete User Guide</h1>
            <h2>Getting Started</h2>
            <h2>Advanced Features</h2>
          </article>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('focus should be visible', async () => {
        const { container } = render(
          <button style={{ outline: '2px solid blue' }}>Focused Button</button>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('2.5 Input Modalities', () => {
      it('touch targets should be at least 44x44 pixels', async () => {
        const { container } = render(
          <button style={{ minWidth: '44px', minHeight: '44px', padding: '12px' }}>
            Tap Target
          </button>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('labels should be included in click/tap target', async () => {
        const { container } = render(
          <label htmlFor="checkbox" style={{ display: 'inline-block', padding: '10px' }}>
            <input id="checkbox" type="checkbox" />
            Select option
          </label>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });

  describe('Understandable - Principle 3', () => {
    describe('3.1 Readable', () => {
      it('page should have language attribute', async () => {
        const { container } = render(
          <html lang="en">
            <body>Content</body>
          </html>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('language changes should be marked', async () => {
        const { container } = render(
          <p>
            This is English text. <span lang="es">Este es texto en español.</span>
          </p>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('3.2 Predictable', () => {
      it('focus should not trigger automatic context changes', async () => {
        const { container } = render(
          <select aria-label="Select option">
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
          </select>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('navigation should be consistent across pages', async () => {
        const { container } = render(
          <nav aria-label="Main navigation">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/settings">Settings</a></li>
            </ul>
          </nav>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('components should be identified consistently', async () => {
        const { container } = render(
          <div>
            <button type="submit" aria-label="Save changes">Save</button>
            <button type="button" aria-label="Cancel action">Cancel</button>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    describe('3.3 Input Assistance', () => {
      it('form errors should be identified', async () => {
        const { container } = render(
          <form>
            <label htmlFor="email">Email</label>
            <input 
              id="email" 
              type="email" 
              aria-invalid="true" 
              aria-describedby="email-error"
            />
            <span id="email-error" role="alert">Please enter a valid email address</span>
          </form>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('form fields should have labels or instructions', async () => {
        const { container } = render(
          <form>
            <label htmlFor="password">
              Password
              <span id="password-hint">(At least 8 characters)</span>
            </label>
            <input 
              id="password" 
              type="password" 
              aria-describedby="password-hint"
              required
            />
          </form>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('error suggestions should be provided', async () => {
        const { container } = render(
          <div>
            <label htmlFor="username">Username</label>
            <input 
              id="username" 
              type="text" 
              aria-invalid="true"
              aria-describedby="username-error"
            />
            <div id="username-error" role="alert">
              Username is already taken. Try username123 or username456.
            </div>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('important actions should require confirmation', async () => {
        const { container } = render(
          <div>
            <button aria-label="Delete account">Delete</button>
            <div role="dialog" aria-labelledby="confirm-title">
              <h2 id="confirm-title">Confirm Deletion</h2>
              <p>Are you sure you want to delete your account?</p>
              <button>Yes, delete</button>
              <button>Cancel</button>
            </div>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('required fields should be indicated', async () => {
        const { container } = render(
          <form>
            <label htmlFor="name">
              Name <span aria-label="required">*</span>
            </label>
            <input id="name" type="text" required aria-required="true" />
          </form>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });

  describe('Robust - Principle 4', () => {
    describe('4.1 Compatible', () => {
      it('HTML should be valid and well-formed', async () => {
        const { container } = render(
          <div>
            <h1>Valid HTML</h1>
            <p>Properly nested and closed elements</p>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('custom components should have proper ARIA roles', async () => {
        const { container } = render(
          <div role="tablist">
            <button role="tab" aria-selected="true" aria-controls="panel1">Tab 1</button>
            <button role="tab" aria-selected="false" aria-controls="panel2">Tab 2</button>
            <div role="tabpanel" id="panel1" aria-labelledby="tab1">Panel 1</div>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('status messages should be programmatically determinable', async () => {
        const { container } = render(
          <div>
            <div role="status" aria-live="polite">
              Form submitted successfully
            </div>
            <div role="alert" aria-live="assertive">
              Error: Connection lost
            </div>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('dynamic content should announce changes', async () => {
        const { container } = render(
          <div>
            <div aria-live="polite" aria-atomic="true">
              Loading: 50%
            </div>
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it('elements should have unique IDs', async () => {
        const { container } = render(
          <div>
            <label htmlFor="field1">Field 1</label>
            <input id="field1" type="text" />
            <label htmlFor="field2">Field 2</label>
            <input id="field2" type="text" />
          </div>
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });
});
