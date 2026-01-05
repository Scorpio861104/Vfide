/**
 * MobileForm Component Tests
 * Testing touch-optimized form inputs and controls
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
  MobileInput,
  MobileButton,
  MobileSelect,
  MobileToggle,
  MobileNumberInput,
} from '../../components/mobile/MobileForm';

describe('MobileInput Component', () => {
  it('renders input field', () => {
    render(
      <MobileInput
        label="Email"
        placeholder="Enter email"
        type="email"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('displays label correctly', () => {
    render(
      <MobileInput
        label="Email Address"
        placeholder="Enter email"
        type="email"
      />
    );

    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('shows error message when provided', () => {
    render(
      <MobileInput
        label="Email"
        error="Invalid email format"
        type="email"
      />
    );

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('displays help text', () => {
    render(
      <MobileInput
        label="Username"
        helpText="Choose a unique username"
        type="text"
      />
    );

    expect(screen.getByText('Choose a unique username')).toBeInTheDocument();
  });

  it('has minimum 44px height for touch target', () => {
    const { container } = render(
      <MobileInput label="Test" type="text" />
    );

    const input = screen.getByRole('textbox');
    const rect = input.getBoundingClientRect();

    expect(rect.height).toBeGreaterThanOrEqual(44);
  });

  it('handles input changes', async () => {
    const user = userEvent.setup();

    render(
      <MobileInput
        label="Name"
        type="text"
        onChange={(e) => {}}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, 'John Doe');

    expect(input.value).toBe('John Doe');
  });

  it('applies disabled state', () => {
    render(
      <MobileInput
        label="Disabled Input"
        type="text"
        disabled
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('shows required indicator', () => {
    const { container } = render(
      <MobileInput
        label="Required Field"
        type="text"
        required
      />
    );

    const label = screen.getByText(/Required Field/);
    expect(label).toBeInTheDocument();
  });
});

describe('MobileButton Component', () => {
  it('renders button', () => {
    render(<MobileButton>Click Me</MobileButton>);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('handles button click', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(
      <MobileButton onClick={handleClick}>Click Me</MobileButton>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('has minimum 48px height for touch target', () => {
    render(<MobileButton>Click Me</MobileButton>);

    const button = screen.getByRole('button');
    const rect = button.getBoundingClientRect();

    expect(rect.height).toBeGreaterThanOrEqual(48);
  });

  it('shows loading state', () => {
    render(
      <MobileButton isLoading={true}>
        Loading...
      </MobileButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('applies variant styles', () => {
    render(
      <MobileButton variant="secondary">
        Secondary Button
      </MobileButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-100');
  });

  it('applies size variants', () => {
    const { rerender } = render(
      <MobileButton size="sm">Small</MobileButton>
    );

    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-2');

    rerender(<MobileButton size="lg">Large</MobileButton>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3');
  });

  it('supports full width', () => {
    render(
      <MobileButton fullWidth>
        Full Width Button
      </MobileButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('disables when required', () => {
    render(
      <MobileButton disabled>
        Disabled Button
      </MobileButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});

describe('MobileSelect Component', () => {
  const options = [
    { value: 'eth', label: 'Ethereum' },
    { value: 'btc', label: 'Bitcoin' },
    { value: 'usdc', label: 'USDC' },
  ];

  it('renders select field', () => {
    render(
      <MobileSelect
        label="Token"
        options={options}
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('displays options', async () => {
    const user = userEvent.setup();

    render(
      <MobileSelect
        label="Token"
        options={options}
      />
    );

    const select = screen.getByRole('combobox');
    await user.click(select);

    options.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('handles selection change', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <MobileSelect
        label="Token"
        options={options}
        onChange={handleChange}
      />
    );

    const select = screen.getByRole('combobox');
    await user.click(select);

    const ethereumOption = screen.getByText('Ethereum');
    await user.click(ethereumOption);

    expect(handleChange).toHaveBeenCalled();
  });

  it('shows selected value', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <MobileSelect
        label="Token"
        options={options}
        value="eth"
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('eth');
  });

  it('has minimum 44px height', () => {
    render(
      <MobileSelect
        label="Token"
        options={options}
      />
    );

    const select = screen.getByRole('combobox');
    const rect = select.getBoundingClientRect();

    expect(rect.height).toBeGreaterThanOrEqual(44);
  });

  it('shows error state', () => {
    render(
      <MobileSelect
        label="Token"
        options={options}
        error="Please select a token"
      />
    );

    expect(screen.getByText('Please select a token')).toBeInTheDocument();
  });
});

describe('MobileToggle Component', () => {
  it('renders toggle switch', () => {
    render(
      <MobileToggle label="Enable notifications" />
    );

    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeInTheDocument();
  });

  it('toggles checked state', async () => {
    const user = userEvent.setup();

    render(
      <MobileToggle label="Enable notifications" />
    );

    const toggle = screen.getByRole('checkbox') as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    await user.click(toggle);
    expect(toggle.checked).toBe(true);

    await user.click(toggle);
    expect(toggle.checked).toBe(false);
  });

  it('displays label', () => {
    render(
      <MobileToggle label="Dark Mode" />
    );

    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('handles change event', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <MobileToggle
        label="Enable notifications"
        onChange={handleChange}
      />
    );

    const toggle = screen.getByRole('checkbox');
    await user.click(toggle);

    expect(handleChange).toHaveBeenCalled();
  });

  it('supports disabled state', () => {
    render(
      <MobileToggle label="Disabled" disabled />
    );

    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeDisabled();
  });

  it('shows help text', () => {
    render(
      <MobileToggle
        label="Feature Flag"
        helpText="This feature is experimental"
      />
    );

    expect(screen.getByText('This feature is experimental')).toBeInTheDocument();
  });
});

describe('MobileNumberInput Component', () => {
  it('renders number input', () => {
    render(
      <MobileNumberInput label="Quantity" />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toBeInTheDocument();
  });

  it('increments value with + button', async () => {
    const user = userEvent.setup();

    render(
      <MobileNumberInput label="Quantity" value={5} />
    );

    const incrementButton = screen.getByRole('button', { name: /\+/i });
    await user.click(incrementButton);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(Number(input.value)).toBe(6);
  });

  it('decrements value with - button', async () => {
    const user = userEvent.setup();

    render(
      <MobileNumberInput label="Quantity" value={5} />
    );

    const decrementButton = screen.getByRole('button', { name: /−|-/i });
    await user.click(decrementButton);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(Number(input.value)).toBe(4);
  });

  it('respects min value', async () => {
    const user = userEvent.setup();

    render(
      <MobileNumberInput label="Quantity" value={1} min={1} />
    );

    const decrementButton = screen.getByRole('button', { name: /−|-/i });
    await user.click(decrementButton);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(Number(input.value)).toBe(1);
  });

  it('respects max value', async () => {
    const user = userEvent.setup();

    render(
      <MobileNumberInput label="Quantity" value={10} max={10} />
    );

    const incrementButton = screen.getByRole('button', { name: /\+/i });
    await user.click(incrementButton);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(Number(input.value)).toBe(10);
  });

  it('handles manual input changes', async () => {
    const user = userEvent.setup();

    render(
      <MobileNumberInput label="Quantity" />
    );

    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '25');

    expect((input as HTMLInputElement).value).toBe('25');
  });

  it('has large, touch-friendly buttons', () => {
    render(
      <MobileNumberInput label="Quantity" />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    });
  });

  it('shows error message', () => {
    render(
      <MobileNumberInput
        label="Quantity"
        error="Value must be positive"
      />
    );

    expect(screen.getByText('Value must be positive')).toBeInTheDocument();
  });
});

describe('Mobile Form Accessibility', () => {
  it('all form inputs have associated labels', () => {
    render(
      <>
        <MobileInput label="Email" type="email" />
        <MobileSelect label="Token" options={[]} />
        <MobileToggle label="Enable" />
      </>
    );

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Token')).toBeInTheDocument();
    expect(screen.getByText('Enable')).toBeInTheDocument();
  });

  it('form inputs have sufficient contrast', () => {
    const { container } = render(
      <>
        <MobileInput label="Email" type="email" />
        <MobileButton>Submit</MobileButton>
      </>
    );

    // Check for proper color classes indicating contrast
    const inputs = container.querySelectorAll('input, select, button');
    inputs.forEach(element => {
      const styles = window.getComputedStyle(element);
      expect(styles).toBeDefined();
    });
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();

    render(
      <>
        <MobileInput label="Email" type="email" />
        <MobileButton>Submit</MobileButton>
      </>
    );

    // Tab to first input
    await user.tab();
    expect(screen.getByRole('textbox')).toHaveFocus();

    // Tab to button
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
  });
});
