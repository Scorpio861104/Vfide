import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

describe('Interactive Components Accessibility Tests', () => {
  describe('Buttons', () => {
    it('buttons should have accessible names', async () => {
      const { container } = render(
        <div>
          <button>Submit Form</button>
          <button aria-label="Close dialog">×</button>
          <button>
            <img src="/icon.png" alt="Save" />
          </button>
        </div>
      );

      expect(screen.getByRole('button', { name: 'Submit Form' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('icon-only buttons should have labels', async () => {
      const { container } = render(
        <div>
          <button aria-label="Search">
            <svg aria-hidden="true"><path d="M0 0" /></svg>
          </button>
          <button aria-label="Settings">
            <span aria-hidden="true">⚙️</span>
          </button>
          <button aria-label="Notifications">
            <span aria-hidden="true">🔔</span>
          </button>
        </div>
      );

      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('toggle buttons should indicate state', async () => {
      const { container } = render(
        <div>
          <button aria-pressed="true">Bold</button>
          <button aria-pressed="false">Italic</button>
          <button aria-expanded="true" aria-controls="menu-panel">Menu</button>
          <div id="menu-panel" hidden>Menu content</div>
        </div>
      );

      const boldButton = screen.getByRole('button', { name: 'Bold' });
      expect(boldButton).toHaveAttribute('aria-pressed', 'true');

      const italicButton = screen.getByRole('button', { name: 'Italic' });
      expect(italicButton).toHaveAttribute('aria-pressed', 'false');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('disabled buttons should be properly marked', async () => {
      const { container } = render(
        <div>
          <button disabled>Disabled Button</button>
          <button aria-disabled="true">Aria Disabled</button>
        </div>
      );

      const disabledButton = screen.getByRole('button', { name: 'Disabled Button' });
      expect(disabledButton).toBeDisabled();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('button groups should be properly labeled', async () => {
      const { container } = render(
        <div role="group" aria-label="Text formatting">
          <button>Bold</button>
          <button>Italic</button>
          <button>Underline</button>
        </div>
      );

      expect(screen.getByRole('group', { name: 'Text formatting' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Links', () => {
    it('links should have descriptive text', async () => {
      const { container } = render(
        <div>
          <a href="/about">Learn more about our company</a>
          <a href="/contact">Contact us for support</a>
          <a href="/docs">Read the documentation</a>
        </div>
      );

      expect(screen.getByRole('link', { name: /learn more/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /contact us/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /read the documentation/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('links with images should have alt text', async () => {
      const { container } = render(
        <a href="/home">
          <img src="/logo.png" alt="Go to homepage" />
        </a>
      );

      expect(screen.getByRole('link', { name: 'Go to homepage' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('icon links should have labels', async () => {
      const { container } = render(
        <div>
          <a href="https://twitter.com" aria-label="Follow us on Twitter">
            <svg aria-hidden="true"><path d="M0 0" /></svg>
          </a>
          <a href="https://github.com" aria-label="View our GitHub">
            <span aria-hidden="true">GitHub</span>
          </a>
        </div>
      );

      expect(screen.getByRole('link', { name: /twitter/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('external links should indicate they open in new window', async () => {
      const { container } = render(
        <a href="https://example.com" target="_blank" rel="noopener noreferrer">
          External Site
          <span className="visually-hidden"> (opens in new window)</span>
        </a>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent(/opens in new window/i);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('skip links should be accessible', async () => {
      const { container } = render(
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <a href="#navigation" className="skip-link">
            Skip to navigation
          </a>
          <main id="main-content">Content</main>
        </div>
      );

      expect(screen.getByRole('link', { name: /skip to main/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /skip to navigation/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Forms', () => {
    it('text inputs should have labels', async () => {
      const { container } = render(
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" />

          <label htmlFor="email">Email Address</label>
          <input id="email" type="email" />

          <label htmlFor="phone">Phone Number</label>
          <input id="phone" type="tel" />
        </form>
      );

      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('required fields should be marked', async () => {
      const { container } = render(
        <form>
          <label htmlFor="username">
            Username <span aria-label="required">*</span>
          </label>
          <input id="username" type="text" required aria-required="true" />

          <label htmlFor="password">
            Password <span aria-label="required">*</span>
          </label>
          <input id="password" type="password" required aria-required="true" />
        </form>
      );

      const username = screen.getByLabelText(/username/i);
      expect(username).toHaveAttribute('required');
      expect(username).toHaveAttribute('aria-required', 'true');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form fields should have helpful descriptions', async () => {
      const { container } = render(
        <form>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            aria-describedby="password-requirements"
          />
          <p id="password-requirements">
            Must be at least 8 characters with uppercase, lowercase, and numbers
          </p>
        </form>
      );

      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('aria-describedby', 'password-requirements');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('checkboxes should have labels', async () => {
      const { container } = render(
        <form>
          <label>
            <input type="checkbox" />
            I agree to the terms and conditions
          </label>
          
          <label htmlFor="newsletter">
            <input id="newsletter" type="checkbox" />
            Subscribe to newsletter
          </label>
        </form>
      );

      expect(screen.getByRole('checkbox', { name: /I agree to the terms and conditions/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /subscribe/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('radio button groups should use fieldset and legend', async () => {
      const { container } = render(
        <fieldset>
          <legend>Choose your plan</legend>
          <label>
            <input type="radio" name="plan" value="free" />
            Free Plan
          </label>
          <label>
            <input type="radio" name="plan" value="pro" />
            Pro Plan
          </label>
          <label>
            <input type="radio" name="plan" value="enterprise" />
            Enterprise Plan
          </label>
        </fieldset>
      );

      expect(screen.getByRole('group', { name: 'Choose your plan' })).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(3);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('select dropdowns should have labels', async () => {
      const { container } = render(
        <form>
          <label htmlFor="country">Country</label>
          <select id="country">
            <option value="">Select a country</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
            <option value="ca">Canada</option>
          </select>
        </form>
      );

      expect(screen.getByLabelText('Country')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('textareas should have labels', async () => {
      const { container } = render(
        <form>
          <label htmlFor="message">Message</label>
          <textarea id="message" rows={4} />

          <label htmlFor="comments">Additional Comments</label>
          <textarea id="comments" rows={3} />
        </form>
      );

      expect(screen.getByLabelText('Message')).toBeInTheDocument();
      expect(screen.getByLabelText('Additional Comments')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form errors should be associated with inputs', async () => {
      const { container } = render(
        <form>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            aria-invalid="true"
            aria-describedby="email-error"
          />
          <span id="email-error" role="alert">
            Please enter a valid email address
          </span>
        </form>
      );

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(screen.getByRole('alert')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Images', () => {
    it('informative images should have descriptive alt text', async () => {
      const { container } = render(
        <div>
          <img src="/logo.png" alt="Vfide company logo" />
          <img src="/chart.png" alt="Sales chart showing 20% growth in Q4" />
          <img src="/user.jpg" alt="Profile picture of John Doe" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('decorative images should have empty alt or be hidden', async () => {
      const { container } = render(
        <div>
          <img src="/decoration.png" alt="" role="presentation" />
          <img src="/border.png" alt="" aria-hidden="true" />
          <img src="/background.jpg" alt="" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('complex images should have detailed descriptions', async () => {
      const { container } = render(
        <figure>
          <img
            src="/infographic.png"
            alt="Customer satisfaction infographic"
            aria-describedby="infographic-description"
          />
          <figcaption id="infographic-description">
            Infographic showing customer satisfaction ratings: 85% very satisfied,
            10% satisfied, 3% neutral, 2% dissatisfied
          </figcaption>
        </figure>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('images in links should describe destination', async () => {
      const { container } = render(
        <a href="/products">
          <img src="/product.jpg" alt="View product details" />
        </a>
      );

      expect(screen.getByRole('link', { name: 'View product details' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('image maps should have accessible areas', async () => {
      const { container } = render(
        <div>
          <img src="/map.png" alt="Office locations" useMap="#office-map" />
          <map name="office-map">
            <area
              shape="rect"
              coords="0,0,100,100"
              href="/offices/ny"
              alt="New York office"
            />
            <area
              shape="rect"
              coords="100,0,200,100"
              href="/offices/sf"
              alt="San Francisco office"
            />
          </map>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Icons', () => {
    it('icons should have accessible labels when meaningful', async () => {
      const { container } = render(
        <div>
          <button aria-label="Save document">
            <svg aria-hidden="true">
              <path d="M0 0" />
            </svg>
          </button>
          <span role="img" aria-label="Success">
            ✓
          </span>
          <span role="img" aria-label="Warning">
            ⚠️
          </span>
        </div>
      );

      expect(screen.getByRole('button', { name: 'Save document' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('decorative icons should be hidden from screen readers', async () => {
      const { container } = render(
        <div>
          <button>
            <svg aria-hidden="true">
              <path d="M0 0" />
            </svg>
            Save
          </button>
          <p>
            <span aria-hidden="true">→</span>
            Next step
          </p>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('icon fonts should have proper labels', async () => {
      const { container } = render(
        <div>
          <button aria-label="Settings">
            <i className="icon-settings" aria-hidden="true" />
          </button>
          <a href="/help" aria-label="Help documentation">
            <i className="icon-help" aria-hidden="true" />
          </a>
        </div>
      );

      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Help documentation' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('status icons should convey meaning without color alone', async () => {
      const { container } = render(
        <div>
          <div>
            <span role="img" aria-label="Success" style={{ color: 'green' }}>
              ✓
            </span>
            Operation successful
          </div>
          <div>
            <span role="img" aria-label="Error" style={{ color: 'red' }}>
              ✗
            </span>
            Operation failed
          </div>
          <div>
            <span role="img" aria-label="Warning" style={{ color: 'orange' }}>
              ⚠
            </span>
            Warning message
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Tables', () => {
    it('data tables should have proper headers', async () => {
      const { container } = render(
        <table>
          <caption>User List</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>john@example.com</td>
              <td>Admin</td>
              <td>Active</td>
            </tr>
            <tr>
              <td>Jane Smith</td>
              <td>jane@example.com</td>
              <td>User</td>
              <td>Active</td>
            </tr>
          </tbody>
        </table>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('caption')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('complex tables should use scope attributes', async () => {
      const { container } = render(
        <table>
          <caption>Quarterly Sales</caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Q1</th>
              <th scope="col">Q2</th>
              <th scope="col">Q3</th>
              <th scope="col">Q4</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Product A</th>
              <td>$100k</td>
              <td>$150k</td>
              <td>$200k</td>
              <td>$250k</td>
            </tr>
            <tr>
              <th scope="row">Product B</th>
              <td>$80k</td>
              <td>$120k</td>
              <td>$180k</td>
              <td>$220k</td>
            </tr>
          </tbody>
        </table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('sortable tables should indicate sort state', async () => {
      const { container } = render(
        <table>
          <caption>Sortable data</caption>
          <thead>
            <tr>
              <th aria-sort="ascending">
                <button>
                  Name
                  <span aria-hidden="true"> ↑</span>
                </button>
              </th>
              <th aria-sort="none">
                <button>
                  Date
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Item 1</td>
              <td>2024-01-01</td>
            </tr>
          </tbody>
        </table>
      );

      const firstHeader = container.querySelector('th[aria-sort="ascending"]');
      expect(firstHeader).toHaveAttribute('aria-sort', 'ascending');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tables with actions should be accessible', async () => {
      const { container } = render(
        <table>
          <caption>User Management</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>
                <button aria-label="Edit John Doe">Edit</button>
                <button aria-label="Delete John Doe">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      );

      expect(screen.getByRole('button', { name: 'Edit John Doe' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete John Doe' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('layout tables should not use table markup', async () => {
      const { container } = render(
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div>Column 1</div>
          <div>Column 2</div>
          <div>Item 1</div>
          <div>Item 2</div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Custom Components', () => {
    it('custom dropdowns should use proper ARIA', async () => {
      const { container } = render(
        <div>
          <button
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-labelledby="dropdown-label"
          >
            Select option
          </button>
          <span id="dropdown-label">Choose color</span>
          <ul role="listbox" hidden>
            <li role="option">Red</li>
            <li role="option">Blue</li>
            <li role="option">Green</li>
          </ul>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('custom tooltips should be accessible', async () => {
      const { container } = render(
        <div>
          <button aria-describedby="tooltip">
            Help
          </button>
          <div id="tooltip" role="tooltip">
            Click for more information
          </div>
        </div>
      );

      const button = screen.getByRole('button', { name: 'Help' });
      expect(button).toHaveAttribute('aria-describedby', 'tooltip');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('custom modals should trap focus and have proper ARIA', async () => {
      const { container } = render(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-desc"
        >
          <h2 id="dialog-title">Confirmation</h2>
          <p id="dialog-desc">Are you sure you want to continue?</p>
          <button>Yes</button>
          <button>No</button>
        </div>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('carousels should have proper navigation', async () => {
      const { container } = render(
        <div role="region" aria-label="Featured content" aria-roledescription="carousel">
          <button aria-label="Previous slide">←</button>
          <div role="group" aria-roledescription="slide" aria-label="Slide 1 of 3">
            <h3>Slide 1</h3>
          </div>
          <button aria-label="Next slide">→</button>
          <div role="tablist" aria-label="Slide controls">
            <button role="tab" aria-selected="true" aria-label="Go to slide 1">1</button>
            <button role="tab" aria-selected="false" aria-label="Go to slide 2">2</button>
            <button role="tab" aria-selected="false" aria-label="Go to slide 3">3</button>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
