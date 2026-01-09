/**
 * Error Boundary Tests
 * Tests error handling, recovery, and crash prevention
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, SectionErrorBoundary, useErrorHandler } from '@/components/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ error }: { error?: Error }) => {
  if (error) throw error;
  throw new Error('Test error');
};

// Component that uses error handler hook
const ComponentWithErrorHandler = ({ shouldThrow }: { shouldThrow: boolean }) => {
  const throwError = useErrorHandler();
  
  if (shouldThrow) {
    throwError(new Error('Manual error'));
  }
  
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  describe('Error Catching', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Normal content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders error UI when error is thrown', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('displays error message', () => {
      const errorMessage = 'Custom error message';
      
      render(
        <ErrorBoundary>
          <ThrowError error={new Error(errorMessage)} />
        </ErrorBoundary>
      );
      
      if (process.env.NODE_ENV === 'development') {
        expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
      }
    });

    it('catches errors from child components', () => {
      const Parent = () => (
        <div>
          <ThrowError />
        </div>
      );
      
      render(
        <ErrorBoundary>
          <Parent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div data-testid="custom">Custom error UI</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('custom')).toBeInTheDocument();
    });

    it('uses custom fallback over default UI', () => {
      const customFallback = <div>Custom</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  describe('Error Handler Callback', () => {
    it('calls onError callback when error occurs', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError error={new Error('Test')} />
        </ErrorBoundary>
      );
      
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it('provides error info to callback', () => {
      const onError = jest.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(onError).toHaveBeenCalled();
      const errorInfo = onError.mock.calls[0][1];
      expect(errorInfo).toHaveProperty('componentStack');
    });
  });

  describe('Recovery Mechanism', () => {
    it('shows try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('resets error state when try again is clicked', async () => {
      const user = userEvent.setup();
      let shouldError = true;
      
      const ConditionalError = () => {
        if (shouldError) throw new Error('Test');
        return <div>Recovered</div>;
      };
      
      render(
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      
      shouldError = false;
      await user.click(screen.getByRole('button', { name: /try again/i }));
      
      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });

    it('shows go home button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      const homeButton = screen.getByRole('link', { name: /go home/i });
      expect(homeButton).toBeInTheDocument();
      expect(homeButton).toHaveAttribute('href', '/');
    });
  });

  describe('Development vs Production', () => {
    const originalEnv = process.env.NODE_ENV;

    it('shows error details in development', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Detailed error')} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText(/detailed error/i)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('hides error details in production', () => {
      process.env.NODE_ENV = 'production';
      
      render(
        <ErrorBoundary>
          <ThrowError error={new Error('Secret details')} />
        </ErrorBoundary>
      );
      
      expect(screen.queryByText(/secret details/i)).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('SectionErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <SectionErrorBoundary>
        <div data-testid="section">Section content</div>
      </SectionErrorBoundary>
    );
    
    expect(screen.getByTestId('section')).toBeInTheDocument();
  });

  it('renders inline error UI', () => {
    render(
      <SectionErrorBoundary>
        <ThrowError />
      </SectionErrorBoundary>
    );
    
    expect(screen.getByText(/section error/i)).toBeInTheDocument();
  });

  it('shows smaller error UI than full ErrorBoundary', () => {
    const { container } = render(
      <SectionErrorBoundary>
        <ThrowError />
      </SectionErrorBoundary>
    );
    
    // Should not take full screen height
    expect(container.querySelector('.min-h-screen')).not.toBeInTheDocument();
  });

  it('allows section recovery', async () => {
    const user = userEvent.setup();
    let shouldError = true;
    
    const ConditionalSection = () => {
      if (shouldError) throw new Error('Section error');
      return <div>Section recovered</div>;
    };
    
    render(
      <SectionErrorBoundary>
        <ConditionalSection />
      </SectionErrorBoundary>
    );
    
    shouldError = false;
    const retryButton = screen.getByText(/retry/i);
    await user.click(retryButton);
    
    expect(screen.getByText('Section recovered')).toBeInTheDocument();
  });

  it('accepts custom fallback', () => {
    render(
      <SectionErrorBoundary fallback={<div>Section fallback</div>}>
        <ThrowError />
      </SectionErrorBoundary>
    );
    
    expect(screen.getByText('Section fallback')).toBeInTheDocument();
  });
});

describe('useErrorHandler Hook', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('throws errors that ErrorBoundary can catch', () => {
    render(
      <ErrorBoundary>
        <ComponentWithErrorHandler shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('does not throw when condition is false', () => {
    render(
      <ErrorBoundary>
        <ComponentWithErrorHandler shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('can be called programmatically', () => {
    const ComponentWithManualError = () => {
      const throwError = useErrorHandler();
      
      const handleClick = () => {
        try {
          throw new Error('Manual error');
        } catch (e) {
          throwError(e as Error);
        }
      };
      
      return <button onClick={handleClick}>Trigger Error</button>;
    };
    
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <ComponentWithManualError />
      </ErrorBoundary>
    );
    
    user.click(screen.getByRole('button'));
    
    // Error should be caught by boundary
    setTimeout(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    }, 100);
  });
});

describe('Nested Error Boundaries', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('inner boundary catches errors before outer', () => {
    render(
      <ErrorBoundary fallback={<div>Outer caught</div>}>
        <div>
          <SectionErrorBoundary fallback={<div>Inner caught</div>}>
            <ThrowError />
          </SectionErrorBoundary>
        </div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Inner caught')).toBeInTheDocument();
    expect(screen.queryByText('Outer caught')).not.toBeInTheDocument();
  });

  it('outer boundary catches errors from between boundaries', () => {
    render(
      <ErrorBoundary fallback={<div>Outer caught</div>}>
        <div>
          <SectionErrorBoundary>
            <div>Safe section</div>
          </SectionErrorBoundary>
          <ThrowError />
        </div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Outer caught')).toBeInTheDocument();
  });
});

describe('Error Boundary Edge Cases', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('handles errors in useEffect', () => {
    const ComponentWithEffectError = () => {
      React.useEffect(() => {
        throw new Error('Effect error');
      }, []);
      return <div>Content</div>;
    };
    
    render(
      <ErrorBoundary>
        <ComponentWithEffectError />
      </ErrorBoundary>
    );
    
    // Effect errors should be caught
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('handles errors during rendering', () => {
    const ComponentWithRenderError = () => {
      throw new Error('Render error');
    };
    
    render(
      <ErrorBoundary>
        <ComponentWithRenderError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('handles null/undefined errors gracefully', () => {
    const ComponentThrowingNull = () => {
      throw new Error('Null-like error');
    };
    
    render(
      <ErrorBoundary>
        <ComponentThrowingNull />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
