import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, WithErrorBoundary } from '@/components/error/ErrorBoundary';

const ThrowError = ({ message = 'Test error' }: { message?: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  const originalError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Boom" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Boom/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('resets after clicking Try Again', () => {
    let shouldThrow = true;
    const Conditional = () => {
      if (shouldThrow) throw new Error('Recoverable error');
      return <div>Recovered</div>;
    };

    render(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
  });
});

describe('WithErrorBoundary', () => {
  const originalError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('wraps and catches child errors', () => {
    render(
      <WithErrorBoundary>
        <ThrowError message="Wrapped error" />
      </WithErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Wrapped error/i)).toBeInTheDocument();
  });

  it('renders wrapped children when healthy', () => {
    render(
      <WithErrorBoundary>
        <div>Wrapped content</div>
      </WithErrorBoundary>
    );

    expect(screen.getByText('Wrapped content')).toBeInTheDocument();
  });
});
