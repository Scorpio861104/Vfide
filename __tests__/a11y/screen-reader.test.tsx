import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

describe('Screen Reader Tests', () => {
  describe('ARIA Labels', () => {
    it('interactive elements without visible text should have aria-label', async () => {
      const { container } = render(
        <button aria-label="Close dialog">
          <span aria-hidden="true">×</span>
        </button>
      );

      const button = screen.getByRole('button', { name: 'Close dialog' });
      expect(button).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('icon buttons should have descriptive labels', async () => {
      const { container } = render(
        <div>
          <button aria-label="Search">
            <svg aria-hidden="true">
              <path d="M10 10" />
            </svg>
          </button>
          <button aria-label="Edit profile">
            <span aria-hidden="true">✏️</span>
          </button>
          <button aria-label="Delete item">
            <span aria-hidden="true">🗑️</span>
          </button>
        </div>
      );

      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete item' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('images should have descriptive alt text', async () => {
      const { container } = render(
        <div>
          <img src="/logo.png" alt="Vfide company logo" />
          <img src="/profile.jpg" alt="John Doe profile picture" />
          <img src="/chart.png" alt="Bar chart showing sales growth from Q1 to Q4" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('decorative images should be hidden from screen readers', async () => {
      const { container } = render(
        <div>
          <img src="/decoration.png" alt="" role="presentation" />
          <img src="/background.jpg" alt="" aria-hidden="true" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('aria-labelledby should reference existing elements', async () => {
      const { container } = render(
        <div>
          <h2 id="dialog-title">Confirmation</h2>
          <div role="dialog" aria-labelledby="dialog-title">
            <p>Are you sure?</p>
            <button>Yes</button>
            <button>No</button>
          </div>
        </div>
      );

      const dialog = screen.getByRole('dialog', { name: 'Confirmation' });
      expect(dialog).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('aria-describedby should provide additional context', async () => {
      const { container } = render(
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            aria-describedby="password-requirements"
          />
          <p id="password-requirements">
            Must be at least 8 characters with uppercase, lowercase, and numbers
          </p>
        </div>
      );

      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('aria-describedby', 'password-requirements');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA Roles', () => {
    it('custom components should have appropriate semantic roles', async () => {
      const { container } = render(
        <div>
          <div role="button" tabIndex={0}>Custom Button</div>
          <div role="navigation">Navigation area</div>
          <div role="search">
            <input type="text" aria-label="Search" />
          </div>
          <div role="alert">Important message</div>
        </div>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('dialog role should be used for modal dialogs', async () => {
      const { container } = render(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <h2 id="dialog-title">Dialog Title</h2>
          <p>Dialog content</p>
          <button>Close</button>
        </div>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('complementary role should be used for sidebars', async () => {
      const { container } = render(
        <aside role="complementary" aria-label="Related content">
          <h2>Related Articles</h2>
          <ul>
            <li><a href="/article1">Article 1</a></li>
            <li><a href="/article2">Article 2</a></li>
          </ul>
        </aside>
      );

      expect(screen.getByRole('complementary')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tablist role should be used for tabs', async () => {
      const { container } = render(
        <div>
          <div role="tablist" aria-label="Account settings">
            <button role="tab" aria-selected="true" aria-controls="panel1">
              Profile
            </button>
            <button role="tab" aria-selected="false" aria-controls="panel2">
              Security
            </button>
          </div>
          <div role="tabpanel" id="panel1">Profile content</div>
          <div role="tabpanel" id="panel2" hidden>Security content</div>
        </div>
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('status role should be used for status messages', async () => {
      const { container } = render(
        <div role="status" aria-live="polite">
          5 items updated
        </div>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('alert role should be used for important messages', async () => {
      const { container } = render(
        <div role="alert">
          Error: Your session has expired. Please log in again.
        </div>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Live Regions', () => {
    it('aria-live="polite" should announce non-urgent updates', async () => {
      const { container } = render(
        <div aria-live="polite" aria-atomic="true">
          Loading complete
        </div>
      );

      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('aria-live="assertive" should announce urgent updates', async () => {
      const { container } = render(
        <div aria-live="assertive" role="alert">
          Error: Payment failed
        </div>
      );

      const liveRegion = container.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('loading states should be announced to screen readers', async () => {
      const { container } = render(
        <div>
          <div role="status" aria-live="polite" aria-busy="true">
            Loading data...
          </div>
        </div>
      );

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-busy', 'true');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form validation messages should be announced', async () => {
      const { container } = render(
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            aria-invalid="true"
            aria-describedby="email-error"
          />
          <div id="email-error" role="alert" aria-live="assertive">
            Please enter a valid email address
          </div>
        </div>
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('progress updates should be announced', async () => {
      const { container } = render(
        <div>
          <div
            role="progressbar"
            aria-valuenow={50}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
          >
            <div style={{ width: '50%' }} />
          </div>
          <div role="status" aria-live="polite">
            50% complete
          </div>
        </div>
      );

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('search results count should be announced', async () => {
      const { container } = render(
        <div>
          <div role="status" aria-live="polite" aria-atomic="true">
            15 results found
          </div>
          <ul>
            <li>Result 1</li>
            <li>Result 2</li>
          </ul>
        </div>
      );

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('15 results found');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Labels and Associations', () => {
    it('all form inputs should have associated labels', async () => {
      const { container } = render(
        <form>
          <label htmlFor="name">Name</label>
          <input id="name" type="text" />

          <label htmlFor="email">Email</label>
          <input id="email" type="email" />

          <label htmlFor="message">Message</label>
          <textarea id="message" />
        </form>
      );

      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Message')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('checkboxes should have labels', async () => {
      const { container } = render(
        <div>
          <label>
            <input type="checkbox" />
            Accept terms and conditions
          </label>
          <label htmlFor="newsletter">
            <input id="newsletter" type="checkbox" />
            Subscribe to newsletter
          </label>
        </div>
      );

      expect(screen.getByRole('checkbox', { name: /accept terms/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /subscribe/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('radio button groups should have legend', async () => {
      const { container } = render(
        <fieldset>
          <legend>Choose payment method</legend>
          <label>
            <input type="radio" name="payment" value="card" />
            Credit Card
          </label>
          <label>
            <input type="radio" name="payment" value="paypal" />
            PayPal
          </label>
          <label>
            <input type="radio" name="payment" value="crypto" />
            Cryptocurrency
          </label>
        </fieldset>
      );

      expect(screen.getByRole('group', { name: 'Choose payment method' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('required fields should be indicated', async () => {
      const { container } = render(
        <form>
          <label htmlFor="username">
            Username <span aria-label="required">*</span>
          </label>
          <input id="username" type="text" required aria-required="true" />
        </form>
      );

      const input = screen.getByLabelText(/username/i);
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('aria-required', 'true');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('select elements should have labels', async () => {
      const { container } = render(
        <div>
          <label htmlFor="country">Country</label>
          <select id="country">
            <option value="">Select a country</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
          </select>
        </div>
      );

      expect(screen.getByLabelText('Country')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Error Message Announcements', () => {
    it('inline validation errors should be announced', async () => {
      const { container } = render(
        <div>
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            aria-invalid="true"
            aria-describedby="phone-error"
          />
          <span id="phone-error" role="alert">
            Please enter a valid phone number
          </span>
        </div>
      );

      const input = screen.getByLabelText('Phone number');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form-level errors should be announced', async () => {
      const { container } = render(
        <form>
          <div role="alert" aria-live="assertive">
            <h2>There are 3 errors in this form:</h2>
            <ul>
              <li><a href="#email">Email is required</a></li>
              <li><a href="#password">Password must be at least 8 characters</a></li>
              <li><a href="#confirm">Passwords do not match</a></li>
            </ul>
          </div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" aria-invalid="true" />
        </form>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('success messages should be announced', async () => {
      const { container } = render(
        <div role="status" aria-live="polite">
          Your profile has been updated successfully
        </div>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Status Updates', () => {
    it('page load status should be conveyed', async () => {
      const { container } = render(
        <div>
          <div role="status" aria-live="polite">
            Page loaded
          </div>
          <h1>Dashboard</h1>
        </div>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('save status should be announced', async () => {
      const { container } = render(
        <div>
          <button>Save</button>
          <div role="status" aria-live="polite">
            Saving... Draft saved
          </div>
        </div>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('filter/sort changes should be announced', async () => {
      const { container } = render(
        <div>
          <select aria-label="Sort by">
            <option>Date</option>
            <option>Name</option>
          </select>
          <div role="status" aria-live="polite" aria-atomic="true">
            Sorted by Date. 25 items displayed
          </div>
        </div>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('item added/removed notifications should be announced', async () => {
      const { container } = render(
        <div>
          <button>Add to cart</button>
          <div role="status" aria-live="polite">
            Item added to cart. Cart now has 3 items
          </div>
        </div>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Hidden Content', () => {
    it('visually hidden content should be available to screen readers', async () => {
      const { container } = render(
        <button>
          <span className="visually-hidden">Close dialog</span>
          <span aria-hidden="true">×</span>
        </button>
      );

      const button = screen.getByRole('button', { name: /close dialog/i });
      expect(button).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('decorative elements should be hidden from screen readers', async () => {
      const { container } = render(
        <div>
          <span aria-hidden="true">★★★★★</span>
          <span className="visually-hidden">5 out of 5 stars</span>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('collapsed content should indicate expandability', async () => {
      const { container } = render(
        <div>
          <button aria-expanded="false" aria-controls="details">
            More details
          </button>
          <div id="details" hidden>
            Additional information
          </div>
        </div>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Complex Widgets', () => {
    it('autocomplete should announce suggestions', async () => {
      const { container } = render(
        <div>
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="suggestions"
          />
          <ul id="suggestions" role="listbox">
            <li role="option">Suggestion 1</li>
            <li role="option">Suggestion 2</li>
          </ul>
        </div>
      );

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tree view should convey structure', async () => {
      const { container } = render(
        <div role="tree" aria-label="File system">
          <div role="treeitem" aria-expanded="true" aria-level={1}>
            <span>Documents</span>
            <div role="group">
              <div role="treeitem" aria-level={2}>file1.txt</div>
              <div role="treeitem" aria-level={2}>file2.txt</div>
            </div>
          </div>
        </div>
      );

      expect(screen.getByRole('tree')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('slider should announce values', async () => {
      const { container } = render(
        <div>
          <label id="volume-label">Volume</label>
          <input
            type="range"
            role="slider"
            aria-labelledby="volume-label"
            aria-valuenow={50}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext="50%"
          />
        </div>
      );

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '50');
      expect(slider).toHaveAttribute('aria-valuetext', '50%');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Table Accessibility', () => {
    it('data tables should have proper headers', async () => {
      const { container } = render(
        <table>
          <caption>User List</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>john@example.com</td>
              <td>Admin</td>
            </tr>
          </tbody>
        </table>
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('complex tables should use scope attributes', async () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Q1</th>
              <th scope="col">Q2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Product A</th>
              <td>$100</td>
              <td>$150</td>
            </tr>
            <tr>
              <th scope="row">Product B</th>
              <td>$200</td>
              <td>$250</td>
            </tr>
          </tbody>
        </table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
