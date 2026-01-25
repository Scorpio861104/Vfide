import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

expect.extend(toHaveNoViolations);

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('Page-Specific Accessibility Tests', () => {
  describe('Homepage Accessibility', () => {
    it('homepage should have proper document structure', async () => {
      const HomePage = () => (
        <div>
          <header role="banner">
            <nav aria-label="Main navigation">
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/features">Features</a></li>
              </ul>
            </nav>
          </header>
          
          <main role="main">
            <section aria-labelledby="hero-heading">
              <h1 id="hero-heading">Welcome to Vfide</h1>
              <p>Decentralized finance platform</p>
              <a href="/get-started" className="cta-button">Get Started</a>
            </section>
            
            <section aria-labelledby="features-heading">
              <h2 id="features-heading">Features</h2>
              <div>
                <article>
                  <h3>Secure Transactions</h3>
                  <p>Bank-level security</p>
                </article>
                <article>
                  <h3>Fast Processing</h3>
                  <p>Lightning-fast transfers</p>
                </article>
              </div>
            </section>
          </main>
          
          <footer role="contentinfo">
            <p>&copy; 2024 Vfide. All rights reserved.</p>
          </footer>
        </div>
      );

      const { container } = render(<HomePage />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('homepage hero section should be accessible', async () => {
      const HeroSection = () => (
        <section aria-labelledby="hero-title">
          <h1 id="hero-title">Your Trusted DeFi Platform</h1>
          <p>Experience secure, fast, and reliable decentralized finance</p>
          <div>
            <a href="/sign-up" className="btn-primary">
              Sign Up Now
            </a>
            <a href="/learn-more" className="btn-secondary">
              Learn More
            </a>
          </div>
        </section>
      );

      const { container } = render(<HeroSection />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /learn more/i })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('homepage feature cards should be accessible', async () => {
      const FeatureCards = () => (
        <section aria-labelledby="features-heading">
          <h2 id="features-heading">Key Features</h2>
          <ul>
            <li>
              <article>
                <img src="/security-icon.svg" alt="" aria-hidden="true" />
                <h3>Enhanced Security</h3>
                <p>Multi-layer security protocols</p>
              </article>
            </li>
            <li>
              <article>
                <img src="/speed-icon.svg" alt="" aria-hidden="true" />
                <h3>Lightning Fast</h3>
                <p>Process transactions in seconds</p>
              </article>
            </li>
            <li>
              <article>
                <img src="/support-icon.svg" alt="" aria-hidden="true" />
                <h3>24/7 Support</h3>
                <p>Always here to help you</p>
              </article>
            </li>
          </ul>
        </section>
      );

      const { container } = render(<FeatureCards />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Dashboard Accessibility', () => {
    it('dashboard should have proper landmark regions', async () => {
      const Dashboard = () => (
        <div>
          <header role="banner">
            <h1>Dashboard</h1>
            <nav aria-label="User menu">
              <button aria-label="Profile">Profile</button>
              <button aria-label="Settings">Settings</button>
            </nav>
          </header>
          
          <aside role="complementary" aria-label="Sidebar navigation">
            <nav>
              <ul>
                <li><a href="/dashboard" aria-current="page">Overview</a></li>
                <li><a href="/dashboard/transactions">Transactions</a></li>
                <li><a href="/dashboard/settings">Settings</a></li>
              </ul>
            </nav>
          </aside>
          
          <main role="main">
            <h2>Account Overview</h2>
            <section aria-labelledby="balance-heading">
              <h3 id="balance-heading">Balance</h3>
              <p>$1,234.56</p>
            </section>
          </main>
        </div>
      );

      const { container } = render(<Dashboard />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('dashboard widgets should be accessible', async () => {
      const DashboardWidgets = () => (
        <div>
          <article aria-labelledby="balance-title">
            <h3 id="balance-title">Account Balance</h3>
            <p aria-label="Balance amount">$1,234.56 USD</p>
            <button>View Details</button>
          </article>
          
          <article aria-labelledby="activity-title">
            <h3 id="activity-title">Recent Activity</h3>
            <ul aria-label="Transaction list">
              <li>
                <span>Payment to John</span>
                <span aria-label="Amount">-$50.00</span>
              </li>
              <li>
                <span>Received from Alice</span>
                <span aria-label="Amount">+$100.00</span>
              </li>
            </ul>
          </article>
        </div>
      );

      const { container } = render(<DashboardWidgets />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('dashboard charts should have text alternatives', async () => {
      const DashboardChart = () => (
        <figure>
          <figcaption id="chart-title">Monthly Transaction Volume</figcaption>
          <svg
            role="img"
            aria-labelledby="chart-title chart-desc"
            width="400"
            height="300"
          >
            <title>Monthly Transaction Volume Chart</title>
            <desc id="chart-desc">
              Bar chart showing transaction volumes: January: $1000, February: $1500, March: $2000
            </desc>
            <rect x="0" y="200" width="100" height="100" />
            <rect x="100" y="150" width="100" height="150" />
            <rect x="200" y="100" width="100" height="200" />
          </svg>
        </figure>
      );

      const { container } = render(<DashboardChart />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Forms Accessibility', () => {
    it('login form should be accessible', async () => {
      const LoginForm = () => (
        <form aria-labelledby="login-title">
          <h2 id="login-title">Log In to Your Account</h2>
          
          <div>
            <label htmlFor="email">Email Address</label>
            <input 
              id="email" 
              type="email" 
              autoComplete="email"
              required 
              aria-required="true"
            />
          </div>
          
          <div>
            <label htmlFor="password">
              Password
            </label>
            <input 
              id="password" 
              type="password" 
              autoComplete="current-password"
              required 
              aria-required="true"
            />
          </div>
          
          <div>
            <label>
              <input type="checkbox" />
              Remember me
            </label>
          </div>
          
          <button type="submit">Log In</button>
          <a href="/forgot-password">Forgot password?</a>
        </form>
      );

      const { container } = render(<LoginForm />);

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Log In' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('registration form should be accessible', async () => {
      const RegistrationForm = () => (
        <form aria-labelledby="register-title">
          <h2 id="register-title">Create Your Account</h2>
          
          <fieldset>
            <legend>Personal Information</legend>
            
            <div>
              <label htmlFor="fullname">
                Full Name <span aria-label="required">*</span>
              </label>
              <input 
                id="fullname" 
                type="text" 
                required 
                aria-required="true"
              />
            </div>
            
            <div>
              <label htmlFor="reg-email">
                Email <span aria-label="required">*</span>
              </label>
              <input 
                id="reg-email" 
                type="email" 
                required 
                aria-required="true"
                aria-describedby="email-hint"
              />
              <p id="email-hint">We'll never share your email</p>
            </div>
            
            <div>
              <label htmlFor="reg-password">
                Password <span aria-label="required">*</span>
              </label>
              <input 
                id="reg-password" 
                type="password" 
                required 
                aria-required="true"
                aria-describedby="password-requirements"
              />
              <p id="password-requirements">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>
          </fieldset>
          
          <div>
            <label>
              <input type="checkbox" required aria-required="true" />
              I agree to the <a href="/terms">Terms of Service</a>
            </label>
          </div>
          
          <button type="submit">Create Account</button>
        </form>
      );

      const { container } = render(<RegistrationForm />);

      expect(screen.getByRole('group', { name: 'Personal Information' })).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form errors should be accessible', async () => {
      const FormWithErrors = () => (
        <form aria-labelledby="form-title">
          <div role="alert" aria-live="assertive">
            <h2>There are 2 errors in this form</h2>
            <ul>
              <li><a href="#email">Email is required</a></li>
              <li><a href="#password">Password is too short</a></li>
            </ul>
          </div>
          
          <div>
            <label htmlFor="email">Email</label>
            <input 
              id="email" 
              type="email" 
              aria-invalid="true"
              aria-describedby="email-error"
            />
            <span id="email-error" role="alert">
              Email is required
            </span>
          </div>
          
          <div>
            <label htmlFor="password">Password</label>
            <input 
              id="password" 
              type="password" 
              aria-invalid="true"
              aria-describedby="password-error"
            />
            <span id="password-error" role="alert">
              Password must be at least 8 characters
            </span>
          </div>
        </form>
      );

      const { container } = render(<FormWithErrors />);

      expect(screen.getAllByRole('alert')).toHaveLength(3);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Data Tables Accessibility', () => {
    it('transaction table should be accessible', async () => {
      const TransactionTable = () => (
        <div>
          <h2 id="transactions-title">Transaction History</h2>
          <table aria-labelledby="transactions-title">
            <caption className="visually-hidden">List of recent transactions</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2024-01-22</td>
                <td>Payment to Merchant</td>
                <td aria-label="Amount: minus $50.00">-$50.00</td>
                <td>
                  <span role="img" aria-label="Completed">✓</span>
                  Completed
                </td>
                <td>
                  <button aria-label="View transaction details">View</button>
                </td>
              </tr>
              <tr>
                <td>2024-01-21</td>
                <td>Received from User</td>
                <td aria-label="Amount: plus $100.00">+$100.00</td>
                <td>
                  <span role="img" aria-label="Completed">✓</span>
                  Completed
                </td>
                <td>
                  <button aria-label="View transaction details">View</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );

      const { container } = render(<TransactionTable />);

      expect(screen.getByRole('table')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('sortable table should be accessible', async () => {
      const SortableTable = () => (
        <table>
          <caption>User List</caption>
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
                  Email
                </button>
              </th>
              <th aria-sort="none">
                <button>
                  Join Date
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alice Johnson</td>
              <td>alice@example.com</td>
              <td>2024-01-15</td>
            </tr>
          </tbody>
        </table>
      );

      const { container } = render(<SortableTable />);

      const sortButton = screen.getByRole('button', { name: /name/i });
      const sortHeader = sortButton.closest('th');
      expect(sortHeader).toHaveAttribute('aria-sort', 'ascending');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('filterable table should be accessible', async () => {
      const FilterableTable = () => (
        <div>
          <div role="search">
            <label htmlFor="table-search">Search transactions</label>
            <input 
              id="table-search" 
              type="search" 
              aria-controls="transaction-table"
            />
          </div>
          
          <div>
            <label htmlFor="status-filter">Filter by status</label>
            <select id="status-filter" aria-controls="transaction-table">
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div role="status" aria-live="polite" aria-atomic="true">
            Showing 15 of 100 transactions
          </div>
          
          <table id="transaction-table">
            <caption>Filtered Transaction List</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TX001</td>
                <td>$100</td>
                <td>Completed</td>
              </tr>
            </tbody>
          </table>
        </div>
      );

      const { container } = render(<FilterableTable />);

      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modals and Dialogs Accessibility', () => {
    it('confirmation modal should be accessible', async () => {
      const ConfirmationModal = () => (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-desc"
        >
          <h2 id="modal-title">Confirm Action</h2>
          <p id="modal-desc">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          <div>
            <button>Cancel</button>
            <button>Delete</button>
          </div>
          <button aria-label="Close dialog">×</button>
        </div>
      );

      const { container } = render(<ConfirmationModal />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form modal should be accessible', async () => {
      const FormModal = () => (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="form-modal-title"
        >
          <h2 id="form-modal-title">Edit Profile</h2>
          <form>
            <div>
              <label htmlFor="modal-name">Name</label>
              <input id="modal-name" type="text" />
            </div>
            <div>
              <label htmlFor="modal-email">Email</label>
              <input id="modal-email" type="email" />
            </div>
            <button type="submit">Save Changes</button>
            <button type="button">Cancel</button>
          </form>
        </div>
      );

      const { container } = render(<FormModal />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation Menus Accessibility', () => {
    it('main navigation should be accessible', async () => {
      const MainNav = () => (
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="/" aria-current="page">Home</a></li>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/transactions">Transactions</a></li>
            <li><a href="/settings">Settings</a></li>
          </ul>
        </nav>
      );

      const { container } = render(<MainNav />);

      const nav = screen.getByRole('navigation', { name: 'Main navigation' });
      expect(nav).toBeInTheDocument();

      const currentLink = screen.getByRole('link', { current: 'page' });
      expect(currentLink).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('dropdown menu should be accessible', async () => {
      const DropdownMenu = () => (
        <div>
          <button
            aria-haspopup="true"
            aria-expanded="true"
            aria-controls="user-menu"
          >
            User Menu
          </button>
          <ul id="user-menu" role="menu">
            <li role="none">
              <a href="/profile" role="menuitem">Profile</a>
            </li>
            <li role="none">
              <a href="/settings" role="menuitem">Settings</a>
            </li>
            <li role="separator" />
            <li role="none">
              <button role="menuitem">Log Out</button>
            </li>
          </ul>
        </div>
      );

      const { container } = render(<DropdownMenu />);

      const button = screen.getByRole('button', { name: 'User Menu' });
      expect(button).toHaveAttribute('aria-expanded', 'true');

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('breadcrumb navigation should be accessible', async () => {
      const Breadcrumbs = () => (
        <nav aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/dashboard">Dashboard</a>
            </li>
            <li aria-current="page">
              <span>Settings</span>
            </li>
          </ol>
        </nav>
      );

      const { container } = render(<Breadcrumbs />);

      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(nav).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Search Functionality Accessibility', () => {
    it('search form should be accessible', async () => {
      const SearchForm = () => (
        <form role="search">
          <label htmlFor="site-search">Search site</label>
          <input
            id="site-search"
            type="search"
            placeholder="Enter search terms"
            aria-label="Search site"
          />
          <button type="submit">Search</button>
        </form>
      );

      const { container } = render(<SearchForm />);

      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByLabelText('Search site')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('search results should be accessible', async () => {
      const SearchResults = () => (
        <div>
          <div role="status" aria-live="polite">
            Found 15 results for "transaction"
          </div>
          <ul aria-label="Search results">
            <li>
              <article>
                <h3>
                  <a href="/result1">Transaction Guide</a>
                </h3>
                <p>Learn how to make transactions...</p>
              </article>
            </li>
            <li>
              <article>
                <h3>
                  <a href="/result2">Transaction History</a>
                </h3>
                <p>View your transaction history...</p>
              </article>
            </li>
          </ul>
        </div>
      );

      const { container } = render(<SearchResults />);

      expect(screen.getByRole('status')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
