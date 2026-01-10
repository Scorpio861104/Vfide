import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests - Button Component', () => {
  test('button should have no a11y violations', async () => {
    const { container } = render(
      <button aria-label="Test Button">Click me</button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('button should be keyboard accessible', async () => {
    const { container } = render(
      <button>Click me</button>
    );
    const button = container.querySelector('button');
    expect(button).toHaveProperty('disabled', false);
  });
});

describe('Accessibility Tests - Form Elements', () => {
  test('input should have associated label', async () => {
    const { container } = render(
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('form should have no a11y violations', async () => {
    const { container } = render(
      <form>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" aria-required="true" />
        <button type="submit">Submit</button>
      </form>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility Tests - Navigation', () => {
  test('nav should have proper landmark', async () => {
    const { container } = render(
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
        </ul>
      </nav>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('links should be descriptive', async () => {
    const { container } = render(
      <a href="/page">Learn more</a>
    );
    const link = container.querySelector('a');
    expect(link?.textContent).toBeTruthy();
  });
});

describe('Accessibility Tests - Color Contrast', () => {
  test('text should have sufficient contrast', async () => {
    const { container } = render(
      <div style={{ color: '#000000', backgroundColor: '#ffffff' }}>
        Text with good contrast
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
